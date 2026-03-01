<script lang="ts">
    import { run, preventDefault } from 'svelte/legacy';

    import { SendHorizontal, X } from "lucide-svelte";
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Sheet from "$lib/components/ui/sheet";
    import { useForm, HintGroup, Hint, validators, email, required } from 'svelte-use-form';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import { toast } from 'svelte-sonner';

    interface Props {
        visible?: boolean;
    }

    let { visible = false }: Props = $props();
    let open = $state(false);
    let title = $state('');
    let requirements = $state('');
    let steps = $state('');
    let keep = $state('');
    let formEmail = $state('');
    let loading = $state(false);

    const form = useForm();

    run(() => {
        console.log('Form:', $form.valid);
    
    });

    function resetForm() {
        title = '';
        requirements = '';
        steps = '';
        keep = '';
        formEmail = '';
    }

    async function sendEmail() {
        if (!$form.valid) {
            toast.error('Please fill in the recipient email, title, and at least one of the required fields.');
            console.log('Form is not valid');
            return;
        }

        if (!requirements && !steps && !keep) {
            toast.error('Please fill in at least one note section (Requirements, Steps, or Keep).');
            loading = false;
            return;
        }

        loading = true;
        try {
            const response = await fetch('/api/send-note-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    requirements,
                    steps,
                    keep,
                    recipient: formEmail
                })
            });

            if (response.ok) {
                toast.success('Email sent successfully');
                resetForm();
                open = false;
            } else {
                toast.error('Failed to send email');
            }
        } catch (error) {
            toast.error('Error sending email');
            console.error('Error sending email:', error);
        } finally {
            loading = false;
        }
    }
</script>

<Sheet.Root bind:open={open}>
    <Sheet.Trigger>
        <Button variant="ghost" size="icon" class="w-full" id="add-notes">
            <img src="/icons/new-icons/notes.png" alt="notes" class="bottom-bar-icon"/>
        </Button>
    </Sheet.Trigger>
    <Sheet.Content
        side="bottom"
        class="bg-[#3f3f46] text-white rounded-t-3xl p-0 max-h-[85vh] overflow-hidden shadow-2xl lg:max-w-[520px]"
    >
        <div class="flex h-full flex-col">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <Sheet.Close
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                    aria-label="Close notes"
                >
                    <X size={18} />
                </Sheet.Close>
                <h2 class="text-lg font-semibold">Add Notes</h2>
                <div class="w-9" aria-hidden="true"></div>
            </div>

            <form
                use:form
                class="flex-1 overflow-y-auto px-5 pb-6 pt-4 space-y-4"
                onsubmit={preventDefault(sendEmail)}
            >
                <div class="rounded-2xl border border-white/10 bg-[#4a4a52] p-4 shadow-sm space-y-2">
                    <label class="text-sm font-semibold" for="title">Title</label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        placeholder="Take a note..."
                        class="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                        bind:value={title}
                        use:validators={[required]}
                    />
                    <HintGroup for="title">
                        <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                            <Hint on="required"><HintValidate>Title is required</HintValidate></Hint>
                        </div>
                    </HintGroup>
                </div>

                <div class="rounded-2xl border border-white/10 bg-[#4a4a52] p-4 shadow-sm space-y-2">
                    <label class="text-sm font-semibold" for="requirements">Requirements</label>
                    <textarea
                        id="requirements"
                        placeholder="Take a note..."
                        class="h-24 w-full resize-none bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                        bind:value={requirements}
                    ></textarea>
                </div>

                <div class="rounded-2xl border border-white/10 bg-[#4a4a52] p-4 shadow-sm space-y-2">
                    <label class="text-sm font-semibold" for="steps">Steps on how to</label>
                    <textarea
                        id="steps"
                        placeholder="Take a note..."
                        class="h-24 w-full resize-none bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                        bind:value={steps}
                    ></textarea>
                </div>

                <div class="rounded-2xl border border-white/10 bg-[#4a4a52] p-4 shadow-sm space-y-2">
                    <label class="text-sm font-semibold" for="keep">Keep</label>
                    <textarea
                        id="keep"
                        placeholder="Take a note..."
                        class="h-20 w-full resize-none bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                        bind:value={keep}
                    ></textarea>
                </div>

                <div class="rounded-2xl border border-white/10 bg-[#4a4a52] p-4 shadow-sm space-y-2">
                    <label class="text-sm font-semibold" for="email">Recipient email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="name@email.com"
                        class="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
                        bind:value={formEmail}
                        use:validators={[required, email]}
                    />
                    <HintGroup for="email">
                        <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                            <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                            <Hint on="email"><HintValidate>Email is not valid</HintValidate></Hint>
                        </div>
                    </HintGroup>
                </div>

                <div class="flex justify-end pt-2">
                    <button
                        type="submit"
                        class="flex items-center gap-2 text-sm font-semibold underline underline-offset-4 decoration-white/60 disabled:text-white/40"
                        disabled={!$form.valid || loading}
                    >
                        {#if loading}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A8.001 8.001 0 014.708 4.708L2.293 7.121l1.414 1.414 2.415-2.415zm12.586-2.415l2.415 2.415 1.414-1.414-2.415-2.415-2.415 2.415zM20 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z"></path>
                            </svg>
                            Sending...
                        {:else}
                            Send notes to Email
                            <SendHorizontal class="h-4 w-4" />
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </Sheet.Content>
</Sheet.Root>

<style>
    /* Tailwind CSS styles are already being used */
</style>