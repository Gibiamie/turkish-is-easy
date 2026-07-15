import { profileStorageKey } from './profiles.js';

export function dayStamp(date=new Date()){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function dayDiff(a,b){ return Math.round((new Date(a+'T00:00:00') - new Date(b+'T00:00:00')) / 86400000); }
function addDays(stamp,n){ const d=new Date(stamp+'T00:00:00'); d.setDate(d.getDate()+n); return dayStamp(d); }

export const STREAK_MILESTONES = [3,7,14,30];
const SRS_INTERVALS = [1,3,7,14]; // days until next review, by step

export class LocalProgressStore {
  constructor(scope){
    this.scope = scope;
    this.key = profileStorageKey(scope.profileId, scope.language, scope.mode);
    this._mem = null;          // in-memory fallback when storage is blocked
    this.storageBlocked = false;
  }
  _empty(){ return { meta:{...this.scope, store:'local', schema:'tie1'}, items:{}, attempts:{}, streak:{count:0, lastActiveDay:null, milestones:[]}, srs:{}, daily:{} }; }
  load(){
    if(this._mem) return this._mem;
    try {
      const data = JSON.parse(localStorage.getItem(this.key)) || this._empty();
      data.srs = data.srs || {}; data.daily = data.daily || {};
      data.streak = data.streak || {count:0,lastActiveDay:null,milestones:[]};
      data.streak.milestones = data.streak.milestones || [];
      return data;
    }
    catch { return this._mem || this._empty(); }
  }
  save(data){
    try { localStorage.setItem(this.key, JSON.stringify(data)); this._mem=null; }
    catch { this._mem = data; this.storageBlocked = true; }
  }
  clear(){
    try { localStorage.removeItem(this.key); } catch { /* ignore */ }
    this._mem = null;
  }
  _touchStreak(data){
    const today=dayStamp();
    const st=data.streak || {count:0, lastActiveDay:null, milestones:[]};
    if(st.lastActiveDay===today) return null; // already counted today
    const gap = st.lastActiveDay ? dayDiff(today, st.lastActiveDay) : null;
    st.count = (gap===1) ? (st.count||0)+1 : 1; // continue if yesterday, else restart
    st.lastActiveDay=today;
    st.milestones = st.milestones || [];
    data.streak=st;
    // Report a newly reached, not-yet-celebrated milestone (if any).
    const hit = STREAK_MILESTONES.find(m => st.count===m && !st.milestones.includes(m));
    if(hit){ st.milestones.push(hit); return hit; }
    return null;
  }
  markComplete(topicId,itemId){
    const data=this.load(); const k=`${topicId}::${itemId}`;
    const existing=data.items[k] || {profileId:this.scope.profileId, language:this.scope.language, mode:this.scope.mode, topicId, itemId, attempts:0, wrongAttempts:0, completed:false};
    const firstCompletion = !existing.completed;
    data.items[k] = {...existing, completed:true, completedAt:new Date().toISOString(), lastSeenAt:new Date().toISOString()};
    if(firstCompletion){ const today=dayStamp(); data.daily[today]=(data.daily[today]||0)+1; }
    const milestone=this._touchStreak(data);
    this.save(data);
    return { item:data.items[k], milestone };
  }
  recordAttempt(topicId,itemId,ok,selected){
    const data=this.load(); const k=`${topicId}::${itemId}`;
    const existing=data.items[k] || {profileId:this.scope.profileId, language:this.scope.language, mode:this.scope.mode, topicId, itemId, attempts:0, wrongAttempts:0, completed:false};
    existing.attempts=(existing.attempts||0)+1; if(!ok) existing.wrongAttempts=(existing.wrongAttempts||0)+1;
    existing.lastAnswer=Array.isArray(selected)?selected.join(' + '):String(selected||'');
    existing.lastSeenAt=new Date().toISOString();
    data.items[k]=existing;
    if(!ok) this._srsSchedule(data, k, false); // wrong answers enter the review queue
    this._touchStreak(data);
    this.save(data); return existing;
  }
  // --- Spaced repetition (review queue) ---
  _srsSchedule(data, key, ok){
    const entry = data.srs[key] || {step:0, due:dayStamp()};
    if(ok){
      entry.step = Math.min(entry.step+1, SRS_INTERVALS.length-1);
      // Fully graduated items leave the queue.
      if(entry.step >= SRS_INTERVALS.length-1){ delete data.srs[key]; return; }
      entry.due = addDays(dayStamp(), SRS_INTERVALS[entry.step]);
    } else {
      entry.step = 0;
      entry.due = dayStamp();
    }
    data.srs[key]=entry;
  }
  markNeedsPractice(topicId,itemId){
    const data=this.load();
    this._srsSchedule(data, `${topicId}::${itemId}`, false);
    this._touchStreak(data);
    this.save(data);
  }
  recordReview(topicId,itemId,ok){
    const data=this.load();
    this._srsSchedule(data, `${topicId}::${itemId}`, ok);
    this._touchStreak(data);
    this.save(data);
  }
  dueReviewKeys(){
    const data=this.load(); const today=dayStamp();
    return Object.entries(data.srs).filter(([,v])=>v.due<=today).map(([k])=>k);
  }
  // --- Stats ---
  streakCount(){
    const st=this.load().streak; if(!st || !st.lastActiveDay) return 0;
    const gap=dayDiff(dayStamp(), st.lastActiveDay);
    return (gap===0 || gap===1) ? (st.count||0) : 0; // broken if a full day was missed
  }
  celebratedMilestones(){ return (this.load().streak||{}).milestones || []; }
  todayCount(){ return this.load().daily[dayStamp()] || 0; }
  isComplete(topicId,itemId){ return !!this.load().items[`${topicId}::${itemId}`]?.completed; }
  completedCount(topicId, validIds){
    const set=new Set(validIds); const items=this.load().items;
    return Object.values(items).filter(x=>x.topicId===topicId && x.completed && set.has(x.itemId)).length;
  }
  topicAccuracy(topicId, validIds){
    const set=new Set(validIds); const items=this.load().items;
    let attempts=0, wrong=0;
    for(const x of Object.values(items)){
      if(x.topicId===topicId && set.has(x.itemId)){ attempts+=x.attempts||0; wrong+=x.wrongAttempts||0; }
    }
    if(!attempts) return 100;
    return Math.round(((attempts-wrong)/attempts)*100);
  }
}

export class CloudProgressStore {
  constructor(scope){ this.scope=scope; this.enabled=false; }
  // Backend-ready stub. A future release can replace this with Supabase.
}

export class ProgressManager {
  constructor(scope){ this.scope=scope; this.local=new LocalProgressStore(scope); this.cloud=new CloudProgressStore(scope); }
  clear(){ this.local.clear(); }
  load(){ return this.local.load(); }
  markComplete(topicId,itemId){ return this.local.markComplete(topicId,itemId); }
  recordAttempt(topicId,itemId,ok,selected){ return this.local.recordAttempt(topicId,itemId,ok,selected); }
  markNeedsPractice(topicId,itemId){ return this.local.markNeedsPractice(topicId,itemId); }
  recordReview(topicId,itemId,ok){ return this.local.recordReview(topicId,itemId,ok); }
  dueReviewKeys(){ return this.local.dueReviewKeys(); }
  isComplete(topicId,itemId){ return this.local.isComplete(topicId,itemId); }
  completedCount(topicId, validIds){ return this.local.completedCount(topicId, validIds); }
  topicAccuracy(topicId, validIds){ return this.local.topicAccuracy(topicId, validIds); }
  streakCount(){ return this.local.streakCount(); }
  celebratedMilestones(){ return this.local.celebratedMilestones(); }
  todayCount(){ return this.local.todayCount(); }
  storageBlocked(){ return this.local.storageBlocked; }
  storeLabel(){ return this.cloud.enabled ? 'Cloud + offline cache' : 'Local fallback · backend-ready'; }
}
