<script lang="ts">
    import { onMount, createEventDispatcher, tick } from 'svelte';
    import * as mammoth from 'mammoth';
    import { currentDocxUrl, docxScrollPosition } from '$lib/callStores';
    import { sendMessage } from '$lib/helpers/sendMessage';

    export let roomName: string;
    export let isController: boolean;

    const dispatch = createEventDispatcher();
    let docxContainer: HTMLDivElement;
    let docxContent: HTMLDivElement;
    let loading = false;
    let error = '';
    let lastScrollUpdate = 0;
    let loadedDocUrl = '';
    let htmlContent = '';
    let isAtBottom = false;
    let previousScrollTop = 0;
    
    // Watch for changes in the docx URL
    $: if ($currentDocxUrl && $currentDocxUrl !== loadedDocUrl) {
        console.log('DOCX URL changed, loading:', $currentDocxUrl);
        loadDocx($currentDocxUrl);
    }

    // Watch for scroll position changes from other users
    $: if (!isScrolling && docxContainer && $docxScrollPosition !== undefined && !isController) {
        updateScrollPosition($docxScrollPosition);
    }

    // Watch for controller status changes
    $: if (docxContainer) {
        if (isController) {
            docxContainer.style.overflowY = 'auto';
            docxContainer.style.cursor = 'default';
        } else {
            // Make it clear visually that user can't scroll
            docxContainer.style.overflowY = 'auto';
            docxContainer.style.cursor = 'not-allowed';
        }
    }

    let isScrolling = false;
    let scrollTimeoutId: ReturnType<typeof setTimeout>;
    let scrollDebounceId: ReturnType<typeof setTimeout>;

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
            
            // Fetch the docx file
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
            }
            
            console.log('DOCX file fetched successfully, converting...');
            const arrayBuffer = await response.arrayBuffer();
            
            // Convert to HTML using mammoth
            const result = await mammoth.convertToHtml({ arrayBuffer });
            console.log('Mammoth conversion result:', result);
            
            if (!result.value) {
                throw new Error('Mammoth conversion returned empty content');
            }
            
            // Store the HTML content in a variable instead of directly setting innerHTML
            htmlContent = result.value;
            console.log('DOCX content length:', htmlContent.length);
            
            // Log any warnings
            if (result.messages && result.messages.length > 0) {
                console.warn('Mammoth conversion warnings:', result.messages);
            }
            
            // Wait for the next tick to ensure docxContent is available
            await tick();
            
            // Set innerHTML only if docxContent exists
            if (docxContent) {
                docxContent.innerHTML = htmlContent;
                // Add custom styling for better readability
                docxContent.classList.add('docx-content');
            } else {
                console.error('docxContent element is not available');
            }
            
            loadedDocUrl = url;
            
            // Reset scroll position after content is loaded
            await tick(); // Wait another tick for DOM updates
            if (docxContainer) {
                docxContainer.scrollTop = 0;
                previousScrollTop = 0;
                docxScrollPosition.set(0);
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
</script>

<div 
    class="docx-container w-full h-full bg-white overflow-y-auto relative"
    bind:this={docxContainer}
    on:scroll={handleScroll}
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
                on:click={() => loadDocx($currentDocxUrl)}
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

<style>
    .docx-container {
        position: absolute;
        inset: 0;
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
    
    /* Add this to prevent direct user interaction when not controller */
    .docx-container.viewer-only {
        pointer-events: none;
    }
</style>