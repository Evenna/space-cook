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

const featuredPhotos={
  'IE-31':'porthole','IE-11':'launch','IE-19':'lunar','IE-17':'station','IE-20':'habitat',
  'IE-02':'solar','HT-31':'recorder','HT-32':'cup','HT-33':'notebook','SC-01':'first-night','HT-20':'tent','HT-29':'fabric'
};
function photo(kind,item,w=400){
  if(featuredPhotos[item.id])return 'assets/'+featuredPhotos[item.id]+'.jpg';
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

/* Coordinates refer to the supplied artboard. They are stable when the batch changes. */
const canvasEl=()=>$('#canvas');
const placements={
  space:[
    [-18,172,214,214,0,1],[219,187,126,130,-5,1],[405,140,98,98,0,1],
    [560,187,111,115,0,1],[695,133,87,90,0,1],[149,313,99,100,2,1],
    [282,381,119,120,0,1],[432,406,112,114,8,1],[478,290,80,79,0,1],
    [225,510,120,121,0,1],[349,535,99,103,-4,1],[462,588,107,109,-3,1],
    [128,619,94,94,0,1],[270,665,147,91,4,0],[414,712,109,109,0,1],
    [257,782,101,100,0,1],[119,834,78,78,0,1],[230,913,149,93,-10,0],
    [394,869,115,117,0,1],[528,920,81,87,0,1],[-8,1010,264,264,0,1]
  ],
  earth:[
    [925,162,103,114,-8],[1050,205,80,114,-6],[1171,138,112,109,11],
    [1406,185,106,119,-7],[1548,183,102,148,-11],[1285,245,91,95,-6],
    [1075,356,87,116,5],[1273,420,109,122,-8],[1080,611,114,115,3],
    [1236,565,86,102,7],[1398,652,159,91,1],[1221,708,123,95,-8],
    [1525,775,137,137,-11],[1068,746,118,86,-6],[1215,836,105,98,6],
    [1080,883,112,111,-3],[1336,910,98,110,8],[1497,892,118,85,-15]
  ],
  scene:[[360,239,114,33,0],[112,724,137,33,0]],
  challenge:[[1181,302,91,76,4],[1398,323,99,76,7],[1128,487,101,78,3],[1375,545,113,79,8],[1365,780,106,79,7]]
};
const featured={
  space:['IE-18','IE-11','IE-19','IE-23','IE-22','IE-15','IE-05','IE-17','IE-08','IE-06','IE-01','IE-02','IE-12','IE-20','IE-09','IE-24','IE-07','IE-29','IE-25','IE-03','IE-04'],
  earth:['HT-28','HT-10','HT-14','HT-32','HT-33','HT-21','HT-16','HT-20','HT-24','HT-30','HT-26','HT-23','HT-27','HT-01','HT-18','HT-06','HT-07','HT-29'],
  scene:['SC-01','SC-10'],
  challenge:['CH-01','CH-08','CH-02','CH-06','CH-09']
};

function shuffled(items){
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
let CURRENT=[];
function samplePool(initial){
  const all=allItems();
  return Object.keys(placements).flatMap(kind=>{
    const available=all.filter(it=>it.kind===kind);
    const items=initial?featured[kind].map(id=>available.find(it=>it.item.id===id)).filter(Boolean):shuffled(available);
    return items.filter(it=>initial||!inPot(kind,it.item.id)).slice(0,placements[kind].length);
  });
}

function tileHTML(it){
  const {kind,item}=it;
  if(kind==='scene'||kind==='challenge')return `<span>${esc(item.name)}</span>${kind==='challenge'?'<small>挑战</small>':''}`;
  const src=photo(kind,item,260);
  return `<img src="${src}" alt="" draggable="false" referrerpolicy="no-referrer"><span class="tlabel">${esc(item.name)}</span>`;
}

function renderCanvas(initial=false){
  const cv=canvasEl();cv.innerHTML='';
  CURRENT=samplePool(initial);
  const counts={space:0,earth:0,scene:0,challenge:0};
  CURRENT.forEach(it=>{
    const el=document.createElement('button');
    el.type='button';
    const isText=it.kind==='scene'||it.kind==='challenge';
    const [x,y,w,h,angle,circle]=placements[it.kind][counts[it.kind]++];
    el.className='tile'+(circle?' round':'')+(isText?' txt':'');
    el.dataset.kind=it.kind;el.dataset.key=key(it);
    el.title=it.item.name;
    el.setAttribute('aria-label','加入'+it.item.name);
    el.style.setProperty('--width',w/1586*100+'vw');
    el.style.setProperty('--height',h/992*100+'%');
    el.style.setProperty('--rot',angle+'deg');
    el.style.left=(x-w/2)/1586*100+'%';
    el.style.top=(y-h/2)/992*100+'%';
    el.innerHTML=tileHTML(it);
    if(inPot(it.kind,it.item.id))el.classList.add('inpot');
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
    if(e.button!==0||state.cooking||el.classList.contains('inpot'))return;
    e.preventDefault();
    const sz=el.getBoundingClientRect().width;
    drag={it,el,started:false,sz,x:e.clientX,y:e.clientY};
    el.setPointerCapture(e.pointerId);
    drag.pid=e.pointerId;
    moveGhost(e.clientX,e.clientY,true);
  });
  el.addEventListener('pointermove',e=>{
    if(!drag||drag.el!==el)return;
    if(!drag.started&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;
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
    if(e.type==='pointercancel'){drag=null;return;}
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
  el.addEventListener('click',e=>{
    if(e.detail===0&&!state.cooking){addToPot(it);el.classList.add('inpot');}
  });
}

function setGhost(it,sz){
  ghost.style.width=ghost.style.height=(sz||88)+'px';
  const isText=it.kind==='scene'||it.kind==='challenge';
  ghost.classList.toggle('txt',isText);
  ghost.innerHTML=tileHTML(it);
  ghost.style.borderRadius=it.kind==='space'?'50%':'12%';
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
  const clusterSize=stage.offsetWidth;
  const featuredPositions=[[0,-.34,-12],[-.24,.13,9],[.22,.08,-15]];
  state.pot.forEach((p,i)=>{
    const el=document.createElement('button');
    el.type='button';el.className='pin';el.dataset.kind=p.kind;
    el.setAttribute('aria-label','移除'+p.item.name);
    el.title='移除'+p.item.name;
    const angle=i/n*Math.PI*2-Math.PI/2;
    const [x,y,rot]=n===3?featuredPositions[i]:n===1?[0,0,0]:[Math.cos(angle)*.29,Math.sin(angle)*.26,i%2?8:-9];
    const dx=x*clusterSize,dy=y*clusterSize;
    const size=clusterSize*Math.min(.32,1.17/Math.max(3,n));
    el.style.setProperty('--pin-size',size+'px');
    const label=p.kind==='scene'||p.kind==='challenge'?`<span class="pin-title">${esc(p.item.name)}</span>`:'';
    el.innerHTML=`${label}<img src="${photo(p.kind,p.item,220)}" alt="" referrerpolicy="no-referrer"><span class="pinx" aria-hidden="true">×</span>`;
    el.onclick=()=>{if(!state.cooking)removeFromPot(p.kind,p.item.id);};
    el.style.transform=`translate(${dx}px,${dy}px) rotate(${rot}deg)`;
    el.style.zIndex=20+i;
    if(justAdded&&i===n-1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      el.animate([{transform:`translate(${dx}px,${dy-18}px) scale(.82) rotate(${rot}deg)`,opacity:0},
        {transform:el.style.transform,opacity:1}],{duration:280,easing:'cubic-bezier(.2,.8,.25,1)'});
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
  if(n===0)hint.innerHTML='把食材拖进锅里 · 已选 <b>0</b> 条线索';
  else if(!hasSignal())hint.innerHTML=`已选 <b>${n}</b> 条线索 · 还差一个 ✦ 太空信号`;
  else if(!hasEarth())hint.innerHTML=`已选 <b>${n}</b> 条线索 · 还差一个 ◆ 地球同款`;
  else hint.innerHTML=`已选 ${n} 条线索`;
}

function luckyFill(){
  if(state.cooking)return;
  clearPot();
  const sig=pick(SPACE_SIGNALS), ert=pick(EARTH_PRODUCTS);
  const sc=Math.random()<0.8?pick(SCENES):null;
  const ch=Math.random()<0.8?pick(CHALLENGES):null;
  const combo=[{kind:'space',item:sig},{kind:'earth',item:ert}];
  if(sc)combo.push({kind:'scene',item:sc});
  if(ch)combo.push({kind:'challenge',item:ch});
  // ensure those tiles exist on canvas (add fresh if not in current pool)
  combo.forEach(c=>{
    addToPot(c);
    const t=$(`.tile[data-key="${key(c)}"]`,canvasEl());
    if(t)t.classList.add('inpot');
  });
}

/* ---------- filters ---------- */
function wireFilters(){
  $$('.fxpill').forEach(p=>{
    p.onclick=()=>{
      const k=p.dataset.kind;
      state.filters[k]=!state.filters[k];
      p.classList.toggle('on',state.filters[k]);
      p.setAttribute('aria-pressed',String(state.filters[k]));
      applyFilters();
    };
  });
}

/* ---------- COOKING ---------- */
async function cook(){
  if(state.cooking||!canCook())return;
  state.cooking=true;refreshCook();
  const btn=$('#cookBtn');btn.classList.add('cooking');
  const catcher=$('#catcher');

  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced){
    $$('.pin',$('#cluster')).forEach((pin,i)=>{
      pin.animate([{transform:pin.style.transform},
        {transform:pin.style.transform+` translateY(${-27-i*4}px) rotate(${i%2?-17:17}deg)`},
        {transform:pin.style.transform}],{duration:520,delay:i*24,easing:'ease-in-out'});
    });
    catcher.animate([{transform:'rotate(0)'},{transform:'rotate(-3deg)'},{transform:'rotate(0)'}],{duration:560});
    await sleep(560);
  }

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

/* ---------- decorative blue arc arrow (ref: 从锅内弯向右上飞出) ---------- */
/* ---------- modals & wiring ---------- */
function openModal(id){$('#'+id).classList.add('show');}
function closeModal(id){$('#'+id).classList.remove('show');}

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

  let resizeFrame;
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>renderCluster());
  });
}

function boot(){
  renderCanvas(true);
  wire();
  const starters=['IE-31','SC-01','HT-31'];
  const items=allItems();
  state.pot=starters.map(id=>items.find(it=>it.item.id===id)).filter(Boolean);
  for(const item of state.pot){
    canvasEl().querySelector(`[data-key="${key(item)}"]`)?.classList.add('inpot');
  }
  renderCluster();
  refreshCook();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

// expose for e2e tests
window.__sc={state,addToPot,cook,luckyFill,clearPot,localGenerate,renderCanvas};
