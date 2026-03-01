<script lang="ts">
	import { Calendar as CalendarPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	type $$Props = CalendarPrimitive.HeaderProps;

	interface Props {
		class?: $$Props["class"];
		children?: import('svelte').Snippet;
		[key: string]: any
	}

	let { class: className = undefined, children, ...rest }: Props = $props();
	
</script>

<CalendarPrimitive.Header
	class={cn("relative flex w-fit items-center gap-10 mx-auto pt-1", className)}
	{...rest}
>
	{@render children?.()}
</CalendarPrimitive.Header>
