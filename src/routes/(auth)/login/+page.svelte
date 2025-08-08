<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let loading = false;
	let step: 'send' | 'verify' = 'send';
	let email = '';
	let phone = '';
	let code = '';

	async function onSendCode(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			const res = await fetch('/api/auth/passwordless/send-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, phone })
			});
			const data = await res.json();
			if (data?.success) {
				toast.success('Code sent');
				step = 'verify';
			} else {
				toast.error(data?.message || 'Failed to send code');
			}
		} catch (err) {
			toast.error('Failed to send code');
		} finally {
			loading = false;
		}
	}

	async function onVerify(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			const res = await fetch('/api/auth/passwordless/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code })
			});
			const data = await res.json();
			if (data?.success) {
				toast.success('Logged in');
				goto('/');
			} else {
				toast.error(data?.message || 'Invalid code');
			}
		} catch (err) {
			toast.error('Verification failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col lg:flex-row bg-[#3583c6]">
	<!-- Left side -->
	<div class="flex-1 flex flex-col gap-6 px-4 lg:px-12 py-8 lg:py-0 justify-center items-center text-white bg-[url('/img/bg.png')] bg-cover bg-center bg-opacity-50">
		<div class="flex flex-col gap-2 items-center text-center">
			<h2 class="text-lg lg:text-xl font-medium mb-4">Welcome Back!</h2>
			<h1 class="text-2xl lg:text-4xl font-semibold">Access Your Company Portal</h1>
		</div>

		<div class="w-[60px] lg:w-[89px] h-2 bg-white"></div>

		<div class="text-base lg:text-lg text-center font-light px-4 lg:px-0 max-w-md">
			Sign in to manage your representatives, content library, and demo rooms.
		</div>
	</div>

	<!-- Right side -->
	<div class="flex-1 bg-white flex items-center justify-center p-4 lg:p-0">
		<div class="w-full max-w-[380px] lg:w-96">
			<div class="mb-6">
				<h2 class="text-xl lg:text-2xl text-primary text-center font-semibold mb-2">Company Login</h2>
				<p class="text-gray-600 text-xs lg:text-sm font-light text-center">
					Enter your email and phone to receive a login code.
				</p>
			</div>

			{#if step === 'send'}
			<form class="space-y-4 px-4 lg:px-0" on:submit={onSendCode}>
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input id="email" type="email" bind:value={email} placeholder="company@example.com" class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" required />
					</div>
				</div>

				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input id="phone" type="tel" bind:value={phone} placeholder="+1234567890" class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" required />
					</div>
				</div>

				<Button type="submit" class="w-full bg-primary rounded-full text-white" disabled={loading}>
					{#if loading}<span>Sending...</span>{:else}<span>Send Code</span>{/if}
				</Button>
			</form>
			{:else}
			<form class="space-y-4 px-4 lg:px-0" on:submit={onVerify}>
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input id="code" type="text" inputmode="numeric" maxlength="6" bind:value={code} placeholder="Enter 6-digit code" class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" required />
					</div>
				</div>
				<Button type="submit" class="w-full bg-primary rounded-full text-white" disabled={loading}>
					{#if loading}<span>Verifying...</span>{:else}<span>Verify & Sign In</span>{/if}
				</Button>
				<button type="button" class="w-full text-xs text-gray-600 underline" on:click={() => (step = 'send')}>Go back</button>
			</form>
			{/if}

			<div class="mt-4 text-center text-xs lg:text-sm">
				Don't have a company account?
				<a href="/register" class="underline">Register now</a>
			</div>
		</div>
	</div>
</div>