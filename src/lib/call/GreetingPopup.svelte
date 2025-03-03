<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { createEventDispatcher, onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import Tourguide from "tourguidejs";

  export let name: string;
  export let host: boolean;

  let step = 1;
  let tour: any;

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
    },
    {
      selector: "#schedule-meeting",
      step: 4,
      title: "Book an Appointment",
      content: "Ready to dive deeper into your project or explore our products further? Use our 'Book an Appointment' feature to easily schedule a meeting with our team for personalized consultations and detailed discussions at your convenience.",
    },
    {
      selector: "#create-quote",
      step: 5,
      title: "Request a Quote",
      content: "Need pricing information or a customized quote? Our 'Request a Quote' feature allows you to seamlessly inquire about pricing details or request a personalized quote tailored to your specific needs.",
    },
    {
      selector: "#chat-button",
      step: 6,
      title: "Chat Box",
      content: "Use this chat box to communicate with other participants inside the demo room. Share your thoughts, ask questions, or engage in discussions with everyone during the live demo.",
    },
    {
      selector: "#participants-button",
      step: 7,
      title: "Participants",
      content: "Click on the 'Participants' button to view a list of everyone currently in the demo room. You can also use this feature to invite others to join the session.",
    },
    {
      selector: "#invite-people-button",
      step: 8,
      title: "Invite People",
      content: "Invite people to the demo room via email, SMS, or by copying and sharing the link. Choose your preferred method to ensure everyone can easily join the session.",
    },
  ]

  let isOpen = true;
  const dispatch = createEventDispatcher();

  function handleOpenChange(open: boolean) {
    isOpen = open;
    if (!open) {
      dispatch("dismissed");
    }
  }

  function initializeTour() {
    try {
      tour = new Tourguide({
        steps: tourSteps,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        padding: 8,
        transition: true,
        tooltipClass: 'custom-tooltip',
        keyboardNavigation: true,
        onStart: () => {
          console.log('Tour started');
        },
        onStop: () => {
          console.log('Tour stopped');
        },
        onComplete: () => {
          console.log('Tour completed');
        },
        onError: (error) => {
          console.error('Tour error:', error);
        }
      });
      console.log('Tour initialized successfully');
    } catch (error) {
      console.error('Error initializing tour:', error);
    }
  }

  function startTour() {
    try {
      if (!tour) {
        console.log('Initializing tour before start');
        initializeTour();
      }
      console.log('Starting tour');
      tour.start();
      dispatch("dismissed");
    } catch (error) {
      console.error('Error starting tour:', error);
    }
  }

  onMount(() => {
    isOpen = true;
    console.log('Initializing tour on mount');
    initializeTour();
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
            As host, you control all video features, invitations including Rep's,
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
          on:click={startTour}
        >Continue</Button>
        <Button class="w-[146px] bg-[#E8F0FA] text-primary py-3 hover:bg-[#E8F0FA]"
          on:click={() => dispatch("dismissed")}
        >Skip</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.custom-tooltip) {
    background-color: white;
    color: #333;
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    max-width: 300px;
  }

  :global(.custom-tooltip .tour-title) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  :global(.custom-tooltip .tour-content) {
    font-size: 1rem;
    line-height: 1.5;
  }

  :global(.tourguide-overlay) {
    background-color: rgba(0, 0, 0, 0.7);
  }
</style>