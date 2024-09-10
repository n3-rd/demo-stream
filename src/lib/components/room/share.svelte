<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ClipboardCopy, Mail, MessageCircle } from 'lucide-svelte';
	import { copyText } from '$lib/helpers/copyText';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
    export let joinURL: string;
</script>
<div class="w-[400px] rounded-lg bg-white p-6 shadow-lg">
    <!-- Dialog content styled to match the provided image -->

    <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Invite People</h2>
        <button class="text-gray-400 hover:text-gray-600">✕</button>
    </div>

    <!-- Link Input -->
    <div class="mb-4">
        <label class="mb-2 block text-sm text-gray-700">One time link (unique link)</label>
        <div class="flex items-center rounded-lg bg-gray-100 p-2">
            <input
                type="text"
                value={joinURL}
                class="flex-1 border-none bg-transparent text-gray-700 outline-none"

                disabled
            />
            <Button
                class="ml-2"
                on:click={() => {
                    try {
                        copyText(joinURL);
                        toast.success('Link copied to clipboard');
                    } catch (error) {
                        toast.error('Failed to copy link');
                    }
                }}><ClipboardCopy /></Button
            >
        </div>
    </div>

    <!-- Email/SMS Tabs -->
    <div class="mb-4 flex border-b">
        <button class="flex-1 border-b-2 border-blue-500 py-2 text-center text-gray-700"
            >Email</button
        >
    </div>

    <!-- Email Form -->
    <form class="space-y-4"
    action="?/send-email"
    method="POST"
    use:enhance
    use:enhance={() => {
        return async ({ result }) => {
            if (result.status === 200) {
                // Handle success case
                toast.success("Invite mail sent sucessfully");
                invalidateAll();
            } else {
                // Handle error case
                toast.error("error sending invite mail");
            }
        };
    }}
    >
    <div class="flex flex-col gap-4">
        <input
            type="text"
            name="name"
            placeholder="Full Name"
            class="flex-1 rounded-lg border px-4 py-2"
        />
        <input
            type="email"
            name="receipient"
            placeholder="example@mail.com"
            class="flex-1 rounded-lg border px-4 py-2"
        />
        <input
                type="text"
                value={joinURL}
                name="url"
                class="flex-1 border-none bg-transparent text-gray-700 outline-none hidden"
                
                disabled
            />
    </div>

    <Button class="w-full rounded-lg bg-blue-500 py-2 text-white"
    type="submit"
    >Invite</Button>
</form>
</div>