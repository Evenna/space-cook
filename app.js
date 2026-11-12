/* ============================================================
   灵感碰撞 · 全屏画布脑暴厨房  —  app.js
   食材漂浮画布 → 拖进中心熔炉堆成一团 → Cooking 融合爆发
   ============================================================ */
const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>[...el.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const rnd=(a,b)=>a+Math.random()*(b-a);

/* pot holds any number of ingredients, each {kind,item} */
const state={pot:[],cooking:false,filters:{space:true,earth:true,scene:true,challenge:true}};

function photo(kind,item,w=400){
  let id;
  if(kind==='space'||kind==='earth') id=PHOTOS&&PHOTOS[item.id];
  else id=SPICE_PHOTOS&&SPICE_PHOTOS[item.id];
  if(id) return `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;
  return `https://picsum.photos/seed/${encodeURIComponent(item.id)}/${w}/${w}`;
}
function allItems(){
  return [
    ...SPACE_SIGNALS.map(x=>({kind:'space',item:x})),
    ...EARTH_PRODUCTS.map(x=>({kind:'earth',item:x})),
    ...SCENES.map(x=>({kind:'scene',item:x})),
    ...CHALLENGES.map(x=>({kind:'challenge',item:x})),
  ];
}
const inPot=(kind,id)=>state.pot.some(p=>p.kind===kind&&p.item.id===id);
const key=it=>it.kind+':'+it.item.id;

/* ---------- scatter layout ----------
   Place tiles in a loose ring around the center stage, avoiding the
   middle (where the forge lives). space→upper-left bias, earth→lower-right,
   scene/challenge sprinkled. Positions are vw/vh fractions. */
const canvasEl=()=>$('#canvas');
function scatterPositions(items){
  const W=innerWidth,H=innerHeight;
  const cx=W/2,cy=H/2;
  const holeR=Math.min(W,H)*0.30;      // keep clear of the forge
  const maxR=Math.min(W,H)*0.62;
  const out=[];const placed=[];
  // bias angle ranges per kind so categories cluster softly
  const biasArc={space:[-2.7,-0.6],earth:[0.5,2.6],scene:[2.4,3.9],challenge:[-0.9,0.9]};
  items.forEach((it,i)=>{
    let x,y,tries=0,ok=false;
    const arc=biasArc[it.kind]||[0,6.28];
    do{
      const ang=rnd(arc[0],arc[1])+rnd(-0.3,0.3);
      const r=rnd(holeR+30,maxR);
      x=cx+Math.cos(ang)*r*rnd(0.85,1.15);
      y=cy+Math.sin(ang)*r*rnd(0.8,1.05);
      x=Math.max(70,Math.min(W-100,x));
      y=Math.max(90,Math.min(H-120,y));
      ok=placed.every(p=>Math.hypot(p.x-x,p.y-y)>96)&&Math.hypot(cx-x,cy-y)>holeR;
      tries++;
    }while(!ok&&tries<40);
    placed.push({x,y});out.push({x,y});
  });
  return out;
}

let CURRENT=[];   // currently shown pool of {kind,item}
function samplePool(){
  // show a curated subset so the canvas feels full but not cramped
  const s=[...SPACE_SIGNALS].sort(()=>Math.random()-0.5).slice(0,9);
  const e=[...EARTH_PRODUCTS].sort(()=>Math.random()-0.5).slice(0,9);
  const sc=[...SCENES].sort(()=>Math.random()-0.5).slice(0,5);
  const ch=[...CHALLENGES].sort(()=>Math.random()-0.5).slice(0,5);
  return [
    ...s.map(x=>({kind:'space',item:x})),
    ...e.map(x=>({kind:'earth',item:x})),
    ...sc.map(x=>({kind:'scene',item:x})),
    ...ch.map(x=>({kind:'challenge',item:x})),
  ];
}

function tileHTML(it){
  const k=it.kind,o=it.item;
  if(k==='space'||k==='earth'){
    return `<img src="${photo(k,o,260)}" alt="" loading="lazy" referrerpolicy="no-referrer">
      <span class="kind"></span>
      <div class="tlabel">${esc(o.name)}</div>`;
  }
  // scene / challenge = text chip tile
  const sub=k==='scene'?'SCENE · 场景':'CHALLENGE · 挑战';
  return `<span class="kind"></span><div class="tt">${esc(o.name)}</div><div class="ts">${sub}</div>`;
}

function renderCanvas(){
  const cv=canvasEl();cv.innerHTML='';
  CURRENT=samplePool();
  const pos=scatterPositions(CURRENT);
  CURRENT.forEach((it,i)=>{
    const el=document.createElement('div');
    el.className='tile'+((it.kind==='space'||it.kind==='earth')?'':' txt')+((it.kind==='space'||it.kind==='scene')?' round':'');
    el.dataset.kind=it.kind;el.dataset.key=key(it);
    const sz=it.kind==='space'||it.kind==='earth'?rnd(78,104):rnd(84,100);
    el.style.setProperty('--sz',sz.toFixed(0)+'px');
    el.style.setProperty('--rot',rnd(-5,5).toFixed(1)+'deg');
    el.style.setProperty('--dur',rnd(5.5,9).toFixed(1)+'s');
    el.style.setProperty('--del',rnd(0,3).toFixed(1)+'s');
    el.style.left=(pos[i].x-sz/2)+'px';
    el.style.top=(pos[i].y-sz/2)+'px';
    el.innerHTML=tileHTML(it);
    if(inPot(it.kind,it.item.id)) el.classList.add('inpot');
    attachDrag(el,it);
    cv.appendChild(el);
  });
  applyFilters();
}

function applyFilters(){
  $$('.tile',canvasEl()).forEach(el=>{
    const on=state.filters[el.dataset.kind];
    el.classList.toggle('hidden',!on);
  });
}

/* ---------- drag to center ---------- */
const ghost=$('#ghost');
let drag=null; // {it, el, started}

function forgeRect(){return $('#catcher').getBoundingClientRect();}
function overForge(x,y){
  const r=forgeRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
  return Math.hypot(x-cx,y-cy) < r.width/2+40;
}

function attachDrag(el,it){
  el.addEventListener('pointerdown',e=>{
    if(el.classList.contains('inpot'))return;
    e.preventDefault();
    const sz=parseFloat(getComputedStyle(el).getPropertyValue('--sz'))||88;
    drag={it,el,started:false,sz};
    el.setPointerCapture(e.pointerId);
    drag.pid=e.pointerId;
    moveGhost(e.clientX,e.clientY,true);
  });
  el.addEventListener('pointermove',e=>{
    if(!drag||drag.el!==el)return;
    if(!drag.started){drag.started=true;el.classList.add('dragging');setGhost(it,drag.sz);ghost.classList.add('on');}
    moveGhost(e.clientX,e.clientY);
    $('#catcher').classList.toggle('over',overForge(e.clientX,e.clientY));
  });
  const end=e=>{
    if(!drag||drag.el!==el)return;
    try{el.releasePointerCapture(drag.pid);}catch(_){}
    el.classList.remove('dragging');
    ghost.classList.remove('on');
    $('#catcher').classList.remove('over');
    if(drag.started && overForge(e.clientX,e.clientY)){
      addToPot(it);
      el.classList.add('inpot');
    }else if(!drag.started){
      // treat as tap: on mobile a tap also drops into the pot
      addToPot(it); el.classList.add('inpot');
    }
    drag=null;
  };
  el.addEventListener('pointerup',end);
  el.addEventListener('pointercancel',end);
}

function setGhost(it,sz){
  ghost.style.width=ghost.style.height=(sz||88)+'px';
  if(it.kind==='space'||it.kind==='earth'){
    ghost.classList.remove('txt');
    ghost.innerHTML=`<img src="${photo(it.kind,it.item,220)}" alt="" referrerpolicy="no-referrer">`;
  }else{
    ghost.classList.add('txt');
    ghost.style.background=it.kind==='scene'?'linear-gradient(140deg,#1bbf94,#0f7d61)':'linear-gradient(140deg,#f0774c,#cf4f27)';
    ghost.innerHTML=esc(it.item.name);
  }
  ghost.style.borderRadius=(it.kind==='space'||it.kind==='scene')?'50%':'14px';
}
function moveGhost(x,y,silent){
  const w=parseFloat(ghost.style.width)||88;
  ghost.style.transform=`translate(${x-w/2}px,${y-w/2}px) scale(${silent?0.9:1.06})`;
}

/* ---------- pot / cluster ---------- */
function addToPot(it){
  if(inPot(it.kind,it.item.id))return;
  state.pot.push(it);
  renderCluster(true);
  refreshCook();
}
function removeFromPot(k,id){
  state.pot=state.pot.filter(p=>!(p.kind===k&&p.item.id===id));
  // un-hide its canvas tile if present
  const t=$(`.tile[data-key="${k}:${id}"]`,canvasEl());
  if(t)t.classList.remove('inpot');
  renderCluster();
  refreshCook();
}
function clearPot(){
  state.pot=[];
  $$('.tile.inpot',canvasEl()).forEach(t=>t.classList.remove('inpot'));
  renderCluster();refreshCook();
}

function renderCluster(justAdded){
  const cl=$('#cluster'),stage=$('#stage');
  cl.innerHTML='';
  const n=state.pot.length;
  stage.classList.toggle('has',n>0);
  const R=n<=1?0:Math.min(66,34+n*6);
  state.pot.forEach((p,i)=>{
    const el=document.createElement('div');
    const round=(p.kind==='space'||p.kind==='scene');
    el.className='pin'+((p.kind==='scene'||p.kind==='challenge')?' txt':'')+(round?' round':'');
    el.dataset.kind=p.kind;
    const ang=(i/Math.max(1,n))*Math.PI*2 - Math.PI/2;
    const r=n===1?0:R;
    const dx=Math.cos(ang)*r, dy=Math.sin(ang)*r;
    const rot=rnd(-8,8);
    if(p.kind==='space'||p.kind==='earth'){
      el.innerHTML=`<img src="${photo(p.kind,p.item,180)}" alt="" referrerpolicy="no-referrer"><span class="ek"></span>`;
    }else{
      el.innerHTML=esc(p.item.name)+`<span class="ek"></span>`;
    }
    const x=document.createElement('span');x.className='pinx';x.textContent='✕';
    x.onclick=ev=>{ev.stopPropagation();removeFromPot(p.kind,p.item.id);};
    el.appendChild(x);
    el.style.transform=`translate(${dx}px,${dy}px) rotate(${rot}deg)`;
    el.style.zIndex=20+i;
    if(justAdded&&i===n-1){
      el.animate([{transform:`translate(${dx}px,${dy}px) scale(1.5) rotate(${rot}deg)`,opacity:0},
                  {transform:`translate(${dx}px,${dy}px) scale(1) rotate(${rot}deg)`,opacity:1}],
                 {duration:460,easing:'cubic-bezier(.34,1.56,.64,1)'});
    }
    cl.appendChild(el);
  });
}

function hasSignal(){return state.pot.some(p=>p.kind==='space');}
function hasEarth(){return state.pot.some(p=>p.kind==='earth');}
function canCook(){return hasSignal()&&hasEarth();}

function refreshCook(){
  const btn=$('#cookBtn'),hint=$('#cookHint'),stage=$('#stage');
  const ok=canCook();
  btn.disabled=!ok||state.cooking;
  stage.classList.toggle('hot',ok&&!state.cooking);
  const n=state.pot.length;
  if(n===0)hint.textContent='把食材拖进中心熔炉';
  else if(!hasSignal())hint.textContent='还差一个 ✦ 太空信号';
  else if(!hasEarth())hint.textContent='还差一个 ◆ 地球同款';
  else hint.innerHTML=`锅里 <b style="color:var(--blue)">${n}</b> 味 · 可以点火了`;
}

/* ---------- ring dots (SATTO decorative ring) ---------- */
function buildRingDots(){
  const rd=$('#ringDots');rd.innerHTML='';
  const N=40;const r=rd.clientWidth/2||168;
  for(let i=0;i<N;i++){
    const a=(i/N)*Math.PI*2;
    const d=document.createElement('i');
    d.style.transform=`translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px)`;
    rd.appendChild(d);
  }
}

/* ---------- 手气模式: auto-fill a tasty combo ---------- */
function luckyFill(){
  clearPot();
  const sig=pick(SPACE_SIGNALS), ert=pick(EARTH_PRODUCTS);
  const sc=Math.random()<0.8?pick(SCENES):null;
  const ch=Math.random()<0.8?pick(CHALLENGES):null;
  const combo=[{kind:'space',item:sig},{kind:'earth',item:ert}];
  if(sc)combo.push({kind:'scene',item:sc});
  if(ch)combo.push({kind:'challenge',item:ch});
  // ensure those tiles exist on canvas (add fresh if not in current pool)
  combo.forEach((c,i)=>setTimeout(()=>{
    addToPot(c);
    const t=$(`.tile[data-key="${key(c)}"]`,canvasEl());
    if(t)t.classList.add('inpot');
  },i*160));
}

/* ---------- filters ---------- */
function wireFilters(){
  $$('.fxpill').forEach(p=>{
    p.onclick=()=>{
      const k=p.dataset.kind;
      state.filters[k]=!state.filters[k];
      p.classList.toggle('on',state.filters[k]);
      applyFilters();
    };
  });
}

/* ---------- COOKING ---------- */
async function cook(){
  if(state.cooking||!canCook())return;
  state.cooking=true;refreshCook();
  const btn=$('#cookBtn');btn.classList.add('cooking');
  const stage=$('#stage'),catcher=$('#catcher');

  // vortex suck-in: pins spin inward then burst
  const pins=$$('.pin',$('#cluster'));
  pins.forEach((pin,i)=>{
    pin.animate([
      {transform:pin.style.transform,offset:0},
      {transform:`translate(0,0) rotate(${rnd(180,360)}deg) scale(.4)`,offset:.7,opacity:1},
      {transform:`translate(0,0) rotate(${rnd(360,540)}deg) scale(0)`,offset:1,opacity:0}
    ],{duration:900,easing:'cubic-bezier(.6,0,.9,.3)',fill:'forwards'});
  });
  catcher.animate([
    {transform:'scale(1)'},{transform:'scale(.82) rotate(8deg)',offset:.55},
    {transform:'scale(1.22) rotate(-4deg)',offset:.78},{transform:'scale(1)'}
  ],{duration:1000,easing:'cubic-bezier(.34,1.56,.64,1)'});
  // flash burst
  burst(stage);
  await sleep(760);

  // open results overlay in loading state
  openResults();
  showLoading();

  const recipe=[...state.pot];
  let ideas=null,used='local';
  const k=localStorage.getItem('ds_key');
  if(k){
    try{ideas=await aiGenerate(recipe,k);used='ai';}catch(e){console.warn('AI failed',e);}
  }
  if(!ideas)ideas=localGenerate(recipe);

  renderRecipeLine(recipe,used);
  await renderNotes(ideas);

  state.cooking=false;btn.classList.remove('cooking');refreshCook();
}

function burst(stage){
  const n=22;
  for(let i=0;i<n;i++){
    const s=document.createElement('div');
    const sz=rnd(5,12);
    s.style.cssText=`position:absolute;top:50%;left:50%;width:${sz}px;height:${sz}px;border-radius:50%;
      background:${pick(['#2E4BFF','#8aa0ff','#16a37f','#e8663a','#ffd34d','#fff'])};
      z-index:50;pointer-events:none;box-shadow:0 0 8px rgba(46,75,255,.6)`;
    stage.appendChild(s);
    const a=rnd(0,6.28),d=rnd(120,320);
    s.animate([
      {transform:'translate(-50%,-50%) scale(1)',opacity:1},
      {transform:`translate(${Math.cos(a)*d-50}%,${Math.sin(a)*d-50}%) scale(0)`,opacity:0}
    ],{duration:rnd(700,1200),easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>s.remove();
  }
}

/* ---------- results overlay ---------- */
function openResults(){$('#results').classList.add('show');}
function closeResults(){$('#results').classList.remove('show');}
function showLoading(){
  $('#noteGrid').innerHTML=`<div class="loading">
    <div class="orbit"><i></i><i></i><i></i></div>
    <div class="lt">正在熔炉里炖这一锅……<br>把太空的物理规则和地球的好点子揉成新物种</div></div>`;
  $('#recipeLine').innerHTML='';
}

function ingrChip(p){
  const cls={space:'s-sig',earth:'s-ert',scene:'s-scn',challenge:'s-chl'}[p.kind];
  const mk={space:'✦',earth:'◆',scene:'场景',challenge:'挑战'}[p.kind];
  return `<span class="ingr ${cls}">${mk} ${esc(p.item.name)}</span>`;
}
function renderRecipeLine(recipe,used){
  const tag=used==='ai'?'<b style="color:var(--blue)">DeepSeek 现炖</b>':'<b>灵感引擎现炖</b>';
  $('#recipeLine').innerHTML=`本次配方 · ${tag} &nbsp; ${recipe.map(ingrChip).join('')} <span style="color:var(--mute)">→ 太空旅馆新物种</span>`;
}

async function renderNotes(ideas){
  const grid=$('#noteGrid');grid.innerHTML='';
  ideas.forEach((idea,i)=>{
    const note=document.createElement('div');note.className='note';
    const tags=(idea.tags||[]).slice(0,4).map(t=>`<span>${esc(t)}</span>`).join('');
    const moment=idea.moment?`<div class="moment"><span class="ml">接住的关键时刻</span>${esc(idea.moment)}</div>`:'';
    note.innerHTML=`<span class="num">IDEA ${String(i+1).padStart(2,'0')}</span>
      <span class="remix" title="把它丢回锅里再炖">↻</span>
      <h3>${esc(idea.title)}</h3>
      <div class="value">${idea.value||''}</div>
      ${moment}
      <div class="tags">${tags}</div>`;
    note.querySelector('.remix').onclick=()=>remix(idea);
    grid.appendChild(note);
    // popcorn pop-in
    setTimeout(()=>{
      note.style.opacity='0';
      note.animate([
        {transform:'translateY(26px) scale(.9) rotate('+rnd(-3,3)+'deg)',opacity:0},
        {transform:'translateY(-6px) scale(1.02)',opacity:1,offset:.7},
        {transform:'translateY(0) scale(1) rotate(0)',opacity:1}
      ],{duration:560,easing:'cubic-bezier(.34,1.56,.64,1)',fill:'forwards'});
    },i*130);
  });
}

/* remix: drop this idea back into the pot as a new 'inspiration' seed */
function remix(idea){
  closeResults();
  // keep current pot, just re-cook for a fresh batch, seeded by the idea title
  state._seed=idea.title;
  setTimeout(()=>cook(),380);
}

/* ---------- AI generation (DeepSeek) ---------- */
function recipeText(recipe){
  const g=k=>recipe.filter(p=>p.kind===k).map(p=>p.item);
  const sig=g('space'),ert=g('earth'),sc=g('scene'),ch=g('challenge');
  let t='【太空信号】'+sig.map(s=>`${s.name}（${s.desc||s.tag||''}）`).join('；')+'\n';
  t+='【地球同款】'+ert.map(s=>`${s.name}（${s.desc||s.tag||''}）`).join('；')+'\n';
  if(sc.length)t+='【场景】'+sc.map(s=>`${s.name}：${s.who||''}在「${s.moment||''}」`).join('；')+'\n';
  if(ch.length)t+='【挑战】'+ch.map(s=>`${s.name}：${s.block||''}`).join('；')+'\n';
  return t;
}
async function aiGenerate(recipe,apiKey){
  const sys=`你是太空旅馆的产品脑暴师。用户给你几样"食材"：太空真实技术/物理规则、地球已有好产品、太空旅客的真实场景与硬约束。请把它们融合，设计出"只有太空旅馆才需要、才能成立"的新产品/服务/系统。要求：具体、可成立、有画面、有商业感，不要空话。`;
  const seed=state._seed?`\n（在上一轮「${state._seed}」的基础上，换个角度再想，不要重复。）`:'';
  const usr=`食材如下：\n${recipeText(recipe)}${seed}
请输出 4 个点子。严格返回 JSON 数组，每个元素字段：
"title"：产品名（4-10字，有记忆点）
"value"：一句话价值主张，必须是"为〔谁〕在〔什么时刻〕，通过〔怎么做〕，带来〔什么改变〕"的句式，把关键词用 <b></b> 包住（2-3 处）
"moment"：这个产品精准接住了旅客的哪个具体时刻/情绪（一句话）
"tags"：3-4 个关键词数组
只返回 JSON，不要任何解释或 markdown 代码块。`;
  const r=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
    body:JSON.stringify({model:'deepseek-chat',temperature:1.1,messages:[{role:'system',content:sys},{role:'user',content:usr}]})
  });
  if(!r.ok)throw new Error('http '+r.status);
  const j=await r.json();
  let txt=j.choices[0].message.content.trim();
  txt=txt.replace(/^```(json)?/i,'').replace(/```$/,'').trim();
  const arr=JSON.parse(txt);
  state._seed=null;
  return arr.slice(0,4);
}

/* ---------- local fallback idea engine ---------- */
function localGenerate(recipe){
  const g=k=>recipe.filter(p=>p.kind===k).map(p=>p.item);
  const sig=g('space'),ert=g('earth'),sc=g('scene'),ch=g('challenge');
  const S=sig[0]||{name:'太空信号',kw:['太空']}, E=ert[0]||{name:'地球产品',kw:['产品']};
  const SC=sc[0], CH=ch[0];
  const sk=(S.kw||[])[0]||S.name, ek=(E.kw||[])[0]||E.name;
  const who=SC?SC.who:'太空旅客', mom=SC?SC.moment:'漂浮在轨道上的日常';
  const emo=SC?SC.emo:'对失重既新鲜又不安';
  const block=CH?CH.block:'失重、辐射、补给受限的硬约束';
  const twist=CH?CH.twist:'把太空的限制变成独一无二的体验';

  const b=t=>`<b>${esc(t)}</b>`;
  const stems=[
    {
      suf:'舱',pre:'悬浮',
      title:`${S.name.slice(0,3)}${E.name.slice(0,3)}舱`,
      value:`为${b(who)}，在${b(mom)}的时刻，把${b(E.name)}用${b(S.name)}重做一遍，让${sk}不再是麻烦，而是只有这里才有的享受。`,
      moment:`接住「${mom}」——${emo}。`,
      tags:[sk,ek,'失重专属', SC?SC.tag:'体验']
    },
    {
      title:`零重力·${E.name}`,
      value:`借${b(S.name)}的原理，把地球上的${b(E.name)}改造成${b('失重版')}，专门解决「${block}」带来的别扭。`,
      moment:CH?`破解「${CH.name}」：${twist}。`:`让旅客第一次觉得"太空版"比地球版更好用。`,
      tags:[sk, ek, CH?CH.name:'零重力', '新物种']
    },
    {
      title:`${S.name.slice(0,2)}${E.name.slice(0,2)}·订阅服务`,
      value:`把${b(S.name)}+${b(E.name)}做成${b('按次订阅的旅馆服务')}，旅客入住即可体验，离开可把数据/纪念带回地球。`,
      moment:`接住「${mom}」，让一次性的震撼变成可反复回味的记忆。`,
      tags:[sk,ek,'订阅制','可带走']
    },
    {
      title:`${E.name.slice(0,3)}·星空版`,
      value:`以${b(S.name)}为卖点，重做${b(E.name)}的仪式感，让${b(who)}在${b(mom)}获得"地球上永远给不了"的那一刻。`,
      moment:SC?`${emo}——正是这款产品要接住的情绪。`:`把科技参数翻译成旅客能感受到的浪漫。`,
      tags:[sk, ek, SC?SC.tag:'情绪', '卖点']
    },
  ];
  // shuffle lightly so remix feels different
  return stems.sort(()=>Math.random()-0.5).slice(0,4);
}

/* ---------- modals & wiring ---------- */
function openModal(id){$('#'+id).classList.add('show');}
function closeModal(id){$('#'+id).classList.remove('show');}

function wireThemes(){
  const bar=$('#themebar');if(!bar)return;
  const saved=localStorage.getItem('sc_theme')||'gallery';
  applyTheme(saved);
  $$('.tdot',bar).forEach(b=>{
    b.onclick=()=>applyTheme(b.dataset.theme);
  });
}
function applyTheme(name){
  document.body.dataset.theme=name;
  localStorage.setItem('sc_theme',name);
  $$('#themebar .tdot').forEach(b=>b.classList.toggle('on',b.dataset.theme===name));
}

function wire(){
  wireFilters();
  $('#cookBtn').onclick=cook;
  $('#diceBtn').onclick=luckyFill;
  $('#shuffleBtn').onclick=()=>{renderCanvas();/* keep pot intact */ state.pot.forEach(p=>{const t=$(`.tile[data-key="${key(p)}"]`,canvasEl());if(t)t.classList.add('inpot');});};
  $('#rclose').onclick=closeResults;
  $('#againBtn').onclick=()=>{closeResults();setTimeout(cook,300);};
  $('#clearBtn').onclick=()=>{closeResults();clearPot();};

  // key modal
  $('#keyBtn').onclick=()=>{$('#keyInput').value=localStorage.getItem('ds_key')||'';openModal('keyModal');};
  $('#keySave').onclick=()=>{const v=$('#keyInput').value.trim();if(v)localStorage.setItem('ds_key',v);else localStorage.removeItem('ds_key');closeModal('keyModal');};
  $('#keyClear').onclick=()=>{localStorage.removeItem('ds_key');$('#keyInput').value='';};
  // how modal
  $('#howBtn').onclick=()=>openModal('howModal');
  $('#howClose').onclick=()=>closeModal('howModal');
  $$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('show');});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){$$('.modal.show,.results.show').forEach(x=>x.classList.remove('show'));}
  });

  // resize: rebuild ring dots + reflow unplaced tiles
  let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{buildRingDots();},200);});
}

function boot(){
  wireThemes();
  renderCanvas();
  buildRingDots();
  renderCluster();
  refreshCook();
  wire();
  // first-visit auto how
  if(!localStorage.getItem('sc_seen')){openModal('howModal');localStorage.setItem('sc_seen','1');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

// expose for e2e tests
window.__sc={state,addToPot,cook,luckyFill,clearPot,localGenerate,renderCanvas};
