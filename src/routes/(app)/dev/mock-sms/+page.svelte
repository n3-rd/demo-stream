<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';

	interface MockSMS {
		id: string;
		to: string;
		message: string;
		timestamp: string;
		code: string;
	}

	let mockCodes: MockSMS[] = [];
	let loading = false;
	let autoRefresh = true;
	let refreshInterval: NodeJS.Timeout;

	// Redirect if not in dev mode
	onMount(() => {
		if (!dev) {
			toast.error('Mock SMS viewer is only available in development mode');
			goto('/');
			return;
		}
		
		loadMockCodes();
		
		// Auto-refresh every 3 seconds
		if (autoRefresh) {
			refreshInterval = setInterval(loadMockCodes, 3000);
		}
		
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});

	async function loadMockCodes() {
		loading = true;
		try {
			const response = await fetch('/api/dev/mock-sms');
			const result = await response.json();
			
			if (result.success) {
				mockCodes = result.codes;
			} else {
				console.error('Failed to load mock codes:', result.error);
			}
		} catch (error) {
			console.error('Error loading mock codes:', error);
		} finally {
			loading = false;
		}
	}

	async function clearCodes() {
		try {
			const response = await fetch('/api/dev/mock-sms', { method: 'DELETE' });
			const result = await response.json();
			
			if (result.success) {
				mockCodes = [];
				toast.success('Mock SMS codes cleared');
			} else {
				toast.error(result.error || 'Failed to clear codes');
			}
		} catch (error) {
			console.error('Error clearing codes:', error);
			toast.error('Failed to clear codes');
		}
	}

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			toast.success('Code copied to clipboard!');
		} catch (error) {
			console.error('Failed to copy code:', error);
			toast.error('Failed to copy code');
		}
	}

	function formatTimestamp(timestamp: string) {
		return new Date(timestamp).toLocaleTimeString();
	}

	function formatPhone(phone: string) {
		if (phone.startsWith('+1') && phone.length === 12) {
			// US number: +12345678901 -> (234) 567-8901
			const digits = phone.slice(2);
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
		}
		return phone;
	}

	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		
		if (autoRefresh) {
			refreshInterval = setInterval(loadMockCodes, 3000);
			toast.success('Auto-refresh enabled');
		} else {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
			toast.success('Auto-refresh disabled');
		}
	}
</script>

<svelte:head>
	<title>Mock SMS Codes - Development</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-4xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-2 mb-2">
			<div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
				<svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
					<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
				</svg>
			</div>
			<h1 class="text-3xl font-bold text-gray-900">Mock SMS Codes</h1>
			<Badge variant="secondary" class="bg-yellow-100 text-yellow-800">DEV ONLY</Badge>
		</div>
		<p class="text-gray-600">Development tool to view verification codes without sending real SMS</p>
	</div>

	<!-- Controls -->
	<div class="flex flex-wrap gap-4 mb-6">
		<Button on:click={loadMockCodes} disabled={loading} variant="outline">
			{#if loading}
				<svg class="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="10" class="opacity-25" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A8.001 8.001 0 014.708 4.708L2.293 7.121l1.414 1.414 2.415-2.415zm12.586-2.415l2.415 2.415 1.414-1.414-2.415-2.415-2.415 2.415zM20 12a8 8 0 01-8 8v4c6.627 0 12-5.373 12-12h-4z"></path>
				</svg>
				Refreshing...
			{:else}
				🔄 Refresh
			{/if}
		</Button>
		
		<Button 
			on:click={toggleAutoRefresh} 
			variant={autoRefresh ? "default" : "outline"}
			class={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
		>
			{autoRefresh ? "🟢 Auto-refresh ON" : "⚪ Auto-refresh OFF"}
		</Button>
		
		<Button on:click={clearCodes} variant="destructive">
			🗑️ Clear All
		</Button>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
						<span class="text-blue-600 font-bold text-sm">{mockCodes.length}</span>
					</div>
					<div>
						<p class="font-medium">Total Codes</p>
						<p class="text-sm text-gray-500">In memory</p>
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
						<span class="text-green-600 font-bold text-sm">10</span>
					</div>
					<div>
						<p class="font-medium">Max Stored</p>
						<p class="text-sm text-gray-500">Auto-cleanup</p>
					</div>
				</div>
			</CardContent>
		</Card>
		
		<Card>
			<CardContent class="p-4">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
						<span class="text-purple-600 font-bold text-sm">3s</span>
					</div>
					<div>
						<p class="font-medium">Refresh Rate</p>
						<p class="text-sm text-gray-500">When enabled</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- SMS Codes List -->
	{#if mockCodes.length === 0}
		<Card>
			<CardContent class="p-8 text-center">
				<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
						<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
					</svg>
				</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">No SMS codes yet</h3>
				<p class="text-gray-500 mb-4">Try registering a new admin account to see verification codes appear here</p>
				<Button on:click={() => goto('/register')} variant="outline">
					Go to Registration
				</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each mockCodes as sms (sms.id)}
				<Card class="transition-all hover:shadow-md">
					<CardHeader class="pb-3">
						<div class="flex items-center justify-between">
							<CardTitle class="text-lg flex items-center gap-2">
								<Badge variant="outline" class="bg-blue-50 text-blue-700 font-mono text-lg px-3 py-1">
									{sms.code}
								</Badge>
								<span class="text-sm font-normal text-gray-500">→</span>
								<span class="text-base font-medium">{formatPhone(sms.to)}</span>
							</CardTitle>
							<div class="flex items-center gap-2">
								<span class="text-sm text-gray-500">{formatTimestamp(sms.timestamp)}</span>
								<Button 
									size="sm" 
									variant="ghost" 
									on:click={() => copyCode(sms.code)}
									class="h-8 w-8 p-0"
								>
									<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
										<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
									</svg>
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent class="pt-0">
						<CardDescription class="font-mono text-sm bg-gray-50 p-3 rounded border">
							{sms.message}
						</CardDescription>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}

	<!-- Footer -->
	<div class="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
		<div class="flex items-start gap-3">
			<svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
			</svg>
			<div>
				<h3 class="font-medium text-yellow-800">Development Mode Only</h3>
				<p class="text-sm text-yellow-700 mt-1">
					This mock SMS receiver is only active in development mode. In production, real SMS will be sent via Telnyx.
					Codes are stored in memory and will be lost when the server restarts.
				</p>
			</div>
		</div>
	</div>
</div> 