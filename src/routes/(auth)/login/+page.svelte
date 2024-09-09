<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import { Label } from '$lib/components/ui/label';
	import { useForm, HintGroup, Hint, validators, email, required } from 'svelte-use-form';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import HintValidate from '$lib/components/layout/hint-validate.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let loading = false;

	const form = useForm();
</script>

<div class="flex h-screen min-w-full items-center justify-center">
	<Card.Root class="mx-auto max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Login</Card.Title>
			<Card.Description>Enter your email below to login to your account</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				action="?/login"
				method="POST"
				use:form
				use:enhance={() => {
					return async ({ result }) => {
						console.log('login results', result);
						if ((result.status = 200)) {
							toast.success('successfully logged in');
							goto('/');
						} else {
							toast.error('error occoured logging in');
						}
					};
				}}
			>
				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label for="email">Email</Label>
						<input
							id="email"
							type="email"
							name="email"
							placeholder="m@example.com"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							required
							use:validators={[required, email]}
						/>
						<HintGroup for="email">
							<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
								<Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
								<Hint on="email" hideWhenRequired
									><HintValidate>Email is not valid</HintValidate></Hint
								>
							</div>
						</HintGroup>
					</div>
					<div class="grid gap-2">
						<div class="flex items-center">
							<Label for="password">Password</Label>
							<a href="/admin/reset-password" class="ml-auto inline-block text-sm underline">
								Forgot your password?
							</a>
						</div>
						<input
							type="password"
							name="password"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							id="password"
							use:validators={[required]}
						/>
						<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
							<Hint for="password" on="required"
								><HintValidate>Password is required</HintValidate></Hint
							>
						</div>
					</div>

					<Button type="submit" class="w-full" disabled={!$form.valid}>
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
							<span>Logging in...</span>
						{:else}
							<span>Login</span>
						{/if}
					</Button>
				</div>
			</form>
			<div class="mt-4 text-center text-sm">
				Don&apos;t have an account?
				<a href="/register" class="underline">Sign up</a>
			</div>
		</Card.Content>
	</Card.Root>
</div>
