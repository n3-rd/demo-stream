<script lang="ts">
    import { enhance } from '$app/forms';
    import { createEventDispatcher } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { useForm, HintGroup, Hint, validators, email as emailValidator, required } from 'svelte-use-form';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    // Form state
    let firstName = '';
    let lastName = '';
    let phone = '';
    let emailAddress = '';
    let quoteRequest = '';

    const dispatch = createEventDispatcher();
    const form = useForm();


</script>

<div class="max-w-md p-6 bg-white rounded-lg shadow-lg">
    <h2 class="text-2xl font-semibold mb-2">Request a Quote</h2>
    <p class="text-gray-600 mb-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
    </p>

    <form
        class="space-y-4"
        action="?/request-quote"
        method="POST"
        use:form
        use:enhance={() => {
            return async ({ result }) => {
                console.log('quote request results', result);
                if ((result.status = 200)) {
                    toast.success('successfully created quote');
                } else {
                    toast.error('error creating quote');
                }
            };
        }}
    >
        <div class="flex gap-4">
            <div class="flex-1">
                <label class="block text-gray-700 text-sm font-bold mb-2">Name:</label>
                <input
                    type="text"
                    placeholder="First Name"
                    name="first_name"
                    bind:value={firstName}
                    class="w-full px-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                    use:validators={[required]}
                />
                <HintGroup for="first_name">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>First Name is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>
            <div class="flex-1">
                <label class="block text-gray-700 text-sm font-bold mb-2 invisible">Name:</label>
                <input
                    type="text"
                    placeholder="Last Name"
                    name="last_name"
                    bind:value={lastName}
                    class="w-full px-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label class="block text-gray-700 text-sm font-bold mb-2">Phone:</label>
            <input
                type="tel"
                placeholder="Enter your Phone Number"
                name="phone"
                bind:value={phone}
                class="w-full px-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                use:validators={[required]}
            />
            <HintGroup for="phone">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                    <Hint on="required"><HintValidate>Phone is required</HintValidate></Hint>
                </div>
            </HintGroup>
        </div>

        <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input
                type="email"
                placeholder="Enter your Email"
                name="email"
                bind:value={emailAddress}
                class="w-full px-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label class="block text-gray-700 text-sm font-bold mb-2">What would you like a quote for?:</label>
            <textarea
                placeholder="Write your quote here..."
                name="description"
                bind:value={quoteRequest}
                class="w-full px-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                rows="4"
                use:validators={[required]}
            ></textarea>
            <HintGroup for="description">
                <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                    <Hint on="required"><HintValidate>Description is required</HintValidate></Hint>
                </div>
            </HintGroup>
        </div>

        <button
            type="submit"
            class="w-full py-3 bg-primary text-white font-semibold rounded-md hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            disabled={!$form.valid}
        >
            SUBMIT QUOTE REQUEST
        </button>
    </form>
</div>

<style>
    /* Additional styles can go here if needed */
</style>