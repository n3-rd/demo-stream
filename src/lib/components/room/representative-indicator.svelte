<script lang="ts">
    export let representatives;
    export let participants;
    
    console.log('representatives from indicator', representatives);
    console.log('participants from indicator', participants);
    
    let participantData = [];
    
    $: {
        if (Array.isArray(participants)) {
            participantData = participants.map(participant => {
                if (typeof participant === 'string') {
                    try {
                        return JSON.parse(participant);
                    } catch (error) {
                        console.error('Error parsing participant data:', error);
                        return { name: participant };
                    }
                }
                return participant;
            });
        } else {
            console.error('Participants is not an array:', participants);
        }
    }
    </script>
    
    {#if Array.isArray(participantData)}
        {#each participantData as participant}
            <div class="absolute bottom-0 right-24 top-[67%] h-32 w-52 bg-red-500 z-50">
                {participant.name || 'Unknown'}
            </div>
        {/each}
    {/if}