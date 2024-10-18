<!-- src/lib/components/NameInputModal.svelte -->
<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { createEventDispatcher } from 'svelte';

  export let open = true;
  let name = '';
  const dispatch = createEventDispatcher();

  function handleSubmit() {
    if (name.trim()) {
      dispatch('nameSubmitted', name.trim());
    }
  }
</script>

<Dialog.Root bind:open closeOnOutsideClick={false} closeOnEscape={false}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Enter Your Name</Dialog.Title>
      <Dialog.Description>
        Please enter your name to join the room.
      </Dialog.Description>
    </Dialog.Header>
    <form on:submit|preventDefault={handleSubmit}>
      <Input 
        type="text" 
        placeholder="Your name" 
        bind:value={name} 
        required
      />
      <Dialog.Footer>
        <Button type="submit">Join Room</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
