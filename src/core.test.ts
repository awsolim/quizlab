import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBank,grade,shuffle,createAttempt,stats,readStore,storageKey} from './core';
import {retireLegacyDemo} from './legacy-demo';
const sample=JSON.parse(readFileSync(new URL('../examples/sample-bank.json',import.meta.url),'utf8'));
test('retiring the old demo preserves user banks, edits and attempts',async()=>{
 const demo=validateBank(sample);
 const edited=structuredClone(demo);edited.questions[0].explanation='My own course explanation';
 const real=structuredClone(demo);real.title='My course';
 const demoAttempt=createAttempt(demo,'practice',demo.questions.slice(0,2),true);
 const editedAttempt=createAttempt(edited,'exam',edited.questions.slice(0,2),true);
 const realAttempt=createAttempt(real,'practice',real.questions,true);
 const input={banks:[{...demo,libraryId:'demo'},{...edited,libraryId:'edited'},{...real,libraryId:'real'}],attempts:[demoAttempt,editedAttempt,realAttempt]};
 const cleaned=await retireLegacyDemo(input);
 assert.deepEqual(cleaned.banks.map(b=>b.libraryId),['edited','real']);
 assert.deepEqual(cleaned.attempts.map(a=>a.id),[editedAttempt.id,realAttempt.id]);
 assert.equal(input.banks.length,3);
 assert.equal(await retireLegacyDemo(cleaned),cleaned);
});
test('sample contains every type and 12 valid questions',()=>{const b=validateBank(sample);assert.equal(b.questions.length,12);assert.equal(new Set(b.questions.map(q=>q.type)).size,4);});
test('invalid imports identify question and field',()=>{const b=structuredClone(sample);b.questions[0].answer=['missing'];assert.throws(()=>validateBank(b),/math-1.*answer/);b.questions[0].id=b.questions[1].id;assert.throws(()=>validateBank(b),/id: must be unique/);assert.throws(()=>validateBank({schemaVersion:2}),/schemaVersion/);assert.throws(()=>validateBank(null),/JSON object/);});
test('all objective types and exact multi-answer grading',()=>{for(const q of validateBank(sample).questions){assert.equal(grade(q,q.answer),q.type==='short'?undefined:true);if(q.type!=='short')assert.equal(grade(q,[]),false);}const q=sample.questions[1];assert.equal(grade(q,['c','a']),true);assert.equal(grade(q,['a']),false);assert.equal(grade(q,['a','c','b']),false);});
test('shuffling preserves IDs and correctness',()=>{const q=validateBank(sample).questions[0];const original=structuredClone(q.choices!);const shuffled=shuffle(q.choices!,()=>0);assert.deepEqual(q.choices,original);assert.deepEqual(new Set(shuffled.map(x=>x.id)),new Set(original.map(x=>x.id)));assert.equal(grade({...q,choices:shuffled},q.answer),true);});
test('both modes snapshot banks and survive refresh, scoring and retry eligibility',()=>{for(const mode of ['practice','exam'] as const){const b=validateBank(sample);const a=createAttempt(b,mode,b.questions,true);b.questions[0].text='changed';assert.notEqual(a.questions[0].text,'changed');a.responses[a.questions[0].id]={value:a.questions[0].answer,submitted:true,correct:true};a.responses[a.questions[1].id]={value:['b'],submitted:true,correct:false};a.responses[a.questions[3].id]={value:['my essay'],submitted:true};const raw=JSON.stringify({banks:[],attempts:[a]});const resumed=readStore({getItem:key=>key===storageKey?raw:null}).attempts[0];assert.deepEqual(resumed,a);const s=stats(resumed);assert.equal(s.correct,1);assert.equal(s.incorrect,1);assert.equal(s.pending,1);assert.equal(s.unanswered,9);const retryQs=a.questions.filter(q=>a.responses[q.id]?.correct===false);const retry=createAttempt(b,'practice',retryQs,false);assert.equal(retry.questions.length,1);assert.notEqual(retry.id,a.id);assert.deepEqual(retry.responses,{});}});

