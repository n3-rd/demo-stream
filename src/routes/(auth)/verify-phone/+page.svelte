<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';

	// Get data from URL params
	let email = '';
	let phone = '';
	let companyName = '';
	let verificationMode = 'phone';
	let verificationCode = ['', '', '', '', '', ''];
	let loading = false;
	let resending = false;

	onMount(() => {
		email = $page.url.searchParams.get('email') || '';
		phone = $page.url.searchParams.get('phone') || '';
		companyName = $page.url.searchParams.get('company') || '';
		verificationMode = $page.url.searchParams.get('mode') || 'phone';
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
			// Choose verification endpoint based on mode
			const endpoint = verificationMode === 'email' 
				? '/api/admin/email-verification/verify'
				: '/api/admin/phone-verification/verify';

			const payload = verificationMode === 'email'
				? { email, code }
				: { phone, email, code };

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (result.success) {
				const modeText = verificationMode === 'email' ? 'Email' : 'Phone';
				toast.success(`${modeText} verified! Creating your account...`);
				
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
			const endpoint = verificationMode === 'email'
				? '/api/admin/email-verification/send'
				: '/api/admin/phone-verification/send';

			const payload = verificationMode === 'email'
				? { email, phone, company_name: companyName }
				: { phone, email, company_name: companyName };

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
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

	// Get verification method display text
	function getVerificationMethodText() {
		if (verificationMode === 'email') {
			return 'email address';
		}
		return 'phone number';
	}

	// Get verification method icon
	function getVerificationMethodIcon() {
		return verificationMode === 'email' ? '✉️' : '📱';
	}
</script>

<svelte:head>
	<title>Verify {verificationMode === 'email' ? 'Email' : 'Phone'} - ClearSky Software</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
		<!-- Logo and Welcome -->
		<div class="text-center mb-8">
			      <!-- ClearSky Software Logo -->
				  <div class="flex items-center justify-center">
					<div class="flex items-center">
					  
						<img src="/logo/main-logo.svg" alt="ClearSky Software" class="w-[10rem] h-24 text-white" />
					
					</div>
				  </div>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">Welcome to ClearSky Software</h1>
		</div>

		<!-- Verification Message -->
		<div class="text-center mb-8">
			<div class="text-4xl mb-3">{getVerificationMethodIcon()}</div>
			<p class="text-gray-600 mb-2">A 6-digit verification code has been sent to your</p>
			<p class="font-medium text-gray-900">{getVerificationMethodText()}</p>
			{#if verificationMode === 'email'}
				<p class="font-medium text-gray-900">{email}</p>
			{:else}
				<p class="font-medium text-gray-900">{formatPhoneForDisplay(phone)}</p>
			{/if}
			<p class="text-sm text-gray-500 mt-2">
				{verificationMode === 'email' 
					? 'Check your email inbox (and spam folder) for the verification code.'
					: 'Check your phone for the SMS message with the verification code.'
				}
			</p>
		</div>

		<!-- Code Input Fields -->
		<div class="mb-8">
			<div class="flex justify-center gap-3 mb-6">
				{#each Array(6) as _, i}
					<input
						id="code-{i}"
						type="text"
						class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none transition-colors"
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
				class="w-full bg-primary hover:bg-primary/80 text-white py-3 text-lg font-medium"
				disabled={loading || verificationCode.join('').length !== 6}
			>
				{#if loading}
					<svg class="mr-3 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A8.001 8.001 0 014.708 4.708L2.293 7.121l1.414 1.414 2.415-2.415zm12.586-2.415l2.415 2.415 1.414-1.414-2.415-2.415-2.415 2.415zM20 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z"></path>
					</svg>
					Creating Account...
				{:else}
					Verify & Create Account
				{/if}
			</Button>

			<Button
				on:click={resendCode}
				variant="outline"
				class="w-full border-primary text-primary hover:bg-blue-50 py-3 text-lg font-medium"
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
				Didn't receive the code? Check your {getVerificationMethodText()} or try resending.
			</p>
			{#if dev && verificationMode === 'phone'}
				<div class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
					<p class="text-xs text-yellow-700 mb-1">🚧 Development Mode</p>
					<button
						on:click={() => window.open('/dev/mock-sms', '_blank')}
						class="text-xs text-yellow-600 hover:text-yellow-800 underline"
					>
						📱 View Mock SMS Codes (No real SMS sent)
					</button>
				</div>
			{/if}
		</div>

		<!-- Back to Registration -->
		<div class="mt-4 text-center">
			<button
				on:click={() => goto('/register')}
				class="text-sm text-primary hover:text-blue-800 underline"
			>
				← Back to Registration
			</button>
		</div>
	</div>
</div> 