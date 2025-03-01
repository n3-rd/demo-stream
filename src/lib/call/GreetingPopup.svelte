<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { createEventDispatcher, onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import Tourguide from "tourguidejs";

  export let name: string;
  export let host: boolean;

  let step = 1;


  let tourSteps = [
    {
      selector: "#add-notes",
      step: 1,
      title: "Add Notes",
      content: "Easily jot down ideas, insights, or follow-up actions directly within the demo room. Our note-taking feature keeps you organized and fully engaged throughout the presentation, ensuring nothing gets missed.",
    },
    {
      selector: "#virtual-assistant",
      step: 2,
      title: "Ask the Virtual Assistant",
      content: "Have a question or need clarification during the presentation? Simply type your question into the chat box, and our AI assistant will be able to address it promptly.",
    },
    {
      selector: "#invite-representative",
      step: 3,
      title: "Speak to Representative",
      content: "Connect with a knowledgeable expert who can provide personalized assistance and answer all your questions. Choose the representative that fits your needs for tailored support and guidance directly within the demo room",
    }
    
  ]

  let tour = new Tourguide({
    steps: tourSteps
  });

  let isOpen = true;
  const dispatch = createEventDispatcher();

  function handleOpenChange(open: boolean) {
    isOpen = open;
    if (!open) {
      dispatch("dismissed");
    }
  }

  onMount(() => {
    isOpen = true;
  });
</script>

<Dialog.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
  <Dialog.Content class="border-none">
    {#if step === 1}
    <Dialog.Header>
      <Dialog.Title class="text-2xl">
        Welcome to the <span class="text-primary">VIEW ROOM</span>
      </Dialog.Title>
      <Dialog.Description class="text-lg">
        {#if host}
          <p class="text-[#0997FD]">You are the host of this room.</p>
          <p>
            As host, you control all video features, invitations including Rep’s,
            and ask questions. All participants who sign in can take notes.
          </p>
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <Dialog.Footer>
      <Button class="w-full bg-[#E8F0FA] text-primary py-3 hover:bg-[#E8F0FA]"
        on:click={() => step = 2}
      >Get Started</Button>
    </Dialog.Footer>
    {/if}

    {#if step === 2}
      <Dialog.Header>
        <Dialog.Title class="text-2xl text-primary">VIEWROOM FEATURES</Dialog.Title>
      </Dialog.Header>
      <Dialog.Description class="text-lg">
        <p>
          Features of ViewRoom will be shown to guide you through the system. Before proceeding, make sure you're ready to explore our tools and instructions.
        </p>
      </Dialog.Description>
      <Dialog.Footer class="flex justify-between min-w-full">
        <Button class="w-[146px] bg-[#E8F0FA] text-primary py-3 hover:bg-[#E8F0FA]"
          on:click={() => {
            tour.start();
            dispatch("dismissed");
          }}
        >Continue</Button>
        <Button class="w-[146px] bg-[#E8F0FA] text-primary py-3 hover:bg-[#E8F0FA]"
          on:click={() => dispatch("dismissed")}
        >Skip</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>