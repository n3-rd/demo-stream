/**
 * Streaming capacity estimates based on the app's default configuration.
 *
 * These constants mirror the values used in:
 *   - src/routes/api/stream/create/+server.ts  (viewer limits, encoder settings)
 *   - src/lib/antmedia.ts                      (WebRTC bandwidth)
 */

/** Viewer limits per stream, per protocol. */
export const VIEWER_LIMITS = {
    webRTC: 100,
    hls: 100,
    dash: 100,
} as const;

/**
 * Bandwidth consumed by a single publisher (uplink from the broadcasting client).
 * Values from the default `encoderSettingsList` in stream creation.
 */
export const PUBLISHER_BANDWIDTH_KBPS =
    1000 + // videoBitrate: 1_000_000 bps → 1000 kbps
    128;   // audioBitrate:   128_000 bps →  128 kbps

/**
 * Bandwidth consumed by a single WebRTC viewer (downlink to the watching client).
 * Matches the `bandwidth` option in AntMediaService.initialize().
 */
export const VIEWER_BANDWIDTH_KBPS = 900;

/** Breakdown of bandwidth used by a single live stream at full WebRTC capacity. */
export interface StreamBandwidthBreakdown {
    /** Uplink from publisher to server (kbps). */
    publisherKbps: number;
    /** Downlink to each WebRTC viewer (kbps). */
    perViewerKbps: number;
    /** Max WebRTC viewers this stream supports. */
    maxWebRTCViewers: number;
    /** Total server downlink if all viewer slots are filled (kbps). */
    fullCapacityDownlinkKbps: number;
}

/**
 * Return the bandwidth breakdown for a single stream.
 */
export function getStreamBandwidthBreakdown(): StreamBandwidthBreakdown {
    return {
        publisherKbps: PUBLISHER_BANDWIDTH_KBPS,
        perViewerKbps: VIEWER_BANDWIDTH_KBPS,
        maxWebRTCViewers: VIEWER_LIMITS.webRTC,
        fullCapacityDownlinkKbps: VIEWER_LIMITS.webRTC * VIEWER_BANDWIDTH_KBPS,
    };
}

/** Aggregate capacity estimate for a given number of concurrent streams. */
export interface CapacityEstimate {
    /** Number of concurrent streams used in this estimate. */
    concurrentStreams: number;
    /** Total uplink bandwidth required (kbps). */
    totalPublisherKbps: number;
    /** Total downlink bandwidth if every viewer slot is filled (kbps). */
    totalViewerKbps: number;
    /** Combined server bandwidth at full capacity (kbps). */
    totalKbps: number;
    /** Combined server bandwidth at full capacity (Mbps, rounded to 2 d.p.). */
    totalMbps: number;
    /** Maximum total WebRTC viewers across all concurrent streams. */
    maxTotalViewers: number;
}

/**
 * Estimate total bandwidth and viewer capacity for `concurrentStreams` active
 * broadcasts, each at full WebRTC viewer capacity.
 *
 * @param concurrentStreams - Number of simultaneously active broadcasts (≥ 1).
 */
export function estimateCapacity(concurrentStreams: number): CapacityEstimate {
    if (concurrentStreams < 1) {
        throw new RangeError('concurrentStreams must be at least 1');
    }

    const totalPublisherKbps = concurrentStreams * PUBLISHER_BANDWIDTH_KBPS;
    const totalViewerKbps =
        concurrentStreams * VIEWER_LIMITS.webRTC * VIEWER_BANDWIDTH_KBPS;
    const totalKbps = totalPublisherKbps + totalViewerKbps;

    return {
        concurrentStreams,
        totalPublisherKbps,
        totalViewerKbps,
        totalKbps,
        totalMbps: Math.round((totalKbps / 1000) * 100) / 100,
        maxTotalViewers: concurrentStreams * VIEWER_LIMITS.webRTC,
    };
}
