<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { Loader2, Mail, Phone, Cloud, Building2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { formatToE164, sanitizePhoneInput, isE164 } from '$lib/helpers/phone';

	let step: 'login' | 'verify' = 'login';
	let loading = false;
	let roomId: string | null = null;
	let uid = '';

	// Form data
	let companyName = 'Studio Blopp';
	let firstName = 'Sam';
	let lastName = 'Altman';
	let email = 'sam@altman.com';
	let mobileNumber = '+1234567890';
	let verificationCode = ['', '', '', '', ''];
	let verificationType = '';

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		roomId = urlParams.get('room');
		uid = urlParams.get('uid') || '';
	});

	function onMobileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		input.value = sanitizePhoneInput(input.value);
		mobileNumber = input.value;
	}

	function onMobileBlur() {
		if (mobileNumber) mobileNumber = formatToE164(mobileNumber);
	}

	function handleCodeInput(e: Event, i: number) {
		const t = e.target as HTMLInputElement;
		if (t.value.length > 1) t.value = t.value.slice(-1);
		verificationCode[i] = t.value;
		if (t.value && i < 4) {
			const next = document.getElementById(`code-${i + 1}`) as HTMLInputElement | null;
			next?.focus();
		}
		if (verificationCode.every((d) => d !== '') && verificationCode.join('').length === 5) {
			handleVerification();
		}
	}

	async function handleLogin() {
		if (!companyName.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !mobileNumber.trim()) {
			toast.error('Please fill in all required fields');
			return;
		}
		loading = true;
		try {
			const normalizedPhone = formatToE164(mobileNumber);
			if (!isE164(normalizedPhone)) {
				toast.error('Please enter a valid phone number with country code, e.g. +170********');
				loading = false;
				return;
			}

			const res = await fetch('/api/representative/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ 
					first_name: firstName.trim(),
					last_name: lastName.trim(),
					company: companyName.trim(),
					email: email.trim(),
					phone: normalizedPhone,
					roomId: roomId || undefined
				})
			});
			const result = await res.json();
			if (result.success) {
				verificationType = result.verification_type;
				step = 'verify';
				toast.success(result.message);
			} else {
				toast.error(result.message);
			}
		} catch (e) {
			toast.error('Connection error. Please try again.');
		} finally {
			loading = false;
		}
	}

	async function handleVerification() {
		if (!verificationCode.every(d => d !== '') || verificationCode.join('').length !== 5) {
			toast.error('Please enter the complete 5-digit verification code');
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/representative/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email: email.trim(), code: verificationCode.join('') })
			});
			const result = await res.json();
			if (result.success) {
				toast.success('Verification successful');
				// Fallback: ensure non-httpOnly rep_user cookie exists for client-side checks
				try {
					if (!document.cookie.includes('rep_user=')) {
						document.cookie = `rep_user=${encodeURIComponent(JSON.stringify(result.user))}; Path=/; SameSite=Strict`;
					}
				} catch {}
				if (roomId) {
					const suffix = uid ? `?uid=${encodeURIComponent(uid)}` : '';
					const repSuffix = result?.user?.id ? `${suffix ? '&' : '?'}repid=${encodeURIComponent(result.user.id)}` : '';
					goto(`/room/${roomId}${suffix}${repSuffix}`);
				} else {
					goto('/representative/dashboard');
				}
			} else {
				toast.error(result.message);
				verificationCode = ['', '', '', '', ''];
			}
		} catch (e) {
			toast.error('Verification failed. Please try again.');
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center pt-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="text-center mb-8">
			<div class="flex items-center justify-center">
				<div class="flex items-center">
					<img src="/logo/main-logo.svg" alt="ClearSky Software" class="w-[10rem] h-24 text-white" />
				</div>
			</div>
			<p class="text-gray-600 text-sm">
				{step === 'login' ? 'Please sign-in to your account' : 'Enter the verification code sent to you'}
			</p>
		</div>
	</div>

	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
			{#if step === 'login'}
				<form on:submit|preventDefault={handleLogin} class="space-y-6">
					<div>
						<Label for="companyName" class="block text-sm font-medium text-gray-700 mb-2">COMPANY NAME</Label>
						<Input id="companyName" bind:value={companyName} type="text" placeholder="Enter your company name" required disabled={loading} class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
					</div>
					<div>
						<Label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">FIRST NAME</Label>
						<Input id="firstName" bind:value={firstName} type="text" placeholder="Enter your first name" required disabled={loading} class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
					</div>
					<div>
						<Label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">LAST NAME</Label>
						<Input id="lastName" bind:value={lastName} type="text" placeholder="Enter your last name" required disabled={loading} class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
					</div>
					<div>
						<Label for="email" class="block text-sm font-medium text-gray-700 mb-2">EMAIL ADDRESS</Label>
						<Input id="email" bind:value={email} type="email" placeholder="Enter your email" required disabled={loading} class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
					</div>
					<div>
						<Label for="mobileNumber" class="block text-sm font-medium text-gray-700 mb-2">Mobile Number</Label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
								<span class="text-lg mr-1">🇨🇦</span>
								<span class="text-sm text-gray-500">+1</span>
							</div>
							<Input id="mobileNumber" bind:value={mobileNumber} type="tel" placeholder="Mobile Number" disabled={loading} inputmode="tel" autocomplete="tel" class="w-full pl-16 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" on:input={onMobileInput} on:blur={onMobileBlur} />
						</div>
						<p class="text-xs text-gray-500 mt-1">Your phone number must match our records for SMS verification</p>
					</div>
					<div class="pt-4">
						<Button type="submit" disabled={loading} class="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed">
							{#if loading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Sending Verification Code...
							{:else}
								Send Verification Code
							{/if}
						</Button>
					</div>
				</form>
			{:else}
				<form on:submit|preventDefault={handleVerification} class="space-y-6">
					<div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
						<div class="flex items-center justify-center mb-2">
							{#if verificationType === 'sms'}
								<Phone class="h-6 w-6 text-primary" />
							{:else}
								<Mail class="h-6 w-6 text-primary" />
							{/if}
						</div>
						<p class="text-sm text-blue-800 font-medium">Verification code sent to your {verificationType === 'sms' ? 'mobile phone' : 'email'}</p>
						<p class="text-xs text-primary mt-1">Code expires in 5 minutes</p>
					</div>
					<div>
						<Label class="block text-sm font-medium text-gray-700 mb-4 text-center">VERIFICATION CODE</Label>
						<div class="flex justify-center gap-3 mb-4">
							{#each Array(5) as _, i}
								<input id={`code-${i}`} type="text" class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none transition-colors" maxlength="1" pattern="[0-9]" on:input={(e) => handleCodeInput(e, i)} />
							{/each}
						</div>
						<p class="text-xs text-gray-500 text-center">Enter the 5-digit code sent to your {verificationType === 'sms' ? 'mobile phone' : 'email'}</p>
					</div>
					<div class="pt-2">
						<Button type="submit" disabled={loading || !verificationCode.every(d => d !== '') || verificationCode.join('').length !== 5} class="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed">
							{#if loading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Verifying Code...
							{:else}
								Verify & Sign In
							{/if}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div> 
