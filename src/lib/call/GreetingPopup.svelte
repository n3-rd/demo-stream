<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { createEventDispatcher, onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import Shepherd from 'shepherd.js';
  import 'shepherd.js/dist/css/shepherd.css';

  interface Props {
    name: string;
    host: boolean;
  }

  let { name, host }: Props = $props();

  let step = $state(1);
  let tour: any;

  const stepIconSelectors: Record<string, string> = {
    "add-notes": "#add-notes svg, #add-notes i, #add-notes img",
    "virtual-assistant": "#virtual-assistant svg, #virtual-assistant i, #virtual-assistant img",
    "invite-representative": "#invite-representative svg, #invite-representative i, #invite-representative img",
    "schedule-meeting": "#schedule-meeting svg, #schedule-meeting i, #schedule-meeting img",
    "create-quote": "#create-quote svg, #create-quote i, #create-quote img",
    "chat-button": "#chat-button svg, #chat-button i, #chat-button img",
    "participants-button": "#participants-button svg, #participants-button i, #participants-button img",
    "invite-people-button": "#invite-people-button svg, #invite-people-button i, #invite-people-button img"
  };

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

  let isOpen = $state(true);
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
              const header = currentStepElement.querySelector('.shepherd-header');
              const stepId = tour.currentStep?.id;

              if (stepId && header) {
                const iconSelector = stepIconSelectors[stepId];
                if (iconSelector) {
                  const iconSource = document.querySelector(iconSelector);
                  if (iconSource) {
                    let iconWrapper = header.querySelector('.shepherd-step-icon') as HTMLElement | null;
                    if (!iconWrapper) {
                      iconWrapper = document.createElement('div');
                      iconWrapper.className = 'shepherd-step-icon';
                      header.insertBefore(iconWrapper, header.firstChild);
                    }

                    // Clear previous content
                    iconWrapper.innerHTML = '';

                    const clone = iconSource.cloneNode(true) as HTMLElement;
                    if (clone instanceof SVGElement) {
                      clone.setAttribute('width', '36');
                      clone.setAttribute('height', '36');
                    }
                    iconWrapper.appendChild(clone);
                  }
                }
              }
              
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
        // Clean up any existing step elements
        const existingSteps = document.querySelectorAll('.shepherd-element:not(.shepherd-enabled)');
        existingSteps.forEach((step: Element) => {
          step.remove();
        });
      });

      tour.on('complete', () => {
        console.log('Tour completed');
      });

      tour.on('cancel', () => {
        console.log('Tour cancelled');
      });
      
      tour.on('show', () => {
        // Hide all steps except the current one
        const allSteps = document.querySelectorAll('.shepherd-element');
        allSteps.forEach((step: Element) => {
          if (step !== tour.currentStep?.el) {
            (step as HTMLElement).style.display = 'none';
            (step as HTMLElement).style.visibility = 'hidden';
            step.classList.remove('shepherd-enabled');
          }
        });
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
  <Dialog.Content class="absolute max-w-md rounded-3xl border border-[#E4E9F4] bg-white p-8 text-center shadow-[0_25px_45px_rgba(15,33,58,0.12)]">
    {#if step === 1}
    <Dialog.Header class="space-y-3 text-center">
      <Dialog.Title class="text-2xl font-semibold text-[#1F2937]">
        Welcome to the View Room
      </Dialog.Title>
      <Dialog.Description class="space-y-3 text-base text-[#6B7280]">
        {#if host}
          <p class="text-primary">You are the host of this room.</p>
          <p>
            As host you control all video features, invitations including Rep's questions.
            All participants who sign in can take notes.
          </p>
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <Dialog.Footer class="mt-6 flex flex-col gap-3 lg:flex-row items-center">
      <Button class="w-full rounded-xl bg-primary py-3 text-base font-semibold text-white shadow hover:bg-primary/90"
        on:click={() => step = 2}
      >Join Room</Button>
      <Button variant="outline" class=" w-full rounded-xl border border-primary/20 py-3 text-base font-semibold text-primary hover:bg-[#F3F6FC]"
        on:click={() => dispatch("dismissed")}
      >Leave Room</Button>
    </Dialog.Footer>
    {/if}

    {#if step === 2}
      <Dialog.Header class="space-y-3 text-center">
        <Dialog.Title class="text-2xl font-semibold text-primary uppercase tracking-wide">Viewroom Features</Dialog.Title>
      </Dialog.Header>
      <Dialog.Description class="space-y-3 text-base text-[#6B7280]">
        <p class="leading-relaxed">
          Features of ViewRoom will be shown to guide you through the system. Before proceeding, make sure you're ready to explore our tools and instructions.
        </p>
      </Dialog.Description>
      <Dialog.Footer class="mt-6 flex flex-col gap-3 lg:flex-row items-center">
        <Button class="w-full  rounded-xl bg-primary py-3 text-base font-semibold text-white shadow hover:bg-primary/90"
          on:click={startTour}
        >Continue</Button>
        <Button class="w-full  rounded-xl border border-primary/20 bg-[#F3F6FC] py-3 text-base font-semibold text-primary hover:bg-[#E8F0FA]"
          on:click={() => dispatch("dismissed")}
        >Skip</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.shepherd-theme-custom) {
    background-image: url('/img/tutorial-bg.png');
    background-position: center center;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    color: #000000;
    border-radius: 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    background-color: transparent;
    width: 400px;
    min-height: auto;
    padding: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 9999;
  }
  
  :global(.shepherd-element.shepherd-enabled) {
    z-index: 10000;
  }
  :global([data-shepherd-step-id="chat-button"], [data-shepherd-step-id="participants-button"], [data-shepherd-step-id="invite-people-button"]) {
    background-image: url('/img/tutorial-bg-mirror.png')!important;
  }
  :global([data-shepherd-step-id="chat-button"] .shepherd-content, [data-shepherd-step-id="participants-button"] .shepherd-content, [data-shepherd-step-id="invite-people-button"] .shepherd-content) {
   margin: 0;
   padding: 1.5rem 1.5rem 0 1.5rem;
  }

  :global(.shepherd-theme-custom .shepherd-title) {
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 500;
    font-size: 18px!important;
    line-height: 18px;
    color: #000000;
    margin-bottom: 0.5rem;
    text-align: center !important;
    width: 100%;
    display: block;
  }

  :global(.shepherd-theme-custom .shepherd-title h3) {
    font-size: 18px!important;
    line-height: 18px!important;
    text-align: center !important;
  }

  :global(.shepherd-theme-custom .shepherd-text) {
    font-family: 'Poppins', sans-serif;
    font-style: normal;
    font-weight: 300;
    line-height: 24px;
    color: #000000;
    font-size: 15px;
    margin: 0 auto;
  }

  /* mobile */

  @media (max-width: 640px) {
    :global(.shepherd-theme-custom .shepherd-text) {
      font-size: 15px!important;
    }
  }

  :global(.shepherd-theme-custom .shepherd-footer) {
    padding-top: 0.5rem;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    padding-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
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
    padding: 1.5rem 1.5rem 0 1.5rem;
    margin: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
    box-sizing: border-box;
  }
  
  :global(.shepherd-theme-custom .shepherd-text p) {
    margin: 0;
  }
  
  :global(.shepherd-theme-custom .shepherd-header) {
    width: 100%;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 0.5rem;
  }
  
  :global(.shepherd-theme-custom .shepherd-element) {
    width: 400px !important;
    min-height: auto;
    max-width: 400px;
  }
  

  :global(.shepherd-has-title .shepherd-content .shepherd-header) {
    background: transparent;
    padding: 0;
    margin: 0;
  }
  
  :global(.shepherd-has-title .shepherd-content) {
    padding-top: 1.5rem;
  }

  :global(.shepherd-element.shepherd-enabled) {
    opacity: 1 !important;
    visibility: visible !important;
    display: block !important;
  }
  
  :global(.shepherd-element:not(.shepherd-enabled)) {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  
  /* Ensure only the active step is visible */
  :global(.shepherd-tour-element:not(.shepherd-enabled)) {
    display: none !important;
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

  :global(.shepherd-step-icon) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 44px;
    border-radius: 12px;
    color: #000;
    margin: 0 auto;
  }

  :global(.shepherd-step-icon img) {
    filter: invert(1)!important;
    height:30px!important;
    width:30px!important;
  }

  @media (max-width: 640px) {
    :global(.shepherd-theme-custom) {
    margin: 0 auto;
      background-image: none;
      background-color: #ffffff;
      border-radius: 18px;
      padding: 1.5rem;
      width: calc(100vw - 1rem);
      margin-top: 18rem;
      max-width: 100%;
      box-shadow: 0 20px 40px rgba(15, 33, 58, 0.12);
    }

    :global(.shepherd-step-icon img) {
      height: 49px!important;
      width: 49px!important;
    }

    :global([data-shepherd-step-id="chat-button"], [data-shepherd-step-id="participants-button"], [data-shepherd-step-id="invite-people-button"]) {
      background-image: none !important;
    }

    :global(.shepherd-theme-custom .shepherd-content) {
      margin-left: 0;
      padding: 0;
    }

    :global(.shepherd-theme-custom .shepherd-header) {
      margin-left: 0;
      padding: 0;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    :global(.shepherd-step-icon) {
      margin-right: 0;
      margin-bottom: 0.5rem;
    }
  }
</style>
