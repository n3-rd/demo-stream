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
    <div class="absolute bottom-0 right-24 top-[37%] z-50 flex items-center gap-3 pointer-events-none">
        {#each participantData as participant}
        {#if participant.user_name && participant.user_name.includes('(Representative)')}

        <div class=" bg-red-500 h-32 w-52">

                {participant.user_name || 'Unknown'}
    </div>
    {/if}
        {/each}
        </div>
    {/if}