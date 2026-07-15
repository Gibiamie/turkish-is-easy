import { t, localized, LANGS } from './i18n.js';
import { PROFILES, getProfile, defaultProfile, migrateLegacyProgress, clearProfileProgress } from './profiles.js';
import { TOPICS, SECTIONS, datasetFor, topicById, EXPLANATIONS, buildReviewDataset, reviewableDueKeys } from './lessonData.js';
import { ProgressManager, STREAK_MILESTONES } from './progressStore.js';
import { esc, progressBar, visual, explanationSheet, pct, toast, focusSignature, restoreFocus } from './uiComponents.js';
import { renderQA } from './qaPanel.js';
import { speechRecognitionAvailable, listenFor, ttsAvailable, speakRobot } from './speech.js';

const app = document.getElementById('app');
const sheet = document.getElementById('sheet-root');
const QA_MODE = new URLSearchParams(location.search).has('qa');
const SESSION_KEY = 'tie_v1_session';
const DAILY_GOAL = 10;

const icons = { alphabet:'ABC', root_words:'-lik', meaning_builder:'🧩', whose_builder:'★', plural_builder:'🦆', accusative_builder:'🎒', dative_builder:'➡️', combo_builder:'🧱', greetings:'👋', colors:'🎨', family:'👨‍👩‍👧‍👦', deconstruct:'🔍', review:'🔁', numbers:'🔢', animals:'🐾' };
const tones = { alphabet:'blue', root_words:'green', meaning_builder:'purple', whose_builder:'sky', plural_builder:'amber', accusative_builder:'aqua', dative_builder:'rose', combo_builder:'indigo', greetings:'mint', colors:'sun', family:'lilac', deconstruct:'teal', review:'peach', numbers:'sky', animals:'rose' };
const sectionLabels = { sounds:'sectionSounds', words:'sectionWords', builders:'sectionBuilders', practice:'sectionPractice' };

let audio = null;
let recognizer = null;
let storageWarned = false;

let s = {
  screen:'profile', profile:null, language:'en', mode:'kids',
  topicId:null, index:0, selected:[], answered:false,
  progress:null, practiced:{}, step:'learn', recall:null,
  opts:null,            // shuffled builder options for the current item
  wrongCount:{},        // wrong attempts per item this session (auto-help)
  doneStats:null        // stats for the topic-complete screen
};

// ---------- helpers ----------
const data = () => datasetFor(s.topicId);
const item = () => data()[s.index];
const name = () => s.profile?.name || (s.language==='id' ? 'Ayza' : 'Bella');
const key = () => item() ? s.topicId + '::' + item().id : '';
const isReview = () => topicById(s.topicId)?.type === 'review';
const done = () => item() && !isReview() && s.progress.isComplete(s.topicId, item().id);

function canNext(){
  const tp = topicById(s.topicId)?.type;
  if(tp === 'review') return !!s.practiced[key()];
  if(tp === 'builder') return s.answered || done();
  return done() || !!s.practiced[key()];
}

function shuffle(a){
  a = a.slice();
  for(let i=a.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function rootOptions(x){
  const others = shuffle(data().filter(w=>w.id!==x.id).map(w=>w.word)).slice(0,2);
  return shuffle([x.word, ...others]);
}
function deconOptions(x){
  const others = shuffle(data().filter(w=>w.id!==x.id).map(w=>w.id)).slice(0,2);
  return shuffle([x.id, ...others]);
}
function builderOptions(x){
  // Shuffled once per item entry so the answer can't be tapped left-to-right
  // straight from the data order; stable across re-renders of the same item.
  if(!s.opts) s.opts = shuffle(x.options);
  return s.opts;
}
function butterflies(){
  return `<div class="butterfly-burst" aria-hidden="true"><span>🦋</span><span>🦋</span><span>🦋</span><span>🦋</span><span>🦋</span></div>`;
}
function warnStorageOnce(){
  if(!storageWarned && s.progress && s.progress.storageBlocked()){
    storageWarned = true;
    toast(t(s.language,'storageWarning'),'warn');
  }
}

// ---------- session + routing ----------
function saveSession(){
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ profileId:s.profile?.id||null, screen:s.screen, topicId:s.topicId, index:s.index, mode:s.mode })); }
  catch { /* private mode: session just won't survive reload */ }
}
function loadSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}
function hashFor(){
  if(s.screen==='home') return '#/home';
  if(s.screen==='rewards') return '#/rewards';
  if(s.screen==='done') return '#/done/'+(s.topicId||'');
  if(s.screen==='lesson') return `#/lesson/${s.topicId}/${s.index}`;
  return '#/profiles';
}
let applyingHash = false;
function pushHash(){
  const h = hashFor();
  if(location.hash !== h){ applyingHash = true; location.hash = h; }
}
function applyHash(){
  if(applyingHash){ applyingHash=false; return; }
  const parts = (location.hash||'').replace(/^#\/?/,'').split('/');
  if(!s.profile){ render(); return; } // no profile yet: stay on the chooser
  if(parts[0]==='lesson' && topicById(parts[1])){
    const i = Math.max(0, Math.min(datasetFor(parts[1]).length-1, parseInt(parts[2],10)||0));
    openLesson(parts[1], i, {fromHash:true});
  } else if(parts[0]==='rewards'){ s.screen='rewards'; render();
  } else if(parts[0]==='profiles'){ s.screen='profile'; render();
  } else { s.screen='home'; s.topicId=null; render(); }
}
window.addEventListener('hashchange', applyHash);

// ---------- navigation ----------
function selectProfile(id, opts={}){
  const p = getProfile(id) || defaultProfile();
  const previous = s.profile;
  // Guest is temporary by promise: leaving it clears its progress.
  if(previous && previous.id==='guest' && p.id!=='guest'){
    if(clearProfileProgress('guest')) toast(t(p.language,'guestCleared'));
  }
  s = { ...s, screen:'home', profile:p, language:p.language, mode:p.mode, topicId:null, index:0, selected:[], answered:false, practiced:{}, opts:null, recall:null, wrongCount:{} };
  s.progress = new ProgressManager({ profileId:p.id, language:p.language, mode:p.mode });
  document.documentElement.lang = p.language;
  if(!opts.silent){ pushHash(); }
  render();
}

function openLesson(id, i=0, opts={}){
  if(id==='review') buildReviewDataset(s.progress.dueReviewKeys());
  const stepFor = topicById(id)?.type==='review' ? 'quiz' : 'learn';
  Object.assign(s, { screen:'lesson', topicId:id, index:i, selected:[], answered:false, step:stepFor, recall:null, opts:null });
  if(!opts.fromHash) pushHash();
  render();
  preloadItemAudio();
}

function goHome(){
  Object.assign(s, { screen:'home', topicId:null, selected:[], answered:false, opts:null });
  pushHash();
  render();
}

function goRewards(){
  s.screen = 'rewards';
  pushHash();
  render();
}

function move(delta){
  if(delta>0 && !canNext()) return toast(t(s.language,'practiceBeforeNext'),'warn');
  if(delta>0 && !isReview() && !done() && s.practiced[key()]) completeCurrent();
  openLesson(s.topicId, Math.max(0, Math.min(data().length-1, s.index+delta)));
}

function completeCurrent(){
  const res = s.progress.markComplete(s.topicId, item().id);
  if(res && res.milestone) toast(t(s.language,'streakMilestone',{n:res.milestone}));
  warnStorageOnce();
}

function finishTopic(){
  if(!canNext()) return toast(t(s.language,'practiceBeforeNext'),'warn');
  if(!isReview() && !done() && s.practiced[key()]) completeCurrent();
  const q = topicById(s.topicId);
  const d = data();
  const ids = d.map(x=>x.id);
  if(!isReview() && s.progress.completedCount(s.topicId, ids) === d.length){
    s.doneStats = {
      topicTitle: localized(q.title, s.language),
      count: d.length,
      accuracy: s.progress.topicAccuracy(s.topicId, ids)
    };
    s.screen = 'done';
    pushHash();
    return render();
  }
  goHome();
}

// ---------- rendering ----------
function render(){
  const sig = focusSignature();
  document.documentElement.dataset.mode = s.mode || 'kids';
  if(!s.profile || s.screen==='profile'){ profilesScreen(); }
  else if(s.screen==='home'){ dashboard(); }
  else if(s.screen==='rewards'){ rewardsScreen(); }
  else if(s.screen==='done'){ celebrationScreen(); }
  else { lesson(); }
  saveSession();
  restoreFocus(sig);
}

function profilesScreen(){
  const l = s.language || 'en';
  const cards = PROFILES.map(p =>
    `<button class="profile-card" data-a="profile" data-id="${esc(p.id)}" data-profile="${esc(p.id)}"><span aria-hidden="true">${esc(p.icon)}</span><div><strong>${esc(t(p.language,'profile'+p.id[0].toUpperCase()+p.id.slice(1))||p.name)}</strong><p>${esc(t(p.language,p.descriptionKey))}</p></div></button>`
  ).join('');
  app.innerHTML = `<main class="center-shell"><section class="hero-card"><div class="brand-mark big" aria-hidden="true">TR</div><h1>${esc(t(l,'appTitle'))}</h1><p>${esc(t(l,'version'))}</p></section><section class="card"><h2>${esc(t(l,'selectProfile'))}</h2><p>${esc(t(l,'selectProfileSub'))}</p><div class="profile-grid">${cards}</div></section></main>`;
}

function recommendedTopic(){
  for(const q of TOPICS){
    if(q.type==='review') continue;
    const d = datasetFor(q.id);
    if(s.progress.completedCount(q.id, d.map(x=>x.id)) < d.length) return q.id;
  }
  return 'review';
}

function moduleCard(q, recommendId){
  const l = s.language;
  if(q.type==='review'){
    const due = reviewableDueKeys(s.progress.dueReviewKeys()).length;
    const badge = due>0 ? `<span class="due-badge">${esc(t(l,'reviewDue',{n:due}))}</span>` : `<span class="due-badge fresh">${esc(t(l,'reviewFresh'))}</span>`;
    return `<button class="module-card ${tones[q.id]||'blue'}" data-a="topic" data-id="${q.id}"><span class="module-art" aria-hidden="true">${icons[q.id]||'★'}</span><span class="module-copy"><strong>${esc(localized(q.title,l))}</strong><em>${esc(localized(q.sub,l))}</em>${badge}</span><span class="module-arrow" aria-hidden="true">→</span></button>`;
  }
  const d = datasetFor(q.id);
  const p = pct(s.progress.completedCount(q.id, d.map(x=>x.id)), d.length);
  const ribbon = q.id===recommendId ? `<span class="start-ribbon">▶ ${esc(t(l, p>0?'continue':'startHere'))}</span>` : '';
  return `<button class="module-card ${tones[q.id]||'blue'} ${q.id===recommendId?'recommended':''}" data-a="topic" data-id="${q.id}">${ribbon}<span class="module-art" aria-hidden="true">${icons[q.id]||'★'}</span><span class="module-copy"><strong>${esc(localized(q.title,l))}</strong><em>${esc(localized(q.sub,l))}</em></span><span class="module-arrow" aria-hidden="true">→</span><i style="--p:${p}%" aria-hidden="true"></i></button>`;
}

function dashboard(){
  const l = s.language, n = name();
  const st = s.progress.streakCount();
  const all = TOPICS.filter(q=>q.type!=='review').flatMap(q=>datasetFor(q.id).map(x=>({q:q.id,id:x.id})));
  const total = all.length || 1;
  const finished = all.filter(x=>s.progress.isComplete(x.q,x.id)).length;
  const overall = pct(finished,total);
  const today = s.progress.todayCount();
  const goalPct = Math.min(100, pct(today, DAILY_GOAL));
  const recommendId = recommendedTopic();

  const sections = SECTIONS.map(sec => {
    const topics = TOPICS.filter(q=>q.section===sec);
    if(!topics.length) return '';
    return `<h2 class="section-title">${esc(t(l,sectionLabels[sec]))}</h2><section class="module-grid">${topics.map(q=>moduleCard(q,recommendId)).join('')}</section>`;
  }).join('');

  const qaBlock = QA_MODE ? renderQA(s) : '';

  app.innerHTML = `<main class="home-page">
    <section class="home-header"><div class="avatar" aria-hidden="true">${esc(n[0])}</div><div><h1>${esc(n)}</h1><p><span>⭐ ${st}</span> ${esc(t(l,'dayStreak'))}</p></div><button class="lang-pill" data-a="settings" aria-label="${esc(t(l,'settings'))}">🌐 ${l.toUpperCase()}</button></section>
    <section class="laya-hero"><div class="laya-mascot" aria-hidden="true">🐬</div><div class="hero-text"><h2>Merhaba, ${esc(n)}! 👋</h2><p>${esc(t(l,'heroLine'))}</p><button class="btn primary" data-a="topic" data-id="${esc(recommendId)}">▶ ${esc(t(l,'continue'))}</button></div></section>
    <section class="progress-card"><div class="progress-ring" style="--p:${overall}"><strong>${overall}%</strong><span>${esc(t(l,'complete'))}</span></div><div class="progress-copy"><h3>${esc(t(l,'greetingPraise'))} <span>${esc(t(l,'greetingProgress'))}</span></h3>${progressBar(overall)}<div class="stats"><b>📘 ${total}<small>${esc(t(l,'lessons'))}</small></b><b>🏆 ${finished}<small>${esc(t(l,'done'))}</small></b><b>🔥 ${st}<small>${esc(t(l,'dayStreak'))}</small></b></div><p class="daily-goal ${today>=DAILY_GOAL?'reached':''}">🎯 ${esc(t(l,'dailyGoal'))}: ${today}/${DAILY_GOAL} ${today>=DAILY_GOAL?'· '+esc(t(l,'goalDone')):''}</p><div class="progress goal"><span style="width:${goalPct}%"></span></div></div></section>
    ${sections}
    ${qaBlock}
    <nav class="bottom-nav"><button class="active" data-a="home">🏠 ${esc(t(l,'dashboard'))}</button><button data-a="rewards">🏆 ${esc(t(l,'rewards'))}</button><button data-a="settings">⚙ ${esc(t(l,'settings'))}</button></nav>
  </main>`;
  warnStorageOnce();
}

function rewardsScreen(){
  const l = s.language;
  const st = s.progress.streakCount();
  const badges = TOPICS.filter(q=>q.type!=='review').map(q=>{
    const d = datasetFor(q.id);
    const earned = s.progress.completedCount(q.id, d.map(x=>x.id)) === d.length;
    return `<div class="badge-card ${earned?'earned':''}"><span class="badge-icon" aria-hidden="true">${earned?(icons[q.id]||'★'):'🔒'}</span><strong>${esc(localized(q.title,l))}</strong><em>${esc(t(l, earned?'badgeEarned':'badgeLocked'))}</em></div>`;
  }).join('');
  const celebrated = s.progress.celebratedMilestones();
  const stones = STREAK_MILESTONES.map(m=>{
    const got = celebrated.includes(m) || st>=m;
    return `<div class="badge-card small ${got?'earned':''}"><span class="badge-icon" aria-hidden="true">${got?'🔥':'🔒'}</span><strong>${esc(t(l,'milestoneDays',{n:m}))}</strong></div>`;
  }).join('');
  app.innerHTML = `<main class="home-page">
    <section class="home-header"><button class="close-x" data-a="home" aria-label="${esc(t(l,'dashboard'))}">×</button><div><h1>${esc(t(l,'rewards'))}</h1><p><span>⭐ ${st}</span> ${esc(t(l,'dayStreak'))}</p></div></section>
    <h2 class="section-title">${esc(t(l,'badges'))}</h2>
    <section class="badge-grid">${badges}</section>
    <h2 class="section-title">${esc(t(l,'milestones'))}</h2>
    <section class="badge-grid">${stones}</section>
    <nav class="bottom-nav"><button data-a="home">🏠 ${esc(t(l,'dashboard'))}</button><button class="active" data-a="rewards">🏆 ${esc(t(l,'rewards'))}</button><button data-a="settings">⚙ ${esc(t(l,'settings'))}</button></nav>
  </main>`;
}

function celebrationScreen(){
  const l = s.language;
  const stats = s.doneStats || {topicTitle:'', count:0, accuracy:100};
  const stars = stats.accuracy>=90 ? 3 : stats.accuracy>=70 ? 2 : 1;
  const starRow = [1,2,3].map(i=>`<span class="star ${i<=stars?'lit':''}" aria-hidden="true">★</span>`).join('');
  app.innerHTML = `<main class="center-shell celebrate-page">
    <section class="hero-card celebrate-card">
      <div class="success-laya" aria-hidden="true">🐬</div>
      <div class="celebrate-anchor celebration-anchor">${butterflies()}</div>
      <h1>${esc(t(l,'topicComplete'))} 🎉</h1>
      <p>${esc(t(l,'youFinished',{topic:stats.topicTitle}))}</p>
      <div class="star-row" role="img" aria-label="${stars}/3">${starRow}</div>
      <div class="stats celebrate-stats"><b>📘 ${stats.count}<small>${esc(t(l,'itemsLearned'))}</small></b><b>🎯 ${stats.accuracy}%<small>${esc(t(l,'accuracy'))}</small></b><b>🔥 ${s.progress.streakCount()}<small>${esc(t(l,'dayStreak'))}</small></b></div>
      <button class="btn primary full" data-a="home">${esc(t(l,'backHome'))}</button>
    </section>
  </main>`;
}

// ---------- lesson rendering ----------
function head(title,p,total){
  return `<header class="lesson-head"><button class="close-x" data-a="home" aria-label="${esc(t(s.language,'dashboard'))}">×</button><h1>${esc(title)}</h1><span class="streak-pill">🔥 ${s.progress.streakCount()}</span><div class="lesson-progress" aria-hidden="true"><span style="width:${p}%"></span></div><b>${s.index+1} / ${total}</b></header>`;
}
function guideLabel(){ return esc(t(s.language, s.mode==='adult'?'guide':'layaGuide')); }
function guide(text){
  return `<section class="laya-guide"><div class="mini-laya" aria-hidden="true">🐬</div><div><strong>${guideLabel()}</strong><p>${esc(text)}</p></div></section>`;
}
function teach(x){
  const l = s.language, ex = EXPLANATIONS[x.explanationKey]||{};
  const lead = s.answered ? t(l,'builtMeaning') : (localized(ex.main,l)||t(l,'buildPrompt'));
  const attrs = x.explanationKey ? ` data-a="explain" data-key="${esc(x.explanationKey)}" role="button" tabindex="0"` : '';
  return `<section class="laya-guide tappable"${attrs}><div class="mini-laya" aria-hidden="true">🐬</div><div><strong>${guideLabel()}</strong><p>${esc(lead)}</p>${x.explanationKey?`<span class="link-btn">${esc(t(l,'learnWhy'))} →</span>`:''}</div></section>`;
}
function acts(){
  const l = s.language;
  return `<div class="learning-actions"><button class="learn-action primary" data-a="practice"><span class="ico" aria-hidden="true">✓</span><span class="lbl">${esc(t(l,'practiceDone'))}</span></button><button class="learn-action" data-a="known"><span class="ico" aria-hidden="true">☆</span><span class="lbl">${esc(t(l,'alreadyKnow'))}</span></button><button class="learn-action" data-a="more"><span class="ico" aria-hidden="true">↻</span><span class="lbl">${esc(t(l,'needsMorePractice'))}</span></button></div><p class="status">${esc(t(l,'practiceRule'))}</p>`;
}
function cueVisual(x){
  if(x.digit) return `<div class="visual"><span class="bignum">${esc(x.digit)}</span></div>`;
  if(x.swatch) return `<div class="visual swatch" style="background:${esc(x.swatch)}"></div>`;
  if(x.emoji) return `<div class="visual emoji-cue"><span aria-hidden="true">${esc(x.emoji)}</span></div>`;
  if(x.image) return visual(x);
  return `<div class="visual fallback"><span lang="tr">${esc(x.fallback||x.word||'?')}</span></div>`;
}
function soundButton(path, labelKey, icon){
  if(!path) return '';
  return `<button class="sound-card" data-a="play" data-path="${esc(path)}">${icon} ${esc(t(s.language,labelKey))}</button>`;
}
function sayItButton(word){
  if(!speechRecognitionAvailable() || !word) return '';
  return `<button class="sound-card say-it" data-a="say-it" data-word="${esc(word)}">🎤 ${esc(t(s.language,'sayIt'))}</button>`;
}
function robotButton(word){
  if(!ttsAvailable() || !word) return '';
  return `<button class="sound-card robot" data-a="robot" data-word="${esc(word)}">🤖 ${esc(t(s.language,'robotVoice'))}</button>`;
}

function lesson(){
  const l = s.language, q = topicById(s.topicId), d = data(), x = item();
  const p = isReview() ? pct(s.index, d.length) : pct(s.progress.completedCount(s.topicId, d.map(v=>v.id)), d.length);
  const last = s.index === d.length-1;
  const body = q.type==='alphabet' ? alphabet(x,p,q,d.length)
    : (q.type==='root'||q.type==='vocab'||q.type==='review') ? root(x,p,q,d.length)
    : q.type==='deconstruct' ? deconstruct(x,p,q,d.length)
    : builder(x,p,q,d.length);
  const end = last ? `<button class="btn success" data-a="finish">${esc(t(l,'finishTopic'))}</button>` : `<button class="btn primary" data-a="next">${esc(t(l,'next'))}</button>`;
  app.innerHTML = `<main class="lesson-page">${body}<nav class="lesson-nav"><button class="btn secondary" data-a="prev" ${s.index===0?'disabled':''}>${esc(t(l,'previous'))}</button><button class="btn secondary" data-a="home">${esc(t(l,'dashboard'))}</button>${end}</nav></main>`;
}

function alphabet(x,p,q,n){
  const l = s.language;
  const b = [
    soundButton(x.mainAudio,'mainSound','🔊'),
    soundButton(x.exampleAudio,'exampleWord','📖'),
    soundButton(x.contrastAudio,'contrastSound','〽')
  ].filter(Boolean);
  const replayPath = x.exampleAudio || x.mainAudio || '';
  const replay = replayPath ? `<button class="round-sound" data-a="play" data-path="${esc(replayPath)}" aria-label="${esc(t(l,'listen'))}">🔊</button>` : '';
  return `${head(localized(q.title,l),p,n)}<section class="lesson-card">${guide(localized(x.target,l))}<div class="letter-stage"><div class="letter" lang="tr">${esc(x.letter)}</div><div class="sound-grid">${b.join('')}</div></div><section class="example-card"><div class="example-icon" aria-hidden="true">🎁</div><div><div class="word-large" lang="tr">${esc(x.exampleWord||'')}</div><p>${esc(localized(x.target,l))}</p></div>${replay}</section><button class="link-btn" data-a="explain" data-key="${esc(x.explanationKey)}">${esc(t(l,'learnWhy'))}</button><p id="audio-status" class="status" aria-live="polite"></p>${acts()}</section>`;
}

function root(x,p,q,n){
  const l = s.language, meaning = localized(x.meaning,l), word = x.word||'';
  if(s.step!=='quiz'){
    return `${head(localized(q.title,l),p,n)}<section class="lesson-card">${guide(t(l,'rootLead',{word,meaning}))}<div class="prompt-card">${cueVisual(x)}<div><h2 class="word-large" lang="tr">${esc(word)}</h2><p>${esc(meaning)}</p></div>${x.audio?`<button class="round-sound" data-a="play" data-path="${esc(x.audio)}" aria-label="${esc(t(l,'listen'))}">🔊</button>`:''}</div><div class="sound-grid inline">${sayItButton(word)}${!x.audio?robotButton(word):''}</div><p id="audio-status" class="status" aria-live="polite"></p><button class="btn primary full" data-a="root-practice">${esc(t(l,'startPractice'))}</button></section>`;
  }
  const solved = !!(s.recall && s.recall.correct);
  const opts = (s.recall && s.recall.opts) || rootOptions(x);
  const wide = opts.some(w=>w.length>7);
  const grid = opts.map(w=>{
    const cls = s.recall && s.recall.picked===w ? (w===x.word?'right':'wrong') : (solved && w===x.word ? 'right':'');
    return `<button class="recall-option ${cls}" lang="tr" data-a="root-pick" data-word="${esc(w)}" ${solved?'disabled':''}>${esc(w)}</button>`;
  }).join('');
  const fb = solved
    ? `<section class="success-panel"><div class="success-check" aria-hidden="true">✓</div><div><h2>${esc(t(l,'successTitle'))} 🎉</h2><p><strong lang="tr">${esc(x.word)}</strong> = ${esc(meaning)}</p></div>${x.audio?`<button class="btn secondary" data-a="play" data-path="${esc(x.audio)}">${esc(t(l,'listen'))}</button>`:robotButton(x.word)}</section>`
    : (s.recall && s.recall.picked ? `<div class="feedback bad">${esc(t(l,'tryAgain'))}</div>` : '');
  return `${head(localized(q.title,l),p,n)}<section class="lesson-card">${guide(t(l,'recallLead',{meaning}))}<div class="recall-cue">${cueVisual(x)}<p>${esc(t(l,'recallTap'))} <strong>${esc(meaning)}</strong></p></div><div class="recall-grid${wide?' stack':''} celebration-anchor">${grid}${solved?butterflies():''}</div><div id="feedback-slot" aria-live="polite">${fb}</div>${x.audio?'<p id="audio-status" class="status" aria-live="polite"></p>':''}${solved?acts():''}</section>`;
}

function deconstruct(x,p,q,n){
  const l = s.language;
  const solved = !!(s.recall && s.recall.correct);
  const ids = (s.recall && s.recall.opts) || deconOptions(x);
  const grid = ids.map(id=>{
    const it = data().find(w=>w.id===id);
    const cls = s.recall && s.recall.picked===id ? (id===x.id?'right':'wrong') : (solved && id===x.id ? 'right':'');
    return `<button class="recall-option ${cls}" data-a="decon-pick" data-id="${esc(id)}" ${solved?'disabled':''}>${esc(localized(it.meaning,l))}</button>`;
  }).join('');
  const wide = ids.some(id=>localized(data().find(w=>w.id===id).meaning,l).length>10);
  const fb = solved
    ? `<section class="success-panel"><div class="success-check" aria-hidden="true">✓</div><div><h2>${esc(t(l,'successTitle'))} 🎉</h2><p><strong lang="tr">${esc(x.word)}</strong> = ${esc(localized(x.meaning,l))}</p></div>${x.audio?`<button class="btn secondary" data-a="play" data-path="${esc(x.audio)}">${esc(t(l,'listen'))}</button>`:''}</section>`
    : (s.recall && s.recall.picked ? `<div class="feedback bad">${esc(t(l,'tryAgain'))}</div>` : '');
  return `${head(localized(q.title,l),p,n)}<section class="lesson-card">${guide(t(l,'deconLead'))}<div class="recall-cue"><div class="word-stage"><h2 lang="tr">${esc(x.word)}</h2>${x.audio?`<button class="round-sound" data-a="play" data-path="${esc(x.audio)}" aria-label="${esc(t(l,'listen'))}">🔊</button>`:''}</div><p>${esc(t(l,'deconWhat'))}</p></div><div class="recall-grid${wide?' stack':''} celebration-anchor">${grid}${solved?butterflies():''}</div><div id="feedback-slot" aria-live="polite">${fb}</div>${x.audio?'<p id="audio-status" class="status" aria-live="polite"></p>':''}${solved?acts():''}</section>`;
}

function builder(x,p,q,n){
  const l = s.language;
  const chosen = s.selected.length
    ? s.selected.map((v,i)=>`<button class="chip selected" lang="tr" data-a="remove" data-i="${i}">${esc(v)}</button>`).join('')
    : `<span>${esc(t(l,'answerHere'))}</span>`;
  const opts = builderOptions(x).map(v=>`<button class="chip" lang="tr" data-a="pick" data-part="${esc(v)}">${esc(v)}</button>`).join('');
  const listenBtn = x.audio
    ? `<button class="btn secondary" data-a="play" data-path="${esc(x.audio)}">${esc(t(l,'listen'))}</button>`
    : robotButton(x.finalWord);
  const ok = s.answered
    ? `<section class="success-panel"><div class="success-check" aria-hidden="true">✓</div><div><h2>${esc(t(l,'successTitle'))} 🎉</h2><p>${esc(t(l,'correct'))}</p><strong lang="tr">${esc(x.finalWord)}</strong></div>${listenBtn}</section>`
    : '';
  return `${head(localized(q.title,l),p,n)}<section class="builder-screen"><section class="prompt-hero">${x.image?`<span class="hero-img" style="background-image:url('${esc(x.image)}')" aria-hidden="true"></span>`:''}<div class="copy"><h2>${esc(localized(x.prompt,l))}</h2><p>${esc(t(l,'noFinalAnswer'))}</p></div></section>${teach(x)}<div class="answer-zone">${chosen}</div><div class="chip-grid">${opts}</div><div class="button-row celebration-anchor"><button class="btn secondary" data-a="clear">↻ ${esc(t(l,'clear'))}</button><button class="btn primary" data-a="check">✓ ${esc(t(l,'check'))}</button>${s.answered?butterflies():''}</div><div id="feedback-slot" aria-live="polite">${ok}</div><p id="audio-status" class="status" aria-live="polite">${(!s.answered&&x.audio)?esc(t(l,'audioLocked')):''}</p></section>`;
}

function settings(){
  const l = s.language;
  const m = ['kids','family','adult'].map(x=>`<button class="seg ${s.mode===x?'active':''}" data-a="mode" data-mode="${x}">${esc(t(l,x))}</button>`).join('');
  sheet.innerHTML = `<div class="sheet-backdrop" data-a="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t(l,'settings'))}"><h2>${esc(t(l,'settings'))}</h2><div class="settings-line"><span>${esc(t(l,'profile'))}</span><strong>${esc(name())}</strong></div><div class="settings-line"><span>${esc(t(l,'learningPath'))}</span><strong>${esc(LANGS[l].native)}</strong></div><label>${esc(t(l,'learnerMode'))}</label><div class="seg-row">${m}</div><button class="btn secondary full" data-a="profiles">${esc(t(l,'changeProfile'))}</button><button class="btn danger full" data-a="reset">${esc(t(l,'resetProgress'))}</button><button class="btn primary full" data-a="close">${esc(t(l,'close'))}</button></div></div>`;
}

// ---------- audio ----------
function setAudioStatus(text){
  const st = document.getElementById('audio-status');
  if(st) st.textContent = text;
}
function play(path){
  const l = s.language;
  if(!path){ toast(t(l,'audioMissing'),'warn'); return; }
  if(audio) audio.pause();
  audio = new Audio(path);
  setAudioStatus(t(l,'audioLoading'));
  const practiceKey = key();
  // Practice credit is earned when sound actually plays — not on tap.
  audio.onplaying = () => { s.practiced[practiceKey] = true; setAudioStatus(t(l,'audioPlaying')); };
  audio.onended = () => setAudioStatus(t(l,'audioReady'));
  audio.onerror = () => setAudioStatus(t(l,'audioError'));
  audio.play().catch(()=>setAudioStatus(t(l,'audioError')));
}
function preloadItemAudio(){
  const x = item();
  if(!x) return;
  const path = x.audio || x.mainAudio || x.exampleAudio;
  if(path){ const a = new Audio(); a.preload='auto'; a.src=path; }
}

// ---------- speech ----------
function sayIt(word, button){
  const l = s.language;
  if(recognizer){ try{ recognizer.abort(); }catch{ /* ignore */ } }
  const practiceKey = key();
  button.disabled = true;
  setAudioStatus(t(l,'listening'));
  recognizer = listenFor(word, {
    onResult: ({match, heard}) => {
      button.disabled = false;
      if(match){
        s.practiced[practiceKey] = true;
        setAudioStatus(t(l,'sayItGreat'));
        toast(t(l,'sayItGreat'));
      } else {
        setAudioStatus(heard ? t(l,'sayItTry',{word:heard}) : t(l,'sayItFail'));
      }
    },
    onError: () => { button.disabled = false; setAudioStatus(t(l,'sayItFail')); }
  });
}

// ---------- wrong-answer help (auto "Learn why" after 2 misses) ----------
function noteWrong(x){
  const k = key();
  s.wrongCount[k] = (s.wrongCount[k]||0)+1;
  if(s.wrongCount[k]===2 && x.explanationKey){
    sheet.innerHTML = explanationSheet(s.language, x.explanationKey, x);
  }
}

// ---------- event handling ----------
function activate(b){
  const a = b.dataset.a;
  if(a==='profile') return selectProfile(b.dataset.id);
  if(a==='topic') return openLesson(b.dataset.id);
  if(a==='home') return goHome();
  if(a==='rewards') return goRewards();
  if(a==='settings') return settings();
  if(a==='close'){ sheet.innerHTML=''; return; }
  if(a==='profiles'){ sheet.innerHTML=''; s.screen='profile'; pushHash(); return render(); }
  if(a==='mode'){
    s.mode = b.dataset.mode;
    s.progress = new ProgressManager({profileId:s.profile.id, language:s.language, mode:s.mode});
    sheet.innerHTML='';
    return render();
  }
  if(a==='prev') return move(-1);
  if(a==='next') return move(1);
  if(a==='finish') return finishTopic();
  if(a==='play') return play(b.dataset.path);
  if(a==='say-it') return sayIt(b.dataset.word, b);
  if(a==='robot'){ if(!speakRobot(b.dataset.word)) toast(t(s.language,'audioMissing'),'warn'); return; }
  if(a==='root-practice'){
    s.step='quiz';
    s.recall={opts:rootOptions(item()), picked:null, correct:false};
    return lesson();
  }
  if(a==='root-pick'){
    if(s.recall && s.recall.correct) return;
    const x=item(), w=b.dataset.word, ok=w===x.word;
    if(isReview()){
      // Review is never scored: only the source item's SRS schedule moves.
      if(x.srcTopic) s.progress.recordReview(x.srcTopic, x.id, ok);
    } else {
      s.progress.recordAttempt(s.topicId, x.id, ok, w);
    }
    s.recall={opts:(s.recall&&s.recall.opts)||rootOptions(x), picked:w, correct:ok};
    if(ok) s.practiced[key()]=true; else noteWrong(x);
    warnStorageOnce();
    return lesson();
  }
  if(a==='decon-pick'){
    if(s.recall && s.recall.correct) return;
    const x=item(), id=b.dataset.id, ok=id===x.id;
    s.progress.recordAttempt(s.topicId, x.id, ok, id);
    s.recall={opts:(s.recall&&s.recall.opts)||deconOptions(x), picked:id, correct:ok};
    if(ok) s.practiced[key()]=true; else noteWrong(x);
    return lesson();
  }
  if(a==='practice' || a==='known'){
    if(!s.practiced[key()]) return toast(t(s.language,'practiceFirstWarning'),'warn');
    if(!isReview()) completeCurrent();
    return lesson();
  }
  if(a==='more'){
    if(!s.practiced[key()]) return toast(t(s.language,'practiceFirstWarning'),'warn');
    const x=item();
    const srcTopic = isReview() ? (x.srcTopic||null) : s.topicId;
    if(srcTopic) s.progress.markNeedsPractice(srcTopic, x.id);
    return toast(t(s.language,'needsMoreSaved'));
  }
  if(a==='pick'){
    if(!s.answered){ s.selected.push(b.dataset.part); lesson(); }
    return;
  }
  if(a==='remove'){ s.selected.splice(+b.dataset.i,1); return lesson(); }
  if(a==='clear'){ s.selected=[]; s.answered=false; return lesson(); }
  if(a==='check'){
    const x=item(), ok=JSON.stringify(s.selected)===JSON.stringify(x.answerParts);
    s.progress.recordAttempt(s.topicId, x.id, ok, s.selected);
    warnStorageOnce();
    if(ok){
      s.answered=true;
      completeCurrent();
      return lesson();
    }
    noteWrong(x);
    const slot=document.getElementById('feedback-slot');
    if(slot) slot.innerHTML=`<div class="feedback bad">${esc(t(s.language,'wrong'))}</div>`;
    return;
  }
  if(a==='reset'){ s.progress.clear(); sheet.innerHTML=''; return render(); }
  if(a==='explain'){ sheet.innerHTML=explanationSheet(s.language, b.dataset.key, item()); return; }
}

document.addEventListener('click', e=>{
  const b = e.target.closest('[data-a]');
  if(!b) return;
  if(b.dataset.a==='close' && b.classList.contains('sheet-backdrop') && e.target!==b) return;
  activate(b);
});
// Keyboard support for non-<button> tappables (e.g. the Laya "Learn why" card).
document.addEventListener('keydown', e=>{
  if(e.key!=='Enter' && e.key!==' ') return;
  const b = e.target.closest('[role="button"][data-a]');
  if(!b || b.tagName==='BUTTON') return;
  e.preventDefault();
  activate(b);
});
// Image fallback without inline handlers: swap a broken visual for its label.
document.addEventListener('error', e=>{
  const img = e.target;
  if(img.tagName==='IMG' && img.dataset && img.dataset.fallback!==undefined){
    const box = img.parentElement;
    img.remove();
    const span = box && box.querySelector('.visual-fallback');
    if(span) span.hidden = false;
  }
}, true);

// ---------- error boundary ----------
window.addEventListener('error', ()=>{
  if(!app.innerHTML.trim()){
    app.innerHTML = `<main class="center-shell"><section class="hero-card"><h1>Turkish Is Easy</h1><p>Something went wrong. Please reload the page.<br>Terjadi kesalahan. Muat ulang halaman.</p><button class="btn primary" onclick="location.reload()">↻</button></section></main>`;
  }
});

// ---------- boot ----------
migrateLegacyProgress();
const session = loadSession();
if(session && session.profileId && getProfile(session.profileId)){
  selectProfile(session.profileId, {silent:true});
  if(session.mode && session.mode!==s.mode){
    s.mode = session.mode;
    s.progress = new ProgressManager({profileId:s.profile.id, language:s.language, mode:s.mode});
  }
  if(location.hash && location.hash!=='#/home'){
    applyHash();
  } else if(session.screen==='lesson' && topicById(session.topicId)){
    openLesson(session.topicId, Math.max(0, Math.min(datasetFor(session.topicId).length-1, session.index||0)));
  } else {
    pushHash();
    render();
  }
} else {
  render();
}
