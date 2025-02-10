<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { currentPdfUrl, pdfScrollPosition } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import * as pdfjs from 'pdfjs-dist';
    import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
    import { throttle } from 'lodash-es';
    import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';

    export let roomName: string;
    export let isController: boolean;

    let pdfContainer: HTMLDivElement;
    let pdf: any = null;
    let currentPage = 1;
    let numPages = 0;
    let scale = 1.0;
    let lastScrollUpdate = 0;
    let isScrolling = false;
    let zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    let currentZoomIndex = zoomLevels.indexOf(1);

    // Initialize PDF.js worker with local worker file
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    // Function to update zoom from sync message
    function updateZoomFromSync(newScale: number) {
        const newIndex = zoomLevels.indexOf(newScale);
        if (newIndex !== -1) {
            currentZoomIndex = newIndex;
            scale = newScale;
            reloadPdf();
        }
    }

    // Subscribe to PDF URL changes and zoom sync
    $: if ($currentPdfUrl) {
        const urlParams = new URLSearchParams(new URL($currentPdfUrl).search);
        const syncedScale = urlParams.get('scale');
        
        if (syncedScale && !isController) {
            // If there's a scale parameter and we're not the controller, use it
            updateZoomFromSync(parseFloat(syncedScale));
        } else {
            // Otherwise just load the PDF normally
            loadPdf($currentPdfUrl);
        }
    }

    // Throttled scroll handler to prevent too many updates
    const handleScroll = throttle(() => {
        if (!isController || !pdfContainer) return;
        
        const scrollPosition = pdfContainer.scrollTop;
        pdfScrollPosition.set(scrollPosition);
        
        // Send scroll position to other participants
        sendMessage(
            roomName,
            Date.now(),
            JSON.stringify({
                eventType: 'pdf_scroll_sync',
                messageBody: JSON.stringify({
                    scrollPosition,
                    timestamp: Date.now()
                })
            }),
            roomName
        );
    }, 100);

    function handleZoom(direction: 'in' | 'out') {
        if (!isController) return;
        
        if (direction === 'in' && currentZoomIndex < zoomLevels.length - 1) {
            currentZoomIndex++;
        } else if (direction === 'out' && currentZoomIndex > 0) {
            currentZoomIndex--;
        }
        
        scale = zoomLevels[currentZoomIndex];
        
        // Broadcast zoom change
        sendMessage(
            roomName,
            Date.now(),
            JSON.stringify({
                eventType: 'pdf_zoom_sync',
                messageBody: JSON.stringify({
                    scale,
                    timestamp: Date.now()
                })
            }),
            roomName
        );
        
        reloadPdf();
    }

    function resetZoom() {
        if (!isController) return;
        currentZoomIndex = zoomLevels.indexOf(1);
        scale = 1.0;
        
        // Broadcast zoom reset
        sendMessage(
            roomName,
            Date.now(),
            JSON.stringify({
                eventType: 'pdf_zoom_sync',
                messageBody: JSON.stringify({
                    scale,
                    timestamp: Date.now()
                })
            }),
            roomName
        );
        
        reloadPdf();
    }

    async function reloadPdf() {
        if ($currentPdfUrl) {
            await loadPdf($currentPdfUrl);
        }
    }

    async function loadPdf(url: string) {
        try {
            const loadingTask = pdfjs.getDocument(url);
            pdf = await loadingTask.promise;
            numPages = pdf.numPages;
            
            // Clear existing pages
            if (pdfContainer) {
                pdfContainer.innerHTML = '';
            }
            
            // Render all pages
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                await renderPage(pageNum);
            }
        } catch (error) {
            console.error('Error loading PDF:', error);
        }
    }

    async function renderPage(pageNumber: number) {
        try {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            pdfContainer?.appendChild(canvas);
        } catch (error) {
            console.error(`Error rendering page ${pageNumber}:`, error);
        }
    }

    // Subscribe to scroll position changes when not controlling
    $: if (!isController && $pdfScrollPosition !== undefined) {
        if (pdfContainer && !isScrolling) {
            isScrolling = true;
            pdfContainer.scrollTop = $pdfScrollPosition;
            setTimeout(() => {
                isScrolling = false;
            }, 50);
        }
    }

    onMount(() => {
        if (pdfContainer) {
            pdfContainer.addEventListener('scroll', handleScroll);
        }
    });

    onDestroy(() => {
        if (pdfContainer) {
            pdfContainer.removeEventListener('scroll', handleScroll);
        }
    });
</script>

<div class="flex flex-col h-full">
    {#if isController}
        <div class="flex items-center justify-center gap-2 p-2 bg-gray-100 border-b">
            <Button 
                variant="outline" 
                size="icon"
                on:click={() => handleZoom('out')}
                disabled={currentZoomIndex === 0}
            >
                <ZoomOut class="h-4 w-4" />
            </Button>
            
            <span class="min-w-[4rem] text-center">
                {Math.round(scale * 100)}%
            </span>
            
            <Button 
                variant="outline" 
                size="icon"
                on:click={() => handleZoom('in')}
                disabled={currentZoomIndex === zoomLevels.length - 1}
            >
                <ZoomIn class="h-4 w-4" />
            </Button>
            
            <Button 
                variant="outline" 
                size="icon"
                on:click={resetZoom}
                disabled={scale === 1}
            >
                <RotateCcw class="h-4 w-4" />
            </Button>
        </div>
    {/if}
    
    <div 
        class="pdf-container flex-1 w-full overflow-y-auto bg-white"
        bind:this={pdfContainer}
        style="pointer-events: {isController ? 'auto' : 'none'}"
    >
        {#if !$currentPdfUrl}
            <div class="flex items-center justify-center h-full text-gray-500">
                No PDF selected
            </div>
        {/if}
    </div>
</div>

<style>
    .pdf-container {
        scroll-behavior: smooth;
    }
    
    .pdf-container canvas {
        display: block;
        margin: 0 auto;
        max-width: 100%;
        height: auto;
    }
</style> 