import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
    const roomId = params.roomId;
    const room = await locals.pb.collection('rooms').getFirstListItem(`room_id = "${roomId}"`);
    const associatedVideo = room.associated_video;
    const formattedVideoName = associatedVideo.replace('/video/', '').replace('.mp4', '');
    const videoCollection = await locals.pb.collection('room_videos_duplicate');
    const videoThumb = await videoCollection.getFirstListItem(`video_ref = "${formattedVideoName}"`);
    const thumbnailUrl = locals.pb.getFileUrl(videoThumb, videoThumb.thumbnail);

    return {
        roomId,
        associatedVideo,
        room,
        videoThumb,
        thumbnailUrl
    }
}