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

const category={
  space:['✧','太空信号'],earth:['◆','地球同款'],scene:['≋','场景'],challenge:['△','挑战']
};
const roamingSlots=[
  [707,335,103,92,-9],[807,494,131,110,6],[729,653,91,102,8],[846,780,118,85,-10]
];
const camera={x:0,y:0,zoom:1,batch:0};
const mounted=new Map();
let worldExtent='';
const world=document.createElement('div');
world.className='material-world';
canvasEl().appendChild(world);
let paintFrame=0;

function tileHTML(it){
  const {kind,item}=it;
  const badge=`<span class="tile-kind" aria-hidden="true">${category[kind][0]}</span>`;
  if(kind==='scene'||kind==='challenge')return `${badge}<span>${esc(item.name)}</span><small>${category[kind][1]}</small>`;
  const src=photo(kind,item,260);
  return `${badge}<img src="${src}" alt="" draggable="false" referrerpolicy="no-referrer"><span class="tlabel">${esc(item.name)}</span>`;
}
const catalog=Object.fromEntries(Object.keys(placements).map(kind=>[kind,allItems().filter(it=>it.kind===kind)]));
function areaItems(kind,col,row){
  const pool=catalog[kind];
  if(!camera.batch&&col===0&&row===0)return featured[kind].map(id=>pool.find(it=>it.item.id===id)).filter(Boolean);
  const offset=((col*7+row*11+camera.batch*13)%pool.length+pool.length)%pool.length;
  const count=col||row?Math.ceil(placements[kind].length*.63):placements[kind].length;
  return Array.from({length:count},(_,i)=>pool[(offset+i)%pool.length]);
}
function createTile(it,angle){
  const el=document.createElement('button');
  const isText=it.kind==='scene'||it.kind==='challenge';
  el.type='button';
  el.className='tile'+(it.kind==='space'?' round':'')+(isText?' txt':'');
  el.dataset.kind=it.kind;el.dataset.key=key(it);
  el.title=it.item.name;
  el.setAttribute('aria-label','加入'+it.item.name);
  el.style.setProperty('--rot',angle+'deg');
  el.innerHTML=tileHTML(it);
  attachDrag(el,it);
  return el;
}
function drawCanvas(){
  const {clientWidth:width,clientHeight:height}=canvasEl(), {x,y,zoom}=camera;
  const spanX=Math.max(width,720),spanY=Math.max(height,540);
  const extent=width+'/'+height, resized=extent!==worldExtent;
  worldExtent=extent;
  const keep=new Set();
  const left=-x/zoom-88, top=-y/zoom-88, right=(width-x)/zoom+88, bottom=(height-y)/zoom+88;
  const shift=(spanX-width)/2;
  for(let row=Math.floor(top/spanY);row<=Math.floor(bottom/spanY);row++){
    for(let col=Math.floor((left+shift)/spanX);col<=Math.floor((right+shift)/spanX);col++){
      for(const kind of Object.keys(placements)){
        if(!state.filters[kind])continue;
        const items=areaItems(kind,col,row);
        items.forEach((it,i)=>{
          const roam=(col||row)&&(kind==='space'||kind==='earth')&&i<2;
          const slot=roam?roamingSlots[i+(kind==='earth'?2:0)]:placements[kind][i];
          const [px,py,w,h,angle]=slot;
          const stagger=col||row?(Math.abs(col*17+row*23+i*11)%55)-27:0;
          const centerX=col*spanX+(px+stagger)*spanX/1586-shift;
          const centerY=row*spanY+(py+stagger*.7)*spanY/992;
          const tileWidth=w*spanX/1586, tileHeight=h*spanY/992;
          if(centerX+tileWidth/2<left||centerX-tileWidth/2>right||centerY+tileHeight/2<top||centerY-tileHeight/2>bottom)return;
          const id=`${row}/${col}/${kind}/${i}`;
          keep.add(id);
          let el=mounted.get(id);
          if(!el){
            el=createTile(it,angle);
            mounted.set(id,el);
            world.appendChild(el);
            el.dataset.newTile='';
          }
          if(resized||'newTile' in el.dataset){
            delete el.dataset.newTile;
            el.style.left=centerX-tileWidth/2+'px';
            el.style.top=centerY-tileHeight/2+'px';
            el.style.setProperty('--width',tileWidth+'px');
            el.style.setProperty('--height',tileHeight+'px');
          }
          el.classList.toggle('inpot',inPot(it.kind,it.item.id));
        });
      }
    }
  }
  for(const [id,el] of mounted){
    if(!keep.has(id)&&el!==drag?.el){el.remove();mounted.delete(id);}
  }
  world.style.transform=`translate3d(${x}px,${y}px,0) scale(${zoom})`;
  $('#zoomValue').textContent=Math.round(zoom*100)+'%';
}
function applyFilters(){drawCanvas();}
function requestCanvas(){
  if(paintFrame)return;
  paintFrame=requestAnimationFrame(()=>{paintFrame=0;drawCanvas();});
}
function renderCanvas(initial=false){
  if(!initial)camera.batch++;
  world.replaceChildren();
  mounted.clear();
  drawCanvas();
}
function zoomCanvas(factor,x=innerWidth/2,y=innerHeight/2){
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
    if(e.code!=='Space'||e.target.closest('button,input,textarea,[contenteditable]')||$('.modal.show,.results.show'))return;
    e.preventDefault();space=true;app.classList.add('pan-mode');
  });
  const releaseSpace=()=>{space=false;app.classList.remove('pan-mode');};
  window.addEventListener('keyup',e=>{if(e.code==='Space')releaseSpace();});
  window.addEventListener('blur',()=>{releaseSpace();pan=null;touches.clear();app.classList.remove('panning');});
  app.addEventListener('pointerdown',e=>{
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
  $('#zoomValue').onclick=()=>{Object.assign(camera,{x:0,y:0,zoom:1});requestCanvas();};
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
      addToPot(it,{x:e.clientX,y:e.clientY});
      el.classList.add('inpot');
    }else if(!drag.started){
      // treat as tap: on mobile a tap also drops into the pot
      addToPot(it,{x:e.clientX,y:e.clientY}); el.classList.add('inpot');
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
  $('#app').inert=true;
  $('#rclose').focus({preventScroll:true});
}
function closeResults(){
  $('#results').classList.remove('show');
  $('#app').inert=false;
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
      <h3>${esc(idea.title)}</h3>
      <div class="value">${value}</div>
      ${idea.moment?`<div class="moment"><span class="ml">使用时刻</span>${esc(idea.moment)}</div>`:''}
      <div class="tags">${tags}</div>
      <footer><button class="recook-idea" ${state.cooking||(!canCook()&&!idea.recipe?.length)?'disabled':''}>↻ 回锅再想</button></footer>
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
    tags:Array.isArray(item.tags)?item.tags.filter(tag=>typeof tag==='string'):[]
  }));
  if(!ideas.length)throw Error('No usable ideas');
  return ideas;
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
  const ideas=stems.sort(()=>Math.random()-0.5).slice(0,4);
  if(state._seed){
    ideas[0]={...ideas[0],title:'换个时刻 · '+E.name,
      value:`沿着「${b(state._seed)}」再走一步：把同一组合挪到${b('离舱前最后五分钟')}，让旅客决定哪段体验要留在舱内、哪段想带回地球。`,
      moment:'做两张纸面流程卡，让同学选取一段记忆并解释选择。'};
  }
  return ideas;
}

/* ---------- decorative blue arc arrow (ref: 从锅内弯向右上飞出) ---------- */
/* ---------- modals & wiring ---------- */
function openModal(id){$('#'+id).classList.add('show');}
function closeModal(id){$('#'+id).classList.remove('show');}

function wire(){
  wireFilters();
  wireCanvas();
  wireDeck();
  $('#cookBtn').onclick=cook;
  $('#diceBtn').onclick=luckyFill;
  $('#shuffleBtn').onclick=()=>{if(!drag)renderCanvas();};
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
    if(e.key==='Escape'){const modal=$('.modal.show');if(modal)modal.classList.remove('show');else if($('.results.show'))closeResults();}
  });

  let resizeFrame;
  window.addEventListener('resize',()=>{
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{renderCluster();requestCanvas();});
  });
}

function boot(){
  renderCanvas(true);
  wire();
  const starters=['IE-31','SC-01','HT-31'];
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
