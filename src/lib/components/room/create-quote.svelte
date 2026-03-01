<script lang="ts">
    import { enhance } from '$app/forms';
    import { createEventDispatcher } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { useForm, HintGroup, Hint, validators, email as emailValidator, required } from 'svelte-use-form';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
	import { X } from 'lucide-svelte';

    const dispatch = createEventDispatcher();
    const form = useForm();

    // Form state
    let firstName = $state('');
    let lastName = $state('');
    let phone = $state('');
    let emailAddress = $state('');
    let quoteRequest = $state('');
    let isSubmitting = $state(false);

    // Handle cancel button click
    function handleCancel() {
        dispatch('close');
    }
    
    // Function to send email notifications
    async function sendQuoteEmails(data: { customerName: string; customerEmail: string; quoteDescription?: string; tags?: string[]; isCustomerConfirmation?: boolean }, ownerEmail: string | null, maxRetries = 2) {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                console.log('Attempt', attempt + 1, 'sending quote email');
                
                // Create the email data structure for the dedicated quote API
                const emailApiData = {
                    customerName: data.customerName,
                    customerEmail: data.customerEmail,
                    customerPhone: phone,
                    quoteDescription: data.quoteDescription || quoteRequest,
                    tags: data.tags || ['quote'],
                    ownerEmail: ownerEmail ?? undefined,
                    isCustomerConfirmation: data.isCustomerConfirmation || false
                };
                
                // Use the dedicated quote email endpoint
                const response = await fetch('/api/send-quote-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailApiData)
                });
                
                // Get the full response text
                const responseText = await response.text();
                let responseData;
                
                try {
                    responseData = JSON.parse(responseText);
                } catch (e) {
                    responseData = { text: responseText };
                    console.error('Failed to parse response as JSON:', responseText);
                }
                
                if (!response.ok) {
                    console.error('Quote email API error:', response.status, responseData);
                    
                    if (attempt === maxRetries - 1) {
                        toast.error(`Email service error: ${responseData.error || response.statusText}`);
                        return false;
                    }
                } else {
                    if (responseData.success) {
                        console.log('Quote email sent successfully:', responseData);
                        return true;
                    } else {
                        console.error('Quote email sending failed:', responseData);
                        if (attempt === maxRetries - 1) {
                            toast.error(responseData.error || 'Failed to send email');
                            return false;
                        }
                    }
                }
                
                // Wait before retrying
                attempt++;
                await new Promise(r => setTimeout(r, 1000 * attempt)); 
            } catch (error) {
                console.error('Error sending quote email (attempt ' + (attempt + 1) + '):', error);
                
                if (attempt === maxRetries - 1) {
                    toast.error(`Network error: ${error.message}`);
                    return false;
                }
                
                attempt++;
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
        
        return false;
    }
    
    // Create quote via API
    async function createQuoteRecord(quoteData: { first_name: string; last_name: string; phone: string; email: string; description: string }) {
        try {
            const response = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: quoteData.first_name,
                    last_name: quoteData.last_name,
                    phone: quoteData.phone,
                    email: quoteData.email,
                    description: quoteData.description
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                console.error('Quote API error:', result);
                return null;
            }
            return { record: result.quote, ownerEmail: result.ownerEmail as string | null };
        } catch (error) {
            console.error('Error creating quote record:', error);
            return null;
        }
    }
    
    // Function to handle form submission with email
    async function handleSubmitWithEmail(event) {
        event.preventDefault();
        
        if (!$form.valid) {
            toast.error('Please fill out all required fields correctly');
            return;
        }
        
        isSubmitting = true;
        
        try {
            // Prepare data for PocketBase
            const quoteData = {
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                email: emailAddress,
                description: quoteRequest
            };
            
            // Create the quote record via API
            const result = await createQuoteRecord(quoteData);
            
            if (!result) {
                toast.error('Error saving quote data. Please try again.');
                isSubmitting = false;
                return;
            }

            const ownerEmail = result.ownerEmail;
            
            // Send emails if the record was created successfully
            const customerEmailSent = await sendQuoteEmails({
                customerName: `${firstName} ${lastName}`,
                customerEmail: emailAddress,
                quoteDescription: quoteRequest,
                tags: ['quote', 'customer_confirmation'],
                isCustomerConfirmation: true
            }, ownerEmail);
            
            const ownerEmailSent = await sendQuoteEmails({
                customerName: `${firstName} ${lastName}`,
                customerEmail: emailAddress,
                quoteDescription: quoteRequest,
                tags: ['quote', 'internal_notification'],
                isCustomerConfirmation: false
            }, ownerEmail);
            
            // Show appropriate notifications
            toast.success('Quote request submitted successfully');
            
            if (!customerEmailSent && !ownerEmailSent) {
                toast.warning('We received your quote but email notifications failed to send.');
            } else if (!customerEmailSent) {
                toast.warning('Your quote was submitted, but we couldn\'t send you a confirmation email.');
            } else if (!ownerEmailSent) {
                console.warn('Owner notification email failed to send');
            }
            
            // Clear form fields after successful submission
            firstName = '';
            lastName = '';
            phone = '';
            emailAddress = '';
            quoteRequest = '';
            
            // Close the form
            dispatch('close');
        } catch (error) {
            console.error('Error processing quote:', error);
            toast.error('An error occurred. Please try again later.');
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="max-w-md p-6 bg-bgdefault md:bg-white text-white rounded-b-none md:text-inherit md:rounded-b-lg rounded-lg shadow-lg max-h-[85vh] overflow-y-auto">
    <div class="flex items-center gap-1">
        <button
        type="button"
        class="rounded-full p-2 text-white hover:bg-white/10 md:hidden md:hover:bg-gray-200"
        onclick={handleCancel}
        aria-label="Close request a quote"
    >
        <X size={18} />
    </button>
        <h2 class="text-lg font-semibold text-white md:text-[#464646]">Request a Quote</h2>
       
    </div>
    <p class="hidden md:block text-gray-600 mb-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    </p>

    <form
        class="space-y-4"
        onsubmit={handleSubmitWithEmail}
        use:form
    >
        <div class="flex gap-4">
            <div class="flex-1">
                <label for="first_name" class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">First name:</label>
                <input
                    id="first_name"
                    type="text"
                    placeholder="First Name"
                    name="first_name"
                    bind:value={firstName}
                    class="w-full px-3 py-2 border md:bg-white bg-bgdefault-light md:border border-none rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    use:validators={[required]}
                />
                <HintGroup for="first_name">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>First Name is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>
            <div class="flex-1">
                <label for="last_name" class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2 ">Last name:</label>
                <input
                    id="last_name"
                    type="text"
                    placeholder="Last Name"
                    name="last_name"
                    bind:value={lastName}
                    class="w-full px-3 py-2 border md:bg-white bg-bgdefault-light md:border border-none rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    use:validators={[required]}
                />
                <HintGroup for="last_name">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Last Name is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>
        </div>

        <div>
            <label for="phone" class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">Phone:</label>
            <input
                id="phone"
                type="tel"
                placeholder="Enter your Phone Number"
                name="phone"
                bind:value={phone}
                class="w-full px-3 py-2 border md:bg-white bg-bgdefault-light md:border border-none rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                use:validators={[required]}
            />
            <HintGroup for="phone">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                    <Hint on="required"><HintValidate>Phone is required</HintValidate></Hint>
                </div>
            </HintGroup>
        </div>

        <div>
            <label for="email" class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">Email:</label>
            <input
                id="email"
                type="email"
                placeholder="Enter your Email"
                name="email"
                bind:value={emailAddress}
                class="w-full px-3 py-2 border md:bg-white bg-bgdefault-light md:border border-none rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                use:validators={[required, emailValidator]}
            />
            <HintGroup for="email">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                    <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                    <Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
                </div>
            </HintGroup>
        </div>

        <div>
            <label for="description" class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">Write a quote:</label>
            <textarea
                id="description"
                placeholder="Write your quote here..."
                name="description"
                bind:value={quoteRequest}
                class="w-full px-3 py-2 border md:bg-white bg-bgdefault-light md:border border-none rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                rows="4"
                use:validators={[required]}
            ></textarea>
            <HintGroup for="description">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                    <Hint on="required"><HintValidate>Description is required</HintValidate></Hint>
                </div>
            </HintGroup>
        </div>

        <div class="flex flex-col gap-3 mt-4 sm:flex-row sm:space-x-4">
            <button
                type="button"
                onclick={handleCancel}
                class="w-full sm:flex-1 py-3 md:block hidden bg-gray-200 text-sm text-gray-800 font-semibold rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isSubmitting}
            >
                CANCEL
            </button>
            <button
                type="submit"
                class="w-full sm:flex-1 py-3 bg-primary text-white text-sm font-semibold rounded-md hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                disabled={!$form.valid || isSubmitting}
            >
                {isSubmitting ? 'SUBMITTING...' : 'REQUEST A QUOTE'}
            </button>
        </div>
    </form>
</div>

<!-- Loading indicator -->
{#if isSubmitting}
<div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
  <div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
    <h3 class="text-lg font-semibold mb-4 text-center">Submitting Quote Request</h3>
    <div class="flex items-center justify-center mb-4">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
    <p class="text-center text-gray-600">Please wait while we process your quote request...</p>
  </div>
</div>
{/if}

<style>
    /* Additional styles can go here if needed */
</style>