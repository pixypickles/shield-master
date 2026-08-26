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
const player={x:800,y:580,r:28,speed:230,hp:100,maxHp:100,face:'down',aim:0,shield:false,jumpT:0,jumpDur:.62,jumpHeight:95,attacking:0,attackCooldown:0,charging:false,chargeStart:0,skillT:0,weapon:0,inv:0};

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

function doAttack(charged=false){if(player.attackCooldown>0)return;const w=player.weapon, wp=weapons[w];let cone=w===1?.34:w>=3?.26:charged?1.65:1.05;let range=wp.range*(charged?1.45:1);let base=autoAim(faceAngle(player.face),Math.PI*.55,range+80);player.aim=base;player.attacking=charged?.34:.22;player.attackCooldown=charged?.55:.30;
 if(charged) particle(player.x,player.y-24,'チャージ！','#fff',.45,15);
 for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);const a=Math.atan2(e.y-player.y,e.x-player.x);if(d<=range+e.r && Math.abs(angleDiff(a,base))<=cone/2){let dmg=w===2?(charged?5:3):(charged?3:1);e.hp-=dmg;e.flash=.14;particle(e.x,e.y-22,`-${dmg}`,'#b31313',.45,16);if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ボン！','#111',.55,18)}}}
 // field interactions
 if(w===0){for(const g of props.grass){if(!g.dead && dist(player.x,player.y,g.x,g.y)<range+28){g.dead=true;particle(g.x,g.y,'ザシュ','#267524')}}}
 if(w===2){for(const r of props.rocks){if(!r.dead && dist(player.x,player.y,r.x,r.y)<range+35){r.dead=true;particle(r.x,r.y,'バキッ','#444')}}}
 if(w===1){for(const s of props.switches){if(!s.on && dist(player.x,player.y,s.x,s.y)<range+35){s.on=true;particle(s.x,s.y,'カチッ','#111')}}}
 if(w===3){for(const g of props.grass){if(!g.dead && dist(player.x,player.y,g.x,g.y)<range+35){g.dead=true;particle(g.x,g.y,'ボワッ','#e43')}}props.water.frozen=0}
 if(w===4){const wx=props.water.x,wy=props.water.y,ww=props.water.w,wh=props.water.h;if(player.x>wx-160&&player.x<wx+ww+160&&player.y>wy-160&&player.y<wy+wh+160){props.water.frozen=5;particle(player.x,player.y-28,'カチコチ！','#167bad')}}
}

function shieldBlocks(enemy){if(!player.shield||player.jumpT>0)return false;const incoming=Math.atan2(enemy.y-player.y,enemy.x-player.x);const facing=faceAngle(player.face);return Math.abs(angleDiff(incoming,facing))<Math.PI*.52;}

function update(dt){
 player.attackCooldown=Math.max(0,player.attackCooldown-dt);player.attacking=Math.max(0,player.attacking-dt);player.skillT=Math.max(0,player.skillT-dt);player.inv=Math.max(0,player.inv-dt);if(props.water.frozen>0)props.water.frozen=Math.max(0,props.water.frozen-dt);
 let mx=stick.x+(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0),my=stick.y+(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);let m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}
 if(m>.16){player.face=faceFromVec(mx,my);if(!player.shield)player.aim=Math.atan2(my,mx)}
 let speed=player.speed*(player.shield?.42:1);
 if(player.skillT>0){mx=Math.cos(player.aim)*2.5;my=Math.sin(player.aim)*2.5;speed=330;for(const e of enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<62){e.hp-=2;e.flash=.12;if(e.hp<=0)e.dead=true}}}
 player.x=clamp(player.x+mx*speed*dt,45,world.w-45);player.y=clamp(player.y+my*speed*dt,45,world.h-45);
 if(player.jumpT>0)player.jumpT=Math.max(0,player.jumpT-dt);
 if(player.shield&&player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+6*dt)}

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
 for(const e of enemies)if(!e.dead)drawEnemy(e);
 drawPlayer();
 for(const p of particles)if(p.life>0){ctx.save();ctx.globalAlpha=Math.min(1,p.life/.18);ctx.fillStyle=p.color;ctx.font=`900 ${p.size}px system-ui`;ctx.textAlign='center';ctx.strokeStyle='white';ctx.lineWidth=4;ctx.strokeText(p.text,p.x,p.y-(1-p.life/p.max)*25);ctx.fillText(p.text,p.x,p.y-(1-p.life/p.max)*25);ctx.restore()}
 ctx.restore();
}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;circle(0,0,e.r,e.type==='brute'?'#e7685d':'#e991d1','#111',6);circle(-8,-4,3,'#111','#111',1);circle(8,-4,3,'#111','#111',1);line(-9,9,9,9,4,'#111');ctx.restore()}

function drawPlayer(){
 const jumpNorm=player.jumpT>0?1-player.jumpT/player.jumpDur:0;const lift=player.jumpT>0?Math.sin(jumpNorm*Math.PI)*player.jumpHeight:0;ctx.save();ctx.translate(player.x,player.y-lift);const bob=player.jumpT>0?1:0;
 // shadow at ground
 ctx.save();ctx.translate(0,lift);ctx.globalAlpha=.22;ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(0,26,27*(1-lift/220),12*(1-lift/220),0,0,7);ctx.fill();ctx.restore();
 const f=player.face;const a=faceAngle(f);const rightX=Math.cos(a+Math.PI/2),rightY=Math.sin(a+Math.PI/2);const frontX=Math.cos(a),frontY=Math.sin(a);
 // body fox
 circle(0,5,24,'#82dcf4','#111',6);
 // head/ears depend on facing but head stays upright on screen
 ctx.fillStyle='#82dcf4';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-18,-13);ctx.lineTo(-14,-38);ctx.lineTo(-2,-20);ctx.lineTo(14,-38);ctx.lineTo(18,-12);ctx.closePath();ctx.fill();ctx.stroke();
 if(f==='down'){circle(-8,-6,3,'#111','#111',1);circle(8,-6,3,'#111','#111',1);ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,5,10,8,0,0,7);ctx.fill();ctx.stroke();circle(0,2,3,'#111','#111',1)}
 else if(f==='up'){line(-10,-2,10,-2,4,'#4a9fb8')}
 else {circle(f==='right'?7:-7,-5,3,'#111','#111',1);ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f==='right'?10:-10,5,9,7,0,0,7);ctx.fill();ctx.stroke()}
 // arms: character-right hand carries weapon, character-left carries shield
 const handR={x:rightX*20+frontX*5,y:rightY*20+frontY*5};const handL={x:-rightX*20+frontX*5,y:-rightY*20+frontY*5};
 line(0,4,handR.x,handR.y,8,'#111');line(0,4,handR.x,handR.y,4,'#82dcf4');
 line(0,4,handL.x,handL.y,8,'#111');line(0,4,handL.x,handL.y,4,'#82dcf4');
 // weapon follows aim while still anchored to right hand
 let wa=player.attacking>0?player.aim:a;drawWeapon(handR.x,handR.y,wa);
 // shield on left hand, large when raised
 drawShield(handL.x,handL.y,a,player.shield);
 if(player.attacking>0)drawAttackArc(wa);
 if(player.charging){ctx.strokeStyle='#ffe551';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,2,38,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
function drawWeapon(hx,hy,a){const w=player.weapon;ctx.save();ctx.translate(hx,hy);ctx.rotate(a);ctx.lineCap='round';if(w===0){line(0,0,42,0,10,'#111');line(0,0,42,0,5,'#f8f8ee');line(4,-10,4,10,7,'#111')}
 else if(w===1){line(-2,0,58,0,8,'#111');line(-2,0,58,0,4,'#d9ab61');ctx.fillStyle='#e8eef2';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(58,-9);ctx.lineTo(78,0);ctx.lineTo(58,9);ctx.closePath();ctx.fill();ctx.stroke()}
 else if(w===2){line(0,0,35,0,10,'#111');line(0,0,35,0,5,'#8b5c3b');roundRect(29,-15,30,30,7,'#9a9a9a','#111',6)}
 else {line(0,0,42,0,9,'#111');line(0,0,42,0,4,'#74442e');circle(48,0,10,w===3?'#ff5a4f':'#69c9ff','#111',5)}ctx.restore()}
function drawShield(hx,hy,a,raised){ctx.save();ctx.translate(hx,hy);ctx.rotate(a);const x=raised?22:10;ctx.fillStyle='#77c7ff';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,raised?-28:-20);ctx.arc(x,0,raised?30:22,-Math.PI/2,Math.PI/2);ctx.lineTo(x,raised?-28:-20);ctx.fill();ctx.stroke();ctx.restore()}
function drawAttackArc(a){const w=player.weapon;const r=weapons[w].range;ctx.save();ctx.rotate(a);ctx.strokeStyle=w===3?'rgba(255,80,40,.75)':w===4?'rgba(60,180,255,.75)':'rgba(255,255,255,.8)';ctx.lineWidth=w===2?20:12;ctx.lineCap='round';ctx.beginPath();const span=w===1?.3:1.05;ctx.arc(0,0,r*.75,-span/2,span/2);ctx.stroke();ctx.restore()}

let last=performance.now();function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);drawWorld();requestAnimationFrame(loop)}requestAnimationFrame(loop);

// keyboard fallback
addEventListener('keydown',e=>{if(e.repeat)return;const k=e.key.toLowerCase();if(k==='j')player.shield=true;if(k==='k')doAttack(false);if(k==='l')jump();if(k==='i')skill();if(k==='q'){player.weapon=(player.weapon+1)%weapons.length;weaponNameEl.textContent=weapons[player.weapon].name}});
addEventListener('keyup',e=>{if(e.key.toLowerCase()==='j')player.shield=false});
})();
