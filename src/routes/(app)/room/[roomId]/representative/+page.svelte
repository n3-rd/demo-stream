<script lang="ts">
  export let data;
  let { representative } = data.representative;
</script>

{#if representative}
 redirecting to meeting.....
{:else}
  <p>You are not a representative, hence you cannot access through this  page</p>
{/if}
