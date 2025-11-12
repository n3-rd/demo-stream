<script lang="ts">
    import { PUBLIC_POCKETBASE_INSTANCE } from '$env/static/public';
    import { enhance } from '$app/forms';
    import { createEventDispatcher } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { useForm, HintGroup, Hint, validators, email as emailValidator, required } from 'svelte-use-form';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import { browser } from '$app/environment';
    import PocketBase from 'pocketbase';
	import { X } from 'lucide-svelte';

    // Initialize PocketBase
    const pb = browser ? new PocketBase(PUBLIC_POCKETBASE_INSTANCE) : null;

    // Form state
    let firstName = '';
    let lastName = '';
    let phone = '';
    let emailAddress = '';
    let quoteRequest = '';
    let isSubmitting = false;
    
    // Company owner's email for receiving quote requests
    const OWNER_EMAIL = pb.authStore.model?.email;

    const dispatch = createEventDispatcher();
    const form = useForm();

    // Handle cancel button click
    function handleCancel() {
        dispatch('close');
    }
    
    // Function to send email notifications
    async function sendQuoteEmails(data, maxRetries = 2) {
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
                    ownerEmail: OWNER_EMAIL,
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
    
    // Create quote in PocketBase
    async function createQuoteRecord(quoteData) {
        try {
            if (!pb) {
                console.error('PocketBase not initialized');
                return null;
            }
            
            // Get the company ID from auth if available
            let companyId = null;
            try {
                if (pb.authStore.model) {
                    console.log('Company ID:', pb.authStore.model.id);
                    companyId = pb.authStore.model.id;
                }
            } catch (e) {
                console.warn('Could not get company ID:', e);
            }
            
            // Prepare data for PocketBase
            const pbData = {
                first_name: quoteData.first_name,
                last_name: quoteData.last_name,
                phone: quoteData.phone,
                email: quoteData.email,
                description: quoteData.description,
                to_company: companyId
            };
            
            // Add company relation if we have a company ID
            if (companyId) {
                pbData.to_company = companyId;
            }
            
            console.log('Creating quote record with data:', pbData);
            
            // Create the record
            const record = await pb.collection('quotes').create(pbData);
            console.log('Quote record created:', record);
            
            return record;
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
            
            // Create the quote record in PocketBase
            const record = await createQuoteRecord(quoteData);
            
            if (!record) {
                toast.error('Error saving quote data. Please try again.');
                isSubmitting = false;
                return;
            }
            
            // Send emails if the record was created successfully
            const customerEmailSent = await sendQuoteEmails({
                customerName: `${firstName} ${lastName}`,
                customerEmail: emailAddress,
                quoteDescription: quoteRequest,
                tags: ['quote', 'customer_confirmation'],
                isCustomerConfirmation: true
            });
            
            const ownerEmailSent = await sendQuoteEmails({
                customerName: `${firstName} ${lastName}`,
                customerEmail: emailAddress,
                quoteDescription: quoteRequest,
                tags: ['quote', 'internal_notification'],
                isCustomerConfirmation: false
            });
            
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
        on:click={handleCancel}
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
        on:submit={handleSubmitWithEmail}
        use:form
    >
        <div class="flex gap-4">
            <div class="flex-1">
                <label class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">First name:</label>
                <input
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
                <label class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2 ">Last name:</label>
                <input
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
            <label class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">Phone:</label>
            <input
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
            <label class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">Email:</label>
            <input
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
            <label class="block text-white md:text-gray-700 font-light text-sm font-bold mb-2">Write a quote:</label>
            <textarea
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
                on:click={handleCancel}
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