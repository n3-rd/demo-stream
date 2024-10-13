<script lang="ts">
    export let roomUrl: string;
    import { Input } from "$lib/components/ui/input";
	import { ClipboardCopy } from 'lucide-svelte';
    import { copyText } from '$lib/helpers/copyText';
    import { toast } from 'svelte-sonner';
    import { Button } from "$lib/components/ui/button";
    let width = 1100;
    let height = 700;
    let embedCode = 
    `
    <iframe src="${roomUrl}" class="border-none w-full h-full" name="myiFrame" scrolling="yes" frameborder="1" marginheight="0" marginwidth="0" height="${height}px" width="${width}px" allowfullscreen></iframe>
    `
</script>
<div class="bg-white rounded-lg p-4">
<div class="flex flex-col gap-2">
    <Input type="number" bind:value={width} class="form-input block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Width" />
    <Input type="number" bind:value={height} class="form-input block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Height" />
</div>
<textarea class="form-textarea block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" bind:value={embedCode} rows="3"></textarea>
    <Button on:click={() => copyText(embedCode)} class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Copy <ClipboardCopy class="h-5 w-5 ml-2" /></Button>
</div>