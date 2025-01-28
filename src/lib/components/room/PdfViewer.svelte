<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { currentPdfUrl, pdfScrollPosition } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import * as pdfjs from 'pdfjs-dist';
    import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
    import { throttle } from 'lodash-es';

    export let roomName: string;
    export let isController: boolean;

    let pdfContainer: HTMLDivElement;
    let pdf: any = null;
    let currentPage = 1;
    let numPages = 0;
    let scale = 1.0;
    let lastScrollUpdate = 0;
    let isScrolling = false;

    // Initialize PDF.js worker with local worker file
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

    // Subscribe to PDF URL changes
    $: if ($currentPdfUrl) {
        loadPdf($currentPdfUrl);
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

<div 
    class="pdf-container w-full h-full overflow-y-auto bg-white"
    bind:this={pdfContainer}
    style="pointer-events: {isController ? 'auto' : 'none'}"
>
    {#if !$currentPdfUrl}
        <div class="flex items-center justify-center h-full text-gray-500">
            No PDF selected
        </div>
    {/if}
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