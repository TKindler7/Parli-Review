import test from 'node:test';
import assert from 'node:assert/strict';
import { requestAI } from '../lib/ai-client.ts';
import { openAI, transcribe } from '../lib/ai-server.ts';
import { demoRound } from '../lib/demo.ts';
const key='sk-unit_test_not_a_real_key_123456';
const options={key,direct:true,origin:'https://example.test'};
function audioForm(name='test.wav'){const form=new FormData();form.set('file',new Blob(['audio-fixture'],{type:'audio/wav'}),name);return form;}
function audioRequest(name='test.wav'){return new Request('https://example.test/api/transcribe',{method:'POST',headers:{'x-openai-key':key},body:audioForm(name)});}
test('portfolio pipeline sends audio then validated transcript feedback through the live adapters',async t=>{
 const fixture=demoRound().reports[0],calls=[];
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  calls.push(url);assert.equal(init.headers.Authorization,'Bearer '+key);
  if(url.endsWith('/audio/transcriptions')){
   assert.equal(init.body.get('model'),'gpt-4o-transcribe-diarize');assert.equal(init.body.get('response_format'),'diarized_json');assert.equal(init.body.get('chunking_strategy'),'auto');assert.equal(init.body.get('file').name,'test.wav');
   return Response.json({segments:fixture.input.segments.map(s=>({start:s.start,end:s.end,text:s.text,speaker:s.speaker}))});
  }
  const sent=JSON.parse(init.body);assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.equal(JSON.parse(sent.input).mode,'feedback');
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(fixture.feedback)}]}]});
 });
 const transcription=await requestAI('transcribe',audioForm(),options);
 const input={...fixture.input,segments:transcription.segments.map((s,i)=>({...fixture.input.segments[i],...s}))};
 const result=await requestAI('analyze',input,options);assert.equal(result.feedback.overview,fixture.feedback.overview);
 assert.deepEqual(calls,['https://api.openai.com/v1/audio/transcriptions','https://api.openai.com/v1/responses']);assert.equal('ballot' in result,false);
});
test('invalid provider timestamps are rejected before entering a round',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({segments:[{start:4,end:2,text:'hello',speaker:'A'}]}));
 const response=await transcribe(audioRequest());assert.equal(response.status,400);assert.match((await response.json()).error,/invalid passages or timestamps/);
});
test('silence and unsupported files return recovery instructions',async t=>{
 let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;return Response.json({segments:[]});});
 assert.match((await(await transcribe(audioRequest())).json()).error,/No usable speech/);
 assert.match((await(await transcribe(audioRequest('not-audio.txt'))).json()).error,/Use MP3/);assert.equal(requests,1);
});
test('an already-cancelled request makes no paid provider call',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({});});
 const abort=new AbortController();abort.abort();
 await assert.rejects(openAI('responses',key,{},abort.signal),{name:'AbortError'});
 await assert.rejects(requestAI('transcribe',audioForm(),{...options,signal:abort.signal}),{name:'AbortError'});assert.equal(calls,0);
});
test('cancelling an in-flight request aborts the provider request without retrying',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async(_url,init)=>{calls++;return new Promise((_r,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError'))));});
 const abort=new AbortController();const pending=openAI('responses',key,{},abort.signal);abort.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,1);
});
test('billing, key, permissions and connection failures are actionable and never expose the key',async t=>{
 for(const[status,phrase]of[[401,/key was not accepted/],[403,/project permissions/],[429,/credit or rate limit/],[503,/saved round is safe/]]){
  t.mock.method(globalThis,'fetch',async()=>new Response('',{status}));
  await assert.rejects(openAI('responses',key,{}),e=>phrase.test(e.message)&&!e.message.includes(key));t.mock.restoreAll();
 }
 t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('Failed to fetch');});await assert.rejects(openAI('responses',key,{}),/Could not reach OpenAI/);
});
