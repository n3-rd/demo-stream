<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onMount, createEventDispatcher } from 'svelte';
    import { currentImageUrl, imageZoomLevel } from '$lib/callStores';
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


    function handleZoomIn() {
        if (!isController) return;
        const newZoom = Math.min(currentZoom + 0.25, 3);
        updateZoom(newZoom);
        syncZoom(newZoom);
    }

    function handleZoomOut() {
        if (!isController) return;
        const newZoom = Math.max(currentZoom - 0.25, 0.5);
        updateZoom(newZoom);
        syncZoom(newZoom);
    }

    function handleReset() {
        if (!isController) return;
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        updateZoom(1);
        syncZoom(1);
        imageContainer.style.transform = `scale(1) translate(0px, 0px)`;
    }

    function handleWheel(event: WheelEvent) {
        if (!isController) return;
        
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
            // Zoom with Ctrl/Cmd + wheel
            const delta = event.deltaY * -0.01;
            const newZoom = Math.min(Math.max(currentZoom + delta, 0.5), 3);
            updateZoom(newZoom);
            syncZoom(newZoom);
        } else {
            // Pan with wheel
            translateX -= event.deltaX;
            translateY -= event.deltaY;
            updateTransform();
        }
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

    function syncZoom(zoom: number) {
        imageZoomLevel.set(zoom);
        
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
        imageContainer.style.cursor = 'grabbing';
    }

    function handleMouseMove(event: MouseEvent) {
        if (!isDragging || !isController) return;
        
        translateX = event.clientX - startX;
        translateY = event.clientY - startY;
        updateTransform();
    }

    function handleMouseUp() {
        if (!isController) return;
        isDragging = false;
        imageContainer.style.cursor = 'grab';
        syncZoom(currentZoom); // Sync the final position
    }

    onMount(() => {
        // Initialize zoom level
        imageZoomLevel.set(1);
        
        // Add wheel event listener for zoom
        const container = document.querySelector('.image-viewer-container');
        if (container) {
            container.addEventListener('wheel', handleWheel, { passive: false });
        }
        
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    });
    // Watch for zoom level changes from other users
    run(() => {
        if (!isDragging && $imageZoomLevel !== currentZoom) {
            updateZoom($imageZoomLevel);
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
        <div 
            class="absolute inset-0 flex items-center justify-center transition-transform duration-200 bg-bgdefault-light"
            bind:this={imageContainer}
            style="cursor: {isController ? 'grab' : 'default'}"
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
                    disabled={currentZoom <= 0.5}
                >
                    <ZoomOut class="h-4 w-4" />
                </Button>
                <Button
                    variant="secondary"
                    size="icon"
                    on:click={handleZoomIn}
                    disabled={currentZoom >= 3}
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