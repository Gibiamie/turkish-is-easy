// Data-integrity checks for Turkish Is Easy. Plain Node, no dependencies.
// Run: node tests/data-integrity.mjs   (from the repo root)
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { TOPICS, datasetFor, allLessonItems, EXPLANATIONS } = await import('../js/lessonData.js');
const { dictKeys } = await import('../js/i18n.js');

let failures = 0;
function check(ok, message){
  if(!ok){ failures++; console.error('FAIL:', message); }
}

// 1. Unique item ids across all topics.
const seen = new Map();
for(const t of TOPICS.filter(t=>t.type!=='review')){
  for(const x of datasetFor(t.id)){
    check(!seen.has(x.id), `duplicate item id "${x.id}" in ${t.id} (also in ${seen.get(x.id)})`);
    seen.set(x.id, t.id);
  }
}

// 2. Builders: answerParts must be a subset (as multiset) of options,
//    and options must contain at least one distractor.
for(const t of TOPICS.filter(t=>t.type==='builder')){
  for(const x of datasetFor(t.id)){
    const opts = [...x.options];
    for(const part of x.answerParts){
      const i = opts.indexOf(part);
      check(i>=0, `${t.id}/${x.id}: answer part "${part}" missing from options`);
      if(i>=0) opts.splice(i,1);
    }
    check(opts.length>0, `${t.id}/${x.id}: no distractor options`);
    check(x.answerParts.join('')===x.finalWord.replace(/\s+/g,''), `${t.id}/${x.id}: answerParts do not join into finalWord "${x.finalWord}"`);
  }
}

// 3. Softening red-lines: never teach kitap+ı or köpek+i style builds.
for(const t of TOPICS.filter(t=>t.type==='builder')){
  for(const x of datasetFor(t.id)){
    const [first, second] = x.answerParts;
    if(second && /^[ıiuüae]/.test(second)){
      // Hard rule from qa/known-critical-rules.md:
      check(!(first==='kitap'), `${t.id}/${x.id}: "kitap" must soften to "kitab" before a vowel block`);
      check(!(first==='köpek'), `${t.id}/${x.id}: "köpek" must soften to "köpeğ" before a vowel block`);
    }
  }
}

// 4. Every referenced media file exists on disk.
const audioFiles = new Set(readdirSync(join(root,'audio')));
const imageFiles = new Set(readdirSync(join(root,'images')));
for(const item of allLessonItems()){
  for(const k of ['audio','mainAudio','exampleAudio','contrastAudio']){
    if(item[k]) check(audioFiles.has(item[k].replace('audio/','')), `${item.topicId}/${item.id}: missing ${item[k]}`);
  }
  if(item.extraExamples) for(const ex of item.extraExamples){
    if(ex.audio) check(audioFiles.has(ex.audio.replace('audio/','')), `${item.topicId}/${item.id}: missing ${ex.audio}`);
  }
  if(item.image) check(imageFiles.has(item.image.replace('images/','')), `${item.topicId}/${item.id}: missing ${item.image}`);
}

// 5. i18n parity: every key exists in both EN and ID.
const { en, id } = dictKeys();
for(const k of en) check(id.includes(k), `i18n key "${k}" missing in ID`);
for(const k of id) check(en.includes(k), `i18n key "${k}" missing in EN`);

// 6. Explanation keys referenced by items must exist.
for(const item of allLessonItems()){
  if(item.explanationKey) check(!!EXPLANATIONS[item.explanationKey], `${item.topicId}/${item.id}: unknown explanationKey "${item.explanationKey}"`);
}

// 7. Core PWA/site files exist.
for(const f of ['index.html','manifest.json','sw.js','favicon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-180.png']){
  check(existsSync(join(root,f)), `missing site file: ${f}`);
}

if(failures){ console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log('All data-integrity checks passed.');
