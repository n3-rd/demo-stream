<script lang="ts">
    import { dev } from '$app/environment';
    import { createEventDispatcher } from 'svelte';
    import { Button } from '$lib/components/ui/button';

    interface Props {
        syncSource: string;
        isRepLive: boolean;
        isHost: boolean;
        isRepresentative: boolean;
    }

    let {
        syncSource,
        isRepLive,
        isHost,
        isRepresentative
    }: Props = $props();

    const dispatch = createEventDispatcher();
</script>

{#if isHost || isRepresentative}
    <div class="absolute top-1 right-4 z-[32] flex gap-2 bg-black/50 p-2 rounded">
        <Button
            variant={syncSource === 'host' ? 'default' : 'secondary'}
            size="sm"
            on:click={() => dispatch('syncSourceChange', { source: 'host' })}
        >
            Host Ctrl
        </Button>
        <Button
            variant={syncSource === 'representative' ? 'default' : 'secondary'}
            size="sm"
            on:click={() => dispatch('syncSourceChange', { source: 'representative' })}
        >
            Rep Ctrl
        </Button>
        {#if dev}
            <Button
                variant={isRepLive ? 'destructive' : 'secondary'}
                size="sm"
                on:click={() => dispatch('toggleDevLiveMode')}
            >
                {isRepLive ? '⏹ Stop Live' : '🔴 Sim Go Live'}
            </Button>
        {/if}
    </div>
{/if}
