import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_ANT_MEDIA_URL } from '$env/static/public';

interface EncoderSettings {
    height: number;
    videoBitrate: number;
    audioBitrate: number;
    forceEncode: boolean;
}

interface HLSParameters {
    hlsTime: string;
    hlsListSize: string;
    hlsPlayListType: string;
}

interface EndPoint {
    status: string;
    type: string;
    rtmpUrl: string;
    endpointServiceId: string;
}

interface PlayListItem {
    streamUrl: string;
    type: string;
    name: string;
    durationInMs: number;
    seekTimeInMs: number;
}

interface BroadcastObject {
    streamId: string;
    status?: 'finished' | 'broadcasting' | 'created' | 'preparing' | 'error' | 'failed';
    playListStatus?: 'finished' | 'broadcasting' | 'created' | 'preparing' | 'error' | 'failed';
    type?: 'liveStream' | 'ipCamera' | 'streamSource' | 'VoD' | 'playlist';
    publishType?: 'WebRTC' | 'RTMP' | 'Pull';
    name: string;
    description?: string;
    publish?: boolean;
    date?: number;
    plannedStartDate?: number;
    plannedEndDate?: number;
    duration?: number;
    endPointList?: EndPoint[];
    playListItemList?: PlayListItem[];
    publicStream?: boolean;
    is360?: boolean;
    listenerHookURL?: string;
    category?: string;
    ipAddr?: string;
    username?: string;
    password?: string;
    quality?: string;
    speed?: number;
    streamUrl?: string;
    originAdress?: string;
    mp4Enabled?: number;
    webMEnabled?: number;
    seekTimeInMs?: number;
    conferenceMode?: string;
    subtracksLimit?: number;
    expireDurationMS?: number;
    rtmpURL?: string;
    zombi?: boolean;
    pendingPacketSize?: number;
    hlsViewerCount?: number;
    dashViewerCount?: number;
    webRTCViewerCount?: number;
    rtmpViewerCount?: number;
    startTime?: number;
    receivedBytes?: number;
    bitrate?: number;
    userAgent?: string;
    latitude?: string;
    longitude?: string;
    altitude?: string;
    mainTrackStreamId?: string;
    subTrackStreamIds?: string[];
    absoluteStartTimeMs?: number;
    webRTCViewerLimit?: number;
    hlsViewerLimit?: number;
    dashViewerLimit?: number;
    subFolder?: string;
    currentPlayIndex?: number;
    metaData?: string;
    playlistLoopEnabled?: boolean;
    updateTime?: number;
    role?: string;
    hlsParameters?: HLSParameters;
    autoStartStopEnabled?: boolean;
    encoderSettingsList?: EncoderSettings[];
}

interface StreamCreateRequest {
    streamId: string;
    name: string;
    description?: string;
    camera?: boolean;
    publish?: boolean;
    encoderSettings?: EncoderSettings;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.pb.authStore.isValid) {
        return json({
            success: false,
            message: 'Unauthorized'
        }, { status: 401 });
    }

    try {
        const body: StreamCreateRequest = await request.json();
        const { streamId, name, description, camera = true, publish = true, encoderSettings } = body;

        if (!streamId || !name) {
            return json({
                success: false,
                message: 'Stream ID and name are required'
            }, { status: 400 });
        }

        // Format the URL for Ant Media Server
        const serverUrl = PUBLIC_ANT_MEDIA_URL || '54.198.58.66:5080';
        const host = serverUrl.replace(/^(wss?:\/\/|https?:\/\/)/, '');
        const apiUrl = `http://${host}/WebRTCAppEE/rest/v2/broadcasts/create`;

        const defaultEncoderSettings: EncoderSettings = {
            height: 720,
            videoBitrate: 1000000,
            audioBitrate: 128000,
            forceEncode: true
        };

        const streamData: BroadcastObject = {
            streamId,
            name,
            description: description || '',
            type: "liveStream",
            publishType: "WebRTC",
            publish,
            publicStream: true,
            status: "created",
            date: Date.now(),
            webRTCViewerLimit: 100,
            hlsViewerLimit: 100,
            dashViewerLimit: 100,
            mp4Enabled: 1,
            webMEnabled: 0,
            encoderSettingsList: [encoderSettings || defaultEncoderSettings],
            autoStartStopEnabled: true,
            hlsParameters: {
                hlsTime: "2",
                hlsListSize: "5",
                hlsPlayListType: "EVENT"
            },
            // Camera specific settings
            ...(camera && {
                is360: false,
                conferenceMode: "play",
                quality: "720p",
            })
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(streamData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.message?.includes('already being used')) {
                return json({
                    success: false,
                    message: 'Stream ID is already in use. Please choose a different stream ID.',
                    error: 'STREAM_ID_CONFLICT'
                }, { status: 409 });
            }

            return json({
                success: false,
                message: result.message || 'Failed to create stream',
                error: result
            }, { status: response.status });
        }

        // Store stream info in PocketBase
        // await locals.pb.collection('streams').create({
        //     stream_id: streamId,
        //     name,
        //     description: description || '',
        //     user: locals.pb.authStore.model.id,
        //     rtmp_url: result.rtmpURL,
        //     status: result.status,
        //     camera_enabled: camera,
        //     publish_enabled: publish,
        //     encoder_settings: encoderSettings || defaultEncoderSettings
        // });

        return json({
            success: true,
            stream: result
        });

    } catch (error) {
        console.error('Error creating stream:', error);
        return json({
            success: false,
            message: 'Failed to create stream',
            error: error.message
        }, { status: 500 });
    }
};