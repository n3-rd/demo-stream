<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Button } from "$lib/components/ui/button";

    interface Props {
        open?: boolean;
        onSelect: (type: string) => void;
    }

    let { open = $bindable(false), onSelect }: Props = $props();
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>Upload File</Dialog.Title>
            <Dialog.Description>
                Which Library would you like to upload this file to?
            </Dialog.Description>
        </Dialog.Header>
        <div class="flex flex-col gap-3 py-4">
            <Button 
                variant="outline" 
                class="w-full justify-start bg-primary text-white hover:bg-primary/80 rounded-none" 
                on:click={() => onSelect('host')}
            >
                Host Library
            </Button>
            <Button 
                variant="outline" 
                class="w-full justify-start bg-primary text-white hover:bg-primary/80 rounded-none" 
                on:click={() => onSelect('representative')}
            >
                Representative Library
            </Button>
            <Button 
                variant="outline" 
                class="w-full justify-start bg-primary text-white hover:bg-primary/80 rounded-none" 
                on:click={() => onSelect('both')}
            >
                Both
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root> 