/* ============================================================
   灵感碰撞 · 脑暴厨房  —  app logic
   融合 business-story-hook 卡片链：信号 + 地球 + 场景(S) + 挑战(T)
   ============================================================ */
const $  = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const pick=a=>a[Math.floor(Math.random()*a.length)];

const state={space:null,earth:null,scene:null,challenge:null,cooking:false};

/* photo url helper (signals/earth use PHOTOS; spice use SPICE_PHOTOS) */
function photo(item,w=600){
  const id=(PHOTOS&&PHOTOS[item.id])||(SPICE_PHOTOS&&SPICE_PHOTOS[item.id]);
  if(id) return `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;
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
  const over=slotUnder(e.clientX,e.clientY);
  $$('.slot').forEach(s=>s.classList.toggle('over', s===over));
}
function endDrag(e){
  if(!drag)return;
  const over=slotUnder(e.clientX,e.clientY);
  if(drag.srcEl)drag.srcEl.style.opacity='';
  $$('.slot').forEach(s=>s.classList.remove('over'));
  ghost.classList.remove('on');
  if(over) placeInSlot(drag.side,drag.item);
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
   3. SLOTS (signal + earth)
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
  renderList(side);updateCook();drawWires();dropIntoPot();
}
function clearSlot(side){
  state[side]=null;
  const slot=side==='space'?$('#slotS'):$('#slotE');
  slot.classList.remove('filled');
  const sym=side==='space'?'✦':'◆', label=side==='space'?'太空信号':'地球同款';
  slot.innerHTML=`<span class="clearx" data-clear="${side}">✕</span><span class="sym">${sym}</span>${label}`;
  renderList(side);updateCook();drawWires();updatePotCount();
}
document.addEventListener('click',e=>{
  const x=e.target.closest('[data-clear]');
  if(x){e.stopPropagation();clearSlot(x.dataset.clear);}
});

/* ============================================================
   4. SPICE DRAWER : scenes (S卡) + challenges (T卡)
   ============================================================ */
function renderChips(){
  $('#chipsScene').innerHTML=SCENES.map(s=>
    `<span class="chip scene" data-kind="scene" data-id="${s.id}">${esc(s.name)}<span class="x">✕</span></span>`).join('');
  $('#chipsChal').innerHTML=CHALLENGES.map(c=>
    `<span class="chip chal" data-kind="challenge" data-id="${c.id}">${esc(c.name)}<span class="x">✕</span></span>`).join('');
}
renderChips();
function spiceItem(kind,id){return (kind==='scene'?SCENES:CHALLENGES).find(x=>x.id===id);}
$('#chipsScene').addEventListener('click',e=>onChip(e));
$('#chipsChal').addEventListener('click',e=>onChip(e));
function onChip(e){
  const chip=e.target.closest('.chip');if(!chip)return;
  const kind=chip.dataset.kind, id=chip.dataset.id;
  const key=kind==='scene'?'scene':'challenge';
  const chipsWrap=chip.parentElement;
  if(state[key]&&state[key].id===id){ state[key]=null; }
  else { state[key]=spiceItem(kind,id); }
  // single-select per group
  $$('.chip',chipsWrap).forEach(c=>c.classList.toggle('on', state[key]&&c.dataset.id===state[key].id));
  chip.animate([{transform:'scale(.9)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.34,1.56,.64,1)'});
  updateSpiceBadge();updateCook();updatePotCount();
}
function updateSpiceBadge(){
  const n=(state.scene?1:0)+(state.challenge?1:0);
  const hot=$('#spiceHot'), tog=$('#spiceToggle');
  hot.textContent=n;tog.classList.toggle('has',n>0);
}
/* drawer toggle */
$('#spiceToggle').addEventListener('click',()=>$('#spice').classList.toggle('open'));

/* dice — lucky mode : random pick of all 4 ingredients */
$('#diceBtn').addEventListener('click',()=>{
  placeInSlot('space',pick(SPACE_SIGNALS));
  placeInSlot('earth',pick(EARTH_PRODUCTS));
  state.scene=pick(SCENES); state.challenge=pick(CHALLENGES);
  $$('#chipsScene .chip').forEach(c=>c.classList.toggle('on',c.dataset.id===state.scene.id));
  $$('#chipsChal .chip').forEach(c=>c.classList.toggle('on',c.dataset.id===state.challenge.id));
  $('#spice').classList.add('open');
  updateSpiceBadge();updateCook();updatePotCount();
  $('#diceBtn').animate([{transform:'rotate(0) scale(1)'},{transform:'rotate(360deg) scale(1.06)'},{transform:'rotate(360deg) scale(1)'}],{duration:500,easing:'ease-out'});
});

/* ============================================================
   5. FORGE POT  (visual feedback as ingredients enter)
   ============================================================ */
const pot=$('#pot'), potCount=$('#potCount');
function ingredientCount(){return (state.space?1:0)+(state.earth?1:0)+(state.scene?1:0)+(state.challenge?1:0);}
function updatePotCount(){
  const n=ingredientCount();
  potCount.textContent=n;potCount.classList.toggle('on',n>0);
  const emo=['🫕','🫕','🍲','🍲','🌟'][n]||'🌟';
  $('#potEm').textContent=emo;
}
function dropIntoPot(){
  updatePotCount();
  // little pop on the core
  const core=$('.pot .core');
  core.animate([{transform:'scale(1)'},{transform:'scale(.86)'},{transform:'scale(1.1)'},{transform:'scale(1)'}],
    {duration:420,easing:'cubic-bezier(.34,1.56,.64,1)'});
}

/* ============================================================
   6. COOK readiness
   ============================================================ */
function updateCook(){
  const ready=state.space&&state.earth;
  const btn=$('#cookBtn');
  btn.disabled=!ready||state.cooking;
  const hint=$('#cookHint');
  if(state.cooking){hint.textContent='灵感正在熔炉里翻滚…';return;}
  const extra=[];if(state.scene)extra.push('场景「'+state.scene.name+'」');if(state.challenge)extra.push('挑战「'+state.challenge.name+'」');
  if(ready){
    hint.innerHTML=extra.length? `已加料：${extra.join(' + ')}　点火吧 🔥` : '两味已齐，点火吧 🔥（想更精准可加点料）';
  }else if(state.space||state.earth){
    hint.textContent='还差一味——'+(state.space?'再选一个地球同款':'再选一个太空信号');
  }else{
    hint.textContent='拖入一个太空信号 + 一个地球同款';
  }
}

/* ============================================================
   7. CURVED WIRE CONNECTORS  (picked card -> center ×)
   ============================================================ */
const wires=$('#wires');
function centerPoint(){
  const x=$('.xmark').getBoundingClientRect();
  return {x:x.left+x.width/2, y:x.top+x.height/2};
}
function curve(from,to,dir){
  const c1x=from.x+dir*Math.min(120,Math.abs(to.x-from.x)*0.5);
  const c2x=to.x-dir*Math.min(120,Math.abs(to.x-from.x)*0.5);
  return `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`;
}
function drawWires(){
  wires.innerHTML='';
  const draw=(side,toSlotSel,dir)=>{
    const it=state[side];if(!it)return;
    const cardEl=document.querySelector(`.card[data-id="${it.id}"]`);
    const slot=$(toSlotSel).getBoundingClientRect();
    const slotPt={x:dir>0?slot.left:slot.right, y:slot.top+slot.height/2};
    if(cardEl){
      const r=cardEl.getBoundingClientRect();
      const from={x:dir>0?r.right:r.left, y:r.top+r.height/2};
      addPath(curve(from,slotPt,dir),from,'w-'+side);
    }
  };
  draw('space','#slotS',1);
  draw('earth','#slotE',-1);
}
function addPath(d,from,cls){
  const ns='http://www.w3.org/2000/svg';
  const p=document.createElementNS(ns,'path');p.setAttribute('d',d);p.setAttribute('class',cls||'');
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
   8. COOKING sequence (boil -> burst -> popcorn notes)
   ============================================================ */
$('#cookBtn').addEventListener('click',cook);
async function cook(){
  if(!state.space||!state.earth||state.cooking)return;
  state.cooking=true;updateCook();
  const btn=$('#cookBtn');btn.classList.add('cooking');btn.innerHTML='<span class="spark">✦</span>熔炉翻滚…';

  // pot boils
  pot.classList.add('hot');
  // shake slots
  const slots=$('.slots');
  slots.animate([{transform:'translate(0,0) rotate(0)'},{transform:'translate(-4px,2px) rotate(-1deg)'},
    {transform:'translate(4px,-2px) rotate(1deg)'},{transform:'translate(-3px,1px) rotate(-.6deg)'},
    {transform:'translate(0,0) rotate(0)'}],{duration:420,iterations:4,easing:'ease-in-out'});
  // pulse wires
  $$('#wires path').forEach(p=>p.animate([{strokeWidth:2.5},{strokeWidth:5},{strokeWidth:2.5}],
    {duration:500,iterations:3,easing:'ease-in-out'}));
  // swirling sparks around the pot
  swirlAroundPot(900);
  await sleep(1050);

  // burst from pot center
  const pc=pot.getBoundingClientRect();
  burstAt({x:pc.left+pc.width/2,y:pc.top+pc.height/2});
  const flash=document.createElement('div');
  flash.style.cssText='position:fixed;inset:0;z-index:70;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 42%,rgba(46,75,255,.3),transparent 55%)';
  document.body.appendChild(flash);
  flash.animate([{opacity:0},{opacity:1,offset:.25},{opacity:0}],{duration:650,easing:'ease-out'});
  setTimeout(()=>flash.remove(),660);
  await sleep(300);

  // fetch + render
  openResults();showLoader();
  let ideas;
  try{ideas=await getIdeas();}
  catch(err){console.warn('AI failed → fallback',err);ideas=localIdeas();}
  renderNotes(ideas);
  pot.classList.remove('hot');
  state.cooking=false;
  btn.classList.remove('cooking');btn.innerHTML='<span class="spark">✦</span>Cooking';
  updateCook();
  $('#results').scrollIntoView({behavior:'smooth',block:'start'});
}

/* particle burst */
function burstAt(pt){
  const N=30;
  for(let i=0;i<N;i++){
    const d=document.createElement('div');
    const sz=4+Math.random()*7;
    d.style.cssText=`position:fixed;left:${pt.x}px;top:${pt.y}px;width:${sz}px;height:${sz}px;border-radius:50%;
      background:${Math.random()>.4?'#2E4BFF':'#9db0ff'};z-index:72;pointer-events:none`;
    document.body.appendChild(d);
    const ang=Math.random()*Math.PI*2, dist=70+Math.random()*200;
    d.animate([{transform:'translate(0,0) scale(1)',opacity:1},
      {transform:`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px) scale(0)`,opacity:0}],
      {duration:700+Math.random()*400,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    setTimeout(()=>d.remove(),1200);
  }
}
/* sparks swirling into the pot while boiling */
function swirlAroundPot(dur){
  const pc=pot.getBoundingClientRect();const cx=pc.left+pc.width/2, cy=pc.top+pc.height/2;
  for(let i=0;i<16;i++){
    const d=document.createElement('div');const sz=3+Math.random()*5;
    d.style.cssText=`position:fixed;width:${sz}px;height:${sz}px;border-radius:50%;background:${Math.random()>.5?'#2E4BFF':'#c3cdff'};z-index:71;pointer-events:none`;
    document.body.appendChild(d);
    const R=50+Math.random()*30, a0=Math.random()*Math.PI*2, spins=1+Math.random();
    const frames=[];for(let t=0;t<=1;t+=.1){const a=a0+spins*Math.PI*2*t;const r=R*(1-t*.85);
      frames.push({transform:`translate(${cx+Math.cos(a)*r}px,${cy+Math.sin(a)*r}px)`,opacity:t<.85?1:0});}
    d.animate(frames,{duration:dur,easing:'ease-in',fill:'forwards'});
    setTimeout(()=>d.remove(),dur+50);
  }
}

/* ============================================================
   9. RESULTS (sticky notes, popcorn pop-in)
   ============================================================ */
const results=$('#results'), noteGrid=$('#noteGrid'), recipeLine=$('#recipeLine');
function ingrChips(){
  const bits=[`<span class="ingr s-sig">✦ ${esc(state.space.name)}</span>`,
              `<span class="ingr s-ert">◆ ${esc(state.earth.name)}</span>`];
  if(state.scene)bits.push(`<span class="ingr s-scn">场景·${esc(state.scene.name)}</span>`);
  if(state.challenge)bits.push(`<span class="ingr s-chl">挑战·${esc(state.challenge.name)}</span>`);
  return bits.join(' + ');
}
function openResults(){
  results.style.display='block';
  recipeLine.innerHTML=`本次配方：${ingrChips()} &nbsp;→&nbsp; 太空旅馆新物种`;
}
function showLoader(){
  noteGrid.innerHTML=`<div class="loading">
    <div class="orbit"><i></i><i></i><i></i></div>
    <div class="lt">正在把这组食材投入熔炉<br>合成太空旅馆新物种中…</div>
  </div>`;
}
function renderNotes(ideas){
  noteGrid.innerHTML='';
  ideas.forEach((idea,i)=>{
    const el=document.createElement('div');el.className='note';
    const moment=idea.moment?`<div class="moment"><span class="ml">它接住了哪个时刻</span>${esc(idea.moment)}</div>`:'';
    el.innerHTML=`<div class="remix" title="把这条丢回锅里再炖">↻</div>
      <div class="num">IDEA ${String(i+1).padStart(2,'0')}</div>
      <h3>${esc(idea.title)}</h3>
      <div class="value">${idea.value||esc(idea.desc||'')}</div>
      ${moment}
      <div class="tags">${(idea.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;
    el.querySelector('.remix').addEventListener('click',()=>remix(idea));
    noteGrid.appendChild(el);
    // popcorn: pop up with slight random x + rotate settle
    const rx=(Math.random()*2-1)*10;
    el.animate([{opacity:0,transform:`translateY(46px) scale(.82) rotate(${rx}deg)`},
      {opacity:1,transform:'translateY(-8px) scale(1.03)',offset:.7},
      {opacity:1,transform:'translateY(0) scale(1) rotate(0)'}],
      {duration:680,delay:i*150,easing:'cubic-bezier(.22,1.3,.36,1)',fill:'forwards'});
  });
}
/* remix: feed an idea back into the pot as a new "earth" twin, keep signal/scene/challenge */
function remix(idea){
  state.earth={id:'MIX', name:idea.title, tag:'脑暴产物', desc:(idea.plain||idea.title), kw:(idea.tags||[]).slice(0,3)};
  const slot=$('#slotE');slot.classList.add('filled');
  slot.innerHTML=`<span class="clearx" data-clear="earth">✕</span>
    <div style="position:absolute;inset:0;background:linear-gradient(135deg,#2E4BFF,#8aa0ff);"></div>
    <div class="fillcap"><div class="fid">REMIX</div><div class="fname">${esc(idea.title)}</div></div>`;
  updateCook();updatePotCount();
  window.scrollTo({top:0,behavior:'smooth'});
  pot.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:400,easing:'cubic-bezier(.34,1.56,.64,1)'});
  $('#cookHint').innerHTML='🔁 已把「'+esc(idea.title)+'」丢回锅里——再点火，灵感滚雪球';
}
$('#againBtn').addEventListener('click',async()=>{
  showLoader();
  let ideas;try{ideas=await getIdeas(true);}catch(e){ideas=localIdeas();}
  renderNotes(ideas);
});
$('#clearBtn').addEventListener('click',()=>{
  clearSlot('space');clearSlot('earth');
  state.scene=null;state.challenge=null;
  $$('.chip').forEach(c=>c.classList.remove('on'));
  updateSpiceBadge();updatePotCount();
  results.style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
});

/* ============================================================
   10. AI (DeepSeek) + local fallback — 融合卡片链 prompt
   ============================================================ */
const KEY='spacecook_deepseek_key';
const getKey=()=>localStorage.getItem(KEY)||'';
function buildPrompt(variety){
  const s=state.space,e=state.earth,sc=state.scene,ch=state.challenge;
  let p=
`你是太空产品创新的头脑风暴主厨，熟悉"设计未来工作坊"的共创方法论（故事卡→任务卡→时刻卡→能力卡）。
现在要为【太空旅馆 / 太空旅居】场景，把下面这些"食材"熔炉融合，脑暴出全新的产品 / 服务 / 系统。

【太空信号·要用的硬道理】${s.id} ${s.name}：${s.desc}（关键词：${(s.kw||[]).join('、')}）
【地球同款·可借鉴的好解法】${e.id} ${e.name}：${e.desc}（关键词：${(e.kw||[]).join('、')}）`;
  if(sc)p+=`\n【场景·真实处境(故事卡)】${sc.name}：${sc.who}——${sc.moment}。情绪：${sc.emo}。`;
  if(ch)p+=`\n【挑战·要破解的硬约束(任务卡)】${ch.name}：${ch.block}。破题方向：${ch.twist}。`;
  p+=`

请脑暴 4 个点子，每个必须包含：
- title：6-12字、有记忆点、像展览标题的产品名
- value：一句话价值，严格用这个句式填空并用中文写出完整句子——"我们为【谁】，在【什么时刻】，通过【怎么做】，带来【什么改变】"。其中【谁】【什么时刻】【怎么做】【什么改变】四处各用<b>…</b>包裹（会在网页高亮）。
- moment：20-38字，具体描述"它接住了太空旅客的哪个关键时刻"，要有画面、有情绪${sc?('，紧扣场景「'+sc.name+'」'):''}。
- plain：15-30字的纯文本一句话概括（不带标签，用于二次创作）。
- tags：3个关键词标签。

要求：大胆、具体、有想象力${ch?('，必须正面破解「'+ch.name+'」这个约束'):''}${variety?'，这一批要和常规思路不同，给我意外的脑洞':''}。
严格只返回 JSON 数组，不要任何解释：
[{"title":"","value":"","moment":"","plain":"","tags":["","",""]}]`;
  return p;
}
async function getIdeas(variety=false){
  const key=getKey();
  if(!key)return localIdeas();
  const res=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:'deepseek-chat',temperature:variety?1.3:1.05,messages:[{role:'user',content:buildPrompt(variety)}]})});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();
  let txt=data.choices[0].message.content.trim().replace(/^```json?/i,'').replace(/```$/,'').trim();
  return JSON.parse(txt).slice(0,4);
}
/* ---- local fallback engine (no key) — 也按卡片链结构拼 ---- */
function localIdeas(){
  const s=state.space,e=state.earth,sc=state.scene,ch=state.challenge;
  const sk=(s.kw||[s.tag]), ek=(e.kw||[e.tag]);
  const clean=n=>n.replace(/（.*?）/g,'').replace(/\s+[A-Za-z].*$/,'').trim();
  const en=clean(e.name), sn=clean(s.name);
  const who=sc?sc.who:pick(['首批太空旅客','长期旅居者','太空蜜月情侣','零重力里的孩子','失重中的长者']);
  const when=sc?sc.name:pick(['入住第一夜','失重早餐','舷窗凝视的时刻','返程前最后一晚']);
  const forms=['可穿戴装置','舱内交互系统','仪式化体验','模块化家具','共生装置'];
  const chTwist=ch?ch.twist:'把太空的硬约束变成独特卖点';
  const chName=ch?ch.name:'失重';
  const V=(who,when,how,gain)=>`我们为<b>${who}</b>，在<b>${when}</b>，通过<b>${how}</b>，带来<b>${gain}</b>。`;
  const M=txt=>sc?`${sc.moment.slice(0,30)}——这一刻它正好出现。`:txt;
  return [
    {title:`零重力${en.slice(0,5)}`,
     value:V(who,when,`把「${sn}」的${pick(sk)}原理注入${en}`,`一款失重舱里更好用的${pick(forms)}`),
     moment:M(`${who}第一次觉得"这不是地球，却更称手"。`),
     plain:`把${sn}原理注入${en}，做失重版产品`,
     tags:[pick(sk),pick(ek),'太空旅馆']},
    {title:`${chName}·反转${en.slice(0,3)}`,
     value:V(who,when,`借${en}的做法正面破解「${chName}」`,`${chTwist}`),
     moment:M(`当${chName}袭来，${who}第一次感到被稳稳接住。`),
     plain:`用${en}的思路破解${chName}这个约束`,
     tags:[chName,pick(ek),'破局']},
    {title:`会呼吸的${en.slice(0,4)}`,
     value:V(who,when,`借「${sn}」的闭环再生思路升级${en}`,'能自循环、零浪费的太空旅馆配套'),
     moment:M(`${who}住一晚，也在悄悄参与整座旅馆的生态循环。`),
     plain:`用${sn}闭环思路做零浪费版${en}`,
     tags:['资源闭环',pick(ek),'可持续']},
    {title:`${pick(['星际','轨道','失重','深空'])}仪式·${e.tag}`,
     value:V(who,when,`把实用的${en}变成一场结合「${pick(sk)}」的太空仪式`,'只在太空才成立、值得一生回忆的体验'),
     moment:M(`${who}在${when}，第一次为"活在太空"这件事而感动。`),
     plain:`把${en}做成只属于太空的情感仪式`,
     tags:['情感设计','仪式感',pick(sk)]},
  ];
}

/* ============================================================
   11. modals
   ============================================================ */
const keyModal=$('#keyModal'), howModal=$('#howModal');
$('#keyBtn').addEventListener('click',()=>{$('#keyInput').value=getKey();keyModal.classList.add('show');});
$('#keySave').addEventListener('click',()=>{const v=$('#keyInput').value.trim();v?localStorage.setItem(KEY,v):localStorage.removeItem(KEY);keyModal.classList.remove('show');});
$('#keyClear').addEventListener('click',()=>{localStorage.removeItem(KEY);$('#keyInput').value='';});
keyModal.addEventListener('click',e=>{if(e.target===keyModal)keyModal.classList.remove('show');});
$('#howBtn').addEventListener('click',()=>howModal.classList.add('show'));
$('#howClose').addEventListener('click',()=>howModal.classList.remove('show'));
howModal.addEventListener('click',e=>{if(e.target===howModal)howModal.classList.remove('show');});

updateCook();updatePotCount();updateSpiceBadge();
