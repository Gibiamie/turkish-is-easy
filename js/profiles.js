export const PROFILES = [
  { id:'bella', name:'Bella', icon:'B', language:'en', mode:'kids', locked:false, descriptionKey:'profileBellaSub' },
  { id:'ayza', name:'Ayza', icon:'A', language:'id', mode:'kids', locked:false, descriptionKey:'profileAyzaSub' },
  { id:'adult', name:'Adult', icon:'AD', language:'en', mode:'adult', locked:false, descriptionKey:'profileAdultSub' },
  { id:'guest', name:'Guest', icon:'G', language:'en', mode:'family', locked:false, descriptionKey:'profileGuestSub' }
];
export function getProfile(id){ return PROFILES.find(p=>p.id===id) || null; }
export function defaultProfile(){ return PROFILES[0]; }

const PREFIX = 'tie_v1_progress__';
const OLD_PREFIX = 'tmb_rc6_progress__';

export function profileStorageKey(profileId, language, mode){ return `${PREFIX}${profileId}__${language}__${mode}`; }

// One-time migration: users who tried the old app on this device keep their progress.
export function migrateLegacyProgress(){
  try {
    if(localStorage.getItem('tie_v1_migrated')) return;
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(OLD_PREFIX)){
        const newKey = PREFIX + k.slice(OLD_PREFIX.length);
        if(!localStorage.getItem(newKey)) localStorage.setItem(newKey, localStorage.getItem(k));
      }
    }
    localStorage.setItem('tie_v1_migrated','1');
  } catch { /* storage unavailable — nothing to migrate */ }
}

export function clearProfileProgress(profileId){
  try {
    const doomed=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && k.startsWith(`${PREFIX}${profileId}__`)) doomed.push(k);
    }
    doomed.forEach(k=>localStorage.removeItem(k));
    return doomed.length>0;
  } catch { return false; }
}
