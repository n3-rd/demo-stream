<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Phone, PlayCircle, Smartphone } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { goto } from '$app/navigation';
	export let isLoggedIn;
</script>

<div
	class="hero relative mx-auto mt-9 flex h-[629px] w-[94%] flex-col items-center justify-center gap-9 rounded-xl bg-white"
>
	<h1 class="max-w-[924px] text-center text-3xl font-bold leading-10 text-primary">
		The Demo Room <br /> Showcasing Innovation by Clearsky Software Solutions
	</h1>
	<p class="max-w-[924px] text-center font-semibold">
		Discover our demo room for real-time demonstrations and explanations, addressing your needs and
		showcasing the benefits of our solutions.
	</p>
	<img
		src="/img/hero-placeholder.png"
		alt="demo placeholder"
		class="hero-placeholder h-60 w-[408px]"
	/>

	<div class="absolute bottom-8 right-8 flex flex-col gap-2">
		<Button
			class="gap-3 rounded-3xl bg-primary px-4 py-6 text-xl font-semibold hover:text-white"
			on:click={() => {
				if (isLoggedIn) {
					goto('/demo');
				} else {
					goto('/login');
				}
			}}
		>
			Create a Demo Room <PlayCircle />
		</Button>
		<div
			class="flex flex-col items-center gap-3 rounded-[26px] bg-primary pt-4 font-bold text-white hover:text-white"
		>
			<p>QUESTIONS? JUST ASK!</p>

			<Dialog.Root>
				<Dialog.Trigger
					class="flex w-full gap-3 rounded-3xl border border-primary bg-white p-4 text-center text-xl font-semibold text-primary hover:text-white"
				>
					<div class="mx-auto flex gap-2">TEXT US <Smartphone /></div>
				</Dialog.Trigger>
				<Dialog.Content class="w-[481px] p-9">
					<Dialog.Header>
						<Dialog.Title>
							<img src="/logo/main-logo.svg" alt="clearsky" class="mx-auto h-9 w-[131px]" />
						</Dialog.Title>
						<Dialog.Description class="py-7 text-center">
							<b>Text with us.</b> Message us now. book a demo.
						</Dialog.Description>

						<div class="flex flex-col gap-4 bg-[#F2F3F4] px-16 py-7">
							<Button
								class="w-full gap-2 rounded-[27px] bg-white py-4 text-2xl font-semibold text-foreground hover:text-white"
								><Smartphone /> Text Us</Button
							>
							<Button
								class="w-full gap-2 rounded-[27px] bg-white py-4 text-2xl font-semibold text-foreground hover:text-white"
								><Phone /> Request a Call</Button
							>
							<Button
								class="w-full gap-2 rounded-[27px] bg-white py-4 text-2xl font-semibold text-foreground hover:text-white"
								><PlayCircle />Watch a Demo</Button
							>
						</div>
					</Dialog.Header>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</div>
</div>
