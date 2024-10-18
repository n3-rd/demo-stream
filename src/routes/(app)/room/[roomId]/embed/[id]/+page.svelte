<script lang="ts">
    export let data;

    const { roomId, associatedVideo, room, videoThumb, thumbnailUrl } = data;
    console.log('associatedVideo', associatedVideo);
    console.log('room', room);
    console.log('roomId', roomId);
    console.log('videoThumb', videoThumb);
    console.log('thumbnailUrl', thumbnailUrl);

    // const videoId = associatedVideo.id;
</script>

<!-- <div>
    <iframe src={`https://www.youtube.com/embed/${videoId}`}></iframe>
</div> -->