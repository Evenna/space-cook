/* ============================================================
   SPACE·COOK  app.js
   ============================================================ */
'use strict';
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const rand = (a,b)=>a+Math.random()*(b-a);
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];

/* ---------------- state ---------------- */
const state = { space:null, earth:null, cooking:false };

/* ============================================================
   1. STARFIELD background
   ============================================================ */
(function starfield(){
  const cv=$('#stars'), ctx=cv.getContext('2d');
  let W,H,stars,shooting=[];
  function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;
    const n=Math.min(260,Math.floor(W*H/9000));
    stars=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,
      z:Math.random(),r:Math.random()*1.3+.2,tw:Math.random()*Math.PI*2,
      sp:Math.random()*.4+.1}));}
  resize();addEventListener('resize',resize);
  function loop(t){
    ctx.clearRect(0,0,W,H);
    // nebula wash
    const g=ctx.createRadialGradient(W*.5,H*.42,0,W*.5,H*.42,Math.max(W,H)*.6);
    g.addColorStop(0,'rgba(30,55,90,.14)');g.addColorStop(.5,'rgba(20,20,45,.06)');g.addColorStop(1,'rgba(5,7,14,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(const s of stars){
      s.tw+=0.02;const a=.35+Math.sin(s.tw)*.35+s.z*.3;
      s.y+=s.sp*.15;if(s.y>H)s.y=0;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);
      ctx.fillStyle=`rgba(${180+s.z*60},${210+s.z*40},255,${a})`;ctx.fill();
    }
    if(Math.random()<0.004)shooting.push({x:Math.random()*W,y:Math.random()*H*.4,
      vx:rand(4,9),vy:rand(2,4),life:1});
    for(let i=shooting.length-1;i>=0;i--){const m=shooting[i];
      ctx.strokeStyle=`rgba(150,220,255,${m.life*.8})`;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(m.x-m.vx*5,m.y-m.vy*5);ctx.stroke();
      m.x+=m.vx;m.y+=m.vy;m.life-=.012;if(m.life<=0)shooting.splice(i,1);}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ============================================================
   2. CAULDRON particle system (center vessel)
   ============================================================ */
const Cauldron = (function(){
  const cv=$('#cauldronCanvas'),ctx=cv.getContext('2d');
  let W,H,DPR,parts=[],energy=0.18,hue=200,burst=0,shake=0;
  function resize(){DPR=Math.min(2,devicePixelRatio||1);
    const r=cv.getBoundingClientRect();W=cv.width=r.width*DPR;H=cv.height=r.height*DPR;}
  function spawn(){
    const cx=W/2, baseY=H*0.78;
    parts.push({x:cx+rand(-W*0.18,W*0.18),y:baseY,
      vx:rand(-0.3,0.3)*DPR,vy:rand(-1.4,-0.5)*DPR*(1+energy*2),
      r:rand(1.2,3.6)*DPR,life:1,decay:rand(.008,.02),h:hue+rand(-25,25)});
  }
  function setEnergy(e){energy=e;}
  function setHue(h){hue=h;}
  function doBurst(){burst=1;shake=1;for(let i=0;i<90;i++){const a=rand(0,7),s=rand(2,8)*DPR;
    parts.push({x:W/2,y:H*0.5,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2*DPR,
      r:rand(1.5,4)*DPR,life:1,decay:rand(.012,.028),h:hue+rand(-40,60)});}}
  function loop(){
    ctx.clearRect(0,0,W,H);
    const sx = shake>0?rand(-shake*6,shake*6)*DPR:0;
    shake*=0.88;if(shake<0.01)shake=0;
    ctx.save();ctx.translate(sx,0);
    // vessel glow base
    const cx=W/2, by=H*0.78;
    const gg=ctx.createRadialGradient(cx,by,0,cx,by,W*0.42);
    gg.addColorStop(0,`hsla(${hue},80%,60%,${0.14+energy*0.4})`);
    gg.addColorStop(1,'hsla(0,0%,0%,0)');
    ctx.fillStyle=gg;ctx.fillRect(0,0,W,H);
    // vessel bowl
    ctx.beginPath();
    ctx.moveTo(W*0.22,H*0.5);
    ctx.quadraticCurveTo(W*0.5,H*1.02,W*0.78,H*0.5);
    ctx.lineTo(W*0.70,H*0.42);
    ctx.quadraticCurveTo(W*0.5,H*0.6,W*0.30,H*0.42);
    ctx.closePath();
    const bg=ctx.createLinearGradient(0,H*0.4,0,H);
    bg.addColorStop(0,`hsla(${hue},70%,55%,${0.1+energy*0.2})`);
    bg.addColorStop(1,`hsla(${hue},60%,30%,0.05)`);
    ctx.fillStyle=bg;ctx.fill();
    ctx.strokeStyle=`hsla(${hue},90%,70%,${0.4+energy*0.4})`;ctx.lineWidth=1.5*DPR;ctx.stroke();
    // liquid surface ellipse
    ctx.beginPath();ctx.ellipse(cx,H*0.5,W*0.26,H*0.07,0,0,7);
    ctx.fillStyle=`hsla(${hue},85%,${50+energy*20}%,${0.25+energy*0.4})`;ctx.fill();
    // particles
    const rate=Math.floor(1+energy*6);for(let i=0;i<rate;i++)spawn();
    ctx.globalCompositeOperation='lighter';
    for(let i=parts.length-1;i>=0;i--){const p=parts[i];
      p.x+=p.vx;p.y+=p.vy;p.vy+=0.02*DPR;p.life-=p.decay;
      if(p.life<=0){parts.splice(i,1);continue;}
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life,0,7);
      ctx.fillStyle=`hsla(${p.h},90%,65%,${p.life*0.8})`;ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
    ctx.restore();
    burst*=0.9;
    requestAnimationFrame(loop);
  }
  resize();addEventListener('resize',resize);requestAnimationFrame(loop);
  return {setEnergy,setHue,doBurst};
})();

/* ============================================================
   3. RENDER chips
   ============================================================ */
function chipHTML(item,side){
  return `<div class="chip" data-id="${item.id}" data-side="${side}">
    <div class="cid">${item.id}</div>
    <div class="cname">${item.name}</div>
    <span class="ctag">${item.tag}</span>
  </div>`;
}
function renderList(side){
  const data = side==='space'?SPACE_SIGNALS:EARTH_PRODUCTS;
  const q = (side==='space'?$('#searchS'):$('#searchE')).value.trim().toLowerCase();
  const el = side==='space'?$('#listS'):$('#listE');
  const filtered = data.filter(d=>!q || (d.name+d.tag+d.id+(d.kw||[]).join('')).toLowerCase().includes(q));
  el.innerHTML = filtered.map(d=>chipHTML(d,side)).join('');
  // mark used
  const usedId = side==='space'?state.space?.id:state.earth?.id;
  if(usedId){const u=el.querySelector(`[data-id="${usedId}"]`);if(u)u.classList.add('used');}
}
renderList('space');renderList('earth');
$('#searchS').addEventListener('input',()=>renderList('space'));
$('#searchE').addEventListener('input',()=>renderList('earth'));

function findItem(side,id){return (side==='space'?SPACE_SIGNALS:EARTH_PRODUCTS).find(d=>d.id===id);}

/* ============================================================
   4. SILKY DRAG  (pointer events + eased ghost)
   ============================================================ */
const ghost=$('#ghost');
let drag=null; // {side,item,gx,gy,tx,ty}
function ghostLoop(){
  if(drag){
    drag.gx += (drag.tx-drag.gx)*0.35;
    drag.gy += (drag.ty-drag.gy)*0.35;
    const rot=Math.max(-10,Math.min(10,(drag.tx-drag.gx)*0.4));
    ghost.style.transform=`translate(${drag.gx}px,${drag.gy}px) rotate(${rot}deg) scale(1.04)`;
  }
  requestAnimationFrame(ghostLoop);
}
requestAnimationFrame(ghostLoop);

function startDrag(e,chip){
  if(chip.classList.contains('used'))return;
  const side=chip.dataset.side, item=findItem(side,chip.dataset.id);
  drag={side,item,tx:e.clientX+14,ty:e.clientY+14,gx:e.clientX+14,gy:e.clientY+14,srcEl:chip};
  ghost.className=side;
  $('.cid',ghost).textContent=item.id;
  $('.cname',ghost).textContent=item.name;
  ghost.style.display='block';
  chip.classList.add('dragging-src');
  try{chip.setPointerCapture(e.pointerId);}catch(_){}
  document.body.style.cursor='grabbing';
}
function moveDrag(e){
  if(!drag)return;
  drag.tx=e.clientX+14;drag.ty=e.clientY+14;
  // hot zone detection
  const over=document.elementFromPoint(e.clientX,e.clientY);
  const slot=over&&over.closest('.slot');
  $$('.slot').forEach(s=>s.classList.remove('drop-hot'));
  if(slot && slot.dataset.side===drag.side) slot.classList.add('drop-hot');
}
function endDrag(e){
  if(!drag)return;
  const over=document.elementFromPoint(e.clientX,e.clientY);
  const slot=over&&over.closest('.slot');
  if(slot && slot.dataset.side===drag.side){
    placeInSlot(drag.side,drag.item);
  }
  ghost.style.display='none';
  drag.srcEl && drag.srcEl.classList.remove('dragging-src');
  $$('.slot').forEach(s=>s.classList.remove('drop-hot'));
  document.body.style.cursor='';
  drag=null;
}
// delegate pointerdown on lists
['#listS','#listE'].forEach(sel=>{
  $(sel).addEventListener('pointerdown',e=>{
    const chip=e.target.closest('.chip');
    if(chip){e.preventDefault();startDrag(e,chip);}
  });
});
addEventListener('pointermove',moveDrag);
addEventListener('pointerup',endDrag);
addEventListener('pointercancel',endDrag);
// click-to-fill fallback (mobile / accessibility): tap a chip fills its side
['#listS','#listE'].forEach(sel=>{
  $(sel).addEventListener('click',e=>{
    const chip=e.target.closest('.chip');
    if(chip && !chip.classList.contains('used')){
      // only trigger if not a drag (drag sets display none already)
      if(!drag){ const side=chip.dataset.side; placeInSlot(side,findItem(side,chip.dataset.id)); }
    }
  });
});

/* ---------------- slots ---------------- */
function placeInSlot(side,item){
  state[side]=item;
  const slot = side==='space'?$('#slotS'):$('#slotE');
  slot.classList.add('filled');
  slot.innerHTML=`<span class="clearx" data-clear="${side}">✕</span>
    <div class="fid">${item.id}</div><div class="fname">${item.name}</div>`;
  // pop animation
  slot.animate([{transform:'scale(.6)',opacity:0},{transform:'scale(1.08)',offset:.6},{transform:'scale(1)',opacity:1}],
    {duration:420,easing:'cubic-bezier(.34,1.56,.64,1)'});
  renderList(side);
  updateCook();
}
function clearSlot(side){
  state[side]=null;
  const slot=side==='space'?$('#slotS'):$('#slotE');
  slot.classList.remove('filled');
  const label = side==='space'?'<span class="big">✦</span>太空信号':'<span class="big">◆</span>地球产品';
  slot.innerHTML=`<span class="clearx" data-clear="${side}">✕</span><div class="ph">${label}</div>`;
  renderList(side);updateCook();
}
document.addEventListener('click',e=>{
  const x=e.target.closest('[data-clear]');
  if(x){e.stopPropagation();clearSlot(x.dataset.clear);}
});

function updateCook(){
  const ready = state.space && state.earth;
  $('#cookBtn').disabled=!ready || state.cooking;
  const hint=$('#cookHint');
  if(state.cooking){hint.textContent='灵感正在融合…';}
  else if(ready){hint.textContent='一切就绪，点火吧 🔥';
    Cauldron.setEnergy(0.4);Cauldron.setHue(50);}
  else if(state.space||state.earth){hint.textContent='还差一个，再拖一个进来';
    Cauldron.setEnergy(0.28);Cauldron.setHue(state.space?200:40);}
  else{hint.textContent='先各选一个拖进来';Cauldron.setEnergy(0.18);Cauldron.setHue(200);}
}

/* ============================================================
   5. COOKING sequence
   ============================================================ */
$('#cookBtn').addEventListener('click',cook);
async function cook(){
  if(!state.space||!state.earth||state.cooking)return;
  state.cooking=true;updateCook();
  const btn=$('#cookBtn');btn.disabled=true;
  // ramp energy
  let e=0.4;const ramp=setInterval(()=>{e=Math.min(1,e+0.08);Cauldron.setEnergy(e);
    Cauldron.setHue(50+ (1-e)*150);},60);
  // shake the whole center
  const center=$('.center');
  center.animate([{transform:'translate(0,0)'},{transform:'translate(-3px,2px)'},
    {transform:'translate(3px,-2px)'},{transform:'translate(-2px,-1px)'},{transform:'translate(0,0)'}],
    {duration:400,iterations:4,easing:'ease-in-out'});
  await sleep(900);
  Cauldron.doBurst();Cauldron.setHue(45);
  clearInterval(ramp);
  // flash
  const flash=document.createElement('div');
  flash.style.cssText='position:fixed;inset:0;z-index:50;background:radial-gradient(circle at 50% 55%,rgba(255,240,200,.9),transparent 55%);pointer-events:none;opacity:0;';
  document.body.appendChild(flash);
  flash.animate([{opacity:0},{opacity:1,offset:.2},{opacity:0}],{duration:700,easing:'ease-out'});
  setTimeout(()=>flash.remove(),720);
  await sleep(350);
  // fetch ideas (AI or fallback) while showing loader
  openResults();
  showLoader();
  let ideas;
  try{ ideas = await getIdeas(state.space,state.earth); }
  catch(err){ console.warn('AI failed, fallback',err); ideas = localIdeas(state.space,state.earth); }
  renderIdeas(ideas);
  state.cooking=false;Cauldron.setEnergy(0.4);Cauldron.setHue(50);
  updateCook();
}

/* ============================================================
   6. RESULTS overlay
   ============================================================ */
const results=$('#results'), ideaGrid=$('#ideaGrid'), comboLine=$('#comboLine');
function openResults(){
  comboLine.innerHTML=`<b class="s">✦ ${state.space.name}</b> &nbsp;×&nbsp; <b class="e">◆ ${state.earth.name}</b>`;
  results.classList.add('show');
}
function showLoader(){
  ideaGrid.innerHTML=`<div class="loader" style="grid-column:1/-1">
    <div class="orbit"><i></i><i></i><i></i></div>
    <div class="ltext">正在把「${state.space.name}」与「${state.earth.name}」投入熔炉…<br>合成太空旅馆新物种中</div>
  </div>`;
}
function renderIdeas(ideas){
  ideaGrid.innerHTML='';
  ideas.forEach((idea,i)=>{
    const el=document.createElement('div');el.className='idea';
    el.innerHTML=`<div class="num">IDEA ${String(i+1).padStart(2,'0')}</div>
      <h3>${esc(idea.title)}</h3><p>${esc(idea.desc)}</p>
      <div class="tagrow">${(idea.tags||[]).map((t,j)=>`<span class="t ${j%2?'e':''}">${esc(t)}</span>`).join('')}</div>`;
    ideaGrid.appendChild(el);
    el.animate([{opacity:0,transform:'translateY(26px) scale(.96)'},
      {opacity:1,transform:'translateY(0) scale(1)'}],
      {duration:600,delay:i*120,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  });
}
function esc(s){return (s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
$('#againBtn').addEventListener('click',async()=>{showLoader();
  let ideas;try{ideas=await getIdeas(state.space,state.earth,true);}catch(e){ideas=localIdeas(state.space,state.earth);}
  renderIdeas(ideas);});
$('#newBtn').addEventListener('click',()=>{results.classList.remove('show');});
results.addEventListener('click',e=>{if(e.target===results)results.classList.remove('show');});

/* ============================================================
   7. AI (DeepSeek) + local fallback
   ============================================================ */
const KEY='spacecook_deepseek_key';
function getKey(){return localStorage.getItem(KEY)||'';}
async function getIdeas(s,e,variety=false){
  const key=getKey();
  if(!key) return localIdeas(s,e);
  const prompt =
`你是太空产品创新的头脑风暴大师。现有两个输入：
【太空信号】${s.id} ${s.name}：${s.desc}（关键词：${(s.kw||[]).join('、')}）
【地球已有产品】${e.id} ${e.name}：${e.desc}（关键词：${(e.kw||[]).join('、')}）

把两者"熔炉融合"，为【太空旅馆/太空旅居】场景头脑风暴 4 个全新的产品、服务或系统点子。要大胆、具体、有想象力${variety?'，和常规思路不同，给我意外的脑洞':''}。
每个点子返回：title(8-16字有记忆点的名字)、desc(40-70字说清它是什么、怎么用、为谁解决什么)、tags(3个关键词标签)。
严格只返回 JSON 数组，不要任何解释：[{"title":"","desc":"","tags":["","",""]}]`;
  const res=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:'deepseek-chat',temperature:variety?1.3:1.0,
      messages:[{role:'user',content:prompt}]})});
  if(!res.ok) throw new Error('HTTP '+res.status);
  const data=await res.json();
  let txt=data.choices[0].message.content.trim();
  txt=txt.replace(/^```json?/i,'').replace(/```$/,'').trim();
  const arr=JSON.parse(txt);
  return arr.slice(0,4);
}

/* ---- local inspiration engine (offline fallback) ---- */
function localIdeas(s,e){
  const sk=(s.kw||[s.tag]), ek=(e.kw||[e.tag]);
  const verbs=['重构','再想象','进化','嫁接','逆转','放大','微缩','游戏化'];
  const audiences=['首批太空旅客','长期驻留的旅居者','太空蜜月情侣','零重力下的孩子','轨道旅馆的管家AI','失重环境里的长者'];
  const forms=['可穿戴装置','舱内交互系统','仪式化体验','模块化家具','共享服务','生物共生装置'];
  const templates=[
    {
      title:`零重力${e.name.replace(/（.*?）/g,'')}`,
      desc:`把【${s.name}】的「${pick(sk)}」原理，注入地球上的「${e.name.replace(/（.*?）/g,'')}」，为${pick(audiences)}做一款在失重舱内也好用的${pick(forms)}，把太空的硬约束变成独特卖点。`,
      tags:[pick(sk),pick(ek),'太空旅馆']
    },
    {
      title:`${s.tag}·${e.tag}融合舱`,
      desc:`一个把「${pick(sk)}」与「${pick(ek)}」合二为一的舱内${pick(forms)}：旅客入住即自动${pick(verbs)}体验，让${pick(audiences)}第一次感到"这不是地球，但更舒服"。`,
      tags:[s.tag,e.tag,'旅居体验']
    },
    {
      title:`会呼吸的${e.name.replace(/（.*?）/g,'').slice(0,6)}`,
      desc:`借【${s.name}】的闭环/再生思路，把${e.name.replace(/（.*?）/g,'')}升级成能自我循环、零浪费的太空旅馆配套，${pick(verbs)}旅客与资源的关系，住一晚也在参与生态。`,
      tags:['资源闭环',pick(ek),'可持续']
    },
    {
      title:`${pick(['星际','轨道','失重','深空'])}仪式·${e.tag}`,
      desc:`把实用的${e.name.replace(/（.*?）/g,'')}变成一场有情绪的太空仪式：结合「${pick(sk)}」，为${pick(audiences)}设计一个值得拍照、值得回忆、只在太空才成立的${pick(forms)}。`,
      tags:['情感设计','仪式感',pick(sk)]
    }
  ];
  return templates;
}

/* ============================================================
   8. modals / help
   ============================================================ */
const keyModal=$('#keyModal');
$('#keyBtn').addEventListener('click',()=>{$('#keyInput').value=getKey();keyModal.classList.add('show');});
$('#keySave').addEventListener('click',()=>{const v=$('#keyInput').value.trim();
  if(v)localStorage.setItem(KEY,v);else localStorage.removeItem(KEY);keyModal.classList.remove('show');});
$('#keyClear').addEventListener('click',()=>{localStorage.removeItem(KEY);$('#keyInput').value='';});
keyModal.addEventListener('click',e=>{if(e.target===keyModal)keyModal.classList.remove('show');});
$('#howBtn').addEventListener('click',()=>{
  alert('玩法：\n\n① 从左边「太空信号」拖一个到中间槽位\n② 从右边「地球产品」拖一个到中间槽位\n   （手机端直接点选也行）\n③ 点 COOKING，熔炉会把它俩融合\n④ 蹦出 4 个太空旅馆的新产品点子\n\n想要真·AI 现场生成？点右上「AI 设置」填 DeepSeek Key。\n不填也能玩——内置灵感引擎兜底。');
});

/* initial */
updateCook();
