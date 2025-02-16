<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { useForm, HintGroup, Hint, validators, email, required } from 'svelte-use-form';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import HintValidate from '$lib/components/layout/hint-validate.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';

	let loading = false;

	const form = useForm();

	function handleLogin(result: ActionResult) {
		if (result.type === 'success') {
			const data = result.data as { success: boolean; message: string };
			if (data.success) {
				toast.success(data.message);
				goto('/');
			} else {
				toast.error(data.message);
			}
		} else {
			toast.error('An error occurred while logging in');
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
			Sign in to manage your representatives, content library, and demo rooms. Your business tools are just a click away.
		</div>
	</div>

	<!-- Right side -->
	<div class="flex-1 bg-white flex items-center justify-center p-4 lg:p-0">
		<div class="w-full max-w-[380px] lg:w-96">
			<div class="mb-6">
				<h2 class="text-xl lg:text-2xl text-primary text-center font-semibold mb-2">Company Login</h2>
				<p class="text-gray-600 text-xs lg:text-sm font-light text-center">
					Enter your company email and password to access your account. If you're a representative, please use your assigned credentials.
				</p>
			</div>
			<form
				action="?/login"
				method="POST"
				use:form
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						handleLogin(result);
					};
				}}
				class="space-y-4 px-4 lg:px-0"
			>
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
						/>
					</div>
				</div>
				<HintGroup for="email">
					<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
						<Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
						<Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
					</div>
				</HintGroup>
				
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
							use:validators={[required]}
						/>
					</div>
				</div>
				<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
					<Hint for="password" on="required"><HintValidate>Password is required</HintValidate></Hint>
				</div>
				
				<div class="flex items-center justify-between text-sm">
					<div class="flex items-center space-x-2">
						<input type="checkbox" id="keep-logged-in" class="rounded border-gray-300 text-primary focus:ring-primary" />
						<label for="keep-logged-in" class="text-xs lg:text-sm text-gray-600">Keep me logged in</label>
					</div>
					<a href="/admin/reset-password" class="text-xs lg:text-sm text-primary hover:underline">
						Forgot password?
					</a>
				</div>
				
				<Button type="submit" class="w-full bg-primary hover:bg-primary rounded-full hover:bg-primary/65 text-white" disabled={!$form.valid}>
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
						<span>Sign In</span>
					{/if}
				</Button>
			</form>
			<div class="mt-4 text-center text-xs lg:text-sm">
				Don't have a company account?
				<a href="/register" class="underline">Register now</a>
			</div>
		</div>
	</div>
</div>