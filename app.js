(() => {
  'use strict';

  const skins = {
    mochi: { name:'Mochi, el abrazable', light:'#ffe4e9', mid:'#f6b6ca', deep:'#e995b5', edge:'#d783a2', shade:'#8e416d', face:'#664e61', blush:'#ea7494', stage:['#fff9fc','#fbe8ef','#f8d9e6'], message:'Mochi dice: otro achuchón, por favor ♡', tone:470 },
    frog: { name:'Rana, la imperturbable',light:'#e2f8d6',mid:'#b4dfb9',deep:'#85c7a2',edge:'#71ae91',shade:'#406d54',face:'#456151',blush:'#e7a2ac',stage:['#f9fffa','#e9f8ec','#d7f1e4'],message:'Croac. Eso era un abrazo, ¿no?',tone:390 },
    cloud: { name:'Nube, la soñadora', light:'#f7edff', mid:'#d9c8f9',deep:'#b6a7e8',edge:'#a18ed9',shade:'#68589b',face:'#695c88',blush:'#efa2c3',stage:['#fefbff','#f0eafe','#e7dffc'],message:'No tengo asuntos pendientes. Soy una nube.',tone:550 },
    star: { name:'Estrella, la dramática',light:'#fff6cf',mid:'#ffdc91',deep:'#f5b96b',edge:'#e7a66a',shade:'#99683e',face:'#826044',blush:'#f3a6a2',stage:['#fffefa','#fff4db','#fbe9d1'],message:'¡Me has estrujado el estrellato!',tone:640 },
    flan: { name:'Flancito, el tembloroso',light:'#fff2d3',mid:'#ffd39c',deep:'#f0ac75',edge:'#d98f64',shade:'#996540',face:'#75533e',blush:'#e9988d',stage:['#fffcf7','#fff0dc','#f8e2ce'],message:'Soy un flan. Literalmente.',tone:320 }
  };
  const order = Object.keys(skins);
  const $ = (id) => document.getElementById(id);
  const canvas = $('squishy-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const stage = $('stage');
  const prefKey='achuchame-preferencias-v1';
  let pref={skin:'mochi',sound:false,haptic:false,night:false};
  try { const saved=JSON.parse(localStorage.getItem(prefKey) || '{}'); pref={...pref,...saved}; }catch(_){}
  if(!skins[pref.skin]) pref.skin='mochi';
  let skinId=pref.skin;
  const points=[]; const count=100; const particles=[];
  const pointers=new Map();
  let w=400,h=420,r=125,dpr=1,hasInteraction=false,isKeyboardDown=false,prevFrame=performance.now();
  let audioCtx=null,toastTimeout=0,breathing=false,breathStart=0,breathDisplay='';
  let pressStrength=0, smile=0, releaseWobble=0, idleTimer=0;
  const prefersLessMotion=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (let i=0;i<count;i++) points.push({x:0,y:0,vx:0,vy:0,ready:false});
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  function save(){ try{localStorage.setItem(prefKey,JSON.stringify(pref));}catch(_){} }
  function toast(text){ const t=$('toast'); t.textContent=text; t.classList.add('visible'); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>t.classList.remove('visible'),2500); }
  function setCanvasSize(){
    const rect=canvas.getBoundingClientRect();
    const oldR=r;
    w=Math.max(1,rect.width);h=Math.max(1,rect.height);r=Math.min(w*.305,h*.344,169);
    dpr=Math.min(2.5,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(Math.abs(oldR-r)>1) points.forEach(p=>{p.ready=false;p.vx=0;p.vy=0;});
  }
  if('ResizeObserver' in window) new ResizeObserver(setCanvasSize).observe(canvas);
  else window.addEventListener('resize',setCanvasSize);

  function setSkin(id){
    if(!skins[id])return;
    const old=skinId;skinId=id;pref.skin=id;save();
    for(const toy of document.querySelectorAll('[data-skin]')){
      const active=toy.dataset.skin===id;
      toy.classList.toggle('active',active);toy.setAttribute('aria-pressed',String(active));
    }
    $('pet-name').textContent=skins[id].name;
    $('skin-number').textContent=String(order.indexOf(id)+1).padStart(2,'0')+' / 05';
    const skin=skins[id];
    stage.style.background=`radial-gradient(ellipse at 48% 28%,${skin.stage[0]} 0%,${skin.stage[1]} 46%,${skin.stage[2]} 100%)`;
    if(document.body.classList.contains('night'))stage.style.background='';
    if(old!==id){ burst(w*.5,h*.46,12,skin.deep,true); releaseWobble=13; toast('¡Hola, '+skins[id].name.split(',')[0]+'! ♡'); }
  }
  for(const toy of document.querySelectorAll('[data-skin]'))toy.addEventListener('click',()=>setSkin(toy.dataset.skin));
  function setupSwitch(id,key){
    const btn=$(id);
    function update(){btn.setAttribute('aria-pressed',String(Boolean(pref[key])));}
    btn.addEventListener('click',()=>{
      pref[key]=!pref[key];save();update();
      if(key==='night') {document.body.classList.toggle('night',pref.night);setSkin(skinId);} 
      if(key==='haptic' && pref.haptic && !('vibrate' in navigator))toast('Este dispositivo no permite vibración web ♡');
      if(key==='sound' && pref.sound)playPop(0.6);
    });
    update();
  }
  setupSwitch('sound-btn','sound');setupSwitch('haptic-btn','haptic');setupSwitch('night-btn','night');
  document.body.classList.toggle('night',pref.night);

  function playPop(volume=1){
    if(!pref.sound)return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!audioCtx)audioCtx=new AC();
      if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
      const t=audioCtx.currentTime,osc=audioCtx.createOscillator(),g=audioCtx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(skins[skinId].tone*1.32,t);osc.frequency.exponentialRampToValueAtTime(skins[skinId].tone*.66,t+.15);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.10*volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.17);
      osc.connect(g);g.connect(audioCtx.destination);osc.start(t);osc.stop(t+.19);
    }catch(_){}
  }
  function haptic(){if(!pref.haptic || !navigator.vibrate)return;try{navigator.vibrate(16);}catch(_){}}
  function shapeRadius(angle){
    switch(skinId){
      case 'cloud': return .94+.054*Math.cos(7*angle+.4)+.018*Math.cos(3*angle);
      case 'star': return .835+.205*Math.cos(5*(angle+Math.PI/2));
      case 'flan': return .985+.015*Math.cos(4*angle);
      case 'frog': return 1+.015*Math.cos(3*angle);
      default: return .98+.018*Math.cos(3*angle-1.2);
    }
  }
  function getPresses(){
    if(isKeyboardDown && !pointers.size)return [{x:w/2,y:h/2-r*.15,startX:w/2,startY:h/2-r*.15,pressure:1}];
    return [...pointers.values()];
  }
  function pointerXY(ev){const b=canvas.getBoundingClientRect();return {x:ev.clientX-b.left,y:ev.clientY-b.top};}
  function hitTest(pos){const dx=(pos.x-w*.5)/r,dy=(pos.y-h*.48)/(r*.9);return dx*dx+dy*dy<1.53;}
  canvas.addEventListener('pointerdown', ev=>{
    if(!hitTest(pointerXY(ev)))return;
    ev.preventDefault();
    const {x,y}=pointerXY(ev);const first=!pointers.size;
    pointers.set(ev.pointerId,{x,y,startX:x,startY:y,pressure:ev.pressure||.5});
    if(first) {hasInteraction=true;pressStrength=1;$('stage-instruction').textContent='¡plof! así, así...';}
    canvas.setPointerCapture(ev.pointerId);canvas.classList.add('pressed');
  });
  canvas.addEventListener('pointermove',ev=>{
    const p=pointers.get(ev.pointerId);if(!p)return;ev.preventDefault();const pos=pointerXY(ev);p.x=pos.x;p.y=pos.y;p.pressure=ev.pressure||.5;
  });
  function pointerEnd(ev){
    if(!pointers.has(ev.pointerId))return;
    ev.preventDefault();
    pointers.delete(ev.pointerId);
    if(!pointers.size){finishSquish();canvas.classList.remove('pressed');}
  }
  canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',pointerEnd);
  canvas.addEventListener('lostpointercapture',ev=>{if(pointers.has(ev.pointerId)){pointers.delete(ev.pointerId);if(!pointers.size){finishSquish();canvas.classList.remove('pressed');}}});
  canvas.addEventListener('keydown',ev=>{if(ev.code!=='Space'&&ev.code!=='Enter')return;ev.preventDefault();if(!isKeyboardDown){isKeyboardDown=true;hasInteraction=true;$('stage-instruction').textContent='¡plof! así, así...';}});
  canvas.addEventListener('keyup',ev=>{if(ev.code!=='Space'&&ev.code!=='Enter')return;ev.preventDefault();if(isKeyboardDown){isKeyboardDown=false;finishSquish();}});
  canvas.addEventListener('blur',()=>{if(isKeyboardDown){isKeyboardDown=false;finishSquish();}});
  function finishSquish(){
    pressStrength=0;releaseWobble=Math.max(releaseWobble,10);
    burst(w*.5,h*.39,11,skins[skinId].mid,false);playPop();haptic();
    $('stage-instruction').textContent=['otra vez, que me ha gustado ♡','plop. oficialmente blandito','no hay nada que hacer. qué bien.','apriétame otro poquito','un achuchón nunca sobra'][Math.floor(Math.random()*5)];
  }
  function burst(x,y,n,color,party=false){
    if(prefersLessMotion && !party)n=Math.min(5,n);
    for(let i=0;i<n;i++){
      const angle=Math.random()*Math.PI*2;
      const speed=party?2.5+Math.random()*5:1+Math.random()*3.2;
      particles.push({x:x+(Math.random()-.5)*r*.6,y:y+(Math.random()-.5)*r*.4,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1.2,life:1,kind:Math.random()>.58?'heart':'star',color:Math.random()>.46?color:'#ffffff',size:3+Math.random()*5,rot:Math.random()*6});
    }
    if(particles.length>180)particles.splice(0,particles.length-180);
  }
  $('surprise-btn').addEventListener('click',()=>{burst(w*.5,h*.4,45,skins[skinId].deep,true);playPop(.65);haptic();toast('¡Una fiesta de absolutamente nada! ✨');});
  $('breath-btn').addEventListener('click',()=>{
    breathing=!breathing;breathStart=performance.now();breathDisplay='';
    stage.classList.toggle('breathing',breathing);$('breath-btn').setAttribute('aria-pressed',String(breathing));
    $('breath-btn').innerHTML=breathing?'<span aria-hidden="true">◌</span> Terminar':'<span aria-hidden="true">◌</span> Respira conmigo';
    $('breathing-msg').textContent=breathing?'Inhala despacito...':'';
    if(breathing)toast('A tu ritmo. Sin hacerlo perfecto.');
  });

  function drawHeart(x,y,s,color){ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,s*.4);ctx.bezierCurveTo(-s*1.45,-s*.33,-s*.6,-s*1.08,0,-s*.38);ctx.bezierCurveTo(s*.6,-s*1.08,s*1.45,-s*.33,0,s*.4);ctx.fill();ctx.restore();}
  function drawSpark(x,y,s,color,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=-Math.PI/2+Math.PI*i/4,rr=i%2===0?s:s*.23;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();ctx.restore();}
  function ellipseFill(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,Math.PI*2);ctx.fill();}
  function drawBody(now,dt){
    const skin=skins[skinId],cx=w*.5,cy=h*.48+Math.sin(now/1000)*(!prefersLessMotion?1.8:.4);
    const presses=getPresses();const multi=presses.length>=2;
    const curDist=multi?Math.hypot(presses[0].x-presses[1].x,presses[0].y-presses[1].y):0;
    const startDist=multi?Math.max(30,Math.hypot(presses[0].startX-presses[1].startX,presses[0].startY-presses[1].startY)):1;
    const pinch=multi?clamp(curDist/startDist,.68,1.32):1;
    let meanDx=0,meanDy=0;
    for(let p of presses){meanDx+=(p.x-p.startX)/presses.length;meanDy+=(p.y-p.startY)/presses.length;}
    const isPressed=presses.length>0;
    smile=lerp(smile,isPressed?1:0, .1*dt);
    const mode=skinId;
    ctx.save();
    // Un pequeño colchón de sombra que crece cuando estrujas el muñeco.
    ctx.save();ctx.filter='blur(10px)';ellipseFill(cx,cy+r*.95,r*.67+(isPressed?8:0),r*.10,'rgba(94,60,91,.14)');ctx.restore();
    if(mode==='frog'){
      ctx.save(); ctx.shadowColor='rgba(46,100,58,.12)';ctx.shadowBlur=12;
      for(const dir of [-1,1]){
        const x=cx+dir*r*.52,y=cy-r*.69;
        const grd=ctx.createRadialGradient(x-r*.2,y-r*.2,1,x,y,r*.31);
        grd.addColorStop(0,skin.light);grd.addColorStop(1,skin.deep);
        ellipseFill(x,y,r*.295,r*.31,grd);
      }ctx.restore();
    }
    const twirl=isPressed?Math.sin(now/90)*.8:Math.sin(now/460)*.2;
    for(let i=0;i<count;i++){
      const a=Math.PI*2*i/count;
      const unit=shapeRadius(a);
      let tx=Math.cos(a)*r*unit;
      let ty=Math.sin(a)*r*.91*unit;
      if(mode==='flan')ty*=.97;
      if(mode==='star'){tx*=.99;ty*=1.04;}
      if(multi){tx=tx*pinch+meanDx*.16;ty=ty*pinch+meanDy*.16;}
      else if(isPressed){
        const p=presses[0];
        const theta=Math.atan2((p.startY-cy)/.91,(p.startX-cx));
        let delta=Math.atan2(Math.sin(a-theta),Math.cos(a-theta));
        const weight=Math.exp(-(delta*delta)/(.64*.64));
        const dx=clamp(p.x-p.startX,-r*.9,r*.9),dy=clamp(p.y-p.startY,-r*.9,r*.9);
        tx+=weight*(dx*.53 - Math.cos(a)*r*.16);
        ty+=weight*(dy*.53 - Math.sin(a)*r*.16);
        // Si aprietas cerca del centro, la masa se aplasta de verdad.
        const centerDistance=Math.hypot((p.startX-cx)/r,(p.startY-cy)/(r*.91));
        const centerPress=clamp((.78-centerDistance)/.78,0,1);
        tx*=1+centerPress*.12;
        ty*=1-centerPress*.18;
        // Si aprietas en el borde se forma una hendidura localizada.
        tx*=.99;ty*=.99;
      }
      if(!isPressed){const wob=releaseWobble*Math.cos(a*3-now*.022)*.25;tx+=wob*Math.cos(a);ty+=wob*Math.sin(a);}
      tx+=twirl*Math.cos(a*2);ty+=twirl*Math.sin(a*2);
      const p=points[i];
      if(!p.ready){p.x=tx;p.y=ty;p.vx=0;p.vy=0;p.ready=true;}
      const spring=.14*dt;
      p.vx=(p.vx+(tx-p.x)*spring)*Math.pow(.75,dt);
      p.vy=(p.vy+(ty-p.y)*spring)*Math.pow(.75,dt);
      p.x+=p.vx*dt;p.y+=p.vy*dt;
    }
    // Contorno suavizado: sin esquinas, incluso al tirar con dos dedos.
    ctx.beginPath();
    const p0=points[count-1],p1=points[0];
    ctx.moveTo(cx+(p0.x+p1.x)/2,cy+(p0.y+p1.y)/2);
    for(let i=0;i<count;i++){
      const a=points[i],b=points[(i+1)%count];
      ctx.quadraticCurveTo(cx+a.x,cy+a.y,cx+(a.x+b.x)/2,cy+(a.y+b.y)/2);
    }
    ctx.closePath();
    const g=ctx.createRadialGradient(cx-r*.27,cy-r*.5,r*.05,cx+r*.2,cy+r*.30,r*1.5);
    g.addColorStop(0,skin.light);g.addColorStop(.43,skin.mid);g.addColorStop(.80,skin.deep);g.addColorStop(1,skin.edge);
    ctx.shadowColor=skin.shade+'3d';ctx.shadowBlur=22;ctx.shadowOffsetY=8;
    ctx.fillStyle=g;ctx.fill();ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=2.5;ctx.stroke();
    ctx.save();ctx.clip();
    // Luz suave bajo el material brillante.
    const shine=ctx.createLinearGradient(cx-r*.48,cy-r*.76,cx+r*.33,cy-r*.12);
    shine.addColorStop(0,'rgba(255,255,255,.42)');shine.addColorStop(1,'rgba(255,255,255,0)');
    ctx.save();ctx.translate(cx-r*.26+meanDx*.08,cy-r*.48+meanDy*.08);ctx.rotate(-.35);ellipseFill(0,0,r*.47,r*.18,shine);ctx.restore();
    if(mode==='flan'){
      // Capita de caramelo ondulada.
      const top=cy-r*.60;
      const caramel=ctx.createLinearGradient(0,top-r*.2,0,top+r*.3);caramel.addColorStop(0,'#ba805d');caramel.addColorStop(1,'#d99d70');
      ctx.fillStyle=caramel;ctx.beginPath();ctx.moveTo(cx-r*.84,top);ctx.bezierCurveTo(cx-r*.5,top+r*.04,cx-r*.2,top-r*.14,cx,top-r*.10);ctx.bezierCurveTo(cx+r*.42,top-r*.15,cx+r*.75,top,cx+r*.9,top+r*.03);ctx.lineTo(cx+r*.88,top+r*.22);ctx.bezierCurveTo(cx+r*.6,top+r*.08,cx+r*.4,top+r*.32,cx+r*.18,top+r*.20);ctx.bezierCurveTo(cx-r*.10,top+r*.05,cx-r*.38,top+r*.37,cx-r*.7,top+r*.20);ctx.closePath();ctx.fill();
      ctx.globalAlpha=.22;ellipseFill(cx-r*.13,top-r*.04,r*.48,r*.09,'#fff4d8');ctx.globalAlpha=1;
    }
    if(mode==='star'){
      drawSpark(cx+r*.39,cy-r*.39,r*.065,'rgba(255,255,255,.65)',.3);
    }
    // Cara. El movimiento también afecta ligeramente a los rasgos.
    const fx=cx+meanDx*.14,fy=cy+meanDy*.12 + (isPressed?2:0),eyeSep=r*.235;
    const ey=fy+r*.038;
    ellipseFill(fx-r*.43,fy+r*.21,r*.15,r*.083,skin.blush+'55');
    ellipseFill(fx+r*.43,fy+r*.21,r*.15,r*.083,skin.blush+'55');
    ctx.fillStyle=skin.face;
    const eyeHeight=r*(.105-smile*.058);
    for(let side of [-1,1]){
      const ex=fx+side*eyeSep;
      if(smile>.54){
        ctx.strokeStyle=skin.face;ctx.lineWidth=Math.max(2.5,r*.027);ctx.lineCap='round';ctx.beginPath();ctx.arc(ex,ey+r*.025,r*.063,Math.PI*1.12,Math.PI*1.88);ctx.stroke();
      }else{
        ellipseFill(ex,ey,r*.046,eyeHeight,skin.face);
        ellipseFill(ex-r*.015,ey-eyeHeight*.32,r*.014,r*.026,'rgba(255,255,255,.85)');
      }
    }
    ctx.lineCap='round';ctx.strokeStyle=skin.face;ctx.lineWidth=Math.max(2.2,r*.025);
    if(smile>.6){
      ellipseFill(fx,fy+r*.24,r*.07,r*.095,skin.face);
      ellipseFill(fx,fy+r*.28,r*.034,r*.025,'#e885a9');
    }else{
      ctx.beginPath();ctx.arc(fx,fy+r*.18,r*.095,.15,Math.PI-.15);ctx.stroke();
    }
    if(mode==='frog'){
      // Dos pecas minúsculas.
      for(const side of [-1,1])for(let j=0;j<2;j++)ellipseFill(fx+side*(r*.53+j*r*.045),fy+r*.08+j*4,r*.012,r*.012,'rgba(62,110,72,.32)');
    }
    ctx.restore(); // clip
    ctx.restore();
  }
  function drawParticles(dt){
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.11*dt;p.vx*=Math.pow(.992,dt);p.life-=.022*dt;p.rot+=.015*dt;
      if(p.life<=0){particles.splice(i,1);continue;}
      ctx.globalAlpha=clamp(p.life,0,1)*.85;
      if(p.kind==='heart')drawHeart(p.x,p.y,p.size,p.color);else drawSpark(p.x,p.y,p.size,p.color,p.rot);
    }
    ctx.globalAlpha=1;
  }
  function frame(now){
    const dt=clamp((now-prevFrame)/16.6667,.1,2.3);prevFrame=now;
    ctx.clearRect(0,0,w,h);
    if(releaseWobble>.01)releaseWobble*=Math.pow(.915,dt);else releaseWobble=0;
    drawBody(now,dt);
    drawParticles(dt);
    if(breathing){
      const seconds=(now-breathStart)/1000%10;
      const msg=seconds<4?'Inhala despacito...':'Suelta el aire...';
      if(msg!==breathDisplay){breathDisplay=msg;$('breathing-msg').textContent=msg;}
    }
    requestAnimationFrame(frame);
  }
  setSkin(skinId);
  setCanvasSize();
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{prevFrame=performance.now();});
  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
})();
