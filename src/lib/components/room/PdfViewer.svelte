<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { currentPdfUrl, pdfScrollPosition } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import { throttle } from 'lodash-es';
    import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';
    import { PdfViewer as SimplePdfViewer } from 'svelte-pdf-simple';

    export let roomName: string;
    export let isController: boolean;

    let pdfContainer: HTMLDivElement;
    let viewerInstance: any;
    let scale = 1.0;
    let zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    let currentZoomIndex = zoomLevels.indexOf(1);
    let isScrolling = false;
    let currentPage = 1;
    let numPages = 0;

    // Function to update zoom from sync message
    function updateZoomFromSync(newScale: number) {
        const newIndex = zoomLevels.indexOf(newScale);
        if (newIndex !== -1) {
            currentZoomIndex = newIndex;
            scale = newScale;
        }
    }

    // Subscribe to PDF URL changes and zoom sync
    $: if ($currentPdfUrl) {
        const urlParams = new URLSearchParams(new URL($currentPdfUrl).search);
        const syncedScale = urlParams.get('scale');
        
        if (syncedScale && !isController) {
            // If there's a scale parameter and we're not the controller, use it
            updateZoomFromSync(parseFloat(syncedScale));
        }
    }

    // Handler when the PDF is successfully loaded
    function handlePdfSuccess(event) {
        const { detail } = event;
        if (detail && detail.numPages) {
            numPages = detail.numPages;
        }
        
        // Make sure to apply the scroll position if not controlling
        if (!isController && $pdfScrollPosition !== undefined) {
            setTimeout(() => {
                if (pdfContainer) {
                    pdfContainer.scrollTop = $pdfScrollPosition;
                }
            }, 100);
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
                onclick={() => handleZoom('out')}
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
                onclick={() => handleZoom('in')}
                disabled={currentZoomIndex === zoomLevels.length - 1}
            >
                <ZoomIn class="h-4 w-4" />
            </Button>
            
            <Button 
                variant="outline" 
                size="icon"
                onclick={resetZoom}
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
        {:else}
            <SimplePdfViewer 
                url={$currentPdfUrl} 
                scale={scale}
                on:success={handlePdfSuccess}
                canvasClass="page-canvas"
            />
        {/if}
    </div>
</div>

<style>
    .pdf-container {
        scroll-behavior: smooth;
    }
    
    :global(.page-canvas) {
        display: block;
        margin: 0 auto;
        max-width: 100%;
        height: auto;
    }
</style> 