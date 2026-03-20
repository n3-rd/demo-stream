import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import {
    VIEWER_LIMITS,
    PUBLISHER_BANDWIDTH_KBPS,
    VIEWER_BANDWIDTH_KBPS,
    getStreamBandwidthBreakdown,
    estimateCapacity
} from '$lib/stream/streamCapacity';

/**
 * GET /api/stream/capacity
 *
 * Returns a rough capacity estimate for this application based on its default
 * stream-creation settings and WebRTC adaptor configuration.
 *
 * Optional query parameter:
 *   ?streams=N   – include a scaled estimate for N concurrent broadcasts (default: 1)
 */
export const GET: RequestHandler = async ({ url }) => {
    const streamsParam = url.searchParams.get('streams');
    const concurrentStreams = streamsParam ? parseInt(streamsParam, 10) : 1;

    if (isNaN(concurrentStreams) || !Number.isInteger(concurrentStreams) || concurrentStreams < 1) {
        return json(
            { success: false, message: 'streams query parameter must be a positive integer' },
            { status: 400 }
        );
    }

    const breakdown = getStreamBandwidthBreakdown();
    const estimate = estimateCapacity(concurrentStreams);

    return json({
        success: true,
        capacity: {
            viewerLimitsPerStream: {
                webRTC: VIEWER_LIMITS.webRTC,
                hls: VIEWER_LIMITS.hls,
                dash: VIEWER_LIMITS.dash,
            },
            bandwidthPerStream: {
                publisherKbps: breakdown.publisherKbps,
                perViewerKbps: breakdown.perViewerKbps,
                fullCapacityDownlinkKbps: breakdown.fullCapacityDownlinkKbps,
            },
            viewerBandwidthKbps: VIEWER_BANDWIDTH_KBPS,
            publisherBandwidthKbps: PUBLISHER_BANDWIDTH_KBPS,
            estimate,
        },
    });
};
