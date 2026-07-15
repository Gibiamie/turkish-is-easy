import { localized, t } from './i18n.js';
import { EXPLANATIONS } from './lessonData.js';

export function esc(s){ return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
export function pct(done,total){ return total ? Math.round(done/total*100) : 0; }
export function progressBar(value){ return `<div class="progress"><span style="width:${Math.max(0,Math.min(100,value))}%"></span></div><div class="progress-label">${value}%</div>`; }

export function visual(item){
  const fallback = esc(item?.fallback || item?.word || 'WORD');
  if(item?.image){
    return `<div class="visual"><img src="${esc(item.image)}" alt="" loading="lazy" data-fallback="${fallback}"><span class="visual-fallback" hidden>${fallback}</span></div>`;
  }
  return `<div class="visual fallback"><span>${fallback}</span></div>`;
}

// Non-blocking toast, replaces alert(). aria-live container lives in index.html.
let toastTimer = null;
export function toast(message, kind='info'){
  const root = document.getElementById('toast-root');
  if(!root) return;
  root.innerHTML = `<div class="toast ${kind==='warn'?'toast-warn':''}">${esc(message)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ root.innerHTML=''; }, 3200);
}

// Focus restoration across full re-renders: capture a small signature of the
// active element before rendering, find its equivalent after.
export function focusSignature(){
  const el = document.activeElement;
  if(!el || el===document.body || !el.dataset || !el.dataset.a) return null;
  return { a:el.dataset.a, id:el.dataset.id||'', part:el.dataset.part||'', word:el.dataset.word||'', i:el.dataset.i||'', path:el.dataset.path||'' };
}
export function restoreFocus(sig){
  if(!sig) return;
  const candidates = document.querySelectorAll(`[data-a="${CSS.escape(sig.a)}"]`);
  for(const el of candidates){
    if((el.dataset.id||'')===sig.id && (el.dataset.part||'')===sig.part && (el.dataset.word||'')===sig.word && (el.dataset.i||'')===sig.i && (el.dataset.path||'')===sig.path){
      el.focus({preventScroll:true});
      return;
    }
  }
}

export function explanationSheet(lang,key,item){
  const ex=EXPLANATIONS[key] || {};
  const list=(ex.practice?.[lang] || ex.practice?.en || []).map(x=>`<li>${esc(x)}</li>`).join('');
  const block=(label,val)=> val ? `<div class="explain-block"><h4>${esc(label)}</h4><p>${esc(val)}</p></div>` : '';
  const reveal = item && item.revealAfterCorrect ? item.revealAfterCorrect : '';
  const wordBlock = reveal ? `<div class="explain-block word-formula"><h4>${esc(t(lang,'thisWord'))}</h4><p><strong lang="tr">${esc(reveal)}</strong></p></div>` : '';
  return `<div class="sheet-backdrop" data-a="close"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t(lang,'learnWhy'))}">
    <h2>${esc(t(lang,'learnWhy'))}</h2>
    ${wordBlock}
    ${block(t(lang,'keyRule'), localized(ex.main,lang))}
    ${block(t(lang,'whatHear'), localized(ex.hear,lang))}
    ${block(t(lang,'mouthTip'), localized(ex.mouth,lang))}
    ${block(t(lang,'commonMistake'), localized(ex.mistake,lang))}
    ${list ? `<div class="explain-block"><h4>${esc(t(lang,'miniPractice'))}</h4><ol>${list}</ol></div>` : ''}
    <button class="btn primary full" data-a="close">${esc(t(lang,'close'))}</button>
  </div></div>`;
}
