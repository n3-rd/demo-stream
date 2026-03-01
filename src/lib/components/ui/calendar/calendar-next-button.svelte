<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import { buttonVariants } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils";

	type $$Props = CalendarPrimitive.NextButtonProps;
	type $$Events = CalendarPrimitive.NextButtonEvents;

	interface Props {
		class?: $$Props["class"];
		children?: import('svelte').Snippet<[any]>;
		[key: string]: any
	}

	let { class: className = undefined, children, ...rest }: Props = $props();
	

	const children_render = $derived(children);
</script>

<CalendarPrimitive.NextButton
	on:click
	class={cn(
		buttonVariants({ variant: "outline" }),
		"h-8 w-8 rounded-full bg-primary/20 p-0 ",
		className
	)}
	{...rest}
	
>
	{#snippet children({ builder })}
		{#if children_render}{@render children_render({ builder, })}{:else}
			<ChevronRight class="h-4 w-4 text-primary" />
		{/if}
	{/snippet}
</CalendarPrimitive.NextButton>
