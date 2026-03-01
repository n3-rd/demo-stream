<script lang="ts">
	import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';
	import { onMount, tick } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		participants?: any[];
		selfName?: string;
	}

	let { participants = [], selfName = $bindable('') }: Props = $props();

	const dispatch = createEventDispatcher();
	const ASPECT = 9 / 16;
	const MIN_W = 320;
	const MAX_W = 960;
	const DEFAULT_W = 648;

	let panelWidth = $state(DEFAULT_W);
	let posX = $state(0);
	let posY = $state(0);
	let ready = $state(false);

	let panelEl: HTMLElement = $state();
	let parentEl: HTMLElement | null = null;

	let dragging = $state(false);
	let resizing = $state(false);
	let dragOffsetX = 0;
	let dragOffsetY = 0;
	let resizeStartX = 0;
	let resizeStartW = 0;


	function clampPos() {
		if (!parentEl) return;
		const pr = parentEl.getBoundingClientRect();
		posX = Math.max(0, Math.min(posX, pr.width - panelWidth));
		posY = Math.max(0, Math.min(posY, pr.height - panelHeight - 24));
	}

	function anchorBottomRight() {
		if (!parentEl) return;
		const pr = parentEl.getBoundingClientRect();
		posX = pr.width - panelWidth - 16;
		posY = pr.height - panelHeight - 16;
		clampPos();
	}

	// --- Drag ---
	function onDragStart(e: MouseEvent) {
		const t = e.target as HTMLElement;
		if (!t || t.closest('.resize-handle')) return;
		e.preventDefault();
		dragging = true;
		const pr = parentEl!.getBoundingClientRect();
		dragOffsetX = e.clientX - pr.left - posX;
		dragOffsetY = e.clientY - pr.top - posY;
	}

	// --- Resize ---
	function onResizeStart(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		resizing = true;
		resizeStartX = e.clientX;
		resizeStartW = panelWidth;
	}

	function onPointerMove(e: MouseEvent) {
		if (dragging && parentEl) {
			const pr = parentEl.getBoundingClientRect();
			posX = e.clientX - pr.left - dragOffsetX;
			posY = e.clientY - pr.top - dragOffsetY;
			clampPos();
		} else if (resizing) {
			const dx = e.clientX - resizeStartX;
			panelWidth = Math.max(MIN_W, Math.min(resizeStartW + dx, MAX_W));
			if (parentEl) {
				const pr = parentEl.getBoundingClientRect();
				panelWidth = Math.min(panelWidth, pr.width - 20);
			}
			clampPos();
		}
	}

	function onPointerEnd() {
		dragging = false;
		resizing = false;
	}

	// --- Filtering ---
	function extractNameFromId(id: string): string {
		const last = (id || '').toString().split('-').pop() || '';
		return last.replace(/_+representative$/i, '').replace(/_/g, ' ').trim() || 'Representative';
	}

	function isRep(participant: any) {
		if (!participant) return false;
		if (typeof participant === 'string') return /_representative$/i.test(participant.split('-').pop() || '');
		if (participant.isRepresentative !== undefined) return !!participant.isRepresentative;
		if (participant.name) return /_representative$/i.test(String(participant.name));
		if (participant.streamId) return /_representative$/i.test(String(participant.streamId).split('-').pop() || '');
		return false;
	}

	function getParticipantName(participant: any) {
		if (!participant) return 'Representative';
		if (typeof participant === 'string') return extractNameFromId(participant);
		if (participant.name) return String(participant.name).replace(/_+representative$/i, '');
		if (participant.streamName) return String(participant.streamName).replace(/_+representative$/i, '');
		if (participant.streamId) return extractNameFromId(String(participant.streamId));
		return 'Representative';
	}

	function normalizeName(v: string) { return (v || '').trim().toLowerCase(); }

	function shouldShow(p: any) {
		if (!selfName) return true;
		return normalizeName(getParticipantName(p)) !== normalizeName(selfName);
	}


	onMount(() => {
		window.addEventListener('mousemove', onPointerMove);
		window.addEventListener('mouseup', onPointerEnd);

		if (!selfName) {
			try {
				const cookie = document.cookie.split('; ').find(c => c.startsWith('rep_user='));
				if (cookie) {
					const rep = JSON.parse(decodeURIComponent(cookie.split('=')[1] || ''));
					if (rep?.name) selfName = rep.name;
				}
			} catch {}
		}

		return () => {
			window.removeEventListener('mousemove', onPointerMove);
			window.removeEventListener('mouseup', onPointerEnd);
		};
	});

	async function initPosition(node: HTMLElement) {
		await tick();
		parentEl = node.closest('.video-container') as HTMLElement || node.parentElement;
		ready = true;
		anchorBottomRight();

		if (typeof ResizeObserver !== 'undefined' && parentEl) {
			const ro = new ResizeObserver(() => clampPos());
			ro.observe(parentEl);
			return { destroy: () => ro.disconnect() };
		}
	}
	let visibleRepresentatives = $derived((participants || []).filter((p: any) => isRep(p) && shouldShow(p)));
	let panelHeight = $derived(visibleRepresentatives.length * Math.round(panelWidth * ASPECT) + (visibleRepresentatives.length - 1) * 6 + 8);
</script>

{#if visibleRepresentatives.length > 0}
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="rep-panel"
	class:is-dragging={dragging}
	class:is-resizing={resizing}
	style="left:{posX}px;top:{posY}px;width:{panelWidth}px;opacity:{ready ? 1 : 0}"
	onmousedown={onDragStart}
	bind:this={panelEl}
	use:initPosition
	role="group"
	aria-label="Representative cameras"
>
	{#each visibleRepresentatives as participant (typeof participant === 'string' ? participant : participant.streamId || participant.id)}
		<div class="rep-video" style="padding-top:{ASPECT * 100}%">
			<iframe
				title="{getParticipantName(participant)} camera"
				src="https://{PUBLIC_ANT_MEDIA_URL}/WebRTCAppEE/play.html?id={encodeURIComponent(typeof participant === 'string' ? participant : participant.streamId || participant.id)}"
				allowfullscreen
			></iframe>
			<span class="rep-name">{getParticipantName(participant)}</span>
		</div>
	{/each}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="resize-handle" onmousedown={onResizeStart}>
		<svg width="12" height="12" viewBox="0 0 12 12"><path d="M11 1v10H1" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-linecap="round"/><path d="M11 5v6H5" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-linecap="round"/></svg>
	</div>
</div>
{/if}

<style>
	.rep-panel {
		position: absolute;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 4px;
		background: rgba(0, 0, 0, 0.55);
		border-radius: 10px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		cursor: move;
		user-select: none;
		touch-action: none;
		transition: box-shadow 0.15s, background 0.15s, opacity 0.25s;
	}
	.rep-panel:hover {
		background: rgba(0, 0, 0, 0.7);
		box-shadow: 0 6px 28px rgba(0, 0, 0, 0.55);
	}
	.rep-panel.is-dragging,
	.rep-panel.is-resizing {
		transition: none;
	}

	.rep-video {
		position: relative;
		width: 100%;
		padding-top: 56.25%; /* 16:9 fallback */
		border-radius: 6px;
		overflow: hidden;
		background: #111;
	}
	.rep-video iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: none;
		pointer-events: none;
	}

	.rep-name {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 3px 8px;
		background: linear-gradient(transparent, rgba(0,0,0,.75));
		color: #fff;
		font-size: 12px;
		font-weight: 500;
		text-align: center;
		pointer-events: none;
		line-height: 1.6;
	}

	.resize-handle {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: nwse-resize;
		border-radius: 0 0 10px 0;
		opacity: 0.5;
		transition: opacity 0.15s;
	}
	.resize-handle:hover {
		opacity: 1;
	}
</style>
