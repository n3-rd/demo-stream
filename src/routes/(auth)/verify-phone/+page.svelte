<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// Get data from URL params
	let email = '';
	let phone = '';
	let companyName = '';
	let verificationCode = ['', '', '', '', '', ''];
	let loading = false;
	let resending = false;

	onMount(() => {
		email = $page.url.searchParams.get('email') || '';
		phone = $page.url.searchParams.get('phone') || '';
		companyName = $page.url.searchParams.get('company') || '';
	});

	// Handle code input with auto-focus
	function handleInput(event: Event, index: number) {
		const target = event.target as HTMLInputElement;
		const value = target.value;

		// Only allow single digits
		if (value.length > 1) {
			target.value = value.slice(-1);
		}

		verificationCode[index] = target.value;

		// Auto-focus next input
		if (value && index < 5) {
			const nextInput = document.querySelector(`#code-${index + 1}`) as HTMLInputElement;
			nextInput?.focus();
		}

		// Auto-submit when all 6 digits are entered
		if (verificationCode.every(digit => digit !== '') && verificationCode.join('').length === 6) {
			verifyCode();
		}
	}

	// Handle backspace
	function handleKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Backspace' && verificationCode[index] === '' && index > 0) {
			const prevInput = document.querySelector(`#code-${index - 1}`) as HTMLInputElement;
			prevInput?.focus();
		}
	}

	// Paste handling
	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const paste = event.clipboardData?.getData('text');
		if (paste && /^\d{6}$/.test(paste)) {
			const digits = paste.split('');
			for (let i = 0; i < 6; i++) {
				verificationCode[i] = digits[i] || '';
				const input = document.querySelector(`#code-${i}`) as HTMLInputElement;
				if (input) input.value = verificationCode[i];
			}
			verifyCode();
		}
	}

	// Verify the code
	async function verifyCode() {
		const code = verificationCode.join('');
		if (code.length !== 6) {
			toast.error('Please enter all 6 digits');
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/admin/phone-verification/verify', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					phone,
					email,
					code
				})
			});

			const result = await response.json();

			if (result.success) {
				toast.success('Phone verified! Creating your account...');
				
				// Now complete the registration
				const registerResponse = await fetch('/api/admin/complete-registration', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						email,
						phone,
						company_name: companyName
					})
				});

				const registerResult = await registerResponse.json();

				if (registerResult.success) {
					toast.success('Account created successfully!');
					goto('/');
				} else {
					toast.error(registerResult.message || 'Failed to create account');
				}
			} else {
				toast.error(result.message || 'Invalid verification code');
				// Clear the code inputs
				verificationCode = ['', '', '', '', '', ''];
				document.querySelectorAll('input[id^="code-"]').forEach((input: any) => {
					input.value = '';
				});
				// Focus first input
				const firstInput = document.querySelector('#code-0') as HTMLInputElement;
				firstInput?.focus();
			}
		} catch (error) {
			console.error('Error verifying code:', error);
			toast.error('Failed to verify code. Please try again.');
		} finally {
			loading = false;
		}
	}

	// Resend code
	async function resendCode() {
		if (!email || !phone || !companyName) {
			toast.error('Missing registration information. Please start over.');
			goto('/register');
			return;
		}

		resending = true;

		try {
			const response = await fetch('/api/admin/phone-verification/send', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					phone,
					email,
					company_name: companyName
				})
			});

			const result = await response.json();

			if (result.success) {
				toast.success('New verification code sent!');
				// Clear existing code
				verificationCode = ['', '', '', '', '', ''];
				document.querySelectorAll('input[id^="code-"]').forEach((input: any) => {
					input.value = '';
				});
				// Focus first input
				const firstInput = document.querySelector('#code-0') as HTMLInputElement;
				firstInput?.focus();
			} else {
				toast.error(result.message || 'Failed to resend code');
			}
		} catch (error) {
			console.error('Error resending code:', error);
			toast.error('Failed to resend code. Please try again.');
		} finally {
			resending = false;
		}
	}

	// Format phone for display
	function formatPhoneForDisplay(phone: string) {
		if (phone.startsWith('+1') && phone.length === 12) {
			// US number: +12345678901 -> 234-567-8901
			return phone.slice(-10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
		}
		// Show last 4 digits for international
		return phone.slice(-4);
	}
</script>

<svelte:head>
	<title>Verify Phone Number - ClearSky Software</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
		<!-- Logo and Welcome -->
		<div class="text-center mb-8">
			<div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
					<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">Welcome to ClearSky Software</h1>
		</div>

		<!-- Verification Message -->
		<div class="text-center mb-8">
			<p class="text-gray-600 mb-2">A code has been sent to</p>
			<p class="font-medium text-gray-900">{email}</p>
			<p class="font-medium text-gray-900">and to {formatPhoneForDisplay(phone)}</p>
		</div>

		<!-- Code Input Fields -->
		<div class="mb-8">
			<div class="flex justify-center gap-3 mb-6">
				{#each Array(6) as _, i}
					<input
						id="code-{i}"
						type="text"
						class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
						maxlength="1"
						pattern="[0-9]"
						on:input={(e) => handleInput(e, i)}
						on:keydown={(e) => handleKeydown(e, i)}
						on:paste={handlePaste}
						disabled={loading}
					/>
				{/each}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="space-y-4">
			<Button
				on:click={verifyCode}
				class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
				disabled={loading || verificationCode.join('').length !== 6}
			>
				{#if loading}
					<svg class="mr-3 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A8.001 8.001 0 014.708 4.708L2.293 7.121l1.414 1.414 2.415-2.415zm12.586-2.415l2.415 2.415 1.414-1.414-2.415-2.415-2.415 2.415zM20 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z"></path>
					</svg>
					Creating Account...
				{:else}
					LOGIN
				{/if}
			</Button>

			<Button
				on:click={resendCode}
				variant="outline"
				class="w-full border-blue-600 text-blue-600 hover:bg-blue-50 py-3 text-lg font-medium"
				disabled={resending || loading}
			>
				{#if resending}
					<svg class="mr-3 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A8.001 8.001 0 014.708 4.708L2.293 7.121l1.414 1.414 2.415-2.415zm12.586-2.415l2.415 2.415 1.414-1.414-2.415-2.415-2.415 2.415zM20 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z"></path>
					</svg>
					Sending...
				{:else}
					Resend Code
				{/if}
			</Button>
		</div>

		<!-- Help Text -->
		<div class="mt-6 text-center">
			<p class="text-sm text-gray-500">
				Didn't receive the code? Check your phone and email, or try resending.
			</p>
		</div>

		<!-- Back to Registration -->
		<div class="mt-4 text-center">
			<button
				on:click={() => goto('/register')}
				class="text-sm text-blue-600 hover:text-blue-800 underline"
			>
				← Back to Registration
			</button>
		</div>
	</div>
</div> 