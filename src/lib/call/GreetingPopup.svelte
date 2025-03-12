<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { createEventDispatcher, onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import Shepherd from 'shepherd.js';
  import 'shepherd.js/dist/css/shepherd.css';

  export let name: string;
  export let host: boolean;

  let step = 1;
  let tour: any;

  let tourSteps = [
    {
      id: "add-notes",
      attachTo: { element: "#add-notes", on: "right-start" },
      title: "Add Notes",
      text: "Easily jot down ideas, insights, or follow-up actions directly within the demo room. Our note-taking feature keeps you organized and fully engaged throughout the presentation, ensuring nothing gets missed.",
      buttons: [
        {
          text: "Next",
          action: () => tour.next()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    },
    {
      id: "virtual-assistant",
      attachTo: { element: "#virtual-assistant", on: "right-start" },
      title: "Ask the Virtual Assistant",
      text: "Have a question or need clarification during the presentation? Simply type your question into the chat box, and our AI assistant will be able to address it promptly.",
      buttons: [
        {
          text: "Next",
          action: () => tour.next()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    },
    {
      id: "invite-representative",
      attachTo: { element: "#invite-representative", on: "right-start" },
      title: "Speak to Representative",
      text: "Connect with a knowledgeable expert who can provide personalized assistance and answer all your questions. Choose the representative that fits your needs for tailored support and guidance directly within the demo room",
      buttons: [
        {
          text: "Next",
          action: () => tour.next()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    },
    {
      id: "schedule-meeting",
      attachTo: { element: "#schedule-meeting", on: "right-start" },
      title: "Book an Appointment",
      text: "Ready to dive deeper into your project or explore our products further? Use our 'Book an Appointment' feature to easily schedule a meeting with our team for personalized consultations and detailed discussions at your convenience.",
      buttons: [
        {
          text: "Next",
          action: () => tour.next()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    },
    {
      id: "create-quote",
      attachTo: { element: "#create-quote", on: "right-start" },
      title: "Request a Quote",
      text: "Need pricing information or a customized quote? Our 'Request a Quote' feature allows you to seamlessly inquire about pricing details or request a personalized quote tailored to your specific needs.",
      buttons: [
        {
          text: "Next",
          action: () => tour.next()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    },
    {
      id: "chat-button",
      attachTo: { element: "#chat-button", on: "left-start" },
      title: "Chat Box",
      text: "Use this chat box to communicate with other participants inside the demo room. Share your thoughts, ask questions, or engage in discussions with everyone during the live demo.",
      buttons: [
        {
          text: "Next",
          action: () => tour.next()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    },
    {
      id: "participants-button",
      attachTo: { element: "#participants-button", on: "left-start" },
      title: "Participants",
      text: "Click on the 'Participants' button to view a list of everyone currently in the demo room. You can also use this feature to invite others to join the session.",
      buttons: [
        {
          text: "Next",
          action: () => tour.next()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    },
    {
      id: "invite-people-button",
      attachTo: { element: "#invite-people-button", on: "left-start" },
      title: "Invite People",
      text: "Invite people to the demo room via email, SMS, or by copying and sharing the link. Choose your preferred method to ensure everyone can easily join the session.",
      buttons: [
        {
          text: "Done",
          action: () => tour.complete()
        }
      ],
      arrow: true,
      classes: 'shepherd-theme-custom'
    }
  ];

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
      tour = new Shepherd.Tour({
        defaultStepOptions: {
          cancelIcon: {
            enabled: false
          },
          classes: 'shepherd-theme-custom',
          scrollTo: { behavior: 'smooth', block: 'center' },
          arrow: true,
          when: {
            show() {
              const currentStepElement = tour.currentStep.el;
              const footer = currentStepElement.querySelector('.shepherd-footer');
              
              // Remove any existing progress indicators
              const existingProgress = currentStepElement.querySelector('.shepherd-progress-counter');
              if (existingProgress) {
                existingProgress.remove();
              }
              
              // Create simple counter
              const counter = document.createElement('div');
              counter.className = 'shepherd-progress-counter';
              counter.textContent = `${tour.steps.indexOf(tour.currentStep) + 1}/${tour.steps.length}`;
              
              // Insert before the first button
              if (footer) {
                footer.insertBefore(counter, footer.firstChild);
              }
            }
          }
        },
        useModalOverlay: true,
        exitOnEsc: false
      });

      // Add steps to the tour
      tourSteps.forEach(step => {
        tour.addStep(step);
      });

      // Setup event listeners
      tour.on('start', () => {
        console.log('Tour started');
      });

      tour.on('complete', () => {
        console.log('Tour completed');
      });

      tour.on('cancel', () => {
        console.log('Tour cancelled');
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
  :global(.shepherd-theme-custom) {
    background-image: url('/img/tutorial-bg.png');
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    color: #000000;
    border-radius: 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    background-color: transparent;
    width: 800px;
    padding: 1rem;
    position: relative;
  }
  :global([data-shepherd-step-id="chat-button"], [data-shepherd-step-id="participants-button"], [data-shepherd-step-id="invite-people-button"]) {
    background-image: url('/img/tutorial-bg-mirror.png')!important;
  }
  :global([data-shepherd-step-id="chat-button"] .shepherd-content, [data-shepherd-step-id="participants-button"] .shepherd-content, [data-shepherd-step-id="invite-people-button"] .shepherd-content) {
   margin-right: 1rem;
   margin-left: 0!important;
  }

  :global(.shepherd-theme-custom .shepherd-title) {
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 500;
    font-size: 12px;
    line-height: 18px;
    color: #000000;
    margin-bottom: 0.5rem;
    
  }

  :global(.shepherd-theme-custom .shepherd-text) {
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 300;
    line-height: 18px;
    color: #000000;
    font-size: 11px;
    margin: 0 auto;
  }

  :global(.shepherd-theme-custom .shepherd-footer) {
    padding-top: 0.5rem;
    padding-left: 0;
    padding-right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin: 0 auto;
  }

  :global(.shepherd-theme-custom .shepherd-button) {
    background: transparent;
    color: #577AB7;
    border: none;
    font-family: 'Poppins', sans-serif;
    font-size: 12px;
    font-weight: 500;
    padding: 0;
    margin-left: 1rem;
    cursor: pointer;
  }

  :global(.shepherd-theme-custom .shepherd-button-secondary) {
    color: #577AB7;
  }

  :global(.shepherd-theme-custom .shepherd-button:hover) {
    background: transparent;
    color: #577AB7;
  }
  
  :global(.shepherd-theme-custom .shepherd-content) {
    width: 100%;
    padding: 1rem;
    padding-bottom: 0;
    margin-left: 1rem;
  }
  
  :global(.shepherd-theme-custom .shepherd-text p) {
    margin: 0;
  }
  
  :global(.shepherd-theme-custom .shepherd-header) {
    width: 100%;
    padding: 1rem;
    margin-left: 0.5rem;
  }
  
  :global(.shepherd-theme-custom .shepherd-element) {
    width: 400px;
    height: auto;
  }
  

  :global(.shepherd-has-title .shepherd-content .shepherd-header) {
    background: transparent;
    padding: 0;
  }

  :global(.shepherd-enabled.shepherd-element) {
    opacity: 1;
  }

  :global(.shepherd-element[data-popper-placement^="bottom"] .shepherd-arrow) {
    top: -8px;
    display: none;
  }

  :global(.shepherd-footer .step-counter) {
    font-family: 'Poppins', sans-serif;
    font-size: 11px;
    color: #666666;
  }

   :global(.shepherd-arrow) {
    top: 6px!important;
    display: none;
  }

  :global(.shepherd-progress-counter) {
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    color: #577AB7;
    margin-right: auto;
    font-weight: 500;
    padding-left: 10px;
    display: flex;
    align-items: center;
  }

  :global(.shepherd-progress-bar) {
    position: relative;
    left: 0%;
    font-size: 14px;
    border-radius: 9px;
    height: 18px;
    width: 100%;
    max-width: 180px;
    padding: 3px;
    background: #e6e6e6;
    margin-right: auto;
  }
  
  :global(.shepherd-progress-bar span) {
    display: block;
    background: #0997FD;
    width: 50%;
    height: 100%;
    border-radius: 9px;
  }
  
  :global(.shepherd-progress-text) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #000;
    font-size: 10px;
    font-weight: 500;
  }
</style>