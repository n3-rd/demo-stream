<script>
    export let localVideoStream;

    function srcObject(node, stream) {
        node.srcObject = stream;
        return {
            update(newStream) {
                if (node.srcObject !== newStream) {
                    node.srcObject = newStream;
                }
            }
        };
    }
</script>

{#if localVideoStream}
    <div class="global-video-container h-full w-full">
        <video 
            autoplay 
            class="w-full h-full object-contain"
            use:srcObject={localVideoStream}
        >
            <track kind="captions" />
        </video>
    </div>
{/if}

<style>
    .global-video-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: black;
    }
    video {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
</style>