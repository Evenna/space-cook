/* ============================================================
   灵感碰撞 · SPACE × EARTH  —  app logic
   ============================================================ */
const $  = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const pick=a=>a[Math.floor(Math.random()*a.length)];

const state={space:null,earth:null,cooking:false};

/* photo url helper */
function photo(item,w=600){
  const id=PHOTOS[item.id];
  if(id) return `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;
  // fallback: keyword via picsum seeded (topical not guaranteed)
  return `https://picsum.photos/seed/${encodeURIComponent(item.id)}/${w}/${w}`;
}

/* ============================================================
   1. RENDER photo collage cards
   ============================================================ */
function cardHTML(item,side){
  return `<div class="card" data-id="${item.id}" data-side="${side}" title="${esc(item.name)}">
    <img loading="lazy" src="${photo(item,520)}" alt="${esc(item.name)}"
         onerror="this.onerror=null;this.src='https://picsum.photos/seed/${item.id}/400'">
    <div class="meta"><div class="cid">${item.id}</div><div class="cname">${esc(item.name)}</div></div>
  </div>`;
}
function renderList(side){
  const data=side==='space'?SPACE_SIGNALS:EARTH_PRODUCTS;
  const q=(side==='space'?$('#searchS'):$('#searchE')).value.trim().toLowerCase();
  const el=side==='space'?$('#listS'):$('#listE');
  const filtered=data.filter(d=>!q||(d.name+d.tag+d.id+(d.kw||[]).join('')).toLowerCase().includes(q));
  el.innerHTML=filtered.map(d=>cardHTML(d,side)).join('');
  const usedId=side==='space'?state.space?.id:state.earth?.id;
  if(usedId){const u=el.querySelector(`[data-id="${usedId}"]`);if(u)u.classList.add('picked');}
}
renderList('space');renderList('earth');
$('#searchS').addEventListener('input',()=>{renderList('space');drawWires();});
$('#searchE').addEventListener('input',()=>{renderList('earth');drawWires();});
function findItem(side,id){return (side==='space'?SPACE_SIGNALS:EARTH_PRODUCTS).find(d=>d.id===id);}

/* ============================================================
   2. SILKY DRAG  (pointer events + eased ghost)
   ============================================================ */
const ghost=$('#ghost'), ghostImg=$('#ghost img');
let drag=null;
function ghostLoop(){
  if(drag){
    drag.gx+=(drag.tx-drag.gx)*0.3;
    drag.gy+=(drag.ty-drag.gy)*0.3;
    const rot=Math.max(-12,Math.min(12,(drag.tx-drag.gx)*0.5));
    ghost.style.transform=`translate(${drag.gx-48}px,${drag.gy-48}px) rotate(${rot}deg) scale(1.02)`;
  }
  requestAnimationFrame(ghostLoop);
}
requestAnimationFrame(ghostLoop);

function startDrag(e,card){
  if(card.classList.contains('picked'))return;
  const side=card.dataset.side, item=findItem(side,card.dataset.id);
  drag={side,item,tx:e.clientX,ty:e.clientY,gx:e.clientX,gy:e.clientY,srcEl:card};
  ghostImg.src=photo(item,200);
  ghost.classList.add('on');
  card.style.opacity=.4;
  try{card.setPointerCapture(e.pointerId);}catch(_){}
}
function moveDrag(e){
  if(!drag)return;
  drag.tx=e.clientX;drag.ty=e.clientY;
  // hover highlight on slots
  const over=slotUnder(e.clientX,e.clientY);
  $$('.slot').forEach(s=>s.classList.toggle('over', s===over));
}
function endDrag(e){
  if(!drag)return;
  const over=slotUnder(e.clientX,e.clientY);
  if(drag.srcEl)drag.srcEl.style.opacity='';
  $$('.slot').forEach(s=>s.classList.remove('over'));
  ghost.classList.remove('on');
  if(over){
    const wantSide=over.dataset.side;
    // allow dropping either side into either slot? keep strict: match side
    if(wantSide===drag.side) placeInSlot(drag.side,drag.item);
    else { // snap into the matching slot regardless of which slot hit
      placeInSlot(drag.side,drag.item);
    }
  }
  drag=null;
}
function slotUnder(x,y){
  for(const s of $$('.slot')){
    const r=s.getBoundingClientRect();
    if(x>=r.left-10&&x<=r.right+10&&y>=r.top-10&&y<=r.bottom+10)return s;
  }
  return null;
}
document.addEventListener('pointerdown',e=>{
  const card=e.target.closest('.card');
  if(card){e.preventDefault();startDrag(e,card);}
},{passive:false});
document.addEventListener('pointermove',moveDrag,{passive:true});
document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',endDrag);

/* click-to-fill (tap) fallback */
let lastDown=null;
document.addEventListener('pointerdown',e=>{lastDown={x:e.clientX,y:e.clientY,t:Date.now()};});
document.addEventListener('pointerup',e=>{
  const card=e.target.closest('.card');
  if(card&&lastDown&&!card.classList.contains('picked')){
    const moved=Math.hypot(e.clientX-lastDown.x,e.clientY-lastDown.y);
    if(moved<6){const side=card.dataset.side;placeInSlot(side,findItem(side,card.dataset.id));}
  }
});

/* ============================================================
   3. SLOTS
   ============================================================ */
function placeInSlot(side,item){
  state[side]=item;
  const slot=side==='space'?$('#slotS'):$('#slotE');
  slot.classList.add('filled');
  slot.innerHTML=`<span class="clearx" data-clear="${side}">✕</span>
    <img src="${photo(item,320)}" alt="" onerror="this.src='https://picsum.photos/seed/${item.id}/300'">
    <div class="fillcap"><div class="fid">${item.id}</div><div class="fname">${esc(item.name)}</div></div>`;
  slot.animate([{transform:'scale(.6)',opacity:.3},{transform:'scale(1.1)',offset:.6},{transform:'scale(1)',opacity:1}],
    {duration:440,easing:'cubic-bezier(.34,1.56,.64,1)'});
  renderList(side);updateCook();drawWires();
}
function clearSlot(side){
  state[side]=null;
  const slot=side==='space'?$('#slotS'):$('#slotE');
  slot.classList.remove('filled');
  const sym=side==='space'?'✦':'◆', label=side==='space'?'太空线索':'地球线索';
  slot.innerHTML=`<span class="clearx" data-clear="${side}">✕</span><span class="sym">${sym}</span>${label}`;
  renderList(side);updateCook();drawWires();
}
document.addEventListener('click',e=>{
  const x=e.target.closest('[data-clear]');
  if(x){e.stopPropagation();clearSlot(x.dataset.clear);}
});

function updateCook(){
  const ready=state.space&&state.earth;
  const btn=$('#cookBtn');
  btn.disabled=!ready||state.cooking;
  const hint=$('#cookHint');
  if(state.cooking)hint.textContent='灵感正在融合…';
  else if(ready)hint.textContent='一切就绪，点火吧 🔥';
  else if(state.space||state.earth)hint.textContent='还差一个，再拖一个进来';
  else hint.textContent='拖入两条线索';
}

/* ============================================================
   4. CURVED WIRE CONNECTORS  (picked card -> center ×)
   ============================================================ */
const wires=$('#wires');
function centerPoint(){
  const x=$('.xmark').getBoundingClientRect();
  return {x:x.left+x.width/2, y:x.top+x.height/2};
}
function curve(from,to,dir){
  // dir: +1 pull right, -1 pull left for the control handles
  const mx=(from.x+to.x)/2;
  const c1x=from.x+dir*Math.min(120,Math.abs(to.x-from.x)*0.5);
  const c2x=to.x-dir*Math.min(120,Math.abs(to.x-from.x)*0.5);
  return `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`;
}
function drawWires(){
  wires.innerHTML='';
  const c=centerPoint();
  const draw=(side,toSlotSel,dir)=>{
    const it=state[side];if(!it)return;
    const cardEl=document.querySelector(`.card[data-id="${it.id}"]`);
    const slot=$(toSlotSel).getBoundingClientRect();
    const slotPt={x:dir>0?slot.left:slot.right, y:slot.top+slot.height/2};
    if(cardEl){
      const r=cardEl.getBoundingClientRect();
      const from={x:dir>0?r.right:r.left, y:r.top+r.height/2};
      addPath(curve(from,slotPt,dir),from);
    }
  };
  draw('space','#slotS',1);
  draw('earth','#slotE',-1);
}
function addPath(d,from){
  const ns='http://www.w3.org/2000/svg';
  const p=document.createElementNS(ns,'path');p.setAttribute('d',d);
  const len=p.getTotalLength?300:0;
  wires.appendChild(p);
  if(p.getTotalLength){const L=p.getTotalLength();
    p.style.strokeDasharray=L;p.style.strokeDashoffset=L;
    p.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:500,easing:'ease-out',fill:'forwards'});
  }
  const dot=document.createElementNS(ns,'circle');
  dot.setAttribute('cx',from.x);dot.setAttribute('cy',from.y);dot.setAttribute('r',4.5);
  wires.appendChild(dot);
}
addEventListener('resize',drawWires);
addEventListener('scroll',drawWires,{passive:true});

/* ============================================================
   5. COOKING sequence
   ============================================================ */
$('#cookBtn').addEventListener('click',cook);
async function cook(){
  if(!state.space||!state.earth||state.cooking)return;
  state.cooking=true;updateCook();
  const btn=$('#cookBtn');btn.classList.add('cooking');btn.innerHTML='<span class="spark">✦</span>融合中…';
  // shake slots
  const slots=$('.slots');
  slots.animate([{transform:'translate(0,0) rotate(0)'},{transform:'translate(-4px,2px) rotate(-1deg)'},
    {transform:'translate(4px,-2px) rotate(1deg)'},{transform:'translate(-3px,1px) rotate(-.6deg)'},
    {transform:'translate(0,0) rotate(0)'}],{duration:420,iterations:4,easing:'ease-in-out'});
  // pulse wires
  $$('#wires path').forEach(p=>p.animate([{strokeWidth:2.5},{strokeWidth:5},{strokeWidth:2.5}],
    {duration:500,iterations:3,easing:'ease-in-out'}));
  await sleep(1000);
  // particle burst from center
  burstAt(centerPoint());
  // flash
  const flash=document.createElement('div');
  flash.style.cssText='position:fixed;inset:0;z-index:70;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 42%,rgba(46,75,255,.28),transparent 55%)';
  document.body.appendChild(flash);
  flash.animate([{opacity:0},{opacity:1,offset:.25},{opacity:0}],{duration:650,easing:'ease-out'});
  setTimeout(()=>flash.remove(),660);
  await sleep(300);
  // fetch + render
  openResults();showLoader();
  let ideas;
  try{ideas=await getIdeas(state.space,state.earth);}
  catch(err){console.warn('AI failed → fallback',err);ideas=localIdeas(state.space,state.earth);}
  renderNotes(ideas);
  state.cooking=false;
  btn.classList.remove('cooking');btn.innerHTML='<span class="spark">✦</span>Cooking';
  updateCook();
  $('#results').scrollIntoView({behavior:'smooth',block:'start'});
}

/* particle burst (canvas-free, DOM dots) */
function burstAt(pt){
  const N=26;
  for(let i=0;i<N;i++){
    const d=document.createElement('div');
    const sz=4+Math.random()*7;
    d.style.cssText=`position:fixed;left:${pt.x}px;top:${pt.y}px;width:${sz}px;height:${sz}px;border-radius:50%;
      background:${Math.random()>.4?'#2E4BFF':'#9db0ff'};z-index:72;pointer-events:none`;
    document.body.appendChild(d);
    const ang=Math.random()*Math.PI*2, dist=60+Math.random()*180;
    d.animate([{transform:'translate(0,0) scale(1)',opacity:1},
      {transform:`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px) scale(0)`,opacity:0}],
      {duration:700+Math.random()*400,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    setTimeout(()=>d.remove(),1150);
  }
}

/* ============================================================
   6. RESULTS (sticky notes)
   ============================================================ */
const results=$('#results'), noteGrid=$('#noteGrid'), comboLine=$('#comboLine');
function openResults(){
  results.style.display='block';
  comboLine.innerHTML=`<b>✦ ${esc(state.space.name)}</b> &nbsp;×&nbsp; <b>◆ ${esc(state.earth.name)}</b> &nbsp;→&nbsp; 太空旅馆新物种`;
}
function showLoader(){
  noteGrid.innerHTML=`<div class="loading">
    <div class="orbit"><i></i><i></i><i></i></div>
    <div class="lt">正在把「${esc(state.space.name)}」与「${esc(state.earth.name)}」投入熔炉<br>合成太空旅馆新物种中…</div>
  </div>`;
}
function renderNotes(ideas){
  noteGrid.innerHTML='';
  ideas.forEach((idea,i)=>{
    const el=document.createElement('div');el.className='note';
    el.innerHTML=`<div class="num">IDEA ${String(i+1).padStart(2,'0')}</div>
      <h3>${esc(idea.title)}</h3><p>${esc(idea.desc)}</p>
      <div class="tags">${(idea.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;
    noteGrid.appendChild(el);
    el.animate([{opacity:0,transform:'translateY(30px) scale(.94) rotate(0)'},
      {opacity:1,transform:'translateY(0) scale(1)'}],
      {duration:620,delay:i*140,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  });
}
$('#againBtn').addEventListener('click',async()=>{
  showLoader();
  let ideas;try{ideas=await getIdeas(state.space,state.earth,true);}catch(e){ideas=localIdeas(state.space,state.earth);}
  renderNotes(ideas);
});
$('#clearBtn').addEventListener('click',()=>{
  clearSlot('space');clearSlot('earth');
  results.style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
});

/* ============================================================
   7. AI (DeepSeek) + local fallback
   ============================================================ */
const KEY='spacecook_deepseek_key';
const getKey=()=>localStorage.getItem(KEY)||'';
async function getIdeas(s,e,variety=false){
  const key=getKey();
  if(!key)return localIdeas(s,e);
  const prompt=
`你是太空产品创新的头脑风暴大师。现有两个输入：
【太空处境】${s.id} ${s.name}：${s.desc}（关键词：${(s.kw||[]).join('、')}）
【地球已有产品】${e.id} ${e.name}：${e.desc}（关键词：${(e.kw||[]).join('、')}）

把两者"熔炉融合"，为【太空旅馆/太空旅居】场景头脑风暴 4 个全新的产品、服务或系统点子。要大胆、具体、有想象力、有情绪与画面感${variety?'，和常规思路不同，给我意外的脑洞':''}。
每个点子返回：title(6-12字有记忆点、像展览标题的名字)、desc(45-75字说清它是什么、怎么用、为谁解决什么)、tags(3个关键词标签)。
严格只返回 JSON 数组，不要任何解释：[{"title":"","desc":"","tags":["","",""]}]`;
  const res=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:'deepseek-chat',temperature:variety?1.3:1.0,messages:[{role:'user',content:prompt}]})});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();
  let txt=data.choices[0].message.content.trim().replace(/^```json?/i,'').replace(/```$/,'').trim();
  return JSON.parse(txt).slice(0,4);
}
function localIdeas(s,e){
  const sk=(s.kw||[s.tag]), ek=(e.kw||[e.tag]);
  const clean=n=>n.replace(/（.*?）/g,'').replace(/\s+[A-Za-z].*$/,'').trim();
  const en=clean(e.name), sn=clean(s.name);
  const aud=['首批太空旅客','长期旅居者','太空蜜月情侣','零重力里的孩子','轨道旅馆管家','失重中的长者'];
  const forms=['可穿戴装置','舱内交互系统','仪式化体验','模块化家具','共享服务','生物共生装置'];
  const verbs=['重构','再想象','进化','嫁接','逆转','放大'];
  return [
    {title:`零重力${en.slice(0,5)}`,
     desc:`把【${sn}】的「${pick(sk)}」原理注入${en}，为${pick(aud)}做一款失重舱里更好用的${pick(forms)}，把太空的硬约束变成独特卖点。`,
     tags:[pick(sk),pick(ek),'太空旅馆']},
    {title:`把${en.slice(0,3)}寄到轨道`,
     desc:`一个把「${pick(sk)}」与「${pick(ek)}」合二为一的舱内${pick(forms)}：旅客入住即自动${pick(verbs)}体验，第一次感到"这不是地球，却更温柔"。`,
     tags:[s.tag,e.tag,'旅居体验']},
    {title:`会呼吸的${en.slice(0,4)}`,
     desc:`借【${sn}】的闭环/再生思路，把${en}升级成能自我循环、零浪费的太空旅馆配套，${pick(verbs)}旅客与资源的关系，住一晚也在参与生态。`,
     tags:['资源闭环',pick(ek),'可持续']},
    {title:`${pick(['星际','轨道','失重','深空'])}仪式·${e.tag}`,
     desc:`把实用的${en}变成一场有情绪的太空仪式：结合「${pick(sk)}」，为${pick(aud)}设计一个值得拍照、值得回忆、只在太空才成立的${pick(forms)}。`,
     tags:['情感设计','仪式感',pick(sk)]},
  ];
}

/* ============================================================
   8. modals
   ============================================================ */
const keyModal=$('#keyModal'), howModal=$('#howModal');
$('#keyBtn').addEventListener('click',()=>{$('#keyInput').value=getKey();keyModal.classList.add('show');});
$('#keySave').addEventListener('click',()=>{const v=$('#keyInput').value.trim();v?localStorage.setItem(KEY,v):localStorage.removeItem(KEY);keyModal.classList.remove('show');});
$('#keyClear').addEventListener('click',()=>{localStorage.removeItem(KEY);$('#keyInput').value='';});
keyModal.addEventListener('click',e=>{if(e.target===keyModal)keyModal.classList.remove('show');});
$('#howBtn').addEventListener('click',()=>howModal.classList.add('show'));
$('#howClose').addEventListener('click',()=>howModal.classList.remove('show'));
howModal.addEventListener('click',e=>{if(e.target===howModal)howModal.classList.remove('show');});

updateCook();
