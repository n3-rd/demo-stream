<script lang="ts">
    import { NotebookPen, SendHorizontal, X } from "lucide-svelte";
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Sheet from "$lib/components/ui/sheet";
    import { useForm, HintGroup, Hint, validators, email, required } from 'svelte-use-form';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import { toast } from 'svelte-sonner';
    import Label from "../ui/label/label.svelte";

    export let visible: boolean = false;
    let title = '';
    let requirements = '';
    let steps = '';
    let keep = '';
    let formEmail = '';
    let loading = false;

    const form = useForm();

    $:{
        console.log('Form:', $form.valid);
    
    }


    async function sendEmail() {
        if (!$form.valid) {
            toast.error('Please fill in the recipient email, title, and at least one of the required fields.');
            console.log('Form is not valid');
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

<Sheet.Root>
    <Sheet.Trigger>
        <Button variant="ghost" size="icon" class="w-full">
            <img src="/icons/icon-notes.svg" alt="quote" class="w-5 h-5"/>
        </Button>
    </Sheet.Trigger>

    <Sheet.Content>
        <Sheet.Header>
            <Sheet.Title>Send notes to email</Sheet.Title>
            <Sheet.Description>
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </Sheet.Description>
        </Sheet.Header>
        <form use:form class="space-y-6">
            <!-- Email Input -->
            <div class="mb-4">
                <Label for="email">Email</Label>
                <input type="email" id="email" placeholder="Email" class="w-full p-2 mb-2 border border-gray-300 rounded placeholder-gray-400" bind:value={formEmail} use:validators={[required, email]} />
                <HintGroup for="email">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                        <Hint on="email"><HintValidate>Email is not valid</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <!-- Title Input -->
            <div>
                <Label for="title">Title</Label>
                <input type="text" id="title" placeholder="Title" name="title" class="w-full p-2 mb-2 border border-gray-300 rounded   placeholder-gray-400" bind:value={title} use:validators={[required]} />
                <HintGroup for="title">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Title is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <!-- Requirements Section -->
            <div>
                <Label for="requirements">Requirements</Label>
                <textarea id="requirements" placeholder="Take a note..." name="requirements" class="w-full p-2 border border-gray-300 rounded   placeholder-gray-400" bind:value={requirements}></textarea>
            </div>

            <!-- Steps Section -->
            <div>
                <Label for="steps">Steps on how to</Label>
                <textarea id="steps" placeholder="Take a note..." name="steps" class="w-full p-2 border border-gray-300 rounded   placeholder-gray-400" bind:value={steps}></textarea>
            </div>

            <!-- Keep Section -->
            <div>
                <Label for="keep">Keep</Label>
                <textarea id="keep" placeholder="Take a note..." name="keep" class="w-full p-2 border border-gray-300 rounded   placeholder-gray-400" bind:value={keep}></textarea>
            </div>

            <!-- Send Notes Button -->
            <Sheet.Footer>
                <button class="hover:underline bg-primary px-4 py-2 text-white ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                on:click|preventDefault={sendEmail} disabled={!$form.valid || loading}>
                    {#if loading}
                        <svg xmlns="http://www.w3.org/2000/svg" class="mr-3 h-5 w-5 animate-spin" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A8.001 8.001 0 014.708 4.708L2.293 7.121l1.414 1.414 2.415-2.415zm12.586-2.415l2.415 2.415 1.414-1.414-2.415-2.415-2.415 2.415zM20 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z"></path>
                        </svg>
                        <span>Sending...</span>
                    {:else}
                        <span>Send</span>
                    {/if}
                    <SendHorizontal class="w-4 h-4 ml-1" />
                </button>
            </Sheet.Footer>
        </form>
    </Sheet.Content>
</Sheet.Root>

<style>
    /* Tailwind CSS styles are already being used */
</style>