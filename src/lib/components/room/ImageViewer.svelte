<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onMount, createEventDispatcher } from 'svelte';
    import { currentImageUrl, imageZoomLevel, imagePanX, imagePanY } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';

    interface Props {
        roomName: string;
        isController: boolean;
    }

    let { roomName, isController }: Props = $props();

    const dispatch = createEventDispatcher();
    let imageContainer: HTMLDivElement = $state();
    let loading = false;
    let error = '';
    let currentZoom = $state(1);
    let isDragging = $state(false);
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    // Touch state for pinch-to-zoom
    let lastPinchDist = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = $state(false);

    function handleZoomIn() {
        if (!isController) return;
        const newZoom = Math.min(currentZoom + 0.1, 5);
        updateZoom(newZoom);
        syncTransform(newZoom);
    }

    function handleZoomOut() {
        if (!isController) return;
        const newZoom = Math.max(currentZoom - 0.1, 0.1);
        updateZoom(newZoom);
        syncTransform(newZoom);
    }

    function handleReset() {
        if (!isController) return;
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        updateZoom(1);
        syncTransform(1);
        if (imageContainer) imageContainer.style.transform = `scale(1) translate(0px, 0px)`;
    }

    function handleWheel(event: WheelEvent) {
        if (!isController) return;

        event.preventDefault();
        // Zoom with scroll wheel (pinch on trackpad triggers ctrlKey)
        const delta = event.deltaY * -0.005;
        const newZoom = Math.min(Math.max(currentZoom + delta, 0.1), 5);
        updateZoom(newZoom);
        syncTransform(newZoom);
    }

    function updateZoom(zoom: number) {
        currentZoom = zoom;
        updateTransform();
    }

    function updateTransform() {
        if (imageContainer) {
            imageContainer.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
        }
    }

    function syncTransform(zoom: number) {
        imageZoomLevel.set(zoom);
        imagePanX.set(translateX);
        imagePanY.set(translateY);

        const zoomSync = {
            eventType: 'image_zoom_sync',
            messageBody: JSON.stringify({
                zoomLevel: zoom,
                translateX,
                translateY
            })
        };

        try {
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(zoomSync),
                roomName
            );
        } catch (error) {
            console.error('Error sending image zoom sync:', error);
        }
    }

    function handleMouseDown(event: MouseEvent) {
        if (!isController) return;

        isDragging = true;
        startX = event.clientX - translateX;
        startY = event.clientY - translateY;
        if (imageContainer) imageContainer.style.cursor = 'grabbing';
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isDragging || !isController) return;

        translateX = event.clientX - startX;
        translateY = event.clientY - startY;
        updateTransform();
    }

    function handleMouseUp() {
        if (!isController || !isDragging) return;
        isDragging = false;
        if (imageContainer) imageContainer.style.cursor = 'grab';
        syncTransform(currentZoom);
    }

    // ── Touch handlers ──────────────────────────────────────────────────────────

    function getTouchDist(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    }

    function handleTouchStart(event: TouchEvent) {
        if (!isController) return;
        event.preventDefault();
        isTouching = true;

        if (event.touches.length === 1) {
            touchStartX = event.touches[0].clientX - translateX;
            touchStartY = event.touches[0].clientY - translateY;
        } else if (event.touches.length === 2) {
            lastPinchDist = getTouchDist(event.touches);
        }
    }

    function handleTouchMove(event: TouchEvent) {
        if (!isController || !isTouching) return;
        event.preventDefault();

        if (event.touches.length === 1) {
            // Pan
            translateX = event.touches[0].clientX - touchStartX;
            translateY = event.touches[0].clientY - touchStartY;
            updateTransform();
        } else if (event.touches.length === 2) {
            // Pinch-to-zoom
            const dist = getTouchDist(event.touches);
            if (lastPinchDist > 0) {
                const ratio = dist / lastPinchDist;
                const newZoom = Math.min(Math.max(currentZoom * ratio, 0.1), 5);
                updateZoom(newZoom);
            }
            lastPinchDist = dist;
        }
    }

    function handleTouchEnd(event: TouchEvent) {
        if (!isController) return;
        isTouching = false;
        lastPinchDist = 0;
        syncTransform(currentZoom);
    }

    onMount(() => {
        // Initialize zoom level
        imageZoomLevel.set(1);
        imagePanX.set(0);
        imagePanY.set(0);

        const container = document.querySelector('.image-viewer-container');
        if (container) {
            container.addEventListener('wheel', handleWheel as EventListener, { passive: false });
            container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: false });
            container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
            container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: false });
        }

        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel as EventListener);
                container.removeEventListener('touchstart', handleTouchStart as EventListener);
                container.removeEventListener('touchmove', handleTouchMove as EventListener);
                container.removeEventListener('touchend', handleTouchEnd as EventListener);
            }
        };
    });

    // Watch for transform changes from other users (non-controller)
    run(() => {
        if (!isDragging && !isTouching) {
            const zoomChanged = $imageZoomLevel !== currentZoom;
            const panXChanged = $imagePanX !== translateX;
            const panYChanged = $imagePanY !== translateY;
            if (zoomChanged || panXChanged || panYChanged) {
                currentZoom = $imageZoomLevel;
                translateX = $imagePanX;
                translateY = $imagePanY;
                updateTransform();
            }
        }
    });
</script>

<div
    class="image-viewer-container w-full h-full bg-black relative overflow-hidden"
    role="application"
    aria-label="Image viewer"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
>
    {#if loading}
        <div class="absolute inset-0 flex items-center justify-center text-white">
            Loading image...
        </div>
    {:else if error}
        <div class="absolute inset-0 flex items-center justify-center text-red-500">
            {error}
        </div>
    {:else}
        <!-- No transition class: CSS transitions cause lag when panning/dragging -->
        <div
            class="absolute inset-0 flex items-center justify-center bg-bgdefault-light"
            bind:this={imageContainer}
            style="cursor: {isController ? 'grab' : 'default'}; transform-origin: center center;"
        >
            <img
                src={$currentImageUrl}
                alt=""
                class="max-w-full max-h-full object-contain select-none"
                draggable="false"
            />
        </div>

        <!-- Zoom Controls -->
        {#if isController}
            <div class="absolute bottom-4 right-4 flex gap-2">
                <Button
                    variant="secondary"
                    size="icon"
                    on:click={handleZoomOut}
                    disabled={currentZoom <= 0.1}
                >
                    <ZoomOut class="h-4 w-4" />
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    on:click={handleZoomIn}
                    disabled={currentZoom >= 5}
                >
                    <ZoomIn class="h-4 w-4" />
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    on:click={handleReset}
                >
                    <RotateCcw class="h-4 w-4" />
                </Button>
            </div>
        {/if}

        <!-- Zoom Level Indicator -->
        <div class="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {Math.round(currentZoom * 100)}%
        </div>

        {#if !isController}
            <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-center py-2 px-4 rounded-full">
                Zoom and pan controlled by presenter
            </div>
        {/if}
    {/if}
</div>

<style>
    .image-viewer-container {
        user-select: none;
        -webkit-user-select: none;
    }

    img {
        pointer-events: none;
        -webkit-user-drag: none;
    }
</style>
