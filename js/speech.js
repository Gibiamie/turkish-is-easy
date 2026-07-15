// Browser speech helpers. Both features are optional enrichment:
// they never gate progress and hide themselves when unsupported.
// Per project red-lines, synthetic audio is only offered where no
// human recording exists, and always labeled as a robot voice.

const Recognition = typeof window!=='undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export function speechRecognitionAvailable(){ return !!Recognition; }

// Fold Turkish text for tolerant comparison of recognition results.
function fold(s){
  return String(s||'').toLocaleLowerCase('tr')
    .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o')
    .replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9 ]/g,'').trim();
}

export function listenFor(targetWord, { onStart, onResult, onError } = {}){
  if(!Recognition) { onError && onError('unsupported'); return null; }
  const rec = new Recognition();
  rec.lang = 'tr-TR';
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  let settled = false;
  rec.onstart = () => { onStart && onStart(); };
  rec.onresult = (e) => {
    settled = true;
    const target = fold(targetWord);
    const alternatives = [];
    for(const result of e.results) for(const alt of result) alternatives.push(alt.transcript);
    const heard = alternatives[0] || '';
    const match = alternatives.some(a => fold(a) === target || fold(a).includes(target));
    onResult && onResult({ match, heard });
  };
  rec.onerror = () => { settled = true; onError && onError('error'); };
  rec.onend = () => { if(!settled) onError && onError('silence'); };
  try { rec.start(); } catch { onError && onError('error'); return null; }
  return rec;
}

let voicesCache = null;
function turkishVoice(){
  if(!('speechSynthesis' in window)) return null;
  voicesCache = voicesCache || window.speechSynthesis.getVoices();
  if(!voicesCache.length) voicesCache = window.speechSynthesis.getVoices();
  return voicesCache.find(v => (v.lang||'').toLowerCase().startsWith('tr')) || null;
}

export function ttsAvailable(){
  try { return !!turkishVoice(); } catch { return false; }
}

export function speakRobot(word){
  const voice = turkishVoice();
  if(!voice) return false;
  const u = new SpeechSynthesisUtterance(word);
  u.voice = voice; u.lang = 'tr-TR'; u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}

// Voice lists load asynchronously in some browsers; warm the cache.
if(typeof window!=='undefined' && 'speechSynthesis' in window){
  window.speechSynthesis.onvoiceschanged = () => { voicesCache = window.speechSynthesis.getVoices(); };
}
