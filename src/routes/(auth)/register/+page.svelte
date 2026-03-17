<script lang="ts">
	import { preventDefault } from 'svelte/legacy';

	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { useForm, HintGroup, Hint, validators, email, required, minLength, maxLength } from 'svelte-use-form';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import HintValidate from '$lib/components/layout/hint-validate.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
  import { formatToE164, sanitizePhoneInput, isE164 } from '$lib/helpers/phone';

	const form = useForm();

	function passwordMatch(value: any, form: any) {
		return value === form.values.password ? null : { passwordMatch: true };
	}

	let loading = $state(false);
	let emailTaken = false;
	let phoneTaken = false;

  async function checkUnique(field: 'email' | 'phone', value: string) {
    try {
      const payload: any = {};
      if (field === 'email') payload.email = value;
      if (field === 'phone') payload.phone = value;
      const res = await fetch('/api/auth/check-unique', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok && data?.success) {
        emailTaken = !!data.email_taken;
        phoneTaken = !!data.phone_taken;
        if (field === 'email' && emailTaken) toast.error('This email is already registered');
        if (field === 'phone' && phoneTaken) toast.error('This phone number is already registered');
      }
    } catch {}
  }

  function onPhoneInput(e: Event) {
    const input = e.target as HTMLInputElement;
    input.value = sanitizePhoneInput(input.value);
  }
  async function onPhoneBlur(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value) input.value = formatToE164(input.value);
    if (input.value) await checkUnique('phone', input.value);
  }
  async function onEmailBlur(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value) await checkUnique('email', input.value);
  }
</script>

<div class="flex min-h-screen bg-[#3583c6]">
	<!-- Left side -->
	<div class="flex-1 flex flex-col gap-6 px-12 justify-center items-center text-white bg-[url('/img/bg.png')] bg-cover bg-center bg-opacity-50">
		<div class="flex flex-col gap-2 items-center">
			<h2 class="text-xl font-medium mb-4">Hello! Welcome</h2>
			<h1 class="text-4xl font-semibold ">Create Your Company Account</h1>
		</div>

		<div class="w-[89px] h-2 bg-white"></div>

		<div class="text-lg text-center font-light ">
			Create your company account to manage your representatives and content library. Start showcasing your products and services today.
		</div>
	</div>

	<!-- Right side -->
	<div class="flex-1 bg-white flex items-center justify-center">
		<div class="w-96">
			<div class="mb-6">
				<h2 class="text-2xl text-primary text-center font-semibold mb-2">Create Company Account</h2>
				<p class="text-gray-600 text-sm font-light text-center">
					Fill in your company details. We'll send a 6-digit verification code to both your phone number and email address.
				</p>
			</div>

			<form
				method="POST"
				onsubmit={preventDefault(async (e) => {
					loading = true;
					const formEl = e.currentTarget;
					const formData = new FormData(formEl);
          const rawPhone = formData.get('phone')?.toString() || '';
          const normalizedPhone = formatToE164(rawPhone);
          if (!isE164(normalizedPhone)) {
            loading = false;
            toast.error('Please enter a valid phone number with country code, e.g. +170********');
            return;
          }
          formData.set('phone', normalizedPhone);

          // Final uniqueness check before submit
          try {
            const res = await fetch('/api/auth/check-unique', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.get('email')?.toString() || '', phone: normalizedPhone })
            });
            const data = await res.json();
            if (data?.email_taken || data?.phone_taken) {
              loading = false;
              if (data.email_taken) toast.error('This email is already registered');
              if (data.phone_taken) toast.error('This phone number is already registered');
              return;
            }
          } catch {}
					
					try {
						const response = await fetch('/api/auth/register', {
							method: 'POST',
							body: formData
						});
						
						const result = await response.json();
						loading = false;
						console.log('register results', result);
						
						if (result.type === 'success') {
							if (result.data?.verification_required) {
								// Redirect to verification page
								goto(`/verify-phone?email=${encodeURIComponent(result.data.email)}&phone=${encodeURIComponent(result.data.phone)}&company=${encodeURIComponent(result.data.company_name)}`);
							} else if (result.data?.success) {
								toast.success('Account created successfully!');
								goto('/');
							} else {
								toast.error(String(result.data?.message || 'Registration failed'));
							}
						} else {
							toast.error('Error occurred while registering company');
						}
					} catch (error) {
						loading = false;
						console.error('Registration error:', error);
						toast.error('Error occurred while registering company');
					}
				})}
				class="space-y-4"
			>
				<!-- Company Name input -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							id="name"
							name="name"
							placeholder="Company name"
							class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							required
							use:validators={[required, minLength(2), maxLength(50)]}
						/>
					</div>
				</div>
				<HintGroup for="name">
					<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
						<Hint on="required"><HintValidate>Company name is required</HintValidate></Hint>
						<Hint on="minLength"><HintValidate>Company name must be at least 2 characters</HintValidate></Hint>
						<Hint on="maxLength"><HintValidate>Company name must be at most 50 characters</HintValidate></Hint>
					</div>
				</HintGroup>

				<!-- Company Phone -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							id="phone"
							name="phone"
							inputmode="tel"
							autocomplete="tel"
							placeholder="Company phone (required) - e.g., +170********"
							class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							required
							use:validators={[required, minLength(10), maxLength(20)]}
							oninput={onPhoneInput}
							onblur={onPhoneBlur}
						/>
					</div>
				</div>
				<HintGroup for="phone">
					<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
						<Hint on="required"><HintValidate>Phone number is required</HintValidate></Hint>
						<Hint on="minLength"><HintValidate>Phone number must be at least 10 digits</HintValidate></Hint>
						<Hint on="maxLength"><HintValidate>Phone number must be at most 20 characters</HintValidate></Hint>
					</div>
				</HintGroup>

				<!-- Company Website -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							id="website"
							name="website"
							placeholder="Company website (optional)"
							class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
						/>
					</div>
				</div>

				<!-- Email input -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							id="email"
							type="email"
							name="email"
							placeholder="company@example.com"
							class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							required
								use:validators={[required, email]}
							onblur={onEmailBlur}
						/>
					</div>
				</div>
				<HintGroup for="email">
					<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
						<Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
						<Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
					</div>
				</HintGroup>

				<!-- Password input -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							type="password"
							name="password"
							placeholder="Enter your password"
							class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							id="password"
							required
							use:validators={[required, minLength(8), maxLength(30)]}
						/>
					</div>
				</div>
				<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
					<Hint for="password" on="required"><HintValidate>Password is required</HintValidate></Hint>
					<Hint for="password" on="minLength"><HintValidate>Password must be at least 8 characters</HintValidate></Hint>
					<Hint for="password" on="maxLength"><HintValidate>Password must be at most 30 characters</HintValidate></Hint>
				</div>

				<!-- Confirm Password input -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							type="password"
							name="passwordConfirm"
							placeholder="Confirm your password"
							class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							id="passwordConfirm"
							required
							use:validators={[required, passwordMatch]}
						/>
					</div>
				</div>
				<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
					<Hint for="passwordConfirm" on="required"><HintValidate>Password confirmation is required</HintValidate></Hint>
					<Hint for="passwordConfirm" on="passwordMatch"><HintValidate>Passwords do not match</HintValidate></Hint>
				</div>
				
				<Button 
					type="submit" 
					class="w-full bg-primary hover:bg-primary rounded-full hover:bg-primary/65 text-white" 
					disabled={!$form.valid || loading}
				>
					{#if loading}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-3 h-5 w-5 animate-spin"
							viewBox="0 0 24 24"
						>
							<circle
								cx="12"
								cy="12"
								r="10"
								class="opacity-25"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A8.001 8.001 0 014.708 4.708L2.293 7.121l1.414 1.414 2.415-2.415zm12.586-2.415l2.415 2.415 1.414-1.414-2.415-2.415-2.415 2.415zM20 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z"
							></path>
						</svg>
						<span>Creating Account...</span>
					{:else}
						<span>Create Company Account</span>
					{/if}
				</Button>
				
				<p class="text-sm text-gray-600 text-center">
					📮 After clicking register, you'll receive a 6-digit code via SMS and Email.
				</p>
			</form>
			<div class="mt-4 text-center text-sm">
				Already have an account?
				<a href="/login" class="underline">Sign in</a>
			</div>
			<div class="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[10px] text-gray-400">
				<a href="/privacy" class="hover:underline">Privacy Policy</a>
				<span>&bull;</span>
				<a href="/delete-account" class="hover:underline">Delete Account</a>
				<span>&bull;</span>
				<a href="/delete-representative" class="hover:underline text-red-400 font-medium">Delete Representative Account</a>
			</div>
		</div>
	</div>
</div>
