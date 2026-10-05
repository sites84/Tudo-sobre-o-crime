(function(){
function E(id){return document.getElementById(id)}
function normalizeImages(root){
  root.querySelectorAll('img').forEach(img=>{
    let src=img.getAttribute('src')||'';
    try{
      if(/^https?:\/\//i.test(src)){
        const u=new URL(src); const marker='/Tudo-sobre-o-crime/'; const i=u.pathname.indexOf(marker);
        if(i>=0) src=u.pathname.slice(i+marker.length);
      }
    }catch(e){}
    src=src.replace(/^\.\.\//,'').replace(/^\//,'');
    if(src.startsWith('assets/')) img.setAttribute('src','../'+src);
  });
}
function htmlForPost(doc){
  const root=doc.querySelector('article')||doc.querySelector('main')||doc.body;
  root.innerHTML=E('area').innerHTML;
  normalizeImages(root);
  doc.querySelectorAll('script').forEach(s=>{if(/const\s+files\s*=/.test(s.textContent||''))s.remove()});
  return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
const oldEdit=window.editCase;
window.editCase=async function(path){
  await oldEdit(path);
  setTimeout(()=>{normalizeImages(E('area'));},50);
};
window.savePost=async function(){
  if(!window.TSC || !TSC.current)return notify('Nenhum post carregado.',false);
  try{
    const newPath='casos/'+slug(E('slug').value)+'.html';
    if(newPath!==TSC.current.path)return window.renameAndSave(newPath);
    const fresh=await gh(TSC.current.path);
    const doc=new DOMParser().parseFromString(dec(fresh.content),'text/html');
    doc.title=E('title').value.trim();
    let m=doc.querySelector('meta[name="description"]');
    if(!m){m=doc.createElement('meta');m.name='description';doc.head.appendChild(m)}
    m.content=E('desc').value.trim();
    const out=htmlForPost(doc);
    const j=await put(TSC.current.path,out,'Atualiza post pelo editor visual',fresh.sha);
    TSC.current.sha=j.content.sha; TSC.current.html=out;
    notify('Post salvo no GitHub.');
  }catch(e){notify(e.message,false)}
};
window.saveCover=async function(){
  if(!TSC.current)return notify('Crie ou abra o post primeiro.',false);
  const p=E('coverPath').value.trim();
  if(!p)return notify('Envie uma capa primeiro.',false);
  try{
    const fresh=await gh(TSC.current.path);
    const doc=new DOMParser().parseFromString(dec(fresh.content),'text/html');
    let m=doc.querySelector('meta[property="og:image"]');
    if(!m){m=doc.createElement('meta');m.setAttribute('property','og:image');doc.head.appendChild(m)}
    m.content='../'+p.replace(/^\.\.\//,'');
    const root=doc.querySelector('article')||doc.querySelector('main')||doc.body;
    let cover=root.querySelector('.post-cover');
    if(!cover){cover=doc.createElement('figure');cover.className='post-cover';root.insertBefore(cover,root.firstChild)}
    cover.innerHTML='<img src="../'+p.replace(/^\.\.\//,'')+'" alt="Capa do caso">';
    const out='<!doctype html>\n'+doc.documentElement.outerHTML;
    const j=await put(TSC.current.path,out,'Define capa do post',fresh.sha);
    TSC.current.sha=j.content.sha;TSC.current.html=out;
    if(typeof updateHomeCover==='function')await updateHomeCover(TSC.current.path,p);
    notify('Capa salva no post.');
  }catch(e){notify(e.message,false)}
};
window.insertImage=async function(){
  const i=document.createElement('input');i.type='file';i.accept='image/*';
  i.onchange=async()=>{
    const f=i.files[0];if(!f)return;
    const n=prompt('Nome da imagem:',f.name.replace(/\.[^.]+$/,''));if(!n)return;
    const fr=new FileReader();
    fr.onload=()=>{const im=new Image();
      im.onload=async()=>{try{
        const max=2400,s=Math.min(1,max/Math.max(im.width,im.height));
        const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*s));c.height=Math.max(1,Math.round(im.height*s));
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        const data=c.toDataURL('image/webp',.88).split(',')[1],p='assets/'+slug(n)+'.webp';
        let old=null;try{old=await gh(p)}catch(e){}
        await put(p,data,'Adiciona imagem pelo editor visual',old&&old.sha);
        const img=document.createElement('img');img.src='../'+p;img.alt=n;img.style.maxWidth='100%';img.style.height='auto';
        const ed=E('area');ed.focus();const sel=window.getSelection();let r;
        if(sel.rangeCount&&ed.contains(sel.anchorNode))r=sel.getRangeAt(0);else{r=document.createRange();r.selectNodeContents(ed);r.collapse(false)}
        r.deleteContents();r.insertNode(img);r.setStartAfter(img);r.collapse(true);sel.removeAllRanges();sel.addRange(r);
        notify('Imagem enviada e inserida corretamente.');
      }catch(e){notify(e.message,false)}};im.onerror=()=>notify('Não foi possível ler a imagem.',false);im.src=fr.result};
    fr.readAsDataURL(f);
  };i.click();
};
})();