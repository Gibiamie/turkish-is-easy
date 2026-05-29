function applyAlphaCFix(){
  const title=document.querySelector('.topbar h1')?.textContent?.trim();
  const sub=document.querySelector('.topbar p')?.textContent || '';
  const letter=document.querySelector('.letter')?.textContent?.trim();
  if(title!=='Alphabet Pro' || letter!=='c' || !sub.includes('Item 9 of 12')) return;
  const word=document.querySelector('.word-large');
  if(word) word.textContent='cam';
  document.querySelectorAll('button[data-action="play"]').forEach(btn=>{
    const label=btn.textContent.trim().toLowerCase();
    if(label==='example word' || label==='contoh kata'){
      btn.dataset.path='audio/pronunciation_tr_cam.mp3';
    }
  });
}

const observer=new MutationObserver(applyAlphaCFix);
observer.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(applyAlphaCFix,0));
applyAlphaCFix();
