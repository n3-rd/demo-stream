<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ClipboardCopy, Mail, MessageCircle } from 'lucide-svelte';
	import { copyText } from '$lib/helpers/copyText';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
    export let shareURL: string;
    export let representative: boolean;
    export let representativeId: string = '';
    import { page } from '$app/stores';

    // Add this at the top of your script section
    let emailSent = false;

    // More robust uid extraction function
    function extractUid(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.get('uid') || '';
        } catch (error) {
            console.error('Invalid URL format:', url, error);
            return '';
        }
    }

    // Extract uid from URL if present - this should handle complex URLs better
    $: currentUid = extractUid(shareURL);
    
    // Add debugging
    $: console.log('Share component URL info:', { 
        shareURL, 
        currentUid,
        hasUid: !!currentUid,
        urlParts: shareURL.split('?')
    });
    
    // Function to clean URL but preserve uid parameter
    function cleanUrlPreserveUid(url: string) {
        try {
            // First create a URL object
            const urlObj = new URL(url);
            const params = urlObj.searchParams;
            
            // Get uid if it exists
            const uid = params.get('uid');
            
            // Clear all query parameters we don't want
            params.delete('anonymousUserId');
            params.delete('representativeId');
            params.delete('representativeName');
            params.delete('isHost');
            params.delete('anonymous');
            
            // Keep only the uid parameter if it exists
            if (uid) {
                // Clear all params and re-add only uid
                urlObj.search = `?uid=${uid}`;
            } else {
                urlObj.search = '';
            }
            
            return urlObj.toString();
        } catch (error) {
            console.error('Error in cleanUrlPreserveUid:', error);
            return url; // Return original URL if there's an error
        }
    }
</script>

<div class="w-full rounded-lg p-6">
    <!-- Dialog content styled to match the provided image -->

    <div class="mb-4 flex items-center justify-between text-[#464646]">
        <h2 class="text-lg font-semibold">Invite <span>
            {representative ? 'Representative': 'People'}
        </span></h2>
    </div>

    <!-- Link Input -->
    <div class="mb-4">
        <label class="mb-2 block text-sm text-gray-700">
            <span>
                {representative ? 'Direct meeting link' : 'One time link'}
            </span>
        </label>
        <div class="flex items-center rounded-lg bg-gray-100 p-2 w-full">
            <input
                type="text"
                value={cleanUrlPreserveUid(shareURL)}
                class="flex-1 border-none bg-transparent text-gray-700 outline-none text-sm overflow-x-auto"
                disabled
            />
            <Button
                class="ml-2 shrink-0"
                on:click={() => {
                    try {
                        // Get base URL without query parameters - handle URL parsing more carefully
                        let baseUrl;
                        try {
                            baseUrl = new URL(shareURL).origin + new URL(shareURL).pathname;
                        } catch (e) {
                            baseUrl = shareURL.split('?')[0];
                        }
                        
                        console.log('Copy link details:', { 
                            baseUrl, 
                            currentUid, 
                            representative,
                            representativeId
                        });
                        
                        if(representative) {
                            // For representatives, construct URL with both rep ID and uid
                            const uidParam = currentUid ? `&uid=${currentUid}` : '';
                            const repLink = `${baseUrl}/representative?id=${representativeId}${uidParam}`;
                            console.log('Copying rep link:', repLink);
                            copyText(repLink);
                        } else {
                            // For regular users, just pass the uid
                            const uidParam = currentUid ? `?uid=${currentUid}` : '';
                            const regularLink = `${baseUrl}${uidParam}`;
                            console.log('Copying regular link:', regularLink);
                            copyText(regularLink);
                        }
                        toast.success('Link copied to clipboard');
                    } catch (error) {
                        toast.error('Failed to copy link');
                        console.error('Error copying link:', error);
                    }
                }}><ClipboardCopy /></Button
            >
        </div>
    </div>

    {#if !representative}

    <!-- Email/SMS Tabs -->
    <!-- <div class="mb-4 flex border-b">
        <button class="flex-1 border-b-2 border-primary py-2 text-center text-gray-700"
            >Email</button
        >
    </div> -->

    <!-- Email Form with updated visibility logic -->
    <form class="space-y-4"
        action="?/send-email"
        method="POST"
        use:enhance
        use:enhance={() => {
            return async ({ result }) => {
                if (result.status === 200) {
                    // Handle success case
                    toast.success("Invite mail sent successfully");
                    // Don't hide the form, keep it visible after sending
                    emailSent = true;
                    invalidateAll();
                } else {
                    // Handle error case
                    toast.error("Error sending invite mail");
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
                value={shareURL}
                name="url"
                class="flex-1 border-none bg-transparent text-gray-700 outline-none hidden"
                disabled
            />
        </div>

        <Button class="w-full rounded-lg bg-primary py-2 text-white"
        type="submit"
        >Invite</Button>
    </form>

    <!-- Show confirmation after sending email with the room link -->
    {#if emailSent}
        <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-green-700 font-medium mb-2">Email sent successfully!</p>
            <p class="text-sm text-gray-600 mb-2">Your guest can use this link to join the scheduled meeting:</p>
            <div class="flex items-center rounded-lg bg-gray-100 p-2 w-full">
                <input
                    type="text"
                    value={cleanUrlPreserveUid(shareURL)}
                    class="flex-1 border-none bg-transparent text-gray-700 outline-none text-sm overflow-x-auto"
                    disabled
                />
                <Button
                    class="ml-2 shrink-0"
                    on:click={() => {
                        copyText(cleanUrlPreserveUid(shareURL));
                        toast.success('Link copied to clipboard');
                    }}><ClipboardCopy /></Button>
            </div>
        </div>
    {/if}
    {/if}
</div>
