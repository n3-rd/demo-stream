/**
 * Query the browser Permissions API for mic and camera state and watch for
 * live changes. Returns a cleanup function that removes the event listeners,
 * or null if the Permissions API is unavailable.
 */
export async function checkPermissions(
    onMicChange: (state: string) => void,
    onCamChange: (state: string) => void
): Promise<(() => void) | null> {
    if (typeof navigator === 'undefined' || !navigator.permissions) return null;
    try {
        const [micResult, camResult] = await Promise.all([
            navigator.permissions.query({ name: 'microphone' as PermissionName }),
            navigator.permissions.query({ name: 'camera' as PermissionName })
        ]);
        onMicChange(micResult.state);
        onCamChange(camResult.state);

        const onMic = () => onMicChange(micResult.state);
        const onCam = () => onCamChange(camResult.state);
        micResult.addEventListener('change', onMic);
        camResult.addEventListener('change', onCam);

        return () => {
            micResult.removeEventListener('change', onMic);
            camResult.removeEventListener('change', onCam);
        };
    } catch (e) {
        console.warn('Permissions API not fully supported:', e);
        return null;
    }
}

/**
 * Prompt the user for microphone access.
 * Returns `'granted'` on success or `'denied'` on failure.
 */
export async function requestMicPermission(): Promise<'granted' | 'denied'> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach(t => t.stop());
        return 'granted';
    } catch (err) {
        console.warn('Mic permission request rejected:', err);
        return 'denied';
    }
}

/**
 * Prompt the user for camera access.
 * Returns `'granted'` on success or `'denied'` on failure.
 */
export async function requestCameraPermission(): Promise<'granted' | 'denied'> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        stream.getTracks().forEach(t => t.stop());
        return 'granted';
    } catch (err) {
        console.warn('Camera permission request rejected:', err);
        return 'denied';
    }
}
