<script lang="ts">
    import { run } from 'svelte/legacy';

    import { onMount, createEventDispatcher, tick } from 'svelte';
    import * as mammoth from 'mammoth';
    import { currentDocxUrl, docxScrollPosition, docxZoomLevel } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';
    import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';

    interface Props {
        roomName: string;
        isController: boolean;
    }

    let { roomName, isController }: Props = $props();

    const dispatch = createEventDispatcher();
    let docxContainer: HTMLDivElement = $state();
    let docxContent: HTMLDivElement = $state();
    let loading = $state(false);
    let error = $state('');
    let lastScrollUpdate = 0;
    let loadedDocUrl = '';
    let htmlContent = $state('');
    let isAtBottom = false;
    let previousScrollTop = 0;
    



    let isScrolling = $state(false);
    let scrollTimeoutId: ReturnType<typeof setTimeout>;
    let scrollDebounceId: ReturnType<typeof setTimeout>;

    // Zoom state
    let zoomScale = $state(1.0);
    const ZOOM_STEP = 0.1;
    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 3.0;

    function handleZoomIn() {
        if (!isController) return;
        const newScale = Math.min(zoomScale + ZOOM_STEP, ZOOM_MAX);
        applyZoomScale(newScale);
        broadcastZoom(newScale);
    }

    function handleZoomOut() {
        if (!isController) return;
        const newScale = Math.max(zoomScale - ZOOM_STEP, ZOOM_MIN);
        applyZoomScale(newScale);
        broadcastZoom(newScale);
    }

    function handleZoomReset() {
        if (!isController) return;
        applyZoomScale(1.0);
        broadcastZoom(1.0);
    }

    function applyZoomScale(newScale: number) {
        zoomScale = newScale;
        docxZoomLevel.set(newScale);
        if (docxContent) {
            docxContent.style.fontSize = `${newScale}em`;
        }
    }

    function broadcastZoom(newScale: number) {
        try {
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify({
                    eventType: 'docx_zoom_sync',
                    messageBody: JSON.stringify({ scale: newScale })
                }),
                roomName
            );
        } catch (err) {
            console.error('Error broadcasting docx zoom:', err);
        }
    }

    function handleScroll(event) {
        if (!isController) {
            // If not controller, prevent manual scrolling by resetting to previous position
            if (!isScrolling) {
                event.preventDefault();
                docxContainer.scrollTop = previousScrollTop;
                return false;
            }
            return;
        }
        
        // Check if we're at the bottom of the container
        const maxScrollTop = docxContainer.scrollHeight - docxContainer.clientHeight;
        isAtBottom = Math.abs(docxContainer.scrollTop - maxScrollTop) < 5;
        
        // If we're at the bottom and were already at the bottom, don't sync
        // This prevents stuttering when already at bottom
        if (isAtBottom && previousScrollTop === docxContainer.scrollTop) {
            return;
        }
        
        // Store current scroll position for next comparison
        previousScrollTop = docxContainer.scrollTop;
        
        // Debounce the scroll event
        clearTimeout(scrollDebounceId);
        scrollDebounceId = setTimeout(() => {
            isScrolling = true;
            clearTimeout(scrollTimeoutId);
            
            // Send scroll updates at most every 150ms to avoid flooding
            const now = Date.now();
            if (now - lastScrollUpdate > 150) {
                syncScrollPosition();
                lastScrollUpdate = now;
            }
            
            scrollTimeoutId = setTimeout(() => {
                isScrolling = false;
                // Send one final update
                syncScrollPosition();
            }, 200);
        }, 10);
    }

    function syncScrollPosition() {
        if (!docxContainer || !isController) return;
        
        const scrollPosition = docxContainer.scrollTop;
        docxScrollPosition.set(scrollPosition);
        
        // Broadcast scroll position to other users
        const scrollSync = {
            eventType: 'docx_scroll_sync',
            messageBody: JSON.stringify({
                scrollPosition: scrollPosition
            })
        };
        
        try {
            sendMessage(
                roomName,
                Date.now(),
                JSON.stringify(scrollSync),
                roomName
            );
        } catch (error) {
            console.error('Error sending docx scroll sync:', error);
        }
    }

    function updateScrollPosition(position: number) {
        if (!docxContainer) return;
        
        // Mark that we're programmatically scrolling
        isScrolling = true;
        
        // Set the new scroll position
        docxContainer.scrollTop = position;
        previousScrollTop = position;
        
        // Clear the scrolling flag after a short delay
        clearTimeout(scrollTimeoutId);
        scrollTimeoutId = setTimeout(() => {
            isScrolling = false;
        }, 100);
    }

    async function loadDocx(url: string) {
        if (!url) return;
        
        try {
            loading = true;
            error = '';
            console.log('Starting DOCX load from URL:', url);
            
            // Proxy cross-origin DOCX (e.g. CDN) to avoid CORS
            let fetchUrl = url;
            if (typeof window !== 'undefined') {
                try {
                    const u = new URL(url);
                    if (u.origin !== window.location.origin) {
                        fetchUrl = `/api/proxy-pdf?url=${encodeURIComponent(url)}`;
                    }
                } catch {
                    // keep fetchUrl as url
                }
            }
            
            // Fetch the docx file
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // Convert to HTML using mammoth
            const result = await mammoth.convertToHtml({ arrayBuffer });
            
            if (!result.value) {
                throw new Error('Mammoth conversion returned empty content');
            }
            
            // Store the HTML content
            htmlContent = result.value;
            
            // Wait for the next tick to ensure DOM is updated
            await tick();
            
            // Try multiple methods to set content
            if (docxContent) {
                docxContent.innerHTML = htmlContent;
            } else {
                // Fallback: create a new element if not found
                const newContentDiv = document.createElement('div');
                newContentDiv.classList.add('docx-content-wrapper', 'p-8', 'max-w-4xl', 'mx-auto');
                newContentDiv.innerHTML = htmlContent;
                
                // Replace the existing content div
                const containerDiv = document.querySelector('.docx-container');
                if (containerDiv) {
                    const existingContentWrapper = containerDiv.querySelector('.docx-content-wrapper');
                    if (existingContentWrapper) {
                        containerDiv.replaceChild(newContentDiv, existingContentWrapper);
                    } else {
                        containerDiv.appendChild(newContentDiv);
                    }
                }
            }
            
            loadedDocUrl = url;
            
            // Reset scroll position after content is loaded
            await tick();
            if (docxContainer) {
                docxContainer.scrollTop = 0;
                previousScrollTop = 0;
                docxScrollPosition.set(0);
            }

            // Re-apply current zoom after content is replaced
            if (docxContent) {
                docxContent.style.fontSize = `${zoomScale}em`;
            }
            
        } catch (err) {
            console.error('Error loading DOCX:', err);
            error = err.message || 'Failed to load document';
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        // Wait a moment to ensure DOM is ready
        await tick();
        
        if ($currentDocxUrl) {
            loadDocx($currentDocxUrl);
        }
        
        return () => {
            clearTimeout(scrollTimeoutId);
            clearTimeout(scrollDebounceId);
        };
    });
    // Reactive statement to handle DOCX URL changes
    run(() => {
        if ($currentDocxUrl) {
            // Trigger document loading
            loadDocx($currentDocxUrl);
        }
    });
    // Watch for scroll position changes from other users
    run(() => {
        if (!isScrolling && docxContainer && $docxScrollPosition !== undefined && !isController) {
            updateScrollPosition($docxScrollPosition);
        }
    });
    // Watch for controller status changes
    run(() => {
        if (docxContainer) {
            if (isController) {
                docxContainer.style.overflowY = 'auto';
                docxContainer.style.cursor = 'default';
            } else {
                // Make it clear visually that user can't scroll
                docxContainer.style.overflowY = 'auto';
                docxContainer.style.cursor = 'not-allowed';
            }
        }
    });
    // Watch for zoom changes from controller (non-controllers)
    run(() => {
        if (!isController && $docxZoomLevel !== zoomScale) {
            zoomScale = $docxZoomLevel;
            if (docxContent) {
                docxContent.style.fontSize = `${zoomScale}em`;
            }
        }
    });
</script>

<div class="flex flex-col h-full">
    <!-- Zoom toolbar (controller only) -->
    {#if isController}
        <div class="flex items-center justify-center gap-2 p-2 bg-gray-100 border-b shrink-0">
            <Button variant="outline" size="icon" on:click={handleZoomOut} disabled={zoomScale <= ZOOM_MIN}>
                <ZoomOut class="h-4 w-4" />
            </Button>
            <span class="min-w-[4rem] text-center text-sm">{Math.round(zoomScale * 100)}%</span>
            <Button variant="outline" size="icon" on:click={handleZoomIn} disabled={zoomScale >= ZOOM_MAX}>
                <ZoomIn class="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" on:click={handleZoomReset} disabled={zoomScale === 1}>
                <RotateCcw class="h-4 w-4" />
            </Button>
        </div>
    {:else if htmlContent}
        <div class="flex items-center justify-center gap-2 p-2 bg-gray-50 border-b text-sm text-gray-500 shrink-0">
            Zoom controlled by presenter · {Math.round(zoomScale * 100)}%
        </div>
    {/if}

<div 
    class="docx-container w-full flex-1 bg-white overflow-y-auto relative"
    bind:this={docxContainer}
    onscroll={handleScroll}
>
    {#if loading}
        <div class="w-full h-full flex items-center justify-center">
            <div class="text-lg">Loading document...</div>
        </div>
    {:else if error}
        <div class="w-full h-full flex items-center justify-center flex-col gap-3">
            <div class="text-lg text-red-600">Error: {error}</div>
            <button 
                class="px-4 py-2 bg-blue-600 text-white rounded"
                onclick={() => loadDocx($currentDocxUrl)}
            >
                Try Again
            </button>
        </div>
    {:else}
        <!-- Always render this element even if empty -->
        <div class="docx-content-wrapper p-8 max-w-4xl mx-auto" bind:this={docxContent}>
            {#if htmlContent}
                <!-- This div is just for Svelte to track the content, actual HTML comes from innerHTML -->
                <div class="docx-content-placeholder"></div>
                {#if !isController}
                    <div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-center py-2 px-4 rounded-full z-10 pointer-events-none">
                        Scrolling controlled by presenter
                    </div>
                {/if}
            {/if}
        </div>
        
     
    {/if}
</div>
</div>

<style>
    .docx-container {
        position: relative;
    }
    
    :global(.docx-content) {
        font-family: 'Calibri', 'Arial', sans-serif;
        line-height: 1.5;
        color: #333;
    }
    
    :global(.docx-content h1) {
        font-size: 1.8rem;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
    }
    
    :global(.docx-content h2) {
        font-size: 1.5rem;
        margin-top: 1.2rem;
        margin-bottom: 0.6rem;
    }
    
    :global(.docx-content p) {
        margin-bottom: 1rem;
    }
    
    :global(.docx-content table) {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1rem;
    }
    
    :global(.docx-content td, .docx-content th) {
        border: 1px solid #ddd;
        padding: 8px;
    }
</style>