(() => {
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hpfill = document.getElementById('hpfill');
const weaponNameEl = document.getElementById('weaponName');
const messageEl = document.getElementById('message');
const DPR = Math.min(2, window.devicePixelRatio || 1);
let W=0,H=0;
function resize(){W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();

const world={w:1600,h:1100};
const camera={x:0,y:0};
const keys={};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key===' ') e.preventDefault()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

const weapons=[
 {name:'剣',range:82,color:'#f5f2e7'},
 {name:'槍',range:125,color:'#d9e7ef'},
 {name:'ハンマー',range:72,color:'#aaa'},
 {name:'赤杖',range:150,color:'#ff675d'},
 {name:'青杖',range:150,color:'#70c8ff'}
];
const player={x:800,y:580,r:28,speed:230,hp:100,maxHp:100,face:'down',aim:0,shield:false,jumpT:0,jumpDur:.62,jumpHeight:105,attacking:0,attackMax:.22,attackCooldown:0,charging:false,chargeStart:0,skillT:0,weapon:0,inv:0,walkPhase:0,moveMag:0};

const enemies=[];
function spawnEnemy(x,y,type='blob'){enemies.push({x,y,r:23,hp:type==='brute'?6:3,maxHp:type==='brute'?6:3,speed:type==='brute'?52:76,type,hit:0,attackCd:Math.random(),flash:0,dead:false})}
[[560,470],[1030,510],[880,760],[680,800],[1180,710],[420,700]].forEach((p,i)=>spawnEnemy(...p,i===4?'brute':'blob'));

const props={
 grass:[{x:470,y:350,dead:false},{x:525,y:365,dead:false},{x:575,y:340,dead:false},{x:1240,y:390,dead:false}],
 rocks:[{x:1110,y:845,dead:false},{x:1165,y:860,dead:false}],
 switches:[{x:1310,y:630,on:false}],
 water:{x:250,y:820,w:320,h:150,frozen:0}
};

const particles=[];
const projectiles=[];
function particle(x,y,text,color='#111',life=.55,size=20){particles.push({x,y,text,color,life,max:life,size})}
function say(t){messageEl.textContent=t;messageEl.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>messageEl.style.opacity=.0,1800)}
setTimeout(()=>messageEl.style.opacity=.0,2500);

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function angleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function faceFromVec(x,y){ if(Math.abs(x)>Math.abs(y)) return x>0?'right':'left'; return y>0?'down':'up'; }
function faceAngle(f){return ({right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2})[f]}

let stick={x:0,y:0,id:null};
const zone=document.getElementById('stickZone'), knob=document.getElementById('stickKnob');
function setStick(clientX,clientY){const r=zone.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=clientX-cx,dy=clientY-cy;const m=Math.hypot(dx,dy),max=44;if(m>max){dx=dx/m*max;dy=dy/m*max}stick.x=dx/max;stick.y=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`}
zone.addEventListener('pointerdown',e=>{stick.id=e.pointerId;zone.setPointerCapture(e.pointerId);setStick(e.clientX,e.clientY)});
zone.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)setStick(e.clientX,e.clientY)});
function stickEnd(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;knob.style.transform='translate(0,0)'}
zone.addEventListener('pointerup',stickEnd);zone.addEventListener('pointercancel',stickEnd);

const shieldBtn=document.getElementById('shieldBtn'), attackBtn=document.getElementById('attackBtn');
shieldBtn.addEventListener('pointerdown',e=>{e.preventDefault();player.shield=true;shieldBtn.classList.add('active')});
for(const ev of ['pointerup','pointercancel','pointerleave']) shieldBtn.addEventListener(ev,()=>{player.shield=false;shieldBtn.classList.remove('active')});

attackBtn.addEventListener('pointerdown',e=>{e.preventDefault();if(player.attackCooldown<=0){player.charging=true;player.chargeStart=performance.now()/1000;attackBtn.classList.add('active')}});
function releaseAttack(){if(!player.charging)return;let held=performance.now()/1000-player.chargeStart;player.charging=false;attackBtn.classList.remove('active');doAttack(held>.42)}
attackBtn.addEventListener('pointerup',releaseAttack);attackBtn.addEventListener('pointercancel',releaseAttack);attackBtn.addEventListener('pointerleave',releaseAttack);

document.getElementById('jumpBtn').addEventListener('pointerdown',()=>jump());
document.getElementById('skillBtn').addEventListener('pointerdown',()=>skill());
document.getElementById('changeBtn').addEventListener('pointerdown',()=>{player.weapon=(player.weapon+1)%weapons.length;weaponNameEl.textContent=weapons[player.weapon].name;say(`${weapons[player.weapon].name} にチェンジ`)});

function jump(){if(player.jumpT<=0){player.jumpT=player.jumpDur;player.shield=false;shieldBtn.classList.remove('active');particle(player.x,player.y+24,'バッ！','#111',.45,18)}}
function skill(){if(player.skillT>0||player.jumpT>0)return;player.skillT=.28;player.shield=false;const a=autoAim(faceAngle(player.face),Math.PI*.65,260);player.aim=a;particle(player.x,player.y,'スキル！','#7e20a6',.5,18)}

function autoAim(base,cone,maxDist){let best=null,bestScore=1e9;for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);if(d>maxDist)continue;const a=Math.atan2(e.y-player.y,e.x-player.x);const ad=Math.abs(angleDiff(a,base));if(ad>cone)continue;const score=d+ad*150;if(score<bestScore){bestScore=score;best=a}}return best??base}

function fireMagic(w,charged,base){
 const speed=charged?560:470, damage=charged?3:2, radius=charged?16:11;
 const start=38;
 projectiles.push({x:player.x+Math.cos(base)*start,y:player.y+Math.sin(base)*start,vx:Math.cos(base)*speed,vy:Math.sin(base)*speed,r:radius,life:1.05,kind:w===3?'fire':'ice',damage,charged,hit:false});
 particle(player.x+Math.cos(base)*42,player.y+Math.sin(base)*42,w===3?'ボッ！':'キン！',w===3?'#e43':'#268bc1',.3,15);
}

function doAttack(charged=false){
 if(player.attackCooldown>0)return;
 const w=player.weapon, wp=weapons[w];
 let range=wp.range*(charged?1.45:1);
 let base=autoAim(faceAngle(player.face),Math.PI*.58,w>=3?440:range+90);
 player.aim=base;player.attackMax=charged?.38:.24;player.attacking=player.attackMax;player.attackCooldown=charged?.55:.30;
 if(charged) particle(player.x,player.y-50,'チャージ！','#fff',.45,15);
 // 杖は完全な遠隔武器。近接判定は出さない。
 if(w>=3){fireMagic(w,charged,base);return;}
 let cone=w===1?.34:charged?1.65:1.05;
 for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);const a=Math.atan2(e.y-player.y,e.x-player.x);if(d<=range+e.r && Math.abs(angleDiff(a,base))<=cone/2){let dmg=w===2?(charged?5:3):(charged?3:1);e.hp-=dmg;e.flash=.14;particle(e.x,e.y-22,`-${dmg}`,'#b31313',.45,16);if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ボン！','#111',.55,18)}}}
 if(w===0){for(const g of props.grass){if(!g.dead && dist(player.x,player.y,g.x,g.y)<range+28){g.dead=true;particle(g.x,g.y,'ザシュ','#267524')}}}
 if(w===2){for(const r of props.rocks){if(!r.dead && dist(player.x,player.y,r.x,r.y)<range+35){r.dead=true;particle(r.x,r.y,'バキッ','#444')}}}
 if(w===1){for(const sw of props.switches){if(!sw.on && dist(player.x,player.y,sw.x,sw.y)<range+35){sw.on=true;particle(sw.x,sw.y,'カチッ','#111')}}}
}

function shieldBlocks(enemy){if(!player.shield||player.jumpT>0)return false;const incoming=Math.atan2(enemy.y-player.y,enemy.x-player.x);const facing=faceAngle(player.face);return Math.abs(angleDiff(incoming,facing))<Math.PI*.52;}

function update(dt){
 player.attackCooldown=Math.max(0,player.attackCooldown-dt);player.attacking=Math.max(0,player.attacking-dt);player.skillT=Math.max(0,player.skillT-dt);player.inv=Math.max(0,player.inv-dt);if(props.water.frozen>0)props.water.frozen=Math.max(0,props.water.frozen-dt);
 let mx=stick.x+(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0),my=stick.y+(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);let m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}
 player.moveMag=m; if(m>.16){player.face=faceFromVec(mx,my);if(!player.shield)player.aim=Math.atan2(my,mx);player.walkPhase+=dt*(9+Math.min(1,m)*4)}
 let speed=player.speed*(player.shield?.42:1);
 if(player.skillT>0){mx=Math.cos(player.aim)*2.5;my=Math.sin(player.aim)*2.5;speed=330;for(const e of enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<62){e.hp-=2;e.flash=.12;if(e.hp<=0)e.dead=true}}}
 player.x=clamp(player.x+mx*speed*dt,45,world.w-45);player.y=clamp(player.y+my*speed*dt,45,world.h-45);
 if(player.jumpT>0)player.jumpT=Math.max(0,player.jumpT-dt);
 if(player.shield&&player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+6*dt)}

 // magic projectiles
 for(const pr of projectiles){
   if(pr.hit)continue;pr.life-=dt;pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
   if(pr.life<=0||pr.x<0||pr.y<0||pr.x>world.w||pr.y>world.h){pr.hit=true;continue}
   if(pr.kind==='fire'){
     for(const g of props.grass){if(!g.dead&&dist(pr.x,pr.y,g.x,g.y)<pr.r+24){g.dead=true;particle(g.x,g.y,'ボワッ','#e43');pr.hit=true;break}}
   }else{
     const wa=props.water;if(pr.x>wa.x-pr.r&&pr.x<wa.x+wa.w+pr.r&&pr.y>wa.y-pr.r&&pr.y<wa.y+wa.h+pr.r){wa.frozen=5;particle(pr.x,pr.y,'カチッ','#167bad',.35,14);pr.hit=true}
   }
   if(pr.hit)continue;
   for(const e of enemies){if(e.dead)continue;if(dist(pr.x,pr.y,e.x,e.y)<pr.r+e.r){e.hp-=pr.damage;e.flash=.14;particle(e.x,e.y-22,`-${pr.damage}`,pr.kind==='fire'?'#b31313':'#176d9a',.45,16);if(pr.kind==='ice')e.attackCd+=.45;if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ボン！','#111',.55,18)}pr.hit=true;break}}
 }
 for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].hit)projectiles.splice(i,1);

 for(const e of enemies){if(e.dead)continue;e.attackCd-=dt;e.flash=Math.max(0,e.flash-dt);const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;if(d>58){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}else if(e.attackCd<=0){e.attackCd=e.type==='brute'?1.35:.9;if(player.jumpT>0){particle(player.x,player.y-55,'スカッ','#333',.35,14);continue}if(shieldBlocks(e)){particle((player.x+e.x)/2,(player.y+e.y)/2,'ガキン！','#111',.45,e.type==='brute'?24:19);e.x-=dx/d*18;e.y-=dy/d*18}else if(player.inv<=0){let dmg=e.type==='brute'?18:10;player.hp=Math.max(0,player.hp-dmg);player.inv=.65;particle(player.x,player.y-38,`-${dmg}`,'#c11',.5,18);if(player.hp<=0){player.hp=100;player.x=800;player.y=580;say('やられた！ でも試作なので即復活') }}}}
 for(const p of particles)p.life-=dt;while(particles.length&&particles[0].life<=0)particles.shift();
 hpfill.style.width=`${player.hp/player.maxHp*100}%`;
 camera.x=clamp(player.x-W/2,0,Math.max(0,world.w-W));camera.y=clamp(player.y-H/2,0,Math.max(0,world.h-H));
}

function line(x1,y1,x2,y2,w=5,color='#111'){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function circle(x,y,r,fill,stroke='#111',lw=5){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke()}
function roundRect(x,y,w,h,r,fill,stroke='#111',lw=5){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke()}

function drawWorld(){
 ctx.fillStyle='#98d483';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-camera.x,-camera.y);
 // ground patches
 ctx.fillStyle='#a9df92';for(let x=80;x<world.w;x+=150)for(let y=90;y<world.h;y+=140){ctx.beginPath();ctx.arc(x+(y%3)*8,y,34,0,7);ctx.fill()}
 // water
 const wa=props.water;ctx.fillStyle=wa.frozen>0?'#bfeeff':'#60bdea';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(wa.x,wa.y,wa.w,wa.h,28);ctx.fill();ctx.stroke();if(wa.frozen>0){ctx.strokeStyle='#fff';ctx.lineWidth=3;for(let i=0;i<5;i++)line(wa.x+30+i*55,wa.y+15,wa.x+70+i*45,wa.y+wa.h-15,3,'rgba(255,255,255,.8)')}
 // grass
 for(const g of props.grass){if(g.dead)continue;line(g.x-14,g.y+17,g.x,g.y-20,6,'#111');line(g.x,g.y+17,g.x+14,g.y-20,6,'#111');line(g.x,g.y+17,g.x,g.y-25,6,'#111');line(g.x-14,g.y+17,g.x,g.y-20,3,'#35a544');line(g.x,g.y+17,g.x+14,g.y-20,3,'#35a544');line(g.x,g.y+17,g.x,g.y-25,3,'#35a544')}
 // rocks
 for(const r of props.rocks){if(r.dead)continue;ctx.fillStyle='#999';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(r.x-30,r.y+18);ctx.lineTo(r.x-23,r.y-22);ctx.lineTo(r.x+5,r.y-34);ctx.lineTo(r.x+31,r.y-10);ctx.lineTo(r.x+24,r.y+24);ctx.closePath();ctx.fill();ctx.stroke()}
 for(const s of props.switches){circle(s.x,s.y,24,s.on?'#7cff78':'#ffdb55','#111',6);circle(s.x,s.y,9,'#fff','#111',4)}
 for(const pr of projectiles)drawProjectile(pr);
 for(const e of enemies)if(!e.dead)drawEnemy(e);
 drawPlayer();
 for(const p of particles)if(p.life>0){ctx.save();ctx.globalAlpha=Math.min(1,p.life/.18);ctx.fillStyle=p.color;ctx.font=`900 ${p.size}px system-ui`;ctx.textAlign='center';ctx.strokeStyle='white';ctx.lineWidth=4;ctx.strokeText(p.text,p.x,p.y-(1-p.life/p.max)*25);ctx.fillText(p.text,p.x,p.y-(1-p.life/p.max)*25);ctx.restore()}
 ctx.restore();
}
function drawProjectile(pr){ctx.save();ctx.translate(pr.x,pr.y);const a=Math.atan2(pr.vy,pr.vx);ctx.rotate(a);ctx.globalAlpha=.28;circle(0,0,pr.r+9,pr.kind==='fire'?'#ff9b45':'#b8ecff','transparent',0);ctx.globalAlpha=1;circle(0,0,pr.r,pr.kind==='fire'?'#ff6247':'#63d7ff','#111',4);line(-pr.r-12,0,-pr.r+1,0,7,pr.kind==='fire'?'#ffcf58':'#eafcff');ctx.restore()}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;circle(0,0,e.r,e.type==='brute'?'#e7685d':'#e991d1','#111',6);circle(-8,-4,3,'#111','#111',1);circle(8,-4,3,'#111','#111',1);line(-9,9,9,9,4,'#111');ctx.restore()}

function drawPlayer(){
 const jumpNorm=player.jumpT>0?1-player.jumpT/player.jumpDur:0;
 const lift=player.jumpT>0?Math.sin(jumpNorm*Math.PI)*player.jumpHeight:0;
 const moving=player.moveMag>.16&&player.jumpT<=0;
 const step=moving?Math.sin(player.walkPhase):0;
 const bounce=moving?Math.abs(Math.sin(player.walkPhase))*2:0;
 ctx.save();ctx.translate(player.x,player.y-lift-bounce);
 // shadow stays on the ground
 ctx.save();ctx.translate(0,lift+bounce);ctx.globalAlpha=.20;ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(0,37,28*(1-lift/235),11*(1-lift/235),0,0,7);ctx.fill();ctx.restore();
 const f=player.face,a=faceAngle(f),rightX=Math.cos(a+Math.PI/2),rightY=Math.sin(a+Math.PI/2),frontX=Math.cos(a),frontY=Math.sin(a);
 // 2頭身寄り：頭は画面に対して常に直立。足だけ歩行で前後に動く。
 const legSwing=step*7;
 const side=f==='left'||f==='right';
 let foot1={x:-9,y:31+legSwing*.25},foot2={x:9,y:31-legSwing*.25};
 if(side){foot1={x:-legSwing*.45,y:31};foot2={x:legSwing*.45,y:31}}
 // boots behind body
 line(-7,19,foot1.x,foot1.y,11,'#111');line(-7,19,foot1.x,foot1.y,6,'#7a4a2e');
 line(7,19,foot2.x,foot2.y,11,'#111');line(7,19,foot2.x,foot2.y,6,'#7a4a2e');
 // tunic/body
 roundRect(-18,-1,36,27,10,'#2d78c4','#111',6);
 ctx.fillStyle='#f1c84b';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-18,15);ctx.lineTo(18,15);ctx.lineTo(14,25);ctx.lineTo(-14,25);ctx.closePath();ctx.fill();ctx.stroke();
 line(-14,12,14,12,5,'#6e432b');circle(0,12,4,'#f2c14e','#111',2);
 // head and ears, light-blue fur + white muzzle/cheeks
 ctx.fillStyle='#82dcf4';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-20,-8);ctx.lineTo(-17,-36);ctx.lineTo(-5,-24);ctx.quadraticCurveTo(0,-28,5,-24);ctx.lineTo(17,-36);ctx.lineTo(20,-8);ctx.quadraticCurveTo(19,8,0,10);ctx.quadraticCurveTo(-19,8,-20,-8);ctx.closePath();ctx.fill();ctx.stroke();
 // ear inner color
 ctx.fillStyle='#f3a9b7';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-14,-30);ctx.lineTo(-8,-22);ctx.lineTo(-15,-18);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(14,-30);ctx.lineTo(8,-22);ctx.lineTo(15,-18);ctx.closePath();ctx.fill();ctx.stroke();
 if(f==='down'){
   circle(-8,-9,3,'#111','#111',1);circle(8,-9,3,'#111','#111',1);
   ctx.fillStyle='#f7fbff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,1,12,9,0,0,7);ctx.fill();ctx.stroke();circle(0,-2,3.5,'#111','#111',1);
 }else if(f==='up'){
   line(-11,-7,11,-7,4,'#4ca5bf');
 }else{
   circle(f==='right'?8:-8,-9,3,'#111','#111',1);ctx.fillStyle='#f7fbff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f==='right'?10:-10,0,9,7,0,0,7);ctx.fill();ctx.stroke();circle(f==='right'?15:-15,-1,3,'#111','#111',1);
 }
 // arms. character-right always weapon, character-left always shield.
 const handR={x:rightX*23+frontX*5,y:rightY*19+frontY*5+3};
 const handL={x:-rightX*23+frontX*5,y:-rightY*19+frontY*5+3};
 line(rightX*8,5,handR.x,handR.y,10,'#111');line(rightX*8,5,handR.x,handR.y,5,'#82dcf4');
 line(-rightX*8,5,handL.x,handL.y,10,'#111');line(-rightX*8,5,handL.x,handL.y,5,'#82dcf4');
 // actual weapon motion
 let wa=a,thrust=0;
 if(player.attacking>0){const t=1-player.attacking/player.attackMax;if(player.weapon===1){wa=player.aim;thrust=Math.sin(t*Math.PI)*20}else if(player.weapon===2){wa=player.aim-1.15+t*2.25}else if(player.weapon>=3){wa=player.aim;thrust=Math.sin(t*Math.PI)*7}else{wa=player.aim-.95+t*1.9}}
 drawWeapon(handR.x,handR.y,wa,thrust);
 drawShield(handL.x,handL.y,a,player.shield);
 if(player.attacking>0&&player.weapon<3)drawAttackArc(player.aim);
 if(player.charging){ctx.strokeStyle='#ffe551';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-5,43,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
function drawWeapon(hx,hy,a,ext=0){const w=player.weapon;ctx.save();ctx.translate(hx+Math.cos(a)*ext,hy+Math.sin(a)*ext);ctx.rotate(a);ctx.lineCap='round';if(w===0){line(0,0,45,0,11,'#111');line(0,0,45,0,5,'#eef5fa');line(5,-11,5,11,7,'#111');line(5,-7,5,7,3,'#d8a93d')}
 else if(w===1){line(-3,0,62,0,9,'#111');line(-3,0,62,0,4,'#b9783d');ctx.fillStyle='#e8eef2';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(62,-10);ctx.lineTo(82,0);ctx.lineTo(62,10);ctx.closePath();ctx.fill();ctx.stroke()}
 else if(w===2){line(0,0,38,0,11,'#111');line(0,0,38,0,5,'#8b5c3b');roundRect(29,-17,34,34,7,'#9ea6ad','#111',6)}
 else {line(-2,0,45,0,10,'#111');line(-2,0,45,0,5,'#6d3e2a');circle(50,0,11,w===3?'#ff5a4f':'#69c9ff','#111',5);circle(50,0,4,'#fff','#111',2)}ctx.restore()}
function drawShield(hx,hy,a,raised){ctx.save();ctx.translate(hx,hy);ctx.rotate(a);const x=raised?26:10,sz=raised?1:0.78;ctx.scale(sz,sz);ctx.fillStyle='#d7e3ea';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x,-31);ctx.quadraticCurveTo(x+31,-28,x+31,0);ctx.quadraticCurveTo(x+27,30,x,39);ctx.quadraticCurveTo(x-27,30,x-31,0);ctx.quadraticCurveTo(x-31,-28,x,-31);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#4f90bd';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,-22);ctx.quadraticCurveTo(x+21,-18,x+21,0);ctx.quadraticCurveTo(x+17,20,x,28);ctx.quadraticCurveTo(x-17,20,x-21,0);ctx.quadraticCurveTo(x-21,-18,x,-22);ctx.stroke();circle(x,0,7,'#f0c94d','#111',4);ctx.restore()}
function drawAttackArc(a){const w=player.weapon,r=weapons[w].range;ctx.save();ctx.rotate(a);ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=w===2?19:11;ctx.lineCap='round';ctx.beginPath();const span=w===1?.45:1.15;ctx.arc(0,0,r*.76,-span/2,span/2);ctx.stroke();ctx.restore()}

let last=performance.now();function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);drawWorld();requestAnimationFrame(loop)}requestAnimationFrame(loop);

// keyboard fallback
addEventListener('keydown',e=>{if(e.repeat)return;const k=e.key.toLowerCase();if(k==='j')player.shield=true;if(k==='k')doAttack(false);if(k==='l')jump();if(k==='i')skill();if(k==='q'){player.weapon=(player.weapon+1)%weapons.length;weaponNameEl.textContent=weapons[player.weapon].name}});
addEventListener('keyup',e=>{if(e.key.toLowerCase()==='j')player.shield=false});
})();
