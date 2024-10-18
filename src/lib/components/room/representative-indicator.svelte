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
        <div class="relative bg-red-500 h-32 w-52 rounded-lg overflow-hidden">
            <img 
                src={participant.avatar 
                    ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/${participant.collectionId}/${participant.id}/${participant.avatar}` 
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.user_name)}&background=random`} 
                alt="{participant.user_name}'s Avatar" 
                class="w-full h-full object-cover object-center"
            />
            <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                {participant.user_name || 'Unknown'}
            </div>
        </div>
        {/if}
        {/each}
    </div>
    {/if}
