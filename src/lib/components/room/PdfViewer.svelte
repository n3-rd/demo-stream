<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onMount, onDestroy } from 'svelte';
    import { currentPdfUrl, pdfScrollPosition, pdfZoomLevel } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import * as pdfjs from 'pdfjs-dist';
    import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
    import { throttle } from 'lodash-es';
    import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';

    interface Props {
        roomName: string;
        isController: boolean;
    }

    let { roomName, isController }: Props = $props();

    let pdfContainer: HTMLDivElement = $state();
    let pdf: any = null;
    let numPages = 0;
    let scale = $state(1.0);
    let lastScrollUpdate = 0;
    let isScrolling = $state(false);
    let lastRenderedScale = 0;
    const ZOOM_STEP = 0.25;
    const ZOOM_MIN = 0.25;
    const ZOOM_MAX = 5;

    // Pinch-to-zoom state
    let lastPinchDist = 0;
    let isTouching = false;

    // Initialize PDF.js worker with local worker file
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    // Throttled scroll handler to prevent too many updates
    const handleScroll = throttle(() => {
        if (!isController || !pdfContainer) return;

        const scrollPosition = pdfContainer.scrollTop;
        pdfScrollPosition.set(scrollPosition);

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

    function broadcastZoom(newScale: number) {
        sendMessage(
            roomName,
            Date.now(),
            JSON.stringify({
                eventType: 'pdf_zoom_sync',
                messageBody: JSON.stringify({
                    scale: newScale,
                    timestamp: Date.now()
                })
            }),
            roomName
        );
    }

    function applyZoom(newScale: number) {
        scale = newScale;
        pdfZoomLevel.set(newScale);
        reloadPdf();
    }

    function handleZoom(direction: 'in' | 'out') {
        if (!isController) return;
        const newScale = direction === 'in'
            ? Math.min(scale + ZOOM_STEP, ZOOM_MAX)
            : Math.max(scale - ZOOM_STEP, ZOOM_MIN);
        applyZoom(newScale);
        broadcastZoom(newScale);
    }

    function resetZoom() {
        if (!isController) return;
        applyZoom(1.0);
        broadcastZoom(1.0);
    }

    function handleWheel(event: WheelEvent) {
        if (!isController) return;
        // Only zoom on ctrl+wheel / meta+wheel (pinch-zoom style); let normal wheel scroll the PDF
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        const delta = event.deltaY * -0.005;
        const newScale = Math.min(Math.max(scale + delta, ZOOM_MIN), ZOOM_MAX);
        applyZoom(newScale);
        broadcastZoom(newScale);
    }

    function getTouchDist(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    }

    function handleTouchStart(event: TouchEvent) {
        if (!isController || event.touches.length !== 2) return;
        event.preventDefault();
        isTouching = true;
        lastPinchDist = getTouchDist(event.touches);
    }

    function handleTouchMove(event: TouchEvent) {
        if (!isController || !isTouching || event.touches.length !== 2) return;
        event.preventDefault();
        const dist = getTouchDist(event.touches);
        if (lastPinchDist > 0) {
            const ratio = dist / lastPinchDist;
            const newScale = Math.min(Math.max(scale * ratio, ZOOM_MIN), ZOOM_MAX);
            scale = newScale;
            // Apply immediate CSS transform for smooth visual feedback during pinch.
            // The full re-render happens on touchend.
            if (pdfContainer) {
                pdfContainer.style.transform = `scale(${newScale / (lastRenderedScale ?? 1)})`;
                pdfContainer.style.transformOrigin = 'top center';
            }
            pdfZoomLevel.set(newScale);
        }
        lastPinchDist = dist;
    }

    function handleTouchEnd(event: TouchEvent) {
        if (!isController || !isTouching) return;
        isTouching = false;
        lastPinchDist = 0;
        // Reset CSS transform and do a full re-render at final scale
        if (pdfContainer) {
            pdfContainer.style.transform = '';
            pdfContainer.style.transformOrigin = '';
        }
        reloadPdf();
        broadcastZoom(scale);
    }

    async function reloadPdf() {
        if ($currentPdfUrl) {
            if (pdfContainer) pdfContainer.classList.add('is-reloading');
            await loadPdf($currentPdfUrl);
            if (pdfContainer) pdfContainer.classList.remove('is-reloading');
        }
    }

    async function loadPdf(url: string) {
        try {
            // Strip any legacy ?scale= query param we may have previously appended
            const cleanUrl = url.split('?')[0];
            // Proxy cross-origin PDFs (e.g. CDN) to avoid CORS
            let fetchUrl = cleanUrl;
            if (typeof window !== 'undefined') {
                try {
                    const u = new URL(cleanUrl);
                    if (u.origin !== window.location.origin) {
                        fetchUrl = `/api/proxy-pdf?url=${encodeURIComponent(cleanUrl)}`;
                    }
                } catch {
                    // keep fetchUrl as cleanUrl
                }
            }
            const loadingTask = pdfjs.getDocument(fetchUrl);
            pdf = await loadingTask.promise;
            numPages = pdf.numPages;

            if (pdfContainer) {
                pdfContainer.innerHTML = '';
            }

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                await renderPage(pageNum);
            }
            lastRenderedScale = scale;
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

            await page.render({ canvasContext: context, viewport }).promise;
            pdfContainer?.appendChild(canvas);
        } catch (error) {
            console.error(`Error rendering page ${pageNumber}:`, error);
        }
    }

    onMount(() => {
        if (pdfContainer) {
            pdfContainer.addEventListener('scroll', handleScroll);
            pdfContainer.addEventListener('wheel', handleWheel as EventListener, { passive: false });
            pdfContainer.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false });
            pdfContainer.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
            pdfContainer.addEventListener('touchend', handleTouchEnd as EventListener, { passive: false });
        }
    });

    onDestroy(() => {
        if (pdfContainer) {
            pdfContainer.removeEventListener('scroll', handleScroll);
            pdfContainer.removeEventListener('wheel', handleWheel as EventListener);
            pdfContainer.removeEventListener('touchstart', handleTouchStart as EventListener);
            pdfContainer.removeEventListener('touchmove', handleTouchMove as EventListener);
            pdfContainer.removeEventListener('touchend', handleTouchEnd as EventListener);
        }
    });

    // Load PDF when URL changes
    run(() => {
        if ($currentPdfUrl) {
            const cleanUrl = $currentPdfUrl.split('?')[0];
            loadPdf(cleanUrl);
        }
    });

    // Apply zoom from store when not the controller (e.g. synced from remote)
    run(() => {
        if (!isController && $pdfZoomLevel !== scale) {
            scale = $pdfZoomLevel;
            reloadPdf();
        }
    });

    // Sync scroll position for non-controllers
    run(() => {
        if (!isController && $pdfScrollPosition !== undefined) {
            if (pdfContainer && !isScrolling) {
                isScrolling = true;
                pdfContainer.scrollTop = $pdfScrollPosition;
                setTimeout(() => { isScrolling = false; }, 50);
            }
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
                disabled={scale <= ZOOM_MIN}
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
                disabled={scale >= ZOOM_MAX}
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
    {:else}
        <div class="flex items-center justify-center gap-2 p-2 bg-gray-50 border-b text-sm text-gray-500">
            Zoom controlled by presenter · {Math.round(scale * 100)}%
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

    /* Brief opacity fade during re-render to reduce jarring flash effect on button zoom */
    .pdf-container.is-reloading {
        opacity: 0.7;
        transition: opacity 0.15s ease;
    }
</style>
