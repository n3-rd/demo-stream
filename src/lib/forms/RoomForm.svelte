<script lang="ts">
  import { dailyErrorMessage, username } from '../../store.js';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { PUBLIC_DAILY_DOMAIN } from '$env/static/public';
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";

  let dailyUrl = '';

  onMount(() => {
    const storedUrl = localStorage?.getItem('DAILY_SVELTE_URL');
    if (storedUrl) {
      dailyUrl = storedUrl;
    }
  });

  async function submitForm() {
    if (dailyUrl) {
      localStorage?.setItem('DAILY_SVELTE_URL', dailyUrl);
      const roomName = dailyUrl.split('/').at(-1);
      goto(`/room/${roomName}`);
      return;
    }

    const submit = await fetch('/api/room', {
      method: 'POST'
    });
    const data = await submit.json();
    const DOMAIN = PUBLIC_DAILY_DOMAIN;

    if (data.success && data?.room?.name) {
      localStorage?.setItem('DAILY_SVELTE_URL', `https://${DOMAIN}.daily.co/${data.room.name}`);
      goto(`/room/${data.room.name}`);
      dailyErrorMessage.set('');
    } else if (data.status === '400') {
      dailyErrorMessage.set('bad request');
    } else if (data.status === '500') {
      dailyErrorMessage.set('server error :|');
    } else {
      dailyErrorMessage.set('Oops, something went wrong!');
    }
  }
</script>




<Card.Root class="w-full max-w-sm">
  <Card.Header>
    <Card.Title class="text-2xl">Join or Create Room</Card.Title>
    <Card.Description>Enter a Daily URL to join a call or create a new room.</Card.Description>
  </Card.Header>
  <Card.Content class="grid gap-4">
    <div class="grid gap-2">
      <Label for="url">Meeting URL (leave empty to create a new room)</Label>
      <Input id="url" type="text" bind:value={dailyUrl} />
    </div>
  </Card.Content>
  <Card.Footer>
    <Button class="w-full" on:click={submitForm}>{!dailyUrl ? 'Create room' : 'Join call'}</Button>
  </Card.Footer>
</Card.Root>

{#if $dailyErrorMessage}
  <p class="error-message">{$dailyErrorMessage}</p>
{/if}

<style>
  .error-message {
    color: var(--red);
    font-weight: 600;
    font-size: 12px;
  }
</style>
