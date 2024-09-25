<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { useForm, HintGroup, Hint, validators, email, required, minLength, maxLength } from 'svelte-use-form';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import HintValidate from '$lib/components/layout/hint-validate.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	const form = useForm();

	function passwordMatch(value: any, form: { values: { password: any } }) {
		return value === form.values.password ? null : { passwordMatch: true };
	}

	let loading = false;
</script>

<div class="flex min-h-screen bg-[#3583c6]">
	<!-- Left side -->
	<div class="flex-1 flex flex-col gap-6 px-12 justify-center items-center text-white bg-[url('/img/bg.png')] bg-cover bg-center bg-opacity-50">
		<div class="flex flex-col gap-2 items-center">
			<h2 class="text-xl font-medium mb-4">Hello! Welcome</h2>
			<h1 class="text-4xl font-semibold ">Create Your Demo Room</h1>
		</div>

		<div class="w-[89px] h-2 bg-white"></div>

		<div class="text-lg text-center font-light ">
			Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
			dolore aliqua. Ut enim ad minim veniam, quis nostrud laboris.
		</div>
	</div>

	<!-- Right side -->
	<div class="flex-1 bg-white flex items-center justify-center">
		<div class="w-96">
			<div class="mb-6">
				<h2 class="text-2xl text-primary text-center font-semibold mb-2">Create Account</h2>
				<p class="text-gray-600 text-sm font-light text-center">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
					labore et dolore aliqua. Ut enim ad minim veniam, quis nostrud laboris.
				</p>
			</div>
			<form
				action="?/register"
				method="POST"
				use:form
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						console.log('register results', result);
						if (result.type === 'success') {
							toast.success('Successfully registered');
							goto('/');
						} else {
							toast.error('Error occurred while registering user');
						}
					};
				}}
				class="space-y-4"
			>
				<!-- Name input -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							id="name"
							name="name"
							placeholder="Your name"
							class="w-full border border-input bg-background px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							required
							use:validators={[required, minLength(3), maxLength(20)]}
						/>
					</div>
				</div>
				<HintGroup for="name">
					<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
						<Hint on="required"><HintValidate>Name is required</HintValidate></Hint>
						<Hint on="minLength"><HintValidate>Name must be at least 3 characters</HintValidate></Hint>
						<Hint on="maxLength"><HintValidate>Name must be at most 20 characters</HintValidate></Hint>
					</div>
				</HintGroup>

				<!-- Email input -->
				<div class="flex gap-1 items-center h-11">
					<div class="h-full w-[6px] bg-primary"></div>
					<div class="w-full">
						<input
							id="email"
							type="email"
							name="email"
							placeholder="m@example.com"
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
						<span>Registering...</span>
					{:else}
						<span>Register</span>
					{/if}
				</Button>
			</form>
			<div class="mt-4 text-center text-sm">
				Already have an account?
				<a href="/login" class="underline">Sign in</a>
			</div>
		</div>
	</div>
</div>
