<script lang="ts">
    import '../../../../app.css';
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
    
</script>

<main class="min-h-screen overflow-hidden w-full flex flex-col h-screen">
    <div class="w-full flex-grow overflow-y-auto h-full">
        {@render children?.()}
    </div>
</main>