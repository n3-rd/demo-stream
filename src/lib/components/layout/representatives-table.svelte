<script>
    import { Button } from '$lib/components/ui/button';
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Table from "$lib/components/ui/table";
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { toast } from 'svelte-sonner';

    export let users;
    export let superUser;
    let representatives;
    let nonRepresentatives;
    let addRepresentativeDialogOpen = false;

    $: {
        users = users;
        representatives = users.filter(user => user.representative === true);
        nonRepresentatives = users.filter(user => user.representative !== true);
    }

    async function toggleRepresentative(userId, makeRepresentative) {
        try {
            const response = await fetch('/api/toggle-representative', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, makeRepresentative }),
            });

            if (response.ok) {
                invalidateAll();
                toast.success(makeRepresentative ? 'User added as representative' : 'User removed as representative');
                if (makeRepresentative) addRepresentativeDialogOpen = false;
            } else {
                toast.error('Failed to update representative status');
            }
        } catch (error) {
            console.error('Error updating representative status:', error);
            toast.error('An error occurred while updating representative status');
        }
    }
</script>

<Table.Root>
    <Table.Caption>A list of your All Representatives.</Table.Caption>
    <Table.Header>
        <Table.Row>
            <Table.Head class="w-[100px]">Name</Table.Head>
            <Table.Head>Email</Table.Head>
            <Table.Head>id</Table.Head>
            <Table.Head class="text-right"></Table.Head>
        </Table.Row>
    </Table.Header>
    <Table.Body>
        {#each representatives as representative}
            <Table.Row>
                <Table.Cell class="font-medium">{representative.name}</Table.Cell>
                <Table.Cell>{representative.email}</Table.Cell>
                <Table.Cell>{representative.id}</Table.Cell>
                <Table.Cell class="text-right">
                    {#if superUser}
                        <Dialog.Root>
                            <Dialog.Trigger>
                                <Button variant="ghost" class="text-red-500">Remove</Button>
                            </Dialog.Trigger>
                            <Dialog.Content>
                                <Dialog.Title>Are you sure you want to remove {representative.name} as a representative?</Dialog.Title>
                                <Dialog.Close asChild>
                                    <Button variant="destructive" on:click={() => toggleRepresentative(representative.id, false)}>
                                        Remove {representative.name}
                                    </Button>
                                </Dialog.Close>
                            </Dialog.Content>
                        </Dialog.Root>
                    {/if}
                </Table.Cell>
            </Table.Row>
        {/each}
    </Table.Body>
</Table.Root>

