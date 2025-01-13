<script lang="ts">

    import { Button } from "$lib/components/ui/button";
    import { PUBLIC_POCKETBASE_INSTANCE } from "$env/static/public";
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { toast } from "svelte-sonner";
    import { enhance } from "$app/forms";
    import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import Sidenav from '$lib/components/layout/sidenav.svelte';
	import { invalidateAll } from "$app/navigation";
    import { useForm, HintGroup, Hint, validators, email, required } from 'svelte-use-form';
    import { slide } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    import HintValidate from '$lib/components/layout/hint-validate.svelte';

    export let data;
    const { representatives } = data;

    let showAddDialog = false;
    let editingRep: any = null;
    let expandedRep: string | null = null;
    const form = useForm();

    function toggleExpand(id: string) {
        expandedRep = expandedRep === id ? null : id;
    }
</script>

<div class="flex h-screen bg-gray-100">
    <Sidenav activePage="representatives" />

    <div class="flex-1 overflow-auto">
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-medium text-gray-700">Representatives</h1>
                <Button 
                    class="bg-[#4B77BE] hover:bg-[#4B77BE]/90 text-white"
                    on:click={() => {
                        editingRep = null;
                        showAddDialog = true;
                    }}
                >
                    Add Representative
                </Button>
            </div>

            <div class="bg-white rounded-lg shadow">
                <!-- Table Header -->
                <div class="grid grid-cols-[80px_1fr_1fr_1fr_1fr_100px] gap-4 p-4 border-b text-sm font-medium text-gray-600">
                    <div>Icon</div>
                    <div>Name</div>
                    <div>Phone</div>
                    <div>Email</div>
                    <div>Location</div>
                    <div></div>
                </div>

                <!-- Table Body -->
                {#each representatives as rep}
                    <div class="border-b last:border-b-0">
                        <!-- Main Row -->
                        <div class="grid grid-cols-[80px_1fr_1fr_1fr_1fr_100px] gap-4 p-4 items-center">
                            <div>
                                {#if rep.avatar}
                                    <img
                                        src={`${PUBLIC_POCKETBASE_INSTANCE}/api/files/representatives/${rep.id}/${rep.avatar}`}
                                        alt={rep.name}
                                        class="w-10 h-10 rounded-full object-cover"
                                    />
                                {:else}
                                    <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <span class="text-lg font-semibold text-gray-600">
                                            {rep.name[0].toUpperCase()}
                                        </span>
                                    </div>
                                {/if}
                            </div>
                            <div class="text-gray-900">{rep.name}</div>
                            <div class="text-gray-600">{rep.phone}</div>
                            <div class="text-gray-600">{rep.email}</div>
                            <div class="text-gray-600">{rep.location || '-'}</div>
                            <div class="flex items-center justify-end gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    class="h-8 w-8 p-0"
                                    on:click={() => toggleExpand(rep.id)}
                                >
                                    {#if expandedRep === rep.id}
                                        <ChevronUp class="h-4 w-4" />
                                    {:else}
                                        <ChevronDown class="h-4 w-4" />
            {/if}
                                </Button>
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild let:builder>
                                        <Button 
                                            variant="ghost"
                                            size="sm"
                                            class="h-8 w-8 p-0"
                                            builders={[builder]}
                                        >
                                            <MoreHorizontal class="h-4 w-4" />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content>
                                        <DropdownMenu.Item on:click={() => {
                                            editingRep = rep;
                                            showAddDialog = true;
                                        }}>
                                            Edit
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
    </div>
</div>

                        <!-- Expanded Content -->
                        {#if expandedRep === rep.id}
                            <div class="px-4 pb-4">
                                <div class="grid grid-cols-2 gap-6">
                                    <!-- Connected Content -->
                                    <div>
                                        <h3 class="font-medium mb-2">Connected to Content ID</h3>
                                        <div class="bg-[#F8F9FC] rounded p-4">
                                            <div class="grid grid-cols-4 gap-4 text-sm">
                                                <div>Image</div>
                                                <div>Video</div>
                                                <div>PDF</div>
                                                <div>Word</div>
                                            </div>
                                            {#if rep.expand?.connected_content?.length}
                                                <div class="grid grid-cols-4 gap-4 mt-2">
                                                    <!-- Images -->
                                                    <div class="text-sm">
                                                        {#each rep.expand.connected_content.filter(c => c.type === 'image') as content}
                                                            <div>
                                                                <div class="text-gray-600">Title {content.title || content.id}</div>
                                                                <div class="font-medium">id{content.id}</div>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                    <!-- Videos -->
                                                    <div class="text-sm">
                                                        {#each rep.expand.connected_content.filter(c => c.type === 'video') as content}
                                                            <div>
                                                                <div class="text-gray-600">Title {content.title || content.id}</div>
                                                                <div class="font-medium">id{content.id}</div>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                    <!-- PDFs -->
                                                    <div class="text-sm">
                                                        {#each rep.expand.connected_content.filter(c => c.type === 'pdf') as content}
                                                            <div>
                                                                <div class="text-gray-600">Title {content.title || content.id}</div>
                                                                <div class="font-medium">id{content.id}</div>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                    <!-- Documents -->
                                                    <div class="text-sm">
                                                        {#each rep.expand.connected_content.filter(c => c.type === 'document') as content}
                                                            <div>
                                                                <div class="text-gray-600">Title {content.title || content.id}</div>
                                                                <div class="font-medium">id{content.id}</div>
                </div>
            {/each}
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
        </div>

                                    <!-- Schedule -->
                                    <div>
                                        <h3 class="font-medium mb-2">Schedule</h3>
                                        <div class="bg-[#F8F9FC] rounded p-4">
                                            <div class="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <div class="text-gray-600">Monday</div>
                                                    <div class="font-medium">{rep.schedule?.monday || '8:00AM - 5:00PM'}</div>
                                                </div>
                                                <div>
                                                    <div class="text-gray-600">Tuesday</div>
                                                    <div class="font-medium">{rep.schedule?.tuesday || '8:00AM - 5:00PM'}</div>
                                                </div>
                                                <div>
                                                    <div class="text-gray-600">Friday</div>
                                                    <div class="font-medium">{rep.schedule?.friday || '8:00AM - 5:00PM'}</div>
                                                </div>
                                                <div>
                                                    <div class="text-gray-600">Saturday</div>
                                                    <div class="font-medium">{rep.schedule?.saturday || '9:00AM - 3:00PM'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
        </div>
        </div>
    </div>
</div>

<Dialog bind:open={showAddDialog}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>{editingRep ? 'Edit' : 'Add'} Representative</DialogTitle>
        </DialogHeader>
        <form
            action={editingRep ? '?/updateRepresentative' : '?/addRepresentative'}
            method="POST"
            enctype="multipart/form-data"
            use:form
            use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        showAddDialog = false;
                        invalidateAll();
                        toast.success(editingRep ? 'Representative updated' : 'Representative added');
                    } else {
                        toast.error('Error occurred');
                    }
                };
            }}
            class="space-y-4"
        >
            {#if editingRep}
                <input type="hidden" name="id" value={editingRep.id} />
{/if}

            <div class="space-y-2">
                <Label for="name">Name</Label>
                <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    value={editingRep?.name || ''} 
                    required 
                    use:validators={[required]}
                />
                <HintGroup for="name">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Name is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <div class="space-y-2">
                <Label for="email">Email</Label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    value={editingRep?.email || ''} 
                    required 
                    use:validators={[required, email]}
                />
                <HintGroup for="email">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Email is required</HintValidate></Hint>
                        <Hint on="email" hideWhenRequired><HintValidate>Email is not valid</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <div class="space-y-2">
                <Label for="phone">Phone</Label>
                <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    value={editingRep?.phone || ''} 
                />
            </div>

            <div class="space-y-2">
                <Label for="location">Location</Label>
                <input 
                    type="text" 
                    id="location" 
                    name="location" 
                    class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    value={editingRep?.location || ''} 
                    required
                    use:validators={[required]}
                />
                <HintGroup for="location">
                    <div transition:slide={{ delay: 250, duration: 300, easing: quintOut, axis: 'y' }}>
                        <Hint on="required"><HintValidate>Location is required</HintValidate></Hint>
                    </div>
                </HintGroup>
            </div>

            <div class="space-y-2">
                <Label for="avatar">Avatar</Label>
                <input 
                    type="file" 
                    id="avatar" 
                    name="avatar" 
                    class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    accept="image/*" 
                />
            </div>

            <div class="space-y-2">
                <Label>Schedule</Label>
                <div class="grid grid-cols-2 gap-4 gap-y-6">
                    <div>
                        <Label for="monday">Monday</Label>
                        <input 
                            type="text" 
                            id="monday" 
                            name="monday" 
                            class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            value={editingRep?.schedule?.monday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="tuesday">Tuesday</Label>
                        <input 
                            type="text" 
                            id="tuesday" 
                            name="tuesday" 
                            class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            value={editingRep?.schedule?.tuesday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="friday">Friday</Label>
                        <input 
                            type="text" 
                            id="friday" 
                            name="friday" 
                            class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            value={editingRep?.schedule?.friday || '8:00AM - 5:00PM'} 
                        />
                    </div>
                    <div>
                        <Label for="saturday">Saturday</Label>
                        <input 
                            type="text" 
                            id="saturday" 
                            name="saturday" 
                            class="w-full border border-input bg-background rounded-md px-3 py-2 h-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            value={editingRep?.schedule?.saturday || '9:00AM - 3:00PM'} 
                        />
                    </div>
                </div>
            </div>

            <div class="flex justify-end space-x-2 mt-8">
                <Button type="button" variant="outline" on:click={() => showAddDialog = false}>
                    Cancel
                </Button>
                <Button type="submit" disabled={!$form.valid}>
                    {editingRep ? 'Update' : 'Add'} Representative
                </Button>
            </div>
        </form>
    </DialogContent>
</Dialog>
