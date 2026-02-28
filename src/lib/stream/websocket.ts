/**
 * Build the WebSocket URL for AntMedia from the configured server URL.
 * Handles both bare hostnames and full URLs with or without protocols.
 */
export function getWebSocketURL(antMediaUrl: string): string {
    const raw = (antMediaUrl || '').trim();
    try {
        const hasProto = /^https?:\/\//i.test(raw) || /^wss?:\/\//i.test(raw);
        const base = hasProto ? raw : `${location.protocol === 'https:' ? 'https://' : 'http://'}${raw}`;
        const u = new URL(base);

        let appPath = (u.pathname || '').replace(/\/+$/, '');
        if (/\/websocket$/i.test(appPath)) {
            appPath = appPath.replace(/\/websocket$/i, '');
        }
        if (appPath === '' || appPath === '/') {
            appPath = '/WebRTCAppEE';
        }

        const secure =
            u.protocol === 'https:' ||
            u.protocol === 'wss:' ||
            location.protocol === 'https:' ||
            u.host.includes(':5443');
        const wsProto = secure ? 'wss' : 'ws';

        return `${wsProto}://${u.host}${appPath}/websocket`;
    } catch {
        let cleaned = raw.replace(/^wss?:\/\//i, '').replace(/^https?:\/\//i, '');
        cleaned = cleaned.replace(/[?#].*$/, '').replace(/\/+$|^\/+/, '');
        const host = cleaned.split('/')[0];
        const secure = host.includes(':5443') || location.protocol === 'https:';
        const wsProto = secure ? 'wss' : 'ws';
        return `${wsProto}://${host}/WebRTCAppEE/websocket`;
    }
}
