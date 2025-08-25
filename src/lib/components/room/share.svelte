<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ClipboardCopy, Mail, MessageCircle } from 'lucide-svelte';
	import { copyText } from '$lib/helpers/copyText';
	import { toast } from 'svelte-sonner';

    import { PUBLIC_SMTP_FROM, PUBLIC_BREVO_API_KEY } from '$env/static/public';
    export let shareURL: string;
    export let representative: boolean;
    export let representativeId: string = '';
    import { page } from '$app/stores';

    // Add this at the top of your script section
    let emailSent = false;
    let isEmailSending = false;

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

    // Function to send email using Brevo API (similar to schedule-meeting)
    async function sendInviteEmail(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        const recipientName = formData.get('name');
        const recipientEmail = formData.get('receipient');
        
        if (!recipientName || !recipientEmail) {
            toast.error('Please fill in both name and email');
            return;
        }
        
        isEmailSending = true;
        
        try {
            // Clean the URL to send
            const inviteLink = cleanUrlPreserveUid(shareURL);
            
            // Prepare email payload for Brevo API
            const emailPayload = {
                sender: {
                    name: "Room Invitation",
                    email: PUBLIC_SMTP_FROM
                },
                to: [
                    {
                        email: recipientEmail,
                        name: recipientName
                    }
                ],
                subject: "You're invited to join a meeting room",
                htmlContent: `
                    <html>
                        <body>
                            <h2>Meeting Room Invitation</h2>
                            <p>Dear ${recipientName},</p>
                            <p>You have been invited to join a meeting room.</p>
                            <p>Click the link below to join:</p>
                            <p><a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Meeting Room</a></p>
                            <p>Or copy and paste this link into your browser:</p>
                            <p><a href="${inviteLink}">${inviteLink}</a></p>
                            <br>
                            <p>Best regards,<br>The ViewRoom Team</p>
                        </body>
                    </html>
                `,
                tags: ["room-invite", "meeting"]
            };
            
            // Send email via Brevo API
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'api-key': PUBLIC_BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(emailPayload)
            });
            
            if (response.ok) {
                toast.success("Invite email sent successfully");
                emailSent = true;
                // Clear the form
                event.target.reset();
            } else {
                const errorData = await response.json();
                console.error('Brevo API error:', errorData);
                toast.error(`Failed to send email: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error sending email:', error);
            toast.error("Failed to send invite email");
        } finally {
            isEmailSending = false;
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
        on:submit={sendInviteEmail}
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
        disabled={isEmailSending}
        >
            {#if isEmailSending}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
            {:else}
                Invite
            {/if}
        </Button>
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
