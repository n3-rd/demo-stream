<script lang="ts">
    export let videoId: string;
    import { Input } from "$lib/components/ui/input";
	import { ClipboardCopy } from 'lucide-svelte';
    import { copyText } from '$lib/helpers/copyText';
    import { toast } from 'svelte-sonner';
    import { Button } from "$lib/components/ui/button";
    import { page} from '$app/stores';
    let width = 1100;
    let height = 700;
    
    $: embedCode = `<iframe src="${$page.url.origin}/embed?videoId=${videoId}" style="border: none; width: ${width}px; height: ${height}px;" allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; clipboard-read"></iframe>`;
    
    // $: scriptEmbedCode = `<script src="${window.location.origin}/embed.js" data-room-url="${roomUrl}" data-width="${width}" data-height="${height}"><\/script>`;
    
    function copyEmbedCode() {
        copyText(embedCode);
        toast.success('Embed code copied to clipboard');
    }

    // let scriptEmbedCode = `<script src="${window.location.origin}/embed.js" data-room-url="${roomUrl}" data-width="${width}" data-height="${height}"><\/script>`;
</script>

<div class="bg-white rounded-lg p-4">
    <div class="flex flex-col gap-2">
        <Input type="number" bind:value={width} placeholder="Width" />
        <Input type="number" bind:value={height} placeholder="Height" />
    </div>
    <textarea class="w-full mt-2 p-2 border rounded" rows="3" readonly>{embedCode}</textarea>
    <Button on:click={copyEmbedCode} class="mt-2">
        Copy Embed Code <ClipboardCopy class="h-5 w-5 ml-2" />
    </Button>
    
    <!-- <h3 class="mt-4 font-bold">Alternative Embed Method</h3>
    <p class="mt-2">You can also use this script tag for a more flexible embed:</p>
    <textarea class="w-full mt-2 p-2 border rounded" rows="3" readonly>{scriptEmbedCode}</textarea>
    <Button on:click={() => copyText(scriptEmbedCode)} class="mt-2">
        Copy Script Embed Code <ClipboardCopy class="h-5 w-5 ml-2" />
    </Button> -->
</div>
