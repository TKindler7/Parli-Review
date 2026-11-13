import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserRecorder } from '../lib/recorder.ts';
function browser(t, overrides={}) {
 let now=0,tick,stops=0,closes=0,last; const listeners=new Map();
 const track={stop(){stops++;},addEventListener(n,fn){listeners.set(n,fn);},removeEventListener(n){listeners.delete(n);}};
 const stream={getTracks:()=>[track]};
 class Recorder {
  static isTypeSupported(type){return type.startsWith('audio/webm');}
  constructor(_stream,options){this.state='inactive';this.mimeType=options?.mimeType||'audio/webm';last=this;}
  start(timeslice){this.timeslice=timeslice;this.state='recording';}
  pause(){this.state='paused';}resume(){this.state='recording';}
  chunk(text){this.ondataavailable?.({data:new Blob([text],{type:this.mimeType})});}
  stop(){this.state='inactive';this.chunk('last');this.onstop?.();}
 }
 class Context {
  state='running';async resume(){if(overrides.resumeError)throw new Error('Audio input failed');}
  async close(){closes++;this.state='closed';}
  createAnalyser(){return {fftSize:256,getByteTimeDomainData(samples){samples.fill(140);}};}
  createMediaStreamSource(){return {connect(){}};}
 }
 const globals={navigator:{mediaDevices:{getUserMedia:overrides.getUserMedia||(async()=>stream)}},MediaRecorder:Recorder,AudioContext:Context,isSecureContext:true};
 for(const [name,value]of Object.entries(globals)){
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,name,{configurable:true,value});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];});
 }
 t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setInterval',fn=>{tick=fn;return 7;});
 t.mock.method(globalThis,'clearInterval',()=>{tick=undefined;});
 return {stream,setTime:value=>{now=value;},tick:()=>tick?.(),disconnect:()=>listeners.get('ended')?.(),get recorder(){return last;},get stops(){return stops;},get closes(){return closes;},get timerActive(){return !!tick;}};
}
test('recording keeps all chunks, excludes paused time, and releases microphone and context',async t=>{
 const env=browser(t);let audio;const chunks=[];
 const session=new BrowserRecorder({onStop:r=>{audio=r;},onChunk:b=>chunks.push(b)});
 assert.equal(await session.start(),true);assert.equal(env.recorder.timeslice,5000);
 env.recorder.chunk('first');env.setTime(1500);session.pause();env.setTime(9500);session.resume();env.setTime(11000);session.stop();
 assert.equal(audio.duration,3);assert.equal(await audio.blob.text(),'firstlast');assert.equal(chunks.length,2);assert.equal(audio.interrupted,false);
 assert.equal(env.stops,1);assert.equal(env.closes,1);assert.equal(env.timerActive,false);
});
test('closing while microphone permission is pending releases a late stream without recording',async t=>{
 let grant;const env=browser(t,{getUserMedia:()=>new Promise(r=>{grant=r;})});let completed=false;
 const session=new BrowserRecorder({onStop:()=>{completed=true;}});
 const pending=session.start();session.cancel();grant(env.stream);
 assert.equal(await pending,false);assert.equal(completed,false);assert.equal(env.stops,1);assert.equal(env.recorder,undefined);
});
test('denied microphone permission has an actionable error and starts no timer',async t=>{
 const env=browser(t,{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}});
 await assert.rejects(new BrowserRecorder({onStop(){}}).start(),/Microphone access was denied/);assert.equal(env.timerActive,false);
});
test('audio setup failure releases the acquired device',async t=>{
 const env=browser(t,{resumeError:true});await assert.rejects(new BrowserRecorder({onStop(){}}).start(),/Audio input failed/);
 assert.equal(env.stops,1);assert.equal(env.closes,1);
});
test('short microphone check stops automatically at its time limit',async t=>{
 const env=browser(t);let audio;const session=new BrowserRecorder({onStop:r=>{audio=r;}},15);
 await session.start();env.setTime(15100);env.tick();assert.ok(audio.duration>=15);assert.equal(env.timerActive,false);assert.equal(env.stops,1);
});
test('a disconnected microphone preserves captured audio and marks the interruption',async t=>{
 const env=browser(t);let audio;const warnings=[];const session=new BrowserRecorder({onStop:r=>{audio=r;},onWarning:m=>warnings.push(m)});
 await session.start();env.recorder.chunk('before-disconnect');env.setTime(900);env.disconnect();
 assert.equal(audio.interrupted,true);assert.match(await audio.blob.text(),/before-disconnect/);assert.match(warnings[0],/disconnected/);assert.equal(env.stops,1);
});
test('cancelling an active setup check releases devices without returning or persisting audio',async t=>{
 const env=browser(t);let completed=false,chunkCalls=0;const session=new BrowserRecorder({onStop:()=>{completed=true;},onChunk:()=>{chunkCalls++;}});
 await session.start();session.cancel();assert.equal(completed,false);assert.equal(chunkCalls,0);assert.equal(env.stops,1);assert.equal(env.closes,1);assert.equal(env.timerActive,false);
});
test('recording errors stop capture and retain a partial recording for review',async t=>{
 const env=browser(t);let audio;const session=new BrowserRecorder({onStop:r=>{audio=r;}});
 await session.start();env.recorder.chunk('partial');env.recorder.onerror();assert.equal(audio.interrupted,true);assert.equal(env.stops,1);assert.equal(env.timerActive,false);
});
test('an automatic stop waits for the final data event before finalizing audio',async t=>{
 const env=browser(t);let audio;const session=new BrowserRecorder({onStop:r=>{audio=r;}});
 await session.start();env.recorder.state='inactive';env.recorder.onerror();assert.equal(audio,undefined);
 env.recorder.chunk('final-error-chunk');env.recorder.onstop();assert.equal(await audio.blob.text(),'final-error-chunk');assert.equal(audio.interrupted,true);assert.equal(env.stops,1);assert.equal(env.closes,1);
});
