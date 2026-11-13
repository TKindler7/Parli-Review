'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, LoaderCircle, Mic, Sparkles, Square } from 'lucide-react';
import { BrowserRecorder, type RecordedAudio } from '@/lib/recorder';
import { audioChunks, inspectAudio } from '@/lib/audio';
import { DEFAULT_RULES, formatTime, type Feedback, type Segment } from '@/lib/debate';
import type { AIPath, AIResponse } from '@/lib/ai-client';
const motion = 'This House would make public transport free.';
export function SetupCheck({ apiKey, blocked, request }: {
  apiKey: string; blocked: boolean;
  request: (path: AIPath, body: unknown, signal?: AbortSignal) => Promise<AIResponse>;
}) {
  const [capture, setCapture] = useState<'idle' | 'permission' | 'recording' | 'checking'>('idle');
  const [seconds, setSeconds] = useState(0), [level, setLevel] = useState(0);
  const [clip, setClip] = useState<RecordedAudio | null>(null), [url, setUrl] = useState('');
  const [warning, setWarning] = useState(''), [error, setError] = useState('');
  const [consent, setConsent] = useState(false), [stage, setStage] = useState('');
  const [segments, setSegments] = useState<Segment[]>([]), [feedback, setFeedback] = useState<Feedback | null>(null);
  const recorder = useRef<BrowserRecorder | null>(null), captureJob = useRef(0), aiJob = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { captureJob.current++; aiJob.current++; recorder.current?.cancel(); controller.current?.abort(); }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { aiJob.current++; controller.current?.abort(); setStage(''); setFeedback(null); setSegments([]); setError(''); }, [apiKey]);
  function cancelRecording() { captureJob.current++; recorder.current?.cancel(); setCapture('idle'); setLevel(0); }
  async function record() {
    if (blocked || capture !== 'idle' || stage) return;
    const job = ++captureJob.current;
    setError(''); setWarning(''); setClip(null); setUrl(''); setSegments([]); setFeedback(null); setConsent(false); setSeconds(0); setCapture('permission');
    const session = new BrowserRecorder({
      onTime: setSeconds, onLevel: setLevel, onWarning: setWarning,
      onStop: async result => {
        if (job !== captureJob.current) return; setCapture('checking');
        try {
          if (!result.blob.size) throw new Error('The microphone produced no audio. Try again or choose a different input in your browser.');
          const duration = await inspectAudio(result.blob); if (job !== captureJob.current) return;
          setClip({ ...result, duration }); setUrl(URL.createObjectURL(result.blob));
        } catch (e) { if (job === captureJob.current) setError(e instanceof Error ? e.message : 'Could not play the test recording.'); }
        finally { if (job === captureJob.current) setCapture('idle'); }
      }
    }, 15); recorder.current = session;
    try { const started = await session.start(); if (started && job === captureJob.current) setCapture('recording'); }
    catch (e) { if (job === captureJob.current) { setError(e instanceof Error ? e.message : 'Could not start the microphone.'); setCapture('idle'); } }
  }
  function cancelAI() {
    aiJob.current++; controller.current?.abort(); setStage('');
    setError('Check stopped. Completed transcription stays here until you close this panel. Provider usage already started may still be billed.');
  }
  async function checkAI() {
    if (!clip || !apiKey || !consent || blocked || stage || capture !== 'idle') return;
    const job = ++aiJob.current, abort = new AbortController(); controller.current = abort; setError(''); setFeedback(null);
    let passages = segments;
    try {
      if (!passages.length) {
        setStage('Transcribing your test clip');
        for await (const chunk of audioChunks(clip.blob)) {
          if (job !== aiJob.current) return;
          const form = new FormData(); form.set('file', chunk.blob, 'microphone-check.wav');
          const result = await request('transcribe', form, abort.signal); if (job !== aiJob.current) return;
          passages = [...passages, ...result.segments.map((s, i) => ({
            id: 'check-' + chunk.offset + '-' + i, assetId: 'mic-check', start: s.start + chunk.offset, end: s.end + chunk.offset,
            text: s.text, speaker: s.speaker, role: 'PM' as const, uncertain: true
          }))]; setSegments(passages);
        }
      }
      if (!passages.length) throw new Error('No speech was found. Record the example aloud and retry.');
      setStage('Writing feedback on your test clip');
      const result = await request('analyze', {
        motion, mode: 'feedback', complete: false, rules: DEFAULT_RULES,
        paradigm: 'This is a short microphone setup check, not a complete debate. Assess only the recorded words. State missing-speaker limitations.',
        segments: passages, gaps: ['Only a short test clip was recorded.']
      }, abort.signal);
      if (job === aiJob.current) setFeedback(result.feedback);
    } catch (e) { if (job === aiJob.current) setError(e instanceof Error ? e.message : 'The live check could not finish.'); }
    finally { if (job === aiJob.current) setStage(''); }
  }
  return <section className="setup-check" aria-labelledby="setup-check-title">
    <h3 id="setup-check-title">Microphone &amp; AI check</h3>
    <p>Try the full path before a round. Test audio stays in memory and is discarded when you close this panel.</p>
    {blocked && <p className="warning-text">Finish the current recording or review before running setup checks.</p>}
    <div className="setup-check-step">
      <h4><span>1</span> Hear your microphone</h4>
      <p>Record up to 15 seconds, then listen back. Nothing is sent for the microphone check.</p>
      <blockquote>“Free public transport would lower the cost of getting to school or work. That helps people who cannot afford daily fares.”</blockquote>
      <div className="setup-check-controls">
        {capture === 'idle' ? <button className="button secondary" onClick={() => void record()} disabled={blocked || !!stage}><Mic size={16}/>{clip ? 'Record another test' : 'Record 15-second test'}</button>
          : capture === 'permission' ? <><span role="status">Waiting for microphone permission…</span><button className="text-button" onClick={cancelRecording}>Cancel microphone request</button></>
          : capture === 'recording' ? <><button className="button danger" onClick={() => recorder.current?.stop()}><Square size={14}/>Stop test</button><span role="timer">{formatTime(seconds)} / 0:15</span></>
          : <span role="status">Checking playback…</span>}
        {capture === 'recording' && <meter min="0" max="1" value={level} aria-label="Microphone input level"/>}
      </div>
      {warning && <p className="warning-text" role="status">{warning}</p>}
      {url && <><audio controls src={url} aria-label="Play microphone test"/><p className="setup-success">Recording captured. Play it back to check clarity and volume.</p></>}
    </div>
    <div className="setup-check-step">
      <h4><span>2</span> Try a real AI review</h4>
      <p>Uses the same transcription and feedback services as your rounds. Judging stays off for this short clip.</p>
      {!apiKey && <p className="small">Enter your API key above to enable the live check.</p>}
      <label className="check-label"><input type="checkbox" checked={consent} disabled={!!stage} onChange={e => setConsent(e.target.checked)}/><span>Send this test clip and its transcript to OpenAI. I agree to the API usage charges on my connected account.</span></label>
      <div className="setup-check-controls"><button className="button primary" onClick={() => void checkAI()} disabled={!clip || !apiKey || !consent || blocked || !!stage || capture !== 'idle'}><Sparkles size={16}/>{segments.length && !feedback ? 'Retry feedback check' : 'Run live AI check'}</button>{stage && <button className="text-button" onClick={cancelAI}>Stop AI check</button>}</div>
      {stage && <p className="setup-check-status" role="status"><LoaderCircle className="spin" size={15}/>{stage}</p>}
      {!!segments.length && <details className="setup-transcript"><summary>Transcribed test clip</summary><p>{segments.map(s => s.text).join(' ')}</p></details>}
      {feedback && <div className="setup-result" role="status"><strong><CheckCircle2 size={17}/>Transcription and AI feedback completed</strong><p>{feedback.overview}</p>{feedback.speakers[0]?.exercise && <p><b>Try next:</b> {feedback.speakers[0].exercise}</p>}<small>This verifies this clip and connection. It does not assess a full round or guarantee future availability.</small></div>}
    </div>{error && <p className="warning-text" role="alert">{error}</p>}
  </section>;
}
