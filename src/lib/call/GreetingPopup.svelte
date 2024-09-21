<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    export let name;
    export let host;
   </script>
    
   <Dialog.Root
   bind:open={host}
   >
    <!-- <Dialog.Trigger></Dialog.Trigger> -->
    <Dialog.Content>
     <Dialog.Header>
      <Dialog.Title>Hello {name}</Dialog.Title>
      <Dialog.Description>
        welcome, you are admin of this room.
       <p>
        You have privileges to manage this room and control the video call.
       </p>
      </Dialog.Description>
     </Dialog.Header>
    </Dialog.Content>
   </Dialog.Root>