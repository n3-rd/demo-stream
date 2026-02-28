/** Parsed components of a stream ID. */
export interface StreamIdInfo {
    uniqueId: string;
    odooRepId: string | null;
    cameraType: string;
    isBackCamera: boolean;
    isFrontCamera: boolean;
}

/**
 * Parse a stream ID into its constituent parts.
 * Format: `<uniqueId>-<odooRepId>_(front|back)` for dual-camera streams,
 * otherwise the whole ID is treated as `uniqueId`.
 */
export function parseStreamId(streamId: string): StreamIdInfo {
    const match = streamId.match(/^(.+)-(.+)_(front|back)$/);
    if (match) {
        return {
            uniqueId: match[1],
            odooRepId: match[2],
            cameraType: match[3],
            isBackCamera: match[3] === 'back',
            isFrontCamera: match[3] === 'front'
        };
    }
    return {
        uniqueId: streamId,
        odooRepId: null,
        cameraType: 'unknown',
        isBackCamera: false,
        isFrontCamera: false
    };
}

/** Sanitize a display name so it is safe to use as a stream name (alphanumeric + hyphens). */
export function sanitizeStreamName(name: string): string {
    if (!name) return '';
    const decodedName = decodeURIComponent(name);
    return decodedName.replace(/[^a-zA-Z0-9-]/g, '_');
}

/** Format a display name, optionally appending `_representative`. */
export function formatDisplayName(name: string, isRepresentative = false): string {
    if (!name) return 'Unknown User';
    const formattedName = name.trim();
    return isRepresentative ? `${formattedName}_representative` : formattedName;
}

/** Strip the `_representative` suffix from a name for UI display. */
export function getCleanDisplayName(name: string): string {
    if (!name) return 'Unknown User';
    return name.replace(/_+representative$/i, '').trim();
}

/** Generate a random lowercase alphanumeric string of the given length. */
export function generateRandomString(length: number): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Read the representative's display name from the `rep_user` cookie.
 * Returns an empty string if the cookie is absent or malformed.
 */
export function getRepresentativeCookieName(): string {
    try {
        const entry = document.cookie.split('; ').find(c => c.startsWith('rep_user='));
        if (!entry) return '';
        const json = decodeURIComponent(entry.split('=')[1] || '');
        const rep = JSON.parse(json);
        if (rep?.firstName && rep?.lastName) {
            return `${rep.firstName} ${rep.lastName}`.trim();
        }
        return (rep?.name || rep?.firstName || rep?.lastName || '').toString();
    } catch {
        console.error('Failed to parse representative cookie');
        return '';
    }
}
