export interface RecordedAudio { blob: Blob; duration: number; interrupted: boolean; }
interface RecorderEvents {
  onTime?: (seconds: number) => void; onLevel?: (level: number) => void;
  onChunk?: (blob: Blob) => void; onWarning?: (message: string) => void;
  onStop: (audio: RecordedAudio) => void;
}
/** Shared device lifecycle for rounds and the microphone setup check. */
export class BrowserRecorder {
  private events: RecorderEvents; private maxSeconds: number;
  private media: MediaStream | null = null; private recorder: MediaRecorder | null = null;
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private chunks: Blob[] = []; private activeSince: number | null = null;
  private elapsed = 0; private quietSince: number | null = null; private warning = '';
  private cancelled = false; private finished = false; private starting = false; private interrupted = false;
  constructor(events: RecorderEvents, maxSeconds = 7200) { this.events = events; this.maxSeconds = maxSeconds; }
  private duration() { return this.elapsed + (this.activeSince === null ? 0 : (performance.now() - this.activeSince) / 1000); }
  private checkpoint() { this.elapsed = this.duration(); this.activeSince = null; if (!this.cancelled) this.events.onTime?.(this.elapsed); }
  private warn(message: string) { if (this.warning === message || this.cancelled) return; this.warning = message; this.events.onWarning?.(message); }
  private trackEnded = () => { this.interrupted = true; this.warn('The microphone disconnected. Check the saved audio for missing speech.'); this.stop(); };
  private cleanup() {
    clearInterval(this.timer); this.timer = undefined;
    for (const track of this.media?.getTracks() ?? []) { track.removeEventListener('ended', this.trackEnded); track.stop(); }
    this.media = null;
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
    this.context = null; if (!this.cancelled) this.events.onLevel?.(0);
  }
  private finish() {
    if (this.finished) return; this.finished = true; this.checkpoint(); this.cleanup();
    const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || this.chunks[0]?.type || 'audio/webm' });
    this.chunks = []; if (!this.cancelled) this.events.onStop({ blob, duration: this.elapsed, interrupted: this.interrupted });
  }
  async start(): Promise<boolean> {
    if (this.starting || this.recorder || this.cancelled) return false; this.starting = true;
    try {
      if (globalThis.isSecureContext === false) throw new Error('Recording requires HTTPS or localhost. Open the published app, or upload audio.');
      if (!globalThis.navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || typeof AudioContext === 'undefined')
        throw new Error('This browser cannot record audio. Try a current Chrome or Safari browser, or upload a recording.');
      this.media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (this.cancelled) { this.cleanup(); return false; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      this.recorder = new MediaRecorder(this.media, mimeType ? { mimeType } : undefined);
      this.context = new AudioContext();
      const analyser = this.context.createAnalyser(); analyser.fftSize = 256;
      this.context.createMediaStreamSource(this.media).connect(analyser);
      await this.context.resume(); if (this.cancelled) { this.cleanup(); return false; }
      const samples = new Uint8Array(analyser.fftSize);
      this.recorder.ondataavailable = event => { if (!event.data.size || this.cancelled) return; this.chunks.push(event.data); this.events.onChunk?.(event.data); };
      this.recorder.onstop = () => this.finish();
      this.recorder.onerror = () => { this.interrupted = true; this.warn('Recording was interrupted. Listen to the saved audio before continuing.'); this.stop(); };
      for (const track of this.media.getTracks()) track.addEventListener('ended', this.trackEnded);
      this.recorder.start(5000); this.activeSince = performance.now();
      this.timer = setInterval(() => {
        if (this.cancelled || this.finished) return;
        const seconds = this.duration(); this.events.onTime?.(seconds);
        if (seconds >= this.maxSeconds) { this.stop(); return; }
        if (this.recorder?.state !== 'recording') { this.events.onLevel?.(0); return; }
        analyser.getByteTimeDomainData(samples); let peak = 0;
        for (const value of samples) peak = Math.max(peak, Math.abs(value - 128) / 128);
        this.events.onLevel?.(peak);
        if (peak < 0.008) {
          this.quietSince ??= performance.now();
          if (performance.now() - this.quietSince > 5000) this.warn('Very little sound detected. Check your microphone and distance.');
        } else this.quietSince = null;
        if (peak > 0.98) this.warn('Audio may be clipping. Move the microphone farther away.');
      }, 100); return true;
    } catch (error) {
      this.cleanup(); if (this.cancelled) return false;
      const name = error instanceof Error ? error.name : '';
      if (name === 'NotAllowedError') throw new Error('Microphone access was denied. Allow it in browser settings or upload a recording.');
      if (name === 'NotFoundError') throw new Error('No microphone was found. Connect one, then try again.');
      if (name === 'NotReadableError') throw new Error('The microphone is unavailable. Close other apps using it, then retry.');
      throw error;
    } finally { this.starting = false; }
  }
  pause() { if (this.recorder?.state !== 'recording') return; this.recorder.pause(); this.checkpoint(); this.quietSince = null; this.events.onLevel?.(0); }
  resume() { if (this.recorder?.state !== 'paused') return; this.recorder.resume(); this.activeSince = performance.now(); }
  stop() {
    if (this.finished) return; this.checkpoint(); clearInterval(this.timer);
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    // Wait for onstop after the final dataavailable event, including automatic stops.
  }
  cancel() { this.cancelled = true; if (this.recorder?.state && this.recorder.state !== 'inactive') this.recorder.stop(); this.cleanup(); this.chunks = []; }
}
