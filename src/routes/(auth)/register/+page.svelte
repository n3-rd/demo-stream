<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		useForm,
		HintGroup,
		Hint,
		validators,
		email,
		required,
		minLength,
		maxLength
	} from 'svelte-use-form';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import HintValidate from '$lib/components/layout/hint-validate.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';

	const form = useForm();

	function passwordMatch(value: any, form: { values: { password: any } }) {
		if (value !== form.values.password) {
			return { passwordMatch: true };
		}
	}
</script>

<div class="flex h-screen min-w-full items-center justify-center">
	<Card.Root class="mx-auto max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Sign Up</Card.Title>
			<Card.Description>Enter your information to create an account</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				action="?/register"
				method="POST"
				use:form
				use:enhance={() => {
					return async ({ result }) => {
						console.log('register results', result);
						if ((result.status = 200)) {
							toast.success('successfully Registered');
							goto('/');
						} else {
							toast.error('error occoured while registering user');
						}
					};
				}}
			>
				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label for="name">name</Label>
						<input
							id="name"
							name="name"
							placeholder="Max"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							required
							use:validators={[required, minLength(3), maxLength(20)]}
						/>
						<HintGroup for="name">
							<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
								<Hint on="required"><HintValidate>Name is required</HintValidate></Hint>
								<Hint on="minLength"
									><HintValidate>Name must be at least 3 characters</HintValidate></Hint
								>
								<Hint on="maxLength"
									><HintValidate>Name must be at most 20 characters</HintValidate></Hint
								>
							</div>
						</HintGroup>
					</div>
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
							<Hint on="required">
								<HintValidate>Email is required</HintValidate>
							</Hint>
							<Hint on="email" hideWhenRequired>
								<HintValidate>Email is not valid</HintValidate>
							</Hint>
						</HintGroup>
					</div>
					<div class="grid gap-2">
						<Label for="password">Password</Label>
						<input
							type="password"
							name="password"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							id="password"
							use:validators={[required, minLength(8), maxLength(30)]}
						/>
						<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
							<Hint for="password" on="required">
								<HintValidate>Password is required</HintValidate>
							</Hint>
							<Hint for="password" on="minLength">
								<HintValidate>Password must be at least 8 characters</HintValidate>
							</Hint>

							<Hint for="password" on="maxLength">
								<HintValidate>Password must be at most 30 characters</HintValidate>
							</Hint>
						</div>
					</div>
					<div class="grid gap-2">
						<Label for="passwordConfirm">Confirm Password</Label>
						<input
							type="password"
							name="passwordConfirm"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
							id="passwordConfirm"
							use:validators={[required, passwordMatch]}
						/>
						<div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
							<Hint for="passwordConfirm" on="required"
								><HintValidate>Password confirmation is required</HintValidate></Hint
							>
							<Hint for="passwordConfirm" on="passwordMatch"
								><HintValidate>Passwords do not match</HintValidate></Hint
							>
						</div>
					</div>
					<Button type="submit" class="w-full" disabled={!$form.valid}>Create an account</Button>
				</div>
			</form>
			<div class="mt-4 text-center text-sm">
				Already have an account?
				<a href="/login" class="underline"> Sign in </a>
			</div>
		</Card.Content>
	</Card.Root>
</div>
