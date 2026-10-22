export type Question = {id:string;type:'single'|'multiple'|'true-false'|'short';text:string;answer:string[];explanation:string;choices?:{id:string;text:string}[];topic?:string;difficulty?:string;hint?:string};
export type Bank = {schemaVersion:1;title:string;description?:string;questions:Question[]};
export type Response = {value:string[];submitted:boolean;correct?:boolean};
export type Attempt = {id:string;title:string;mode:'practice'|'exam';questions:Question[];responses:Record<string,Response>;index:number;complete:boolean;created:string};
export function validateBank(input:unknown):Bank {
 const errors:string[]=[]; const b=input as Bank;
 if(!b||typeof b!=='object') throw Error('Bank must be a JSON object.');
 if(b.schemaVersion!==1) errors.push('schemaVersion: must be 1');
 if(typeof b.title!=='string'||!b.title.trim()) errors.push('title: required text');
 if(b.description!==undefined&&typeof b.description!=='string') errors.push('description: must be text');
 if(!Array.isArray(b.questions)||!b.questions.length) errors.push('questions: must be a nonempty array');
 const ids=new Set<string>();
 if(Array.isArray(b.questions)) b.questions.forEach((q,i)=>{
 const label=`Question ${i+1}${q?.id?` (${q.id})`:''}`;
 const err=(field:string,msg:string)=>errors.push(`${label} · ${field}: ${msg}`);
 if(!q||typeof q!=='object'){err('question','must be an object');return;}
 for(const f of ['id','text','explanation'] as const) if(typeof q[f]!=='string'||!q[f].trim())err(f,'required nonempty text');
 if(ids.has(q.id))err('id','must be unique'); ids.add(q.id);
 for(const f of ['topic','difficulty','hint'] as const)if(q[f]!==undefined&&(typeof q[f]!=='string'||!q[f]!.trim()))err(f,'must be nonempty text');
 if(!['single','multiple','true-false','short'].includes(q.type))err('type','use single, multiple, true-false, or short');
 if(!Array.isArray(q.answer)||!q.answer.length||q.answer.some(a=>typeof a!=='string'||!a.trim())||new Set(q.answer).size!==q.answer.length)err('answer','must be a nonempty array of unique strings');
 else if(q.type==='true-false'){if(q.answer.length!==1||!['true','false'].includes(q.answer[0]))err('answer','use ["true"] or ["false"]');}
 else if(q.type==='short'){if(q.answer.length!==1)err('answer','provide one model answer');}
 else if(q.type==='single'||q.type==='multiple'){
 if(!Array.isArray(q.choices)||q.choices.length<2)err('choices','provide at least two choices');
 else {const ci=new Set<string>();q.choices.forEach(c=>{if(!c||typeof c.id!=='string'||!c.id.trim()||typeof c.text!=='string'||!c.text.trim()||ci.has(c.id))err('choices','each needs unique nonempty id and text');if(c)ci.add(c.id);});if(q.answer.some(a=>!ci.has(a)))err('answer','must reference choice IDs');}
 if(q.type==='single'&&q.answer.length!==1)err('answer','single requires exactly one answer');
 }
 });
 if(errors.length)throw Error(errors.join('\n'));return structuredClone(b);
}
export function shuffle<T>(values:T[],rng= Math.random):T[]{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function grade(q:Question,value:string[]):boolean|undefined {return q.type==='short'?undefined:value.length===q.answer.length&&q.answer.every(a=>value.includes(a));}
export function stats(a:Attempt){let correct=0,incorrect=0,unanswered=0,pending=0;for(const q of a.questions){const r=a.responses[q.id];if(!r?.value.length)unanswered++;else if(r.correct===undefined)pending++;else if(r.correct)correct++;else incorrect++;}return{correct,incorrect,unanswered,pending,total:a.questions.length};}
export function createAttempt(bank:Bank,mode:Attempt['mode'],questions:Question[],mix:boolean):Attempt{return{id:crypto.randomUUID(),title:bank.title,mode,questions:structuredClone(questions).map(q=>(mix&&q.choices?{...q,choices:shuffle(q.choices)}:q)),responses:{},index:0,complete:false,created:new Date().toISOString()};}
export type Store={banks:(Bank&{libraryId:string})[];attempts:Attempt[]};
export const storageKey='quizlab.v1';
export function readStore(storage:Pick<Storage,'getItem'>):Store{const raw=storage.getItem(storageKey);if(!raw)return{banks:[],attempts:[]};const s=JSON.parse(raw);if(!Array.isArray(s.banks)||!Array.isArray(s.attempts))throw Error('Saved library is invalid.');return s;}

