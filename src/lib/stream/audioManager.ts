/**
 * AudioManager encapsulates all browser-audio logic for the meeting room:
 * - Creating and removing remote <audio> elements in the DOM
 * - Monitoring per-stream audio levels via the Web Audio API
 * - Detecting the active (loudest) speaker and notifying via a callback
 */
export class AudioManager {
    private audioAnalysers = new Map<string, AnalyserNode>();
    private sharedAudioContext: AudioContext | null = null;
    private speakerPollInterval: ReturnType<typeof setInterval> | null = null;

    // ── Audio context ──────────────────────────────────────────────────────────

    private getOrCreateAudioContext(): AudioContext | null {
        if (this.sharedAudioContext) return this.sharedAudioContext;
        try {
            this.sharedAudioContext = new (
                window.AudioContext || (window as any).webkitAudioContext
            )();
            return this.sharedAudioContext;
        } catch {
            return null;
        }
    }

    /**
     * Resume the AudioContext if it is suspended (required after a user gesture on iOS/Safari).
     * Should be called once from a click/touchstart handler in the UI.
     */
    resumeAudioContext(): void {
        const ctx = this.getOrCreateAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch((e) => console.warn('AudioContext resume failed:', e));
        }
    }

    // ── Remote audio DOM elements ──────────────────────────────────────────────

    /** Create a hidden <audio> element for the given track and attach a level monitor. */
    createRemoteAudio(trackLabel: string): void {
        let container = document.getElementById('players');
        if (!container) {
            container = document.createElement('div');
            container.id = 'players';
            container.className = 'hidden';
            document.body.appendChild(container);
        }

        const player = document.createElement('div');
        player.id = `player${trackLabel}`;

        const audio = document.createElement('audio');
        audio.id = `remoteAudio${trackLabel}`;
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        // Prevent iOS from treating this as an earpiece call stream
        audio.setAttribute('x-webkit-airplay', 'deny');
        audio.controls = false;

        // Route audio to default speaker output where setSinkId is supported (not iOS Safari).
        // The empty string selects the system default output device (loudspeaker on mobile).
        if (typeof (audio as any).setSinkId === 'function') {
            (audio as any).setSinkId('').catch((e: unknown) => console.warn('setSinkId failed:', e));
        }

        player.appendChild(audio);
        container.appendChild(player);

        // Short delay lets the element connect to the DOM before createMediaElementSource is called.
        setTimeout(() => this.monitorAudioLevel(trackLabel), 200);
    }

    /** Remove the <audio> element for the given track and clean up its analyser. */
    removeRemoteAudio(trackLabel: string): void {
        this.cleanupAudioMonitor(trackLabel);
        const player = document.getElementById(`player${trackLabel}`);
        if (player) player.remove();
    }

    // ── Audio level monitoring ─────────────────────────────────────────────────

    /** Attach a Web Audio AnalyserNode to the remote audio element for level detection. */
    monitorAudioLevel(trackLabel: string): void {
        if (this.audioAnalysers.has(trackLabel)) return;
        const audioEl = document.getElementById(
            `remoteAudio${trackLabel}`
        ) as HTMLAudioElement | null;
        if (!audioEl) return;
        const ctx = this.getOrCreateAudioContext();
        if (!ctx) return;
        try {
            const source = ctx.createMediaElementSource(audioEl);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);
            source.connect(ctx.destination);
            this.audioAnalysers.set(trackLabel, analyser);
        } catch (e) {
            console.warn('Cannot set up audio analyser for', trackLabel, e);
        }
    }

    /** Remove the analyser entry for a track (call before removing the audio element). */
    cleanupAudioMonitor(trackLabel: string): void {
        this.audioAnalysers.delete(trackLabel);
    }

    // ── Active speaker detection ───────────────────────────────────────────────

    /**
     * Start polling audio levels every 200 ms and call `onSpeakerChange` whenever
     * the loudest speaker changes. Passes `null` when the room is silent.
     */
    startSpeakerDetection(onSpeakerChange: (trackLabel: string | null) => void): void {
        if (this.speakerPollInterval) return;
        const dataArray = new Uint8Array(64);
        this.speakerPollInterval = setInterval(() => {
            if (this.audioAnalysers.size === 0) return;
            let loudest: string | null = null;
            // Threshold of 3 (out of ~128 max RMS) avoids ambient-noise false positives.
            let loudestLevel = 3;
            this.audioAnalysers.forEach((analyser, label) => {
                analyser.getByteTimeDomainData(dataArray);
                let sumSq = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const v = (dataArray[i] as number) - 128;
                    sumSq += v * v;
                }
                const rms = Math.sqrt(sumSq / dataArray.length);
                if (rms > loudestLevel) {
                    loudestLevel = rms;
                    loudest = label;
                }
            });
            onSpeakerChange(loudest);
        }, 200);
    }

    /** Stop polling and release the shared AudioContext. */
    stopSpeakerDetection(): void {
        if (this.speakerPollInterval) {
            clearInterval(this.speakerPollInterval);
            this.speakerPollInterval = null;
        }
        this.audioAnalysers.clear();
        if (this.sharedAudioContext) {
            this.sharedAudioContext.close().catch(() => {});
            this.sharedAudioContext = null;
        }
    }
}
