<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { X, ArrowRight } from "lucide-svelte";

    const dispatch = createEventDispatcher();

    interface Props {
        title?: string;
        requirements?: string;
        steps?: string;
        keep?: string;
    }

    let {
        title = $bindable(''),
        requirements = $bindable(''),
        steps = $bindable(''),
        keep = $bindable('')
    }: Props = $props();

    function closeSheet() {
        dispatch("close");
    }

    function sendNotesToEmail() {
        // Handle send to email
        dispatch("send", { title, requirements, steps, keep });
    }
</script>

<div class="flex max-h-[85vh] flex-col rounded-t-2xl bg-[#3f4043]/95 backdrop-blur-sm text-white overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-4">
        <button
            class="flex items-center justify-center text-white hover:opacity-80 transition-opacity"
            type="button"
            aria-label="Close notes"
            onclick={closeSheet}
        >
            <X size={24} class="text-white" />
        </button>
        <h2 class="text-lg font-semibold text-white">Add Notes</h2>
    </div>

    <!-- Content area with scrollable content -->
    <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-4">
        <!-- Title Section -->
        <div class=" bg-bgdefault-light p-4">
            <label for="notes-title" class="block text-white text-sm font-medium mb-3">Title</label>
            <input
                id="notes-title"
                type="text"
                placeholder="Take a note...."
                bind:value={title}
                class="w-full bg-transparent text-white  placeholder:text-[#9CA3AF] focus:outline-none text-sm"
            />
        </div>

        <!-- Requirements Section -->
        <div class=" bg-bgdefault-light p-4">
            <label for="notes-requirements" class="block text-white text-sm font-medium mb-3">Requirements</label>
            <textarea
                id="notes-requirements"
                placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                bind:value={requirements}
                rows="4"
                class="w-full bg-transparent text-white  placeholder:text-[#9CA3AF] focus:outline-none text-sm resize-none leading-relaxed"
            ></textarea>
        </div>

        <!-- Steps on how to Section -->
        <div class=" bg-bgdefault-light p-4">
            <label for="notes-steps" class="block text-white text-sm font-medium mb-3">Steps on how to</label>
            <textarea
                id="notes-steps"
                placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                bind:value={steps}
                rows="4"
                class="w-full bg-transparent text-white  placeholder:text-[#9CA3AF] focus:outline-none text-sm resize-none leading-relaxed"
            ></textarea>
        </div>

        <!-- Keep Section -->
        <div class=" bg-bgdefault-light p-4">
            <label for="notes-keep" class="block text-white text-sm font-medium mb-3">Keep</label>
            <input
                id="notes-keep"
                type="text"
                placeholder="Lorem ipsum dolor sit amet"
                bind:value={keep}
                class="w-full bg-transparent text-white  placeholder:text-[#9CA3AF] focus:outline-none text-sm"
            />
        </div>
    </div>

    <!-- Footer with Send button -->
    <div class="flex justify-end px-4 pb-6">
        <button
            type="button"
            onclick={sendNotesToEmail}
            class="flex items-center gap-1.5 text-white underline decoration-white underline-offset-2 hover:opacity-80 transition-opacity text-sm font-medium"
        >
            <span>Send notes to Email</span>
            <ArrowRight size={16} class="text-white" />
        </button>
    </div>
</div>

