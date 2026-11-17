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
const state={pot:[],cooking:false};

const featuredPhotos={
  'IE-31':'porthole','IE-32':'habitat','IE-11':'launch','IE-19':'lunar','IE-17':'station','IE-20':'habitat',
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

const canvasEl=()=>$('#canvas');
const category=Object.fromEntries(Object.entries(CLUE_ROLES).map(([kind,role])=>[kind,[role.mark,role.name]]));
const clues=new Map(allItems().map(it=>[it.item.id,it]));
const camera={x:0,y:0,zoom:1};
const mounted=new Map();
const world=document.createElement('div');
world.className='material-world';
canvasEl().appendChild(world);
let paintFrame=0, flight=0, batch=0;

const FIRST_CLUES={
  space:['IE-32','IE-02','IE-06','IE-25','IE-17','IE-19','IE-18','IE-15','IE-05','IE-24'],
  scene:['SC-01','SC-03','SC-02','SC-05','SC-10','SC-07','SC-09','SC-06','SC-11','SC-12'],
  challenge:['CH-05','CH-08','CH-09','CH-12','CH-03','CH-01','CH-04','CH-06','CH-02','CH-10'],
  earth:['HT-31','HT-32','HT-33','HT-01','HT-06','HT-13','HT-20','HT-29','HT-10','HT-28','HT-14']
};
function buildMap(){
  const nodes=[];
  const directions={space:[0,-1],earth:[1,0],challenge:[0,1],scene:[-1,0]};
  for(const [kind,role] of Object.entries(CLUE_ROLES)){
    const [dx,dy]=directions[kind];
    const lead=FIRST_CLUES[kind].map(id=>clues.get(id));
    const ids=new Set(FIRST_CLUES[kind]);
    const items=[...lead,...[...clues.values()].filter(it=>it.kind===kind&&!ids.has(it.item.id))];
    nodes.push({id:'zone-'+kind,kind,x:role.x,y:role.y,w:174,h:25,zone:{...role,mark:category[kind][0]}});
    items.forEach((it,i)=>{
      const slot=SCATTER[kind][i];
      const j=i-SCATTER[kind].length;
      const ring=Math.floor(Math.max(0,j)/6), sweep=((j%6)-2.5)*126+(j%2)*14;
      const radius=(dy?541:865)+ring*177+(j%3)*15;
      const [x,y,w]=slot||[dx*radius+dy*sweep,dy*radius+dx*sweep,92+(i%4)*11];
      const h=kind==='space'?w:kind==='earth'?w*.72:kind==='scene'?38:54;
      const angle=kind==='space'?0:[-7,3,-3,6,0][i%5];
      nodes.push({id:it.item.id,kind,it,x,y,w,h,angle});
    });
  }
  return nodes;
}
const map=buildMap();
const mechanism=item=>MECHANISMS[item.id]||item.kw?.[0]||item.name;
const tension=item=>TENSIONS[item.id]||[item.name,item.block];
function tileHTML(it){
  const {kind,item}=it;
  const badge=`<span class="tile-kind" aria-hidden="true">${category[kind][0]}</span>`;
  if(kind==='scene')return `${badge}<span>${esc(item.name)}</span><small>设定</small>`;
  if(kind==='challenge'){
    const [first,second]=tension(item);
    return `${badge}<span class="tension-lines"><span>${esc(first)}</span><span>${esc(second)}</span></span>`;
  }
  const label=kind==='earth'?mechanism(item):item.sourceName||item.name;
  return `${badge}<img src="${photo(kind,item,260)}" alt="" draggable="false" referrerpolicy="no-referrer"><span class="tlabel">${esc(label)}</span>`;
}
function createNode(node){
  if(node.it){
    const el=document.createElement('button');
    el.type='button';
    el.className='tile'+(node.kind==='space'?' round':'')+(node.kind==='scene'||node.kind==='challenge'?' txt':'');
    el.dataset.key=key(node.it);
    el.title=node.it.item.name;
    el.setAttribute('aria-label','查看 '+node.it.item.name);
    el.style.setProperty('--rot',node.angle+'deg');
    el.innerHTML=tileHTML(node.it);
    attachDrag(el,node.it);
    return el;
  }
  const el=document.createElement('div');
  el.className=node.zone?'zone-label':'theme-label';
  el.innerHTML=node.zone
    ?`<strong><i>${node.zone.mark}</i> ${node.zone.name}</strong><span>${node.zone.question}</span>`
    :`<span>${node.label}</span>`;
  return el;
}
function metrics(){
  const {clientWidth:w,clientHeight:h}=canvasEl();
  return {w,h,s:w<760?Math.max(.34,Math.min(w/1060,h/1000)):Math.min(w/1586,h/970),cx:w*.483,cy:h*.49};
}
function drawCanvas(){
  const {w,h,s,cx,cy}=metrics(), {x,y,zoom}=camera;
  const frame=w+'/'+h;
  const keep=new Set();
  for(const node of map){
    const gx=cx+node.x*s,gy=cy+node.y*s,tw=node.w*s,th=node.h*s;
    const sx=gx*zoom+x,sy=gy*zoom+y;
    if(sx+tw*zoom/2<-36||sy+th*zoom/2<-36||sx-tw*zoom/2>w+36||sy-th*zoom/2>h+36)continue;
    keep.add(node.id);
    let el=mounted.get(node.id);
    if(!el){
      el=createNode(node);
      el.dataset.kind=node.kind;
      world.appendChild(el);mounted.set(node.id,el);
    }
    if(el.dataset.frame!==frame){
      el.dataset.frame=frame;
      el.style.left=gx-tw/2+'px';el.style.top=gy-th/2+'px';
      el.style.setProperty('--width',tw+'px');el.style.setProperty('--height',th+'px');
      el.style.setProperty('--map-scale',s);
    }
    if(node.it){
      const selected=inPot(node.kind,node.it.item.id);
      el.classList.toggle('inpot',selected);
      el.setAttribute('aria-label','查看 '+node.it.item.name+(selected?'（已入锅）':''));
    }
  }
  for(const [id,el] of mounted){
    if(!keep.has(id)&&el!==drag?.el){el.remove();mounted.delete(id);}
  }
  $('#panHome').classList.toggle('away',Math.abs(x)+Math.abs(y)>12||Math.abs(zoom-1)>.03);
  world.style.transform=`translate3d(${x}px,${y}px,0) scale(${zoom})`;
  $('#zoomValue').textContent=Math.round(zoom*100)+'%';
}
function requestCanvas(){
  if(!paintFrame)paintFrame=requestAnimationFrame(()=>{paintFrame=0;drawCanvas();});
}
function renderCanvas(){drawCanvas();}
function flyTo(x,y,zoom){
  cancelAnimationFrame(flight);
  const {x:oldX,y:oldY,zoom:oldZoom}=camera;
  const start=performance.now();
  function step(now){
    const t=reduceMotion()?1:Math.min(1,(now-start)/360);
    const eased=1-(1-t)**3;
    Object.assign(camera,{x:oldX+(x-oldX)*eased,y:oldY+(y-oldY)*eased,zoom:oldZoom+(zoom-oldZoom)*eased});
    drawCanvas();
    if(t<1)flight=requestAnimationFrame(step);
  }
  flight=requestAnimationFrame(step);
}
function visitZone(kind,far=false){
  const role=CLUE_ROLES[kind],{w,h,s,cx,cy}=metrics();
  const zoom=w<760?1.8:far?1.18:1.12;
  const magnitude=far?2.05:1;
  const x=cx+(kind==='challenge'?(far?0:role.x*.72):role.x*magnitude)*s;
  const y=cy+(kind==='challenge'?(far?540:316):role.y*magnitude)*s;
  const targetX=w*(w<760?.5:kind==='scene'?.25:kind==='earth'?.75:.5);
  const targetY=h*(kind==='challenge'?.79:.25);
  flyTo(targetX-x*zoom,targetY-y*zoom,zoom);
}
function zoomCanvas(factor,x=innerWidth/2,y=innerHeight/2){
  cancelAnimationFrame(flight);
  const zoom=Math.min(2.6,Math.max(.65,camera.zoom*factor));
  const ratio=zoom/camera.zoom;
  camera.x=x-(x-camera.x)*ratio;
  camera.y=y-(y-camera.y)*ratio;
  camera.zoom=zoom;
  requestCanvas();
}
function wireCanvas(){
  const app=$('#app');
  let space=false,pan=null;
  const touches=new Map();
  function pinch(){
    if(touches.size!==2)return null;
    const [a,b]=[...touches.values()];
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};
  }
  app.addEventListener('wheel',e=>{
    cancelAnimationFrame(flight);
    e.preventDefault();
    const unit=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;
    if(e.ctrlKey||e.metaKey)zoomCanvas(Math.exp(-e.deltaY*unit*.003),e.clientX,e.clientY);
    else{
      camera.x-=(e.shiftKey&&!e.deltaX?e.deltaY:e.deltaX)*unit;
      camera.y-=(e.shiftKey?0:e.deltaY)*unit;
      requestCanvas();
    }
  },{passive:false});
  window.addEventListener('keydown',e=>{
    if(e.code!=='Space'||e.target.closest('button,input,textarea,[contenteditable]')||$('.modal.show,.results.show,.clue-dialog[open]'))return;
    e.preventDefault();space=true;app.classList.add('pan-mode');
  });
  const releaseSpace=()=>{space=false;app.classList.remove('pan-mode');};
  window.addEventListener('keyup',e=>{if(e.code==='Space')releaseSpace();});
  window.addEventListener('blur',()=>{releaseSpace();pan=null;touches.clear();app.classList.remove('panning');});
  app.addEventListener('pointerdown',e=>{
    cancelAnimationFrame(flight);
    if(e.pointerType==='touch')touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(touches.size===2){
      app.classList.remove('panning');
      app.setPointerCapture(e.pointerId);
      e.stopPropagation();
      if(drag){drag.el.dispatchEvent(new PointerEvent('pointercancel',{pointerId:drag.pid}));}
      pan=null;
      return;
    }
    if(e.button!==1&&(e.button!==0||(!space&&e.target.closest('button,.topbar,.sidefx,.cookdock'))))return;
    e.preventDefault();
    e.stopPropagation();
    app.setPointerCapture(e.pointerId);
    pan={id:e.pointerId,x:e.clientX,y:e.clientY};
    app.classList.add('panning');
  },true);
  app.addEventListener('pointermove',e=>{
    if(touches.has(e.pointerId)){
      const before=pinch();
      touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const after=pinch();
      if(before&&after&&before.d){
        camera.x+=after.x-before.x;camera.y+=after.y-before.y;
        zoomCanvas(after.d/before.d,after.x,after.y);
        return;
      }
    }
    if(!pan||pan.id!==e.pointerId)return;
    camera.x+=e.clientX-pan.x;camera.y+=e.clientY-pan.y;
    pan.x=e.clientX;pan.y=e.clientY;
    requestCanvas();
  });
  function end(e){
    touches.delete(e.pointerId);
    if(pan?.id!==e.pointerId)return;
    pan=null;app.classList.remove('panning');
  }
  app.addEventListener('pointerup',end,true);
  app.addEventListener('pointercancel',end,true);
  $('#zoomIn').onclick=()=>zoomCanvas(1.2);
  $('#zoomOut').onclick=()=>zoomCanvas(1/1.2);
  $('#zoomValue').onclick=$('#panHome').onclick=()=>flyTo(0,0,1);
  $$('[data-zone-jump]').forEach(button=>button.onclick=()=>visitZone(button.dataset.zoneJump));
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
    if(e.button!==0||state.cooking)return;
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
    if(drag.started && overForge(e.clientX,e.clientY)&&!inPot(it.kind,it.item.id)){
      addToPot(it,{x:e.clientX,y:e.clientY});
      el.classList.add('inpot');
    }else if(!drag.started){
      inspectClue(it);
    }
    drag=null;
  };
  el.addEventListener('pointerup',end);
  el.addEventListener('pointercancel',end);
  el.addEventListener('click',e=>{
    if(e.detail===0&&!state.cooking)inspectClue(it);
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
function addToPot(it,origin){
  if(inPot(it.kind,it.item.id))return;
  state.pot.push(it);

  requestCanvas();
  renderCluster(true,origin);
  refreshCook();
}
function removeFromPot(k,id){
  state.pot=state.pot.filter(p=>!(p.kind===k&&p.item.id===id));
  // un-hide its canvas tile if present
  requestCanvas();
  renderCluster();
  refreshCook();
}
function clearPot(){
  state.pot=[];
  $$('.tile.inpot',canvasEl()).forEach(t=>t.classList.remove('inpot'));
  renderCluster();refreshCook();
}

function renderCluster(justAdded,origin){
  const cl=$('#cluster'),stage=$('#stage');
  cl.innerHTML='';
  const n=state.pot.length;
  stage.classList.toggle('has',n>0);
  const {width:clusterSize,left,top}=stage.getBoundingClientRect();
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
      const sx=origin?origin.x-left-clusterSize/2:dx;
      const sy=origin?origin.y-top-clusterSize/2:dy-18;
      el.animate([
        {transform:`translate(${sx}px,${sy}px) scale(.87) rotate(0deg)`,opacity:origin?1:.4},
        {transform:`translate(${dx}px,${dy+5}px) scale(1.045) rotate(${rot+2}deg)`,opacity:1,offset:.77},
        {transform:el.style.transform,opacity:1}
      ],{duration:300,easing:'cubic-bezier(.19,.79,.25,1)'});

    }
    cl.appendChild(el);
  });
}

function canCook(){return state.pot.length>=2;}
function frameRecipe(recipe){
  const first=kind=>recipe.find(p=>p.kind===kind)?.item;
  const signal=first('space'), scene=first('scene'), challenge=first('challenge'), method=first('earth');
  const borrow=method&&mechanism(method);
  const pair=challenge&&tension(challenge);
  if(signal&&challenge)return {label:'机会',question:`「${signal.name}」带来的变化，能怎样缓解「${pair[0]}／${pair[1]}」的取舍？`};
  if(challenge&&method)return {label:'试做',question:`用「${borrow}」，能同时照顾「${pair[0]}」与「${pair[1]}」吗？`};
  if(scene&&method)return {label:'场景',question:`在「${scene.name}」里，「${borrow}」会帮到谁？`};
  if(signal&&scene)return {label:'推演',question:`把「${signal.name}」放进「${scene.name}」，谁的日常会先改变？`};
  const names=recipe.slice(0,2).map(p=>p.item.name);
  return {label:'探索',question:`「${names[0]}」遇到「${names[1]}」时，谁会遇到一个新问题？`};
}
function refreshCook(){
  const btn=$('#cookBtn'),n=state.pot.length;
  btn.disabled=!canCook()||state.cooking;
  $('#stage').classList.toggle('hot',canCook()&&!state.cooking);
  $('#cookHint').textContent=n>=2?`已选 ${n} 条线索`:n?`已选 1 条 · 再加一条`:'拖两条线索进锅';
  const question=$('#recipeQuestion');
  question.hidden=n<2;
  question.textContent=n>=2?frameRecipe(state.pot).question:'';
}
function luckyFill(){
  if(state.cooking)return;
  clearPot();
  const pair=pick(DESIGN_LINKS);
  for(const id of pair.slice(0,Math.random()<.5?2:3)){
    const clue=clues.get(id);
    if(clue)addToPot(clue);
  }
}

function inspectClue(it){
  if(state.cooking)return;
  const dialog=$('#clueDialog'), body=$('#clueBody');
  const {item,kind}=it, zone=CLUE_ROLES[kind];
  const status=kind==='space'?(item.source?'有来源':'观察线索 · 待核'):kind==='earth'?'已有做法':'课堂设定';
  const fields=kind==='scene'?[['谁',item.who],['假设发生了什么',item.moment],['可能的感受',item.emo]]
    :kind==='challenge'?[['两个需要兼顾的目标',tension(item).join(' / ')],['背景线索',item.block]]
    :kind==='earth'?[['可借的那一步',mechanism(item)],['原有案例',item.desc]]
    :[[item.source?'观察到的变化':'待核查的观察',item.desc]];
  const suggestions=[...new Set(DESIGN_LINKS.filter(link=>link.includes(item.id)).flat())]
    .filter(id=>id!==item.id).map(id=>clues.get(id)).filter(Boolean).slice(0,5);
  body.dataset.kind=kind;
  body.innerHTML=`<div class="clue-kicker">${category[kind][0]} ${zone.name} · ${status}</div>
    <h2 id="clueTitle">${esc(item.name)}</h2>
    ${kind==='space'||kind==='earth'?`<img class="clue-image" src="${photo(kind,item,500)}" alt="">`:''}
    ${item.source?`<span class="source-caption">配图为课堂示意</span> · <a class="clue-source" href="${item.source}" target="_blank" rel="noopener">查看 ${esc(item.sourceName)} ↗</a>`: ''}
    <p class="clue-question">${zone.question}</p>
    <dl>${fields.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>
    ${suggestions.length?`<section class="clue-related"><h3>可以搭配的线索</h3>${suggestions.map(other=>`<button data-related-clue="${other.item.id}">${CLUE_ROLES[other.kind].mark} ${esc(other.item.name)} <span>↗</span></button>`).join('')}</section>`:''}
    <button class="clue-add" ${inPot(kind,item.id)?'disabled':''}>${inPot(kind,item.id)?'已在锅中':'加入锅中 ＋'}</button>`;
  $('.clue-add',body).onclick=()=>{
    dialog.close();
    const box=forgeRect();
    addToPot(it,{x:box.x+box.width*.75,y:box.y+box.height*.2});
  };
  $$('[data-related-clue]',body).forEach(button=>button.onclick=()=>inspectClue(clues.get(button.dataset.relatedClue)));
  if(!dialog.open)dialog.showModal();
  $('#closeClue').focus();
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
  state._seed=null;

  state.cooking=false;btn.classList.remove('cooking');refreshCook();
  latestBatch={ideas:ideas.map((idea,i)=>({...idea,recipe,id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+i})),recipe,used};
  if($('#results').classList.contains('show'))showDeck('latest',true);
  $('#openDeck').textContent='灵感册 · '+latestBatch.ideas.length;
}

let latestBatch=null, deckMode='latest', activeIdea=0, deckDrag=null;
let savedIdeas=[];
try{const saved=JSON.parse(localStorage.getItem('sc-saved-ideas-v1')||'[]');if(Array.isArray(saved))savedIdeas=saved;}catch{}
let lastFocus;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const deckIdeas=()=>deckMode==='saved'?savedIdeas:latestBatch?.ideas||[];
function openResults(){
  const results=$('#results');
  if(results.classList.contains('show'))return;
  lastFocus=document.activeElement;
  results.classList.add('show');

  $('#rclose').focus({preventScroll:true});
}
function closeResults(){
  $('#results').classList.remove('show');

  const target=lastFocus?.disabled?$('#openDeck'):lastFocus;
  target?.focus({preventScroll:true});
}
function showLoading(){
  $('#noteGrid').innerHTML='<div class="loading" role="status"><span class="stir-loader"></span>正在翻拌线索…</div>';
  $('#recipeLine').textContent='';
  $('#deckControls').hidden=true;
  $('.result-tabs').hidden=true;
  $('.resbtns').hidden=true;
}

function ingrChip(p){
  const [mark,label]=category[p.kind];
  return `<span class="ingr" data-kind="${p.kind}" title="${label}">${mark} ${esc(p.item.name)}</span>`;
}
function showDeck(mode=deckMode,fromPan=false){
  deckMode=mode;
  $('.result-tabs').hidden=false;
  $('.resbtns').hidden=false;
  $('#showLatest').setAttribute('aria-pressed',String(mode==='latest'));
  $('#showSaved').setAttribute('aria-pressed',String(mode==='saved'));
  $('#showLatest').disabled=!latestBatch;
  $('#showSaved').textContent='已收藏'+(savedIdeas.length?' · '+savedIdeas.length:'');
  const recipe=mode==='latest'?latestBatch?.recipe:null;
  $('#recipeLine').innerHTML=recipe?`<span>${latestBatch.used==='ai'?'DeepSeek':'灵感引擎'}</span>${recipe.map(ingrChip).join('')}`:'';
  activeIdea=0;
  paintDeck(0,fromPan);
}
function paintDeck(direction=0,fromPan=false){
  const ideas=deckIdeas(), grid=$('#noteGrid');
  $('#deckControls').hidden=ideas.length<2;
  $('#ideaCount').textContent=`${String(activeIdea+1).padStart(2,'0')} / ${String(ideas.length).padStart(2,'0')}`;
  $('#againBtn').disabled=state.cooking||!canCook();
  if(!ideas.length){
    grid.innerHTML='<p class="empty-deck">收藏一张灵感后，它会留在这里。</p>';
    return;
  }
  const idea=ideas[activeIdea],isSaved=savedIdeas.some(item=>item.id===idea.id);
  const value=esc(idea.value||'').replaceAll('&lt;b&gt;','<b>').replaceAll('&lt;/b&gt;','</b>');
  const tags=(idea.tags||[]).slice(0,4).map(t=>`<span>${esc(t)}</span>`).join('');
  const title=i=>ideas[(activeIdea+i+ideas.length)%ideas.length]?.title||'';
  grid.innerHTML=`
    ${ideas.length>1?`<button class="deck-peek before" data-deck-step="-1" aria-label="上一张灵感"><small>←</small><span>${esc(title(-1))}</span></button><button class="deck-peek after" data-deck-step="1" aria-label="下一张灵感"><small>→</small><span>${esc(title(1))}</span></button>`:''}
    <article class="note deck-card">
      <header><span class="num">灵感 / ${String(activeIdea+1).padStart(2,'0')}</span><button class="save-idea" aria-pressed="${isSaved}">${isSaved?'✓ 已收藏':'＋ 收藏'}</button></header>
      <div class="idea-front"><h3>${esc(idea.title)}</h3><div class="value">${value}</div><div class="tags">${tags}</div></div>
      <div class="idea-back" hidden>
        <h3>这条想法怎么验证？</h3>
        ${idea.recipe?.length?`<div class="moment"><span class="ml">借用的线索</span>${idea.recipe.map(ingrChip).join('')}</div>`:''}
        ${idea.assumption?`<div class="moment"><span class="ml">关键假设</span>${esc(idea.assumption)}</div>`:''}
        ${idea.question?`<div class="moment"><span class="ml">下一步追问</span>${esc(idea.question)}</div>`:''}
        ${idea.moment?`<div class="moment"><span class="ml">${idea.assumption?'最小验证':'使用时刻'}</span>${esc(idea.moment)}</div>`:''}
      </div>
      <footer><button class="flip-idea" aria-pressed="false">翻面看假设</button><button class="recook-idea" ${state.cooking||(!canCook()&&!idea.recipe?.length)?'disabled':''}>↻ 回锅再想</button></footer>
    </article>`;
  const card=$('.deck-card',grid);
  if((direction||fromPan)&&!reduceMotion()){
    const rect=card.getBoundingClientRect(), pan=forgeRect();
    const x=fromPan?pan.x+pan.width/2-rect.x-rect.width/2:direction*56;
    const y=fromPan?pan.y+pan.height/2-rect.y-rect.height/2:0;
    card.animate([
      {transform:`translate(${x}px,${y}px) scale(${fromPan ? .28 : .94}) rotate(${fromPan?-13:direction*4}deg)`,opacity:.18},
      {transform:fromPan?'translateY(-10px) scale(1.015) rotate(1.5deg)':'translateX(-3px)',opacity:1,offset:.79},
      {transform:'none',opacity:1}
    ],{duration:fromPan?640:310,easing:'cubic-bezier(.19,.82,.26,1)'});
    if(fromPan)$$('.deck-peek',grid).forEach((peek,i)=>peek.animate([
      {transform:'scale(.85) translateY(32px)',opacity:0},{transform:getComputedStyle(peek).transform,opacity:1}
    ],{duration:470,delay:100+70*i,easing:'cubic-bezier(.19,.82,.26,1)',fill:'backwards'}));
  }
}
function advanceDeck(step){
  const length=deckIdeas().length;
  if(length<2)return;
  activeIdea=(activeIdea+step+length)%length;
  paintDeck(step);
}
function wireDeck(){
  $('#openDeck').onclick=()=>{if(state.cooking)return;openResults();showDeck(latestBatch?'latest':'saved');};
  $('#showLatest').onclick=()=>showDeck('latest');
  $('#showSaved').onclick=()=>showDeck('saved');
  $('#prevIdea').onclick=()=>advanceDeck(-1);
  $('#nextIdea').onclick=()=>advanceDeck(1);
  const grid=$('#noteGrid');
  grid.addEventListener('click',e=>{
    const step=e.target.closest('[data-deck-step]');
    if(step){advanceDeck(Number(step.dataset.deckStep));$('#nextIdea').focus();return;}
    const idea=deckIdeas()[activeIdea];
    if(!idea)return;
    if(e.target.closest('.recook-idea')){remix(idea);return;}
    const flip=e.target.closest('.flip-idea');
    if(flip){
      const next=flip.getAttribute('aria-pressed')!=='true', card=flip.closest('.deck-card');
      const face=$(next?'.idea-back':'.idea-front',card);
      $('.idea-front',card).hidden=next;$('.idea-back',card).hidden=!next;
      flip.setAttribute('aria-pressed',String(next));
      flip.textContent=next?'回到提案':'翻面看假设';
      if(!reduceMotion())face.animate([{opacity:0,transform:'translateY(6px) scale(.98)'},{opacity:1,transform:'none'}],{duration:230,easing:'ease-out'});
      return;
    }
    if(!e.target.closest('.save-idea'))return;
    if(savedIdeas.some(item=>item.id===idea.id))savedIdeas=savedIdeas.filter(item=>item.id!==idea.id);
    else savedIdeas=[...savedIdeas,idea];
    try{localStorage.setItem('sc-saved-ideas-v1',JSON.stringify(savedIdeas));}catch{}
    $('#showSaved').textContent='已收藏'+(savedIdeas.length?' · '+savedIdeas.length:'');
    activeIdea=Math.min(activeIdea,Math.max(0,deckIdeas().length-1));
    paintDeck();
    $('.save-idea',grid)?.focus();
  });
  grid.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('button')||deckIdeas().length<2)return;
    const card=e.target.closest('.deck-card');
    if(!card)return;
    deckDrag={id:e.pointerId,x:e.clientX,dx:0,card};
    grid.setPointerCapture(e.pointerId);
  });
  grid.addEventListener('pointermove',e=>{
    if(deckDrag?.id!==e.pointerId)return;
    deckDrag.dx=e.clientX-deckDrag.x;
    if(!reduceMotion())deckDrag.card.style.transform=`translateX(${deckDrag.dx*.67}px) rotate(${Math.max(-8,Math.min(8,deckDrag.dx*.035))}deg)`;
  });
  const end=e=>{
    if(deckDrag?.id!==e.pointerId)return;
    const {dx,card}=deckDrag;
    deckDrag=null;
    if(e.type!=='pointercancel'&&Math.abs(dx)>43)advanceDeck(dx<0?1:-1);
    else{
      if(!reduceMotion())card.animate([{transform:card.style.transform},{transform:'none'}],{duration:210,easing:'ease-out'});
      card.style.transform='';
    }
  };
  grid.addEventListener('pointerup',end);
  grid.addEventListener('pointercancel',end);
  $('#results').addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();advanceDeck(e.key==='ArrowLeft'?-1:1);
    }
  });
}

/* remix: drop this idea back into the pot as a new 'inspiration' seed */
function remix(idea){
  closeResults();
  if(idea.recipe?.length){
    state.pot=[...idea.recipe];
    requestCanvas();renderCluster();refreshCook();
  }
  state._seed=idea.title;
  setTimeout(()=>cook(),380);
}

/* ---------- AI generation (DeepSeek) ---------- */
function recipeText(recipe){
  return recipe.map(({kind,item})=>{
    const detail=kind==='space'?`${item.desc}（${item.source?'来源 '+item.source:'待核观察'}）`
      :kind==='earth'?`${mechanism(item)}。案例：${item.desc}`
      :kind==='scene'?`课堂设定：${item.who}在「${item.moment}」`
      :`课堂假设：${tension(item).join(' / ')}`;
    return `【${CLUE_ROLES[kind].name}】${item.name} · ${detail}`;
  }).join('\n');
}
async function aiGenerate(recipe,apiKey){
  const sys=`你是用未来设计方法研究太空旅居的设计师。先指出太空变化带来的新机会，再从地球案例提取可迁移的机制，落到具体的人和时刻，最后用限制检验。把未经证实的假设写为待验证。用户会任意组合变化信号、情境条件、处境张力、可借机制中的两条或多条。基于实际选中的线索推演，可提出装置、服务或规则。缺少的要素以明确的假设或追问表达，不可捏造已验证的事实、用户需求或来源。`;
  const seed=state._seed?`\n（在上一轮「${state._seed}」的基础上，换个角度再想，不要重复。）`:'';
  const usr=`食材如下：\n${recipeText(recipe)}${seed}
请输出 4 个点子。严格返回 JSON 数组，每个元素字段：
"title"：产品名（4-10字，有记忆点）
"value"：一句话价值主张，必须是"为〔谁〕在〔什么时刻〕，通过〔怎么做〕，带来〔什么改变〕"的句式，把关键词用 <b></b> 包住（2-3 处）
"moment"：最小课堂验证动作（一句话）
"assumption"：决定这个想法能否成立的一个假设（一句话）
"question"：学生接下来该追问哪一个问题（一句话）
"tags"：3-4 个关键词数组
只返回 JSON，不要任何解释或 markdown 代码块。`;
  const r=await fetch('https://api.deepseek.com/chat/completions',{
    method:'POST',signal:AbortSignal.timeout(22000),headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
    body:JSON.stringify({model:'deepseek-chat',temperature:1.1,messages:[{role:'system',content:sys},{role:'user',content:usr}]})
  });
  if(!r.ok)throw new Error('http '+r.status);
  const j=await r.json();
  let txt=j.choices[0].message.content.trim();
  txt=txt.replace(/^```(json)?/i,'').replace(/```$/,'').trim();
  const arr=JSON.parse(txt);
  if(!Array.isArray(arr))throw Error('Invalid idea payload');
  const ideas=arr.filter(item=>typeof item?.title==='string'&&typeof item.value==='string').slice(0,4).map(item=>({
    title:item.title,value:item.value,moment:typeof item.moment==='string'?item.moment:'',
    assumption:typeof item.assumption==='string'?item.assumption:'',question:typeof item.question==='string'?item.question:'',
    tags:Array.isArray(item.tags)?item.tags.filter(tag=>typeof tag==='string'):[]
  }));
  if(!ideas.length)throw Error('No usable ideas');
  return ideas;
}

/* ---------- local fallback idea engine ---------- */
function localGenerate(recipe){
  const first=kind=>recipe.find(p=>p.kind===kind)?.item;
  const signal=first('space'), scene=first('scene'), challenge=first('challenge'), method=first('earth');
  const pair=challenge&&tension(challenge);
  const who=scene?.who||'未来驻留者';
  const moment=scene?.name||'一天中需要作决定的时刻';
  const material=recipe.slice(0,2).map(p=>p.item.name).join(' × ');
  const framing=frameRecipe(recipe);
  const borrowed=method?mechanism(method):null;
  const issue=pair?`在「${pair[0]}」与「${pair[1]}」之间取舍`:'判断这个组合能否解决一个真实麻烦';
  const idea=(title,value,assumption,test,question=framing.question)=>({
    title,value,assumption,question,moment:test,tags:[framing.label,'课堂推演']
  });
  const ideas=[
    idea('把决定留给使用者',
      `在「${moment}」，给${who}一个可以延后、继续或退出的选项。${borrowed?`用「${borrowed}」把两次操作分开。`:`用「${material}」设定一个前后对照。`}`,
      '使用者需要掌控时机，而且愿意多做一次选择。',
      '做两版纸面流程，一版允许延后，一版直接执行，比较同学会怎么选。'),
    idea('把冲突变成可协商的约定',
      `让${who}和同伴先决定何时共享、何时留给个人。用一张双面提示卡标记两种状态，帮他们${issue}。`,
      '同伴能看懂提示，也愿意在需要时改变约定。',
      '本组两人分别扮演当事人和同伴，记录第一次出现意见分歧的位置。'),
    idea('先把变化看得见',
      `在「${moment}」开始前，用一个简短信号提示${signal?`「${signal.name}」可能带来的变化`:`「${material}」组合中的隐含条件`}，让使用者知道接下来会发生什么。`,
      '提前知道变化，能让使用者更从容地行动。',
      '一组先看提示，一组直接体验。同场比较两组能否说出下一步。')
  ];
  if(method?.id==='HT-31'&&(scene?.id==='SC-01'||challenge?.id==='CH-05'||signal?.id==='IE-32')){
    ideas[0]=idea('声音家书','把「先录后听」做成床边的一键收听。家人留言先抵达，旅客挑一个适合自己的时刻再听。',
      '旅客需要陪伴感，也在意何时播放、谁能听见留言。',
      '比较家人语音、生活环境声和静音三组选项，记录同学愿意重听什么、何时重听。');
  }
  if(state._seed)ideas.unshift(idea('换个条件再试',
    `从「${state._seed}」出发，把同一套做法放到需要和别人共享的环境，观察它在哪一步会失效。`,
    '原方案依赖一个人可以自由决定使用时间。',
    '把原方案的体验流程复制一份，只改变共享条件，记录必须调整的步骤。'));
  return ideas;
}

/* ---------- decorative blue arc arrow (ref: 从锅内弯向右上飞出) ---------- */
/* ---------- modals & wiring ---------- */
function openModal(id){$('#'+id).classList.add('show');}
function closeModal(id){$('#'+id).classList.remove('show');}

function wire(){
  $('#closeClue').onclick=()=>$('#clueDialog').close();
  wireCanvas();
  wireDeck();
  $('#cookBtn').onclick=cook;
  $('#diceBtn').onclick=luckyFill;
  $('#shuffleBtn').onclick=()=>{
    if(drag)return;
    const kinds=Object.keys(CLUE_ROLES);
    visitZone(kinds[batch++%kinds.length],true);
  };
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
    if(e.key==='Escape'&&!$('.clue-dialog[open]')){const modal=$('.modal.show');if(modal)modal.classList.remove('show');else if($('.results.show'))closeResults();}
  });

  let resizeFrame;
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{renderCluster();requestCanvas();});
  });
}

function boot(){
  renderCanvas();
  wire();
  const starters=['IE-32','SC-01','HT-31'];
  const items=allItems();
  state.pot=starters.map(id=>items.find(it=>it.item.id===id)).filter(Boolean);
  for(const item of state.pot){
    $$(`[data-key="${key(item)}"]`,canvasEl()).forEach(el=>el.classList.add('inpot'));
  }
  renderCluster();
  refreshCook();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

// expose for e2e tests
window.__sc={state,addToPot,cook,luckyFill,clearPot,localGenerate,renderCanvas};
