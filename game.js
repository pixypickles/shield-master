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

const world={w:11800,h:1100};
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
const player={x:230,y:545,r:28,speed:230,hp:100,maxHp:100,fallGrace:0,face:'down',aim:0,shield:false,jumpT:0,jumpDur:.62,jumpHeight:105,attacking:0,spin:0,spinT:0,attackMax:.22,attackCooldown:0,charging:false,chargeStart:0,skillT:0,skillElapsed:0,skillBase:0,skillSide:1,skillHit:new Set(),skillKind:'',skillPhase:0,skillZ:0,hammerSpin:0,fireTrail:[],iceTrail:[],spiral:0,spiralA:0,hammerSmash:0,hammerSmashT:0,weapon:0,shieldType:0,inv:0,walkPhase:0,moveMag:0,dashT:0,dashAuto:false,dashDir:0,dashAttack:false,dashShieldHit:new Set(),shieldStepT:0,shieldStepDir:0};

// Prototype 53: 最初の浮遊草原ステージ
const stage={
 id:1,
 bossDefeated:false,
 bridgeOpen:false,
 goalUnlocked:false,
 bossStarted:false,
 bossHp:18,
 bossMaxHp:18,
 checkpoint:{x:250,y:545},
 messageStep:0
};

// 最初は剣と基本盾のみ。
// 今後ここへ槍・ハンマー・杖、各種盾をアンロックしていく。
const unlockedWeapons=[true,false,false,false,false];
const shields=[
 {name:'勇者の盾',heal:6,move:1,jump:1,magic:false,reflect:false},
 {name:'生命の盾',heal:11,move:.96,jump:1,magic:false,reflect:false},
 {name:'ミラーシールド',heal:5,move:1,jump:1,magic:false,reflect:true},
 {name:'マジックシールド',heal:4,move:.92,jump:1,magic:true,reflect:false},
 {name:'ウイングシールド',heal:5,move:1.12,jump:1.25,magic:false,reflect:false}
];
const unlockedShields=[true,false,false,false,false];


const enemies=[];
function spawnEnemy(x,y,type='grass'){
 const flower=type==='flower';
 const hp=flower?2:1;
 enemies.push({x,y,r:flower?24:22,hp,maxHp:hp,speed:flower?58:74,type,hit:0,attackCd:Math.random()*.8+.3,flash:0,stagger:0,dead:false});
}
[[520,520],[760,470],[980,610],[1190,500],[1290,625]].forEach((p,i)=>spawnEnemy(...p,i===1||i===3?'flower':'grass'));


const boss={
 x:1540,y:590,r:72,hp:26,maxHp:26,active:false,dead:false,
 speed:46,attackCd:1.05,flash:0,phase:0
};

const props={
 grass:[{x:470,y:350,dead:false},{x:525,y:365,dead:false},{x:575,y:340,dead:false},{x:1240,y:390,dead:false}],
 rocks:[{x:1110,y:655,dead:false},{x:1165,y:670,dead:false}],
 water:{x:260,y:590,w:300,h:105,frozen:0},
 smallTrees:[
  {x:850,y:390,dead:false},{x:850,y:455,dead:false},{x:850,y:520,dead:false},
  {x:850,y:585,dead:false},{x:850,y:650,dead:false}
 ]
};

const stageGeo={
 // ステージ1：一枚の読みやすい浮遊草原。
 path:[
   {x:70,y:330,w:1680,h:400}
 ],
 bossArena:{x:1370,y:350,w:380,h:380},
 nextIsland:{x:1810,y:450,w:150,h:280},
 bridge:{x1:1735,y1:570,x2:1905,y2:570}
};

const stage2Geo={
 // 第2島：種を飛ばす植物が中心。まだ剣だけで進む。
 path:[
  {x:1900,y:350,w:470,h:390},
  {x:2310,y:405,w:350,h:285},
  {x:2590,y:340,w:450,h:410},
  {x:2960,y:390,w:420,h:340}
 ],
 arena:{x:2940,y:360,w:460,h:390},
 bridge:{x1:3370,y1:575,x2:3470,y2:575}
};
const stage2Enemies=[];
function spawnStage2Enemy(x,y,type='seedpod'){
 stage2Enemies.push({
  x,y,type,
  // 見た目の花びらまで含めて、少し大きめの当たり判定。
  r:type==='seedflower'?38:32,
  hp:type==='seedflower'?3:2,maxHp:type==='seedflower'?3:2,
  attackCd:.8+Math.random()*.7,flash:0,dead:false
 });
}
[[2100,520,'seedpod'],[2390,505,'seedflower'],[2710,600,'seedpod'],[2820,455,'seedflower']].forEach(v=>spawnStage2Enemy(...v));

const seedBoss={
 x:3180,y:555,r:82,hp:24,maxHp:24,active:false,dead:false,
 attackCd:.8,flash:0,phase:0
};

const stage3Geo={
 // 第3島：木の実が増え、ここで槍を入手。
 path:[
  {x:3480,y:360,w:470,h:390},
  {x:3890,y:410,w:350,h:290},
  {x:4170,y:340,w:470,h:410},
  {x:4540,y:390,w:240,h:330}
 ],
 arena:{x:4430,y:350,w:340,h:420}
};
const stage3Enemies=[];
function spawnStage3Enemy(x,y,type='acorn'){
 stage3Enemies.push({x,y,type,r:type==='walnut'?30:23,hp:type==='walnut'?4:1,maxHp:type==='walnut'?4:1,
 speed:type==='walnut'?45:68,attackCd:.5+Math.random(),flash:0,dead:false,open:0});
}
[[3670,530,'acorn'],[3980,510,'flower'],[4250,570,'walnut'],[4510,500,'acorn'],[4630,610,'walnut']].forEach(v=>spawnStage3Enemy(...v));


const stage4Geo={
 // ステージ4：槍を持って進むツル草原
 path:[
  {x:4950,y:350,w:500,h:390},
  {x:5380,y:400,w:360,h:300},
  {x:5680,y:330,w:480,h:410}
 ],
 bridge:{x1:6130,y1:570,x2:6250,y2:570}
};
const stage4Enemies=[
 {x:5150,y:520,r:25,hp:1,maxHp:1,type:'vine',speed:55,attackCd:.5,flash:0,dead:false},
 {x:5480,y:500,r:25,hp:1,maxHp:1,type:'vine',speed:55,attackCd:.7,flash:0,dead:false},
 {x:5860,y:590,r:27,hp:2,maxHp:2,type:'thorn',speed:48,attackCd:.8,flash:0,dead:false},
 {x:6020,y:470,r:27,hp:2,maxHp:2,type:'thorn',speed:48,attackCd:.9,flash:0,dead:false}
];

const stage5Geo={
 // ステージ5：草原エリアの最終広場
 path:[
  {x:6260,y:320,w:600,h:430},
  {x:6780,y:370,w:420,h:340},
  {x:7140,y:300,w:650,h:470}
 ],
 arena:{x:7140,y:300,w:650,h:470}
};
const grassFinalBoss={
 x:7530,y:545,r:88,hp:40,maxHp:40,active:false,dead:false,
 attackCd:.8,flash:0,phase:0
};

// 草原エリアを抜けた先の「風の庭園」。
// 次の本格エリアへの導入ステージ。広めの島＋風を使う植物。
const stage6Geo={
 path:[
  {x:8060,y:330,w:560,h:420},
  {x:8500,y:390,w:390,h:310},
  {x:8790,y:300,w:650,h:470}
 ],
 bridge:{x1:7790,y1:550,x2:8060,y2:550}
};
const stage6Enemies=[
 {x:8250,y:510,r:24,hp:1,maxHp:1,type:'dandelion',attackCd:.6,flash:0,dead:false},
 {x:8550,y:590,r:24,hp:1,maxHp:1,type:'dandelion',attackCd:1.0,flash:0,dead:false},
 {x:8950,y:470,r:27,hp:2,maxHp:2,type:'fanleaf',attackCd:.7,flash:0,dead:false},
 {x:9180,y:610,r:27,hp:2,maxHp:2,type:'fanleaf',attackCd:1.1,flash:0,dead:false}
];

// ステージ7：岩だらけの分かれ道。
// 左右どちらからでも奥へ進めるが、岩が多くて槍だけでは回り道気味。
// 奥でハンマーを入手し、その直後に岩＆クルミボス戦。
const stage7Geo={
 path:[
  {x:9580,y:300,w:620,h:480},          // 分岐入口
  {x:10120,y:300,w:500,h:190},         // 上ルート
  {x:10120,y:590,w:500,h:190},         // 下ルート
  {x:10530,y:300,w:560,h:480},         // 合流エリア
  {x:11010,y:330,w:700,h:430}          // ボス広場
 ],
 bridge:{x1:9435,y1:545,x2:9580,y2:545}
};

const stage7Rocks=[
 {x:9880,y:405,r:34,dead:false},{x:9970,y:485,r:34,dead:false},
 {x:10040,y:640,r:34,dead:false},{x:10190,y:390,r:34,dead:false},
 {x:10350,y:675,r:34,dead:false},{x:10680,y:465,r:38,dead:false},
 {x:10780,y:610,r:38,dead:false}
];

let hammerPickup={x:10860,y:540,taken:false};

const rockBoss={
 x:11420,y:545,r:82,hp:44,maxHp:44,active:false,dead:false,
 attackCd:1.15,spawnCd:2.8,flash:0,phase:0
};

const rollingRocks=[];
const bossWalnuts=[];






const guardRails=[
 // stage1: rocks / low trees along portions of cliff
 {x:180,y:340,w:260,h:24,type:'rock'},{x:1020,y:340,w:250,h:24,type:'bush'},
 {x:300,y:690,w:260,h:24,type:'bush'},{x:1050,y:690,w:230,h:24,type:'rock'},
 // stage2
 {x:1990,y:360,w:230,h:22,type:'bush'},{x:2640,y:710,w:250,h:22,type:'rock'},
 // stage3
 {x:3540,y:370,w:210,h:22,type:'rock'},{x:4210,y:710,w:210,h:22,type:'bush'},
 // stage4
 {x:5020,y:360,w:220,h:22,type:'bush'},{x:5720,y:700,w:230,h:22,type:'rock'},
 // stage5
 {x:6350,y:330,w:260,h:22,type:'rock'},{x:7240,y:730,w:260,h:22,type:'bush'}
];

const healDrops=[];
const buffDrops=[];
const areaFruitDropped={1:false,2:false,3:false,4:false,5:false};
let powerFruitT=0,guardFruitT=0;
const particles=[];
const projectiles=[];
function particle(x,y,text,color='#111',life=.55,size=20){particles.push({x,y,text,color,life,max:life,size})}
function say(t){messageEl.textContent=t;messageEl.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>messageEl.style.opacity=.0,1800)}
setTimeout(()=>messageEl.style.opacity=.0,2500);


function visibleGroundRects(){
 const grounds=[...stageGeo.path];
 if(stage.bridgeOpen){grounds.push(stageGeo.nextIsland,...stage2Geo.path)}
 if(stage2BridgeOpen)grounds.push(...stage3Geo.path);
 if(stage3BridgeOpen)grounds.push(...stage4Geo.path);
 if(stage4BridgeOpen)grounds.push(...stage5Geo.path);
 if(grassAreaClear){
   grounds.push(...stage6Geo.path);
   // ひまわり撃破後の虹の橋
   grounds.push({
     x:Math.min(stage6Geo.bridge.x1,stage6Geo.bridge.x2)-20,
     y:stage6Geo.bridge.y1-82,
     w:Math.abs(stage6Geo.bridge.x2-stage6Geo.bridge.x1)+40,
     h:164
   });
 }
 if(stage6Started){
   // 風の庭園→岩の分かれ道の虹も、見た目だけでなく実際の地面にする。
   // stage7Startedになる前から橋を渡れる必要がある。
   grounds.push({
     x:Math.min(stage7Geo.bridge.x1,stage7Geo.bridge.x2)-28,
     y:stage7Geo.bridge.y1-86,
     w:Math.abs(stage7Geo.bridge.x2-stage7Geo.bridge.x1)+56,
     h:172
   });
   // 橋の出口側の島も、stage7Startedになる前から地面判定を有効にする。
   grounds.push(stage7Geo.path[0]);
 }
 if(stage7Started)grounds.push(...stage7Geo.path);
 return grounds;
}
function pointSupportedByGround(x,y,pad=24){
 return visibleGroundRects().some(r=>{
   const cx=clamp(x,r.x,r.x+r.w),cy=clamp(y,r.y,r.y+r.h);
   const dx=x-cx,dy=y-cy;
   return dx*dx+dy*dy<=pad*pad;
 });
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function angleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function faceFromVec(x,y){ if(Math.abs(x)>Math.abs(y)) return x>0?'right':'left'; return y>0?'down':'up'; }
function faceAngle(f){return ({right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2})[f]}

let stick={x:0,y:0,id:null};
const zone=document.getElementById('stickZone'), knob=document.getElementById('stickKnob');
let lastFlickTime=0,lastFlickDir=null,stickWasNeutral=true;
function setStick(clientX,clientY){
 const r=zone.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=clientX-cx,dy=clientY-cy;
 const m=Math.hypot(dx,dy),max=44;if(m>max){dx=dx/m*max;dy=dy/m*max}
 stick.x=dx/max;stick.y=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`;
 const mag=Math.hypot(stick.x,stick.y);
 if(mag>.72&&stickWasNeutral){
  const a=Math.atan2(stick.y,stick.x),dir=Math.round(a/(Math.PI/2)),now=performance.now();
  if(lastFlickDir===dir&&now-lastFlickTime<330&&player.skillT<=0){
   // 方向2回入力は、通常時も盾中も「大きく速いステップ」。
   // オートランは廃止。入力方向へ一気に踏み込み、短時間で止まる。
   player.shieldStepT=player.shield?.30:.28;
   player.shieldStepDir=a;
   player.dashAuto=false;
   player.dashT=0;
   player.dashAttack=false;
   player.dashShieldHit=new Set();
   particle(player.x,player.y+20,player.shield?'ガードステップ！':'ステップ！','#fff',.22,13);
   lastFlickTime=0;lastFlickDir=null;
  }else{lastFlickTime=now;lastFlickDir=dir}
  stickWasNeutral=false;
 }else if(mag<.22)stickWasNeutral=true;
}
zone.addEventListener('pointerdown',e=>{stick.id=e.pointerId;zone.setPointerCapture(e.pointerId);setStick(e.clientX,e.clientY)});
zone.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)setStick(e.clientX,e.clientY)});
function stickEnd(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;stickWasNeutral=true;knob.style.transform='translate(0,0)'}
zone.addEventListener('pointerup',stickEnd);zone.addEventListener('pointercancel',stickEnd);

const shieldBtn=document.getElementById('shieldBtn'), attackBtn=document.getElementById('attackBtn');
shieldBtn.addEventListener('pointerdown',e=>{e.preventDefault();player.shield=true;player.dashShieldHit=new Set();shieldBtn.classList.add('active')});
for(const ev of ['pointerup','pointercancel','pointerleave']) shieldBtn.addEventListener(ev,()=>{player.shield=false;shieldBtn.classList.remove('active')});

attackBtn.addEventListener('pointerdown',e=>{e.preventDefault();if(player.attackCooldown<=0){player.charging=true;player.chargeStart=performance.now()/1000;attackBtn.classList.add('active')}});
function releaseAttack(){if(!player.charging)return;let held=performance.now()/1000-player.chargeStart;player.charging=false;attackBtn.classList.remove('active');doAttack(held>.42)}
attackBtn.addEventListener('pointerup',releaseAttack);attackBtn.addEventListener('pointercancel',releaseAttack);attackBtn.addEventListener('pointerleave',releaseAttack);

document.getElementById('jumpBtn').addEventListener('pointerdown',()=>jump());
document.getElementById('skillBtn').addEventListener('pointerdown',()=>skill());
document.getElementById('changeBtn').addEventListener('pointerdown',()=>openEquipPanel());


const equipPanel=document.getElementById('equipPanel');
const equipItems=document.getElementById('equipItems');
let equipMode='weapon';

function openEquipPanel(){
 equipPanel.classList.remove('hidden');
 renderEquipPanel();
}
function closeEquipPanel(){equipPanel.classList.add('hidden')}
function renderEquipPanel(){
 equipItems.innerHTML='';
 document.getElementById('equipWeaponTab').classList.toggle('active',equipMode==='weapon');
 document.getElementById('equipShieldTab').classList.toggle('active',equipMode==='shield');

 if(equipMode==='weapon'){
   weapons.forEach((w,i)=>{
     const b=document.createElement('button');
     b.className='equipItem'+(!unlockedWeapons[i]?' locked':'')+(player.weapon===i?' selected':'');
     b.textContent=unlockedWeapons[i]?w.name:'？？？';
     if(unlockedWeapons[i])b.onclick=()=>{
       player.weapon=i;weaponNameEl.textContent=w.name;
       shortcut={type:'weapon',index:i,returnType:'weapon',returnIndex:i};
       updateShortcutLabel();renderEquipPanel()
     };
     equipItems.appendChild(b);
   });
 }else{
   shields.forEach((sh,i)=>{
     const b=document.createElement('button');
     b.className='equipItem'+(!unlockedShields[i]?' locked':'')+(player.shieldType===i?' selected':'');
     b.textContent=unlockedShields[i]?sh.name:'？？？';
     if(unlockedShields[i])b.onclick=()=>{
       player.shieldType=i;
       shortcut={type:'shield',index:i,returnType:'shield',returnIndex:i};
       updateShortcutLabel();say(`${sh.name} を装備／SHORT登録`);renderEquipPanel()
     };
     equipItems.appendChild(b);
   });
 }
}
document.getElementById('equipWeaponTab').onclick=()=>{equipMode='weapon';renderEquipPanel()};
document.getElementById('equipShieldTab').onclick=()=>{equipMode='shield';renderEquipPanel()};
document.getElementById('equipClose').onclick=closeEquipPanel;


const shortcutBtn=document.getElementById('shortcutBtn');
const shortcutLabel=document.getElementById('shortcutLabel');
function updateShortcutLabel(){
 if(shortcut.index<0){shortcutLabel.textContent='なし';return}
 shortcutLabel.textContent=shortcut.type==='weapon'?weapons[shortcut.index].name:shields[shortcut.index].name;
}
shortcutBtn.addEventListener('pointerdown',(ev)=>{
 ev.preventDefault();
 if(shortcut.index<0){say('装備画面でSHORTに登録');return}
 if(shortcut.type==='weapon'){
   if(player.weapon!==shortcut.index){
     shortcut.returnType='weapon';shortcut.returnIndex=player.weapon;
     player.weapon=shortcut.index;weaponNameEl.textContent=weapons[player.weapon].name;
   }else if(shortcut.returnType==='weapon'&&shortcut.returnIndex>=0&&unlockedWeapons[shortcut.returnIndex]){
     const back=shortcut.returnIndex;shortcut.returnIndex=shortcut.index;player.weapon=back;weaponNameEl.textContent=weapons[player.weapon].name;
   }
 }else{
   if(player.shieldType!==shortcut.index){
     shortcut.returnType='shield';shortcut.returnIndex=player.shieldType;player.shieldType=shortcut.index;
   }else if(shortcut.returnType==='shield'&&shortcut.returnIndex>=0&&unlockedShields[shortcut.returnIndex]){
     const back=shortcut.returnIndex;shortcut.returnIndex=shortcut.index;player.shieldType=back;
   }
 }
});

function jump(){if(player.jumpT<=0){player.jumpT=player.jumpDur;player.shield=false;shieldBtn.classList.remove('active');particle(player.x,player.y+24,'バッ！','#111',.45,18)}}

function steerAngle(current,target,maxStep){
 const d=angleDiff(target,current);
 return current+Math.max(-maxStep,Math.min(maxStep,d));
}
function stickAngle(){
 if(Math.hypot(stick.x,stick.y)<.18)return null;
 return Math.atan2(stick.y,stick.x);
}

function skill(){
 if(player.skillT>0||player.jumpT>0)return;
 player.shield=false;
 const baseFace=faceAngle(player.face);
 let a=autoAim(baseFace,Math.PI*.65,320);
 if(player.weapon===0||player.weapon===1){
   // 剣・槍スキルはジャンプ開始時に近い敵へやや強めに自動補正。
   const snap=skillAutoAim(baseFace,360,Math.PI*.82);
   a=snap.angle;
 }
 player.aim=a;
 player.skillBase=a;
 player.skillElapsed=0;
 player.skillHit=new Set();
 player.skillPhase=0;
 player.skillZ=0;
 player.hammerSpin=0;

 if(player.weapon===0){
   // 剣：頭上へ振り上げ→高速小ジャンプ→着地振り下ろし→短い硬直
   player.skillKind='sword';
   player.skillT=.74;
   particle(player.x,player.y,'跳び斬り！','#7e20a6',.45,18);

 }else if(player.weapon===1){
   // 槍：前へ大ジャンプして突き刺し→同じ軌道を後ろへジャンプで戻る
   player.skillKind='spear';
   player.skillT=.98;
   particle(player.x,player.y,'飛槍！','#2f6db0',.5,18);

 }else if(player.weapon===2){
   // ハンマー：ダッシュ→身体を一本軸にしてクルッ→横振り抜き
   player.skillKind='hammer';
   player.skillT=.70;
   player.skillSide=player.skillSide>0?-1:1;
   particle(player.x,player.y,'旋回！','#7e20a6',.5,18);

 }else if(player.weapon===3){
   // 赤杖：炎の輪をまとってダッシュ
   player.skillKind='fire';
   player.skillT=.62;
   particle(player.x,player.y,'炎輪！','#e34a24',.5,18);

 }else{
   // 青杖：氷の板に乗ってサーフィン直進
   player.skillKind='ice';
   player.skillT=.68;
   particle(player.x,player.y,'アイスサーフ！','#268bc1',.5,18);
 }
}


function skillAutoAim(base,maxDist=330,cone=Math.PI*.72){
 const candidates=[];
 for(const e of enemies)if(!e.dead)candidates.push(e);
 for(const e of stage2Enemies)if(!e.dead)candidates.push(e);
 for(const e of stage3Enemies)if(!e.dead)candidates.push(e);
 for(const e of stage4Enemies)if(!e.dead)candidates.push(e);
 for(const e of stage6Enemies)if(!e.dead)candidates.push(e);
 if(boss.active&&!boss.dead)candidates.push(boss);
 if(seedBoss.active&&!seedBoss.dead)candidates.push(seedBoss);
 if(grassFinalBoss.active&&!grassFinalBoss.dead)candidates.push(grassFinalBoss);
 if(rockBoss.active&&!rockBoss.dead)candidates.push(rockBoss);
 for(const e of bossWalnuts)if(!e.dead)candidates.push(e);

 let best=null,bestScore=1e9,bestA=base;
 for(const e of candidates){
   const d=dist(player.x,player.y,e.x,e.y);
   if(d>maxDist)continue;
   const a=Math.atan2(e.y-player.y,e.x-player.x);
   const ad=Math.abs(angleDiff(a,base));
   if(ad>cone)continue;
   const score=d+ad*120;
   if(score<bestScore){bestScore=score;best=e;bestA=a}
 }
 return {angle:bestA,target:best};
}

function autoAim(base,cone,maxDist){let best=null,bestScore=1e9;for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);if(d>maxDist)continue;const a=Math.atan2(e.y-player.y,e.x-player.x);const ad=Math.abs(angleDiff(a,base));if(ad>cone)continue;const score=d+ad*150;if(score<bestScore){bestScore=score;best=a}}return best??base}

function fireMagic(w,charged,base){
 // 杖チャージ：単発大弾ではなく、扇状の炎/吹雪を噴射する。
 if(charged){
   const kind=w===3?'fire':'ice';
   const count=11;
   for(let i=0;i<count;i++){
     const spread=(i-(count-1)/2)/(count-1);
     const a=base+spread*.72;
     const speed=350+Math.random()*90;
     const r=10+Math.random()*4;
     projectiles.push({
       x:player.x+Math.cos(a)*48,
       y:player.y+Math.sin(a)*48,
       vx:Math.cos(a)*speed,
       vy:Math.sin(a)*speed,
       r,life:.48+Math.random()*.18,kind,damage:1,charged:true,hit:false,spray:true
     });
   }
   particle(player.x+Math.cos(base)*48,player.y+Math.sin(base)*48,w===3?'ゴォッ！':'ブワァ！',w===3?'#e43':'#268bc1',.35,17);
   return;
 }

 const speed=470,damage=2,radius=11;
 const fa=faceAngle(player.face), rx=Math.cos(fa+Math.PI/2), ry=Math.sin(fa+Math.PI/2), fx=Math.cos(fa), fy=Math.sin(fa);
 let hx=player.x+rx*23+fx*5,hy=player.y+ry*19+fy*5+3;
 if(player.face==='right'){hx=player.x+20;hy=player.y+13;}
 else if(player.face==='left'){hx=player.x-18;hy=player.y+12;}
 const tip=56;
 const sx=hx+Math.cos(base)*tip,sy=hy+Math.sin(base)*tip;
 projectiles.push({x:sx,y:sy,vx:Math.cos(base)*speed,vy:Math.sin(base)*speed,r:radius,life:1.05,kind:w===3?'fire':'ice',damage,charged:false,hit:false});
 particle(sx,sy,w===3?'ボッ！':'キン！',w===3?'#e43':'#268bc1',.3,15);
}






function takeDamage(amount){
 const dmg=guardFruitT>0?Math.max(1,Math.ceil(amount*.5)):amount;
 player.hp=Math.max(1,player.hp-dmg);
 return dmg;
}
function maybeDropHeal(x,y,chance=.48){
 if(Math.random()<chance)healDrops.push({x,y,r:10,life:10,bob:Math.random()*6.28});
}
function killDrop(e,chance=.48){
 maybeDropHeal(e.x,e.y,chance);
 const area=Math.max(1,Math.min(5,currentStage||1));
 if(!areaFruitDropped[area]&&Math.random()<.16){
   areaFruitDropped[area]=true;
   const kind=Math.random()<.5?'power':'guard';
   buffDrops.push({x:e.x+14,y:e.y-8,r:12,life:14,bob:Math.random()*6.28,kind});
 }
}

function stage1DeathEffect(e){
 if(e.type==='grass'){
   particle(e.x,e.y-16,'ザシュッ！','#267524',.5,17);
   particle(e.x-12,e.y,'葉','#35a544',.38,12);
   particle(e.x+12,e.y,'葉','#35a544',.38,12);
 }else{
   particle(e.x,e.y-12,'パサッ！','#b64a9c',.45,15);
 }
}

function enemyHitReact(e,power=18){
 const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy)||1;
 e.x+=dx/d*power;e.y+=dy/d*power;
 e.flash=.24;
 e.hitReact=.16;
}
function hitStage2(damage,range,base,cone){
 if(!stage2Started)return;
 damage=powerFruitT>0?damage*2:damage;
 for(const e of stage2Enemies){
   if(e.dead)continue;
   const d=dist(player.x,player.y,e.x,e.y);
   const a=Math.atan2(e.y-player.y,e.x-player.x);
   if(d<=range+e.r+6&&Math.abs(angleDiff(a,base))<=cone/2){
     e.hp-=damage;e.flash=.26;particle(e.x,e.y-25,`-${damage}`,'#b31313',.4,15);
     if(e.hp<=0){e.dead=true;particle(e.x,e.y,'パサッ','#fff',.4,15);killDrop(e,.5)}
   }
 }
 if(seedBoss.active&&!seedBoss.dead){
   const d=dist(player.x,player.y,seedBoss.x,seedBoss.y);
   const a=Math.atan2(seedBoss.y-player.y,seedBoss.x-player.x);
   if(d<=range+seedBoss.r&&Math.abs(angleDiff(a,base))<=cone/2){
     seedBoss.hp-=damage;seedBoss.flash=.14;particle(seedBoss.x,seedBoss.y-45,`-${damage}`,'#b31313',.4,16);
   }
 }
}

function hitStage3(damage,range,base,cone,weapon,charged=false){
 if(!stage3Started)return;
 damage=powerFruitT>0?damage*2:damage;
 for(const e of stage3Enemies){
  if(e.dead)continue;
  const d=dist(player.x,player.y,e.x,e.y);
  const a=Math.atan2(e.y-player.y,e.x-player.x);
  if(d>range+e.r||Math.abs(angleDiff(a,base))>cone/2)continue;

  let dmg=damage;
  if(e.type==='walnut'){
    // 剣は殻に弾かれる。ハンマーは特効。槍は細い隙間を突くイメージ。
    if(weapon===0){dmg=0;particle(e.x,e.y-25,'カキン！','#111',.4,16)}
    else if(weapon===2){dmg=99}
    else if(weapon===1){dmg=charged?4:2}
    else dmg=1;
  }
  if(dmg>0){e.hp-=dmg;enemyHitReact(e,22);particle(e.x,e.y-25,`-${dmg}`,'#b31313',.4,15)}
  if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ポン！','#fff',.4,15);killDrop(e,.55)}
 }
}


function hitStage45(damage,range,base,cone,weapon){
 damage=powerFruitT>0?damage*2:damage;
 if(stage4Started){
  for(const e of stage4Enemies){
   if(e.dead)continue;
   const d=dist(player.x,player.y,e.x,e.y),a=Math.atan2(e.y-player.y,e.x-player.x);
   if(d<=range+e.r&&Math.abs(angleDiff(a,base))<=cone/2){
    let dmg=damage;
    if(e.type==='thorn'&&weapon===0)dmg=Math.max(1,damage-1);
    e.hp-=dmg;e.flash=.22;enemyHitReact(e,52);
    particle(e.x,e.y-24,`-${dmg}`,'#b31313',.4,15);
    if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ブチッ！','#4d8b37',.45,15);killDrop(e,.55)}
   }
  }
 }
 if(stage6Started){
  for(const e of stage6Enemies){
   if(e.dead)continue;
   const d=dist(player.x,player.y,e.x,e.y),a=Math.atan2(e.y-player.y,e.x-player.x);
   if(d<=range+e.r&&Math.abs(angleDiff(a,base))<=cone/2){
    e.hp-=damage;e.flash=.22;enemyHitReact(e,70);
    particle(e.x,e.y-24,`-${damage}`,'#b31313',.4,15);
    if(e.hp<=0){e.dead=true;particle(e.x,e.y,'パァッ！','#fff',.45,15);killDrop(e,.55)}
   }
  }
 }
 if(stage7Started&&rockBoss.active&&!rockBoss.dead){
  const d=dist(player.x,player.y,rockBoss.x,rockBoss.y);
  const a=Math.atan2(rockBoss.y-player.y,rockBoss.x-player.x);
  if(d<=range+rockBoss.r&&Math.abs(angleDiff(a,base))<=cone/2){
   const bossDmg=weapon===2?Math.max(8,damage):damage;
   rockBoss.hp-=bossDmg;rockBoss.flash=.18;
   particle(rockBoss.x,rockBoss.y-55,`-${bossDmg}`,'#b31313',.4,17);
  }
 }
 if(stage5Started&&grassFinalBoss.active&&!grassFinalBoss.dead){
  const d=dist(player.x,player.y,grassFinalBoss.x,grassFinalBoss.y);
  const a=Math.atan2(grassFinalBoss.y-player.y,grassFinalBoss.x-player.x);
  if(d<=range+grassFinalBoss.r&&Math.abs(angleDiff(a,base))<=cone/2){
   grassFinalBoss.hp-=damage;grassFinalBoss.flash=.18;
   particle(grassFinalBoss.x,grassFinalBoss.y-55,`-${damage}`,'#b31313',.4,17);
  }
 }
}


function swordSkillTouches(x,y,r,sa){
 const fx=Math.cos(sa),fy=Math.sin(sa);
 const sx=-fy,sy=fx;
 const cx=player.x+fx*24,cy=player.y+fy*24;
 const dx=x-cx,dy=y-cy;
 const forward=dx*fx+dy*fy;
 const side=Math.abs(dx*sx+dy*sy);
 return forward>-30&&forward<82&&side<66+r*.55;
}
function swordSkillHitTarget(target,damage=7){
 if(!target||target.dead||player.skillHit.has(target))return false;
 if(!swordSkillTouches(target.x,target.y,target.r||24,player.skillBase))return false;
 target.hp-=damage;
 target.flash=.2;
 player.skillHit.add(target);
 particle(target.x,target.y-24,`-${damage}`,'#b31313',.42,17);
 return true;
}

function hitBoss(damage,range,base,cone=Math.PI*2){
 if(!boss.active||boss.dead)return;
 const d=dist(player.x,player.y,boss.x,boss.y);
 const a=Math.atan2(boss.y-player.y,boss.x-player.x);
 if(d<=range+boss.r && Math.abs(angleDiff(a,base))<=cone/2){
   boss.hp-=damage;boss.flash=.14;particle(boss.x,boss.y-35,`-${damage}`,'#b31313',.45,18);
 }
}

function doAttack(charged=false){
 if(player.attackCooldown>0)return;
 const wasDash=player.dashT>0||player.dashAuto;
 if(wasDash)player.dashAttack=true;
 const w=player.weapon, wp=weapons[w];
 const jumpStrike=player.jumpT>0&&!charged;
 let range=wp.range*(charged?1.45:1);
 let base=autoAim(faceAngle(player.face),Math.PI*.58,w>=3?440:range+90);
 player.aim=base;

 // 剣チャージ：360度回転斬り（既存）
 if(w===0 && charged){
   player.spin=1;player.spinT=0;player.attackMax=.56;player.attacking=.56;player.attackCooldown=.72;
   particle(player.x,player.y-50,'回転斬り！','#fff',.45,15);
   for(const e of enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<=range+38){e.hp-=5;enemyHitReact(e,58);particle(e.x,e.y-22,'-5','#b31313',.45,16);if(e.hp<=0){e.dead=true;stage1DeathEffect(e);killDrop(e,.55)}}}
   for(const g of props.grass){if(!g.dead&&dist(player.x,player.y,g.x,g.y)<range+40){g.dead=true;particle(g.x,g.y,'ザシュ','#267524')}}
   for(const tr of props.smallTrees){if(!tr.dead&&dist(player.x,player.y,tr.x,tr.y)<range+55){tr.dead=true;particle(tr.x,tr.y-18,'バサッ！','#3a7e35',.45,16)}}
   hitBoss(5,range+38,base,Math.PI*2);hitStage2(5,range+38,base,Math.PI*2);hitStage3(5,range+38,base,Math.PI*2,w,true);hitStage45(5,range+38,base,Math.PI*2,w);
   return;
 }

 // 槍チャージ：スパイラル貫通突き。長射程・敵を貫通・岩も破壊。
 if(w===1 && charged){
   player.attackMax=.48;player.attacking=.48;player.attackCooldown=.72;
   player.spiral=.48;player.spiralA=base;
   particle(player.x,player.y-48,'スパイラル！','#fff',.45,15);
   const reach=230, width=34;
   const fx=Math.cos(base),fy=Math.sin(base);
   for(const e of enemies){
     if(e.dead)continue;
     const dx=e.x-player.x,dy=e.y-player.y;
     const along=dx*fx+dy*fy, side=Math.abs(dx*fy-dy*fx);
     if(along>0&&along<reach&&side<width+e.r*.45){
       e.hp-=4;enemyHitReact(e,34);particle(e.x,e.y-22,'-4','#b31313',.45,16);
       if(e.hp<=0){e.dead=true;particle(e.x,e.y,'貫通！','#111',.55,18)}
     }
   }
   hitBoss(4,230,base,.55);hitStage2(4,230,base,.55);hitStage3(4,230,base,.55,w,true);hitStage45(8,230,base,.55,w);
   for(const r of props.rocks){
     if(r.dead)continue;
     const dx=r.x-player.x,dy=r.y-player.y;
     const along=dx*fx+dy*fy,side=Math.abs(dx*fy-dy*fx);
     if(along>0&&along<reach&&side<48){r.dead=true;particle(r.x,r.y,'粉砕！','#444',.55,18)}
   }
   return;
 }

 // ハンマーチャージ：高く跳んで叩きつけ。直撃大ダメージ＋周囲をよろけさせる。
 if(w===2 && charged){
   player.hammerSmash=.72;player.hammerSmashT=0;player.attackMax=.72;player.attacking=.72;player.attackCooldown=.92;
   player.jumpZ=Math.max(player.jumpZ||0,1);
   particle(player.x,player.y-50,'大叩き！','#fff',.4,15);
   return;
 }

 // 杖チャージ：通常弾より大きく強い魔法弾。
 player.attackMax=charged?.38:.24;player.attacking=player.attackMax;player.attackCooldown=charged?.55:.30;
 if(charged)particle(player.x,player.y-50,'チャージ！','#fff',.45,15);
 if(w>=3){fireMagic(w,charged,base);return;}

 let cone=w===1?.34:1.05;
 for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);const aa=Math.atan2(e.y-player.y,e.x-player.x);if(d<=range+e.r&&Math.abs(angleDiff(aa,base))<=cone/2){let dmg=jumpStrike?5:(wasDash?5:(w===2?4:3));e.hp-=dmg;e.flash=.14;particle(e.x,e.y-22,`-${dmg}`,'#b31313',.45,16);if(e.hp<=0){e.dead=true;stage1DeathEffect(e);killDrop(e,.55)}}}
 hitBoss(jumpStrike?5:(wasDash?5:(w===2?4:3)),range,base,cone);
 hitStage2(jumpStrike?5:(wasDash?5:(w===2?4:3)),range,base,cone);hitStage3(jumpStrike?5:(wasDash?5:(w===2?4:3)),range,base,cone,w,false);hitStage45(jumpStrike?5:(wasDash?5:(w===2?4:3)),range,base,cone,w);
 if(w===0){
  for(const g of props.grass){if(!g.dead&&dist(player.x,player.y,g.x,g.y)<range+28){g.dead=true;particle(g.x,g.y,'ザシュ','#267524')}}
  for(const tr of props.smallTrees){if(!tr.dead&&dist(player.x,player.y,tr.x,tr.y)<range+45){tr.dead=true;particle(tr.x,tr.y-18,'バサッ！','#3a7e35',.45,16)}}
 }
 if(w===2){for(const r of props.rocks){if(!r.dead&&dist(player.x,player.y,r.x,r.y)<range+35){r.dead=true;particle(r.x,r.y,'バキッ','#444')}}}
 if(w===2&&stage7Started){
  for(const r of stage7Rocks){
   if(!r.dead&&dist(player.x,player.y,r.x,r.y)<range+55){
    r.dead=true;particle(r.x,r.y,'粉砕！','#444',.45,17);
   }
  }
  for(const e of bossWalnuts){
   if(!e.dead&&dist(player.x,player.y,e.x,e.y)<range+e.r+20){
    e.dead=true;particle(e.x,e.y,'パカン！','#9b6637',.45,17);killDrop(e,.5);
   }
  }
  for(const r of rollingRocks){
   if(!r.dead&&dist(player.x,player.y,r.x,r.y)<range+r.r+20){
    r.dead=true;particle(r.x,r.y,'ガシャッ！','#666',.4,16);
   }
  }
 }
}
function shieldBlocks(enemy){if(!player.shield||player.jumpT>0)return false;
 if(shields[player.shieldType].magic)return true;
 const incoming=Math.atan2(enemy.y-player.y,enemy.x-player.x);
 const facing=faceAngle(player.face);
 return Math.abs(angleDiff(incoming,facing))<Math.PI*.52;}

function update(dt){
 player.fallGrace=Math.max(0,(player.fallGrace||0)-dt);
 // P17: 敵のよろけ時間はゲーム更新側で減らす。
 for(const e of enemies){
   if(e.stagger>0)e.stagger=Math.max(0,e.stagger-dt);
 }

 // P16 チャージ攻撃の時間処理
 if(player.spiral>0)player.spiral=Math.max(0,player.spiral-dt);
 if(player.hammerSmash>0){
   player.hammerSmash-=dt;player.hammerSmashT+=dt;
   const p=Math.min(1,player.hammerSmashT/.72);

   // 高く跳び、最後の約25%で一気に落下。
   if(p<.72){
     const q=p/.72;
     player.jumpZ=Math.sin(q*Math.PI*.78)*132;
   }else{
     const q=(p-.72)/.28;
     player.jumpZ=132*(1-q);
   }

   // 着地した瞬間にハンマーも地面へ到達し、ここで衝撃判定。
   if(p>=.985&&!player.smashHit){
     player.jumpZ=0;
     player.smashHit=true;
     particle(player.x,player.y,'ドゴォン！','#111',.55,24);
     if(stage7Started){
       for(const r of stage7Rocks){
         if(!r.dead&&dist(player.x,player.y,r.x,r.y)<155){
           r.dead=true;particle(r.x,r.y,'粉砕！','#444',.45,17);
         }
       }
       for(const e of bossWalnuts){
         if(!e.dead&&dist(player.x,player.y,e.x,e.y)<165){
           e.dead=true;particle(e.x,e.y,'パカン！','#9b6637',.45,17);killDrop(e,.55);
         }
       }
       for(const r of rollingRocks){
         if(!r.dead&&dist(player.x,player.y,r.x,r.y)<165){
           r.dead=true;particle(r.x,r.y,'ガシャッ！','#666',.4,16);
         }
       }
     }
     for(const e of enemies){
       if(e.dead)continue;
       const d=dist(player.x,player.y,e.x,e.y);
       if(d<62){e.hp-=5;e.flash=.2;particle(e.x,e.y-22,'-5','#b31313',.5,17)}
       else if(d<145){e.hp-=1;e.flash=.14;e.stagger=.75;particle(e.x,e.y-20,'よろっ','#555',.45,14)}
       if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ボン！','#111',.55,18)}
     }
     if(boss.active&&!boss.dead&&dist(player.x,player.y,boss.x,boss.y)<145){boss.hp-=dist(player.x,player.y,boss.x,boss.y)<62?5:1;boss.flash=.16;}
     for(const e of stage3Enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<110){let dd=e.type==='walnut'?7:4;e.hp-=dd;e.flash=.16;if(e.hp<=0)e.dead=true}}
     for(const r of props.rocks){if(!r.dead&&dist(player.x,player.y,r.x,r.y)<92){r.dead=true;particle(r.x,r.y,'粉砕！','#444',.5,17)}}
   }
   if(player.hammerSmash<=0){
     player.hammerSmash=0;player.hammerSmashT=0;player.smashHit=false;player.jumpZ=0;
   }
 }

 // 剣チャージ回転斬り
 if(player.spin){
   player.spinT += dt;
   const seq=['down','left','up','right','down','left','up','right'];
   player.face=seq[Math.floor((player.spinT/0.56)*8)%8];
   player.aim = ({down:Math.PI/2,left:Math.PI,up:-Math.PI/2,right:0})[player.face];
   if(player.spinT>=0.56){
     player.spin=0; player.spinT=0;
   }
 }
 // 回転斬りの全周攻撃判定
 if(player.spin){
   for(const e of enemies){
     if(e.dead) continue;
     const dx=e.x-player.x, dy=e.y-player.y;
     if(dx*dx+dy*dy < 82*82){
       if(!e.spinHit){
         e.hp-=0;
         e.spinHit=true;
         e.hitFlash=.12;
       }
     }
   }
 }else{
   for(const e of enemies) e.spinHit=false;
 }


 player.attackCooldown=Math.max(0,player.attackCooldown-dt);player.attacking=Math.max(0,player.attacking-dt);player.skillT=Math.max(0,player.skillT-dt);if(player.skillT<=0){player.skillZ=0;player.hammerSpin=0;player.skillKind='';}player.inv=Math.max(0,player.inv-dt);if(props.water.frozen>0)props.water.frozen=Math.max(0,props.water.frozen-dt);
 let mx=stick.x+(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0),my=stick.y+(keys['s']||keys['arrowdown']?1:0)-(keys['w']||keys['arrowup']?1:0);
 if(player.dashT>0)player.dashT=Math.max(0,player.dashT-dt);

 // オートラン中はスティックを離しても同じ方向へ走り続ける。
 // 進行方向と逆向きの入力を入れると、その場でオートラン解除。
 if(false&&player.dashAuto&&player.skillT<=0){
   const rawMag=Math.hypot(mx,my);
   if(rawMag>.35){
     const nx=mx/rawMag,ny=my/rawMag;
     const fx=Math.cos(player.dashDir),fy=Math.sin(player.dashDir);
     if(nx*fx+ny*fy<-.45){
       player.dashAuto=false;player.dashT=0;player.dashShieldHit=new Set();
       particle(player.x,player.y+18,'キュッ','#fff',.22,13);
     }
   }
   if(player.dashAuto){
     mx=Math.cos(player.dashDir)*1.28;my=Math.sin(player.dashDir)*1.28;
     if(!player.shield)player.face=faceFromVec(mx,my);
   }
 }

 if(player.shieldStepT>0&&player.skillT<=0){
   player.shieldStepT=Math.max(0,player.shieldStepT-dt);
   // ステップ方向だけをここで固定。距離は後段の専用速度で決める。
   // 通常移動の正規化処理に潰されないよう倍率をここには持たせない。
   mx=Math.cos(player.shieldStepDir);
   my=Math.sin(player.shieldStepDir);
 }

 let m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}
 player.moveMag=m;
 if(m>.16){
   // 盾中は向きを固定。移動しても盾の向きは変えない。
   if(!player.shield){
     player.face=faceFromVec(mx,my);
     player.aim=Math.atan2(my,mx);
   }
   player.walkPhase+=dt*(9+Math.min(1,m)*4);
 }
 let speed=player.speed*(player.shield?.42:1)*shields[player.shieldType].move;
 // ステップは通常移動とは完全に別速度。
 // 盾の移動速度低下0.42倍を受けないので、見た目にも明確に大きく移動する。
 if(player.shieldStepT>0&&player.skillT<=0){
   speed=(player.shield?640:690)*shields[player.shieldType].move;
 }
 if(player.skillT>0){
   player.skillElapsed+=dt;
   const t=player.skillElapsed;

   if(player.skillKind==='sword'){
     const sa=player.skillBase;
     player.aim=sa;
     player.face=faceFromVec(Math.cos(sa),Math.sin(sa));

     if(t<.10){
       mx=0;my=0;speed=0;player.skillZ=0;
       const snap=skillAutoAim(player.skillBase,340,Math.PI*.60);
       player.skillBase=steerAngle(player.skillBase,snap.angle,dt*4.5);
     }else if(t<.43){
       const p=(t-.10)/.33;
       mx=Math.cos(sa)*1.72;my=Math.sin(sa)*1.72;speed=345;
       player.skillZ=Math.sin(p*Math.PI)*58;
     }else{
       mx=0;my=0;speed=0;player.skillZ=0;
       if(player.skillPhase===0){
         player.skillPhase=1;
         const ix=player.x+Math.cos(sa)*42,iy=player.y+Math.sin(sa)*42;
         particle(ix,iy,'ズバン！','#fff',.42,20);

         const hitOne=(e,deathFx)=>{
           if(!e||e.dead||player.skillHit.has(e))return;
           const d=dist(ix,iy,e.x,e.y);
           const aa=Math.atan2(e.y-player.y,e.x-player.x);
           if(d<118+(e.r||24)*.45&&Math.abs(angleDiff(aa,sa))<1.05){
             player.skillHit.add(e);e.hp-=7;e.flash=.22;
             if(e!==boss&&e!==seedBoss&&e!==grassFinalBoss)enemyHitReact(e,92);
             particle(e.x,e.y-24,'-7','#b31313',.42,17);
             if(e.hp<=0&&deathFx)deathFx(e);
           }
         };

         for(const e of enemies)hitOne(e,e=>{e.dead=true;stage1DeathEffect(e);killDrop(e,.6)});
         for(const e of stage2Enemies)hitOne(e,e=>{e.dead=true;particle(e.x,e.y,'パサッ','#fff',.4,15);killDrop(e,.5)});
         for(const e of stage3Enemies){
           if(e.type==='walnut'){
             if(!e.dead&&dist(ix,iy,e.x,e.y)<125){player.skillHit.add(e);particle(e.x,e.y-24,'カキン！','#111',.35,15)}
           }else hitOne(e,e=>{e.dead=true;particle(e.x,e.y,'ポン！','#fff',.4,15);killDrop(e,.5)});
         }
         for(const e of stage4Enemies)hitOne(e,e=>{e.dead=true;particle(e.x,e.y,'ブチッ！','#4d8b37',.4,15);killDrop(e,.55)});
         for(const e of stage6Enemies)hitOne(e,e=>{e.dead=true;particle(e.x,e.y,'パァッ！','#fff',.4,15);killDrop(e,.55)});

         hitOne(boss);hitOne(seedBoss);hitOne(grassFinalBoss);

         for(const tr of props.smallTrees){
           if(!tr.dead&&dist(ix,iy,tr.x,tr.y)<120){tr.dead=true;particle(tr.x,tr.y-18,'バサッ！','#3a7e35',.45,16)}
         }
         for(const g of props.grass){
           if(!g.dead&&dist(ix,iy,g.x,g.y)<115){g.dead=true;particle(g.x,g.y,'ザシュ','#267524',.35,14)}
         }
       }
     }

   }else if(player.skillKind==='spear'){
     player.inv=Math.max(player.inv,.18);
     let sa=player.skillBase;
     player.face=faceFromVec(Math.cos(sa),Math.sin(sa));

     if(t<.12){
       const snap=skillAutoAim(player.skillBase,380,Math.PI*.62);
       player.skillBase=steerAngle(player.skillBase,snap.angle,dt*4.2);
       sa=player.skillBase;
       mx=Math.cos(sa)*1.45;my=Math.sin(sa)*1.45;speed=285;player.skillZ=0;
     }else if(t<.54){
       const p=(t-.12)/.42;
       mx=Math.cos(sa)*1.62;my=Math.sin(sa)*1.62;speed=280;
       player.skillZ=Math.sin(p*Math.PI)*112;
       if(p>.89&&player.skillPhase===0){
         player.skillPhase=1;
         const ix=player.x+Math.cos(sa)*42,iy=player.y+Math.sin(sa)*42;
         particle(ix,iy,'ズドン！','#2f6db0',.48,21);
         for(const e of enemies){
           if(e.dead)continue;
           if(dist(ix,iy,e.x,e.y)<94){
             e.hp-=7;enemyHitReact(e,86);particle(e.x,e.y-20,'-7','#b31313',.45,17);
             if(e.hp<=0){e.dead=true;stage1DeathEffect(e);killDrop(e,.65)}
           }
         }
         hitStage2(7,104,sa,Math.PI);hitStage3(7,104,sa,Math.PI,1,true);hitStage45(7,104,sa,Math.PI,1);hitBoss(7,104,sa,Math.PI);
       }
     }else{
       const p=Math.min(1,(t-.54)/.44);
       mx=-Math.cos(sa)*1.52;my=-Math.sin(sa)*1.52;speed=275;
       player.skillZ=Math.sin(p*Math.PI)*88;
       player.face=faceFromVec(Math.cos(sa),Math.sin(sa));
     }

   }else if(player.skillKind==='hammer'){
     // ハンマー：回転開始前のダッシュ中だけ少し方向修正。
     if(t<.24){
       const inputA=stickAngle();
       if(inputA!==null)player.skillBase=steerAngle(player.skillBase,inputA,dt*2.0);
       mx=Math.cos(player.skillBase)*2.35;my=Math.sin(player.skillBase)*2.35;speed=315;
     }else{
       mx=0;my=0;speed=0;
       const p=Math.min(1,(t-.24)/.34);
       player.hammerSpin=p*Math.PI*2.2*player.skillSide;
       if(p>.72&&!player.skillPhase){
         player.skillPhase=1;
         particle(player.x,player.y,'ブォン！','#7e20a6',.45,20);
         for(const e of enemies){
           if(e.dead)continue;
           if(dist(player.x,player.y,e.x,e.y)<105){
             e.hp-=8;e.flash=.16;enemyHitReact(e,72);particle(e.x,e.y-20,'-8','#b31313',.45,16);
             if(e.hp<=0)e.dead=true;
           }
         }
       }
     }

   }else if(player.skillKind==='fire'){
     // 赤杖：かなり強く旋回できる。燃えるタイヤのような操作感。
     const inputA=stickAngle();
     if(inputA!==null)player.skillBase=steerAngle(player.skillBase,inputA,dt*5.2);
     player.aim=player.skillBase;
     mx=Math.cos(player.skillBase)*2.55;my=Math.sin(player.skillBase)*2.55;speed=340;
     player.face=faceFromVec(mx,my);
     // 地面に短時間残る火を置く。
     if(!player.fireTrail.length || dist(player.x,player.y,player.fireTrail[player.fireTrail.length-1].x,player.fireTrail[player.fireTrail.length-1].y)>34){
       player.fireTrail.push({x:player.x,y:player.y,life:1.6});
     }
     for(const e of enemies){
       if(e.dead||player.skillHit.has(e))continue;
       if(dist(player.x,player.y,e.x,e.y)<70){
         e.hp-=3;e.flash=.15;player.skillHit.add(e);particle(e.x,e.y-20,'炎！','#e43',.4,15);
         if(e.hp<=0)e.dead=true;
       }
     }

   }else if(player.skillKind==='ice'){
     // 青杖：サーフィンらしく、急には曲がれず大きな弧で旋回。
     const inputA=stickAngle();
     if(inputA!==null)player.skillBase=steerAngle(player.skillBase,inputA,dt*2.7);
     player.aim=player.skillBase;
     mx=Math.cos(player.skillBase)*2.75;my=Math.sin(player.skillBase)*2.75;speed=355;
     player.face=faceFromVec(mx,my);
     if(!player.iceTrail.length || dist(player.x,player.y,player.iceTrail[player.iceTrail.length-1].x,player.iceTrail[player.iceTrail.length-1].y)>28){
       player.iceTrail.push({x:player.x,y:player.y,life:1.15,phase:Math.random()*Math.PI*2});
     }
     for(const e of enemies){
       if(e.dead||player.skillHit.has(e))continue;
       if(dist(player.x,player.y,e.x,e.y)<72){
         e.hp-=3;e.flash=.15;e.stagger=Math.max(e.stagger||0,.55);player.skillHit.add(e);
         particle(e.x,e.y-20,'ガツン！','#268bc1',.4,15);
         if(e.hp<=0)e.dead=true;
       }
     }
   }
 }
 const prevX=player.x,prevY=player.y;
 player.x=clamp(player.x+mx*speed*dt,45,world.w-45);player.y=clamp(player.y+my*speed*dt,45,world.h-45);
 // 小木は剣で切るまでは通れない。
 for(const tr of props.smallTrees){
  if(!tr.dead&&dist(player.x,player.y,tr.x,tr.y)<47){player.x=prevX;player.y=prevY;break}
 }
 // 岩の分かれ道の大岩。壊すまでは通れない。
 if(stage7Started){
   for(const r of stage7Rocks){
     if(!r.dead&&dist(player.x,player.y,r.x,r.y)<player.r+r.r-4){
       player.x=prevX;player.y=prevY;break;
     }
   }
 }

 
 if((player.dashT>0||player.dashAuto||player.shieldStepT>0)&&player.shield){
   const bashList=[...enemies,...stage2Enemies,...stage3Enemies,...stage4Enemies];
   for(const e of bashList){
    if(e.dead||player.dashShieldHit.has(e))continue;
    if(dist(player.x,player.y,e.x,e.y)<player.r+e.r+20){
      player.dashShieldHit.add(e);
      const dx=e.x-player.x,dy=e.y-player.y,dd=Math.hypot(dx,dy)||1;
      e.x+=dx/dd*155;e.y+=dy/dd*155;e.flash=.2;e.stagger=.55;
      particle(e.x,e.y-18,'ドン！','#fff',.35,17);
    }
   }
 }
// 崖際の岩・低木は見た目用。通常ステージでは引っかからない。

 // 浮遊大陸から落ちた判定
 // 見た目上、足元が地面に少しでも乗っていれば落ちない。
 // 中心点だけでなく、キャラの足元円が地面矩形に重なっているかで判定。
 const groundSupport=24;
 const onRect=(r)=>{
   const cx=clamp(player.x,r.x,r.x+r.w);
   const cy=clamp(player.y,r.y,r.y+r.h);
   const dx=player.x-cx,dy=player.y-cy;
   return dx*dx+dy*dy<=groundSupport*groundSupport;
 };
 // 地面の見た目に使う矩形と、落下判定に使う矩形を同じ定義から取る。
 let safe=pointSupportedByGround(player.x,player.y,groundSupport);
 if(stage.bridgeOpen){
   const bx1=Math.min(stageGeo.bridge.x1,stageGeo.bridge.x2)-25,bx2=Math.max(stageGeo.bridge.x1,stageGeo.bridge.x2)+25;
   const by=stageGeo.bridge.y1;
   if(player.x>=bx1&&player.x<=bx2&&Math.abs(player.y-by)<100)safe=true;
   if(stage2BridgeOpen){
     const b2x1=Math.min(stage2Geo.bridge.x1,stage2Geo.bridge.x2)-25,b2x2=Math.max(stage2Geo.bridge.x1,stage2Geo.bridge.x2)+25;
     if(player.x>=b2x1&&player.x<=b2x2&&Math.abs(player.y-stage2Geo.bridge.y1)<100)safe=true;
   }
   if(stage3BridgeOpen&&player.x>=4770&&player.x<=4980&&Math.abs(player.y-570)<105)safe=true;
   if(stage4BridgeOpen&&player.x>=6100&&player.x<=6280&&Math.abs(player.y-570)<105)safe=true;
 }
 // 通常ステージでは落下しない。
 // 浮遊大陸には独自の重力があり、縁まで行っても裏側へ吸い付く設定。
 // そのため通常探索では落下ダメージなし。レース専用コースだけ別処理にする。
 if(!safe){
   const allGround=visibleGroundRects();
   let best=null,bestD=1e9;
   for(const r of allGround){
     const rx=clamp(player.x,r.x+12,r.x+r.w-12);
     const ry=clamp(player.y,r.y+12,r.y+r.h-12);
     const dd=(rx-player.x)**2+(ry-player.y)**2;
     if(dd<bestD){bestD=dd;best={x:rx,y:ry}}
   }
   // 完全に空へ出た時だけ、最寄りの地面へ吸い付く。HPは減らさない。
   if(best&&bestD>55*55){
     player.x=best.x;
     player.y=best.y;
     if(player.skillT>0){
       player.skillT=0;
       player.skillKind=null;
       player.skillZ=0;
     }
     particle(player.x,player.y,'ふわっ','#8ad4ff',.3,13);
   }
 }

 if(player.jumpT>0)player.jumpT=Math.max(0,player.jumpT-dt);
 if(player.shield&&player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+shields[player.shieldType].heal*dt)}


 // 赤杖スキルの火の跡
 for(const f of player.fireTrail){
   f.life-=dt;
   for(const e of enemies){
     if(e.dead||f.life<=0)continue;
     if(dist(f.x,f.y,e.x,e.y)<30){
       e.fireTick=(e.fireTick||0)-dt;
       if(e.fireTick<=0){
         e.fireTick=.35;e.hp-=1;e.flash=.1;
         if(e.hp<=0)e.dead=true;
       }
     }
   }
 }
 player.fireTrail=player.fireTrail.filter(f=>f.life>0);
 for(const f of player.iceTrail)f.life-=dt;
 player.iceTrail=player.iceTrail.filter(f=>f.life>0);
 // magic projectiles
 for(const pr of projectiles){
   if(pr.hit)continue;
   pr.life-=dt;pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
   if(pr.life<=0||pr.x<0||pr.y<0||pr.x>world.w||pr.y>world.h){pr.hit=true;continue}

   // 敵が撃った種・花粉弾は、プレイヤー専用の当たり判定。
   // 自分自身や他の敵には当たらず、プレイヤー弾処理にも流さない。
   if(pr.enemyShot){
     if(dist(pr.x,pr.y,player.x,player.y)<pr.r+player.r){
       if(player.jumpT>0){
         particle(player.x,player.y-45,'スカッ','#333',.3,13);
       }else if(shieldBlocks({x:pr.x,y:pr.y})){
         particle(pr.x,pr.y,pr.kind==='seed'?'カン！':'ポフン！','#111',.35,14);
       }else if(player.inv<=0){
         const got=takeDamage(pr.damage);
         player.inv=.45;
         particle(player.x,player.y-35,`-${got}`,'#c11',.45,16);
       }
       pr.hit=true;
     }
     // 敵弾はここで処理終了。ボス自身への衝突判定へ進ませない。
     continue;
   }

   if(pr.kind==='fire'){
     for(const g of props.grass){if(!g.dead&&dist(pr.x,pr.y,g.x,g.y)<pr.r+24){g.dead=true;particle(g.x,g.y,'ボワッ','#e43');pr.hit=true;break}}
   }else{
     const wa=props.water;if(pr.x>wa.x-pr.r&&pr.x<wa.x+wa.w+pr.r&&pr.y>wa.y-pr.r&&pr.y<wa.y+wa.h+pr.r){wa.frozen=5;particle(pr.x,pr.y,'カチッ','#167bad',.35,14);pr.hit=true}
   }
   if(pr.hit)continue;
   if(seedBoss.active&&!seedBoss.dead&&dist(pr.x,pr.y,seedBoss.x,seedBoss.y)<pr.r+seedBoss.r){
     seedBoss.hp-=pr.damage;seedBoss.flash=.14;pr.hit=true;
   }
   if(pr.hit)continue;
   if(boss.active&&!boss.dead&&dist(pr.x,pr.y,boss.x,boss.y)<pr.r+boss.r){
     boss.hp-=pr.damage;boss.flash=.14;particle(boss.x,boss.y-35,`-${pr.damage}`,pr.kind==='fire'?'#b31313':'#176d9a',.45,16);pr.hit=true;
   }
   if(pr.hit)continue;
   for(const e of enemies){if(e.dead)continue;if(dist(pr.x,pr.y,e.x,e.y)<pr.r+e.r){e.hp-=pr.damage;enemyHitReact(e,14);particle(e.x,e.y-22,`-${pr.damage}`,pr.kind==='fire'?'#b31313':'#176d9a',.45,16);if(pr.kind==='ice')e.attackCd+=.45;if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ボン！','#111',.55,18)}pr.hit=true;break}}
 }
 for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].hit)projectiles.splice(i,1);

 for(const e of enemies){
   if(e.dead)continue;
   e.attackCd-=dt;
   e.flash=Math.max(0,e.flash-dt);
   e.hitReact=Math.max(0,(e.hitReact||0)-dt);
   e.attackWind=Math.max(0,(e.attackWind||0)-dt);
   e.attackAnim=Math.max(0,(e.attackAnim||0)-dt);

   const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;

   // 攻撃中でなければ近づく。ただ触れただけではダメージなし。
   if(d>64&&e.hitReact<=0&&e.attackWind<=0){
     e.x+=dx/d*e.speed*dt*(e.stagger>0?.22:1);
     e.y+=dy/d*e.speed*dt*(e.stagger>0?.22:1);
   }

   // 近距離で一度構えてから葉っぱを振る。
   if(d<=76&&e.attackCd<=0&&e.attackWind<=0){
     e.attackWind=.28;
     e.attackCd=e.type==='flower'?1.25:1.0;
     particle(e.x,e.y-28,'…！','#555',.24,12);
   }

   if(e.attackWind>0&&e.attackWind<=.06&&!e.windHit){
     e.windHit=true;e.attackAnim=.18;
     particle((player.x+e.x)/2,(player.y+e.y)/2,'ブン！','#3a8d3f',.26,14);
     const nowD=dist(player.x,player.y,e.x,e.y);
     if(nowD<88){
       if(player.jumpT>0){
         particle(player.x,player.y-45,'スカッ','#333',.3,13);
       }else if(shieldBlocks(e)){
         particle((player.x+e.x)/2,(player.y+e.y)/2,'ガキン！','#111',.35,17);
         e.x-=dx/d*15;e.y-=dy/d*15;
       }else if(player.inv<=0){
         const dmg=e.type==='flower'?5:4;
         const got=takeDamage(dmg);player.inv=.5;
         particle(player.x,player.y-35,`-${got}`,'#c11',.4,16);
       }
     }
   }
   if(e.attackWind<=0)e.windHit=false;

   // 体が重なった時は押し合うだけ。
   if(d<52){
     player.x+=dx/d*3;player.y+=dy/d*3;
     e.x-=dx/d*2;e.y-=dy/d*2;
   }
 }

 // 最初の島のボス：奥の広場へ入ると戦闘開始。
 if(!stage.bossDefeated && !boss.active && player.x>1260){
   boss.active=true;
   stage.bossStarted=true;
   say('花の守護者！');
 }
 if(boss.active&&!boss.dead){
   boss.flash=Math.max(0,boss.flash-dt);
   boss.attackCd-=dt;
   const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;
   if(d>78){boss.x+=dx/d*boss.speed*dt;boss.y+=dy/d*boss.speed*dt}
   else if(boss.attackCd<=0){
     boss.attackCd=.95;
     if(player.jumpT>0){particle(player.x,player.y-45,'スカッ','#333',.35,14)}
     else if(shieldBlocks(boss)){particle((player.x+boss.x)/2,(player.y+boss.y)/2,'ガギィン！','#111',.5,24)}
     else if(player.inv<=0){const got=takeDamage(8);player.inv=.7;particle(player.x,player.y-35,`-${got}`,'#b31313',.45,18)}
   }
   if(boss.hp<=0){
     boss.dead=true;boss.active=false;stage.bossDefeated=true;stage.bridgeOpen=true;
     particle(boss.x,boss.y,'撃破！','#fff',.8,26);
     say('虹の橋が現れた！');
   }
 }


 
 if(stage.bridgeOpen && player.x>1880 && !stage2Started){
   stage2Started=true;currentStage=2;
   stage.checkpoint={x:1990,y:545};
   say('第2島：種まき草原');
 }

 if(stage2Started&&!stage2BossDefeated){
   for(const e of stage2Enemies){
     if(e.dead)continue;
     e.attackCd-=dt;e.flash=Math.max(0,e.flash-dt);
     const d=dist(player.x,player.y,e.x,e.y);
     // この雑魚は動かない。一定距離に入ると種を飛ばす。
     if(e.attackCd<=0&&d<360){
       e.attackCd=e.type==='seedflower'?1.35:1.6;
       const base=Math.atan2(player.y-e.y,player.x-e.x);
       const shots=e.type==='seedflower'?2:1;
       for(let i=0;i<shots;i++){
         const off=shots===1?0:(i-1)*.24;
         const a=base+off;
         projectiles.push({x:e.x,y:e.y-12,vx:Math.cos(a)*245,vy:Math.sin(a)*245,r:9,life:1.7,kind:'seed',damage:5,enemyShot:true,hit:false});
       }
       particle(e.x,e.y-30,'プッ！','#567d28',.3,14);
     }
   }

   if(!seedBoss.active&&!seedBoss.dead&&player.x>2940){
     seedBoss.active=true;say('種吹き大花！');
   }
   if(seedBoss.active&&!seedBoss.dead){
     seedBoss.flash=Math.max(0,seedBoss.flash-dt);
     seedBoss.attackCd-=dt;
     if(seedBoss.attackCd<=0){
       seedBoss.attackCd=1.05;seedBoss.phase++;
       const base=Math.atan2(player.y-seedBoss.y,player.x-seedBoss.x);
       // 正面5方向と、ときどき全周8方向を交互に撃つ。
       if(seedBoss.phase%4===0){
         for(let i=0;i<6;i++){
           const a=i*Math.PI/3+seedBoss.phase*.07;
           projectiles.push({x:seedBoss.x,y:seedBoss.y-10,vx:Math.cos(a)*225,vy:Math.sin(a)*225,r:11,life:1.9,kind:'seed',damage:6,enemyShot:true,hit:false});
         }
         particle(seedBoss.x,seedBoss.y-55,'パパパッ！','#567d28',.4,18);
       }else{
         for(const off of [-.28,0,.28]){
           const a=base+off;
           projectiles.push({x:seedBoss.x,y:seedBoss.y-10,vx:Math.cos(a)*255,vy:Math.sin(a)*255,r:11,life:1.7,kind:'seed',damage:6,enemyShot:true,hit:false});
         }
       }
     }
     if(seedBoss.hp<=0){
       seedBoss.dead=true;seedBoss.active=false;stage2BossDefeated=true;stage2BridgeOpen=true;
       particle(seedBoss.x,seedBoss.y,'撃破！','#fff',.8,26);
       say('次の島へ虹の橋！');
     }
   }
 }

if(stage2BridgeOpen && player.x>3470 && !stage3Started){
   stage3Started=true;currentStage=3;
   stage.checkpoint={x:3600,y:550};
   say('第3島。何か地面に刺さっている…');
 }


 if(stage3Started&&!spearPickup.taken&&dist(player.x,player.y,spearPickup.x,spearPickup.y)<58){
   spearPickup.taken=true;
   unlockedWeapons[1]=true;
   player.weapon=1;
   weaponNameEl.textContent=weapons[1].name;
   particle(spearPickup.x,spearPickup.y-30,'槍 GET！','#fff',.7,22);
   say('槍を手に入れた！');
 }

 if(stage3Started){
   for(const e of stage3Enemies){
     if(e.dead)continue;e.attackCd-=dt;e.flash=Math.max(0,e.flash-dt);e.hitReact=Math.max(0,(e.hitReact||0)-dt);
     const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
     e.attackWind=Math.max(0,(e.attackWind||0)-dt);e.attackAnim=Math.max(0,(e.attackAnim||0)-dt);
     if(d>66&&e.hitReact<=0&&e.attackWind<=0){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}
     if(d<=78&&e.attackCd<=0&&e.attackWind<=0){
       e.attackCd=1.05;e.attackWind=.30;particle(e.x,e.y-28,'…！','#555',.22,12);
     }
     if(e.attackWind>0&&e.attackWind<=.06&&!e.windHit){
       e.windHit=true;e.attackAnim=.18;
       particle((player.x+e.x)/2,(player.y+e.y)/2,'ブン！','#6a8b33',.25,14);
       if(dist(player.x,player.y,e.x,e.y)<90){
         if(player.jumpT>0)particle(player.x,player.y-45,'スカッ','#333',.3,13);
         else if(shieldBlocks(e))particle(player.x,player.y-25,'ガキン！','#111',.35,16);
         else if(player.inv<=0){const got=takeDamage(e.type==='walnut'?6:4);player.inv=.5;particle(player.x,player.y-35,`-${got}`,'#c11',.4,16)}
       }
     }
     if(e.attackWind<=0)e.windHit=false;
     if(d<54){player.x+=dx/d*3;player.y+=dy/d*3;}
   }
 }


 // ステージ3の敵を倒し、槍を拾ったらステージ4への橋が開く。
 if(stage3Started&&!stage3BridgeOpen&&spearPickup.taken&&player.x>4580){
   stage3BridgeOpen=true;
   say('ステージ4への虹の橋！');
 }

 if(stage3BridgeOpen&&player.x>4940&&!stage4Started){
   stage4Started=true;currentStage=4;stage.checkpoint={x:5050,y:545};
   say('ステージ4：ツル草原');
 }

 if(stage4Started&&!stage4Cleared){
   for(const e of stage4Enemies){
    if(e.dead)continue;e.attackCd-=dt;e.flash=Math.max(0,e.flash-dt);
    const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
    e.attackWind=Math.max(0,(e.attackWind||0)-dt);e.attackAnim=Math.max(0,(e.attackAnim||0)-dt);
    if(d>66&&e.attackWind<=0){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}

    if(e.type==='thorn'){
      // トゲは見た目通り、接触そのものが危険。
      if(d<58&&player.jumpT<=0&&player.inv<=0&&!shieldBlocks(e)){
        const got=takeDamage(5);player.inv=.5;particle(player.x,player.y-35,`-${got}`,'#c11',.4,16);
      }
    }else{
      // ツルは触れるだけでは無害。葉っぱ攻撃だけダメージ。
      if(d<=80&&e.attackCd<=0&&e.attackWind<=0){e.attackCd=1.0;e.attackWind=.3;particle(e.x,e.y-30,'…！','#555',.22,12)}
      if(e.attackWind>0&&e.attackWind<=.06&&!e.windHit){
        e.windHit=true;e.attackAnim=.18;particle((player.x+e.x)/2,(player.y+e.y)/2,'ビシッ！','#3a8d3f',.25,14);
        if(dist(player.x,player.y,e.x,e.y)<92){
          if(shieldBlocks(e))particle(player.x,player.y-25,'ガキン！','#111',.35,16);
          else if(player.jumpT<=0&&player.inv<=0){const got=takeDamage(5);player.inv=.5;particle(player.x,player.y-35,`-${got}`,'#c11',.4,16)}
        }
      }
      if(e.attackWind<=0)e.windHit=false;
    }
    if(d<54&&e.type!=='thorn'){player.x+=dx/d*3;player.y+=dy/d*3;}
   }
   if(player.x>5980){
    stage4Cleared=true;stage4BridgeOpen=true;say('ステージ5への虹の橋！');
   }
 }

 if(stage4BridgeOpen&&player.x>6250&&!stage5Started){
   stage5Started=true;currentStage=5;stage.checkpoint={x:6370,y:545};
   say('ステージ5：草原の最奥');
 }

 if(stage5Started&&!grassFinalBoss.dead){
   if(!grassFinalBoss.active&&player.x>7100){
    grassFinalBoss.active=true;say('大王ひまわり！');
   }
   if(grassFinalBoss.active){
    grassFinalBoss.flash=Math.max(0,grassFinalBoss.flash-dt);
    grassFinalBoss.attackCd-=dt;
    if(grassFinalBoss.attackCd<=0){
     grassFinalBoss.attackCd=.9;grassFinalBoss.phase++;
     const base=Math.atan2(player.y-grassFinalBoss.y,player.x-grassFinalBoss.x);
     // 3方向の種＋時々回転弾。ステージ2ボスより少し強い。
     if(grassFinalBoss.phase%4===0){
      for(let i=0;i<6;i++){
       const a=i*Math.PI/3+grassFinalBoss.phase*.09;
       projectiles.push({x:grassFinalBoss.x,y:grassFinalBoss.y-20,vx:Math.cos(a)*245,vy:Math.sin(a)*245,r:11,life:1.9,kind:'seed',damage:6,enemyShot:true,hit:false});
      }
     }else{
      for(const off of [-.3,0,.3]){
       const a=base+off;
       projectiles.push({x:grassFinalBoss.x,y:grassFinalBoss.y-20,vx:Math.cos(a)*270,vy:Math.sin(a)*270,r:11,life:1.7,kind:'seed',damage:6,enemyShot:true,hit:false});
      }
     }
    }
    if(grassFinalBoss.hp<=0){
     grassFinalBoss.dead=true;grassFinalBoss.active=false;grassAreaClear=true;
     particle(grassFinalBoss.x,grassFinalBoss.y,'AREA CLEAR！','#fff',1.0,28);
     say('草原エリア クリア！　新しい虹の橋が現れた！');
    }
   }
 }



 // 草原クリア後：風の庭園
 if(grassAreaClear&&player.x>8010&&!stage6Started){
   stage6Started=true;currentStage=6;stage.checkpoint={x:8170,y:545};
   say('風の庭園：風を操る植物たち');
 }
 if(stage6Started){
   for(const e of stage6Enemies){
     if(e.dead)continue;
     e.flash=Math.max(0,e.flash-dt);e.attackCd-=dt;
     const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;

     // このステージの敵は追い回さず、距離を取って風で攻撃。
     if(d<130){e.x-=dx/d*38*dt;e.y-=dy/d*38*dt}
     else if(d>280){e.x+=dx/d*24*dt;e.y+=dy/d*24*dt}

     if(e.attackCd<=0&&d<420){
       e.attackCd=e.type==='dandelion'?1.45:1.15;
       const a=Math.atan2(player.y-e.y,player.x-e.x);
       if(e.type==='dandelion'){
         // タンポポ：遅い綿毛。盾で受けやすい。
         for(const off of [-.16,.16]){
           projectiles.push({x:e.x,y:e.y-18,vx:Math.cos(a+off)*155,vy:Math.sin(a+off)*155,r:10,life:2.5,kind:'puff',damage:4,enemyShot:true,hit:false});
         }
         particle(e.x,e.y-28,'ふわっ','#fff',.35,14);
       }else{
         // 扇葉：一直線の風刃。予告を見て盾かジャンプ。
         projectiles.push({x:e.x,y:e.y-16,vx:Math.cos(a)*225,vy:Math.sin(a)*225,r:13,life:2.0,kind:'wind',damage:5,enemyShot:true,hit:false});
         particle(e.x,e.y-30,'シュッ！','#5cae78',.3,14);
       }
     }
   }
 }


 // 風の庭園の奥から岩の分かれ道へ
 if(stage6Started&&player.x>9540&&!stage7Started){
   stage7Started=true;currentStage=7;stage.checkpoint={x:9690,y:545};
   say('岩の分かれ道');
 }

 // ハンマー取得
 if(stage7Started&&!hammerPickup.taken&&dist(player.x,player.y,hammerPickup.x,hammerPickup.y)<62){
   hammerPickup.taken=true;
   unlockedWeapons[2]=true;
   player.weapon=2;
   weaponNameEl.textContent=weapons[2].name;
   particle(hammerPickup.x,hammerPickup.y-30,'ハンマー GET！','#fff',.8,22);
   say('ハンマーを手に入れた！ 岩もクルミも一撃！');
 }

 // ボス起動
 if(stage7Started&&hammerPickup.taken&&!rockBoss.dead&&!rockBoss.active&&player.x>11040){
   rockBoss.active=true;
   say('岩喰いグルミ！');
 }

 if(rockBoss.active&&!rockBoss.dead){
   rockBoss.flash=Math.max(0,rockBoss.flash-dt);
   rockBoss.attackCd-=dt;
   rockBoss.spawnCd-=dt;

   // 岩をプレイヤー方向へ転がす
   if(rockBoss.attackCd<=0){
     rockBoss.attackCd=1.2;
     const a=Math.atan2(player.y-rockBoss.y,player.x-rockBoss.x);
     rollingRocks.push({
       x:rockBoss.x-55,y:rockBoss.y+10,
       vx:Math.cos(a)*260,vy:Math.sin(a)*260,
       r:25,life:3.2,dead:false
     });
     particle(rockBoss.x-40,rockBoss.y,'ゴロゴロ！','#555',.35,16);
   }

   // クルミを定期的に生み出す
   if(rockBoss.spawnCd<=0){
     rockBoss.spawnCd=3.0;
     const a=Math.random()*Math.PI*2;
     bossWalnuts.push({
       x:rockBoss.x+Math.cos(a)*90,y:rockBoss.y+Math.sin(a)*70,
       r:28,hp:4,maxHp:4,dead:false,flash:0,attackCd:.7
     });
     particle(rockBoss.x,rockBoss.y-70,'ポン！','#9b6637',.35,16);
   }

   if(rockBoss.hp<=0){
     rockBoss.dead=true;rockBoss.active=false;rockBossDefeated=true;
     particle(rockBoss.x,rockBoss.y,'粉砕！','#fff',.9,26);
     say('岩喰いグルミ撃破！');
   }
 }

 // 転がる岩
 for(const r of rollingRocks){
   if(r.dead)continue;
   r.life-=dt;
   r.x+=r.vx*dt;r.y+=r.vy*dt;
   if(r.life<=0){r.dead=true;continue}
   if(dist(player.x,player.y,r.x,r.y)<player.r+r.r){
     if(player.jumpT>0){
       particle(player.x,player.y-40,'スカッ','#333',.25,13);
     }else if(shieldBlocks(r)){
       particle(r.x,r.y,'ガァン！','#111',.35,16);
       r.vx*=-.35;r.vy*=-.35;
     }else if(player.inv<=0){
       const got=takeDamage(7);player.inv=.55;
       particle(player.x,player.y-35,`-${got}`,'#c11',.4,16);
       r.dead=true;
     }
   }
 }

 // ボスが生むクルミ
 for(const e of bossWalnuts){
   if(e.dead)continue;
   e.flash=Math.max(0,e.flash-dt);e.attackCd-=dt;
   const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
   if(d>64){e.x+=dx/d*52*dt;e.y+=dy/d*52*dt}
   else if(e.attackCd<=0){
     e.attackCd=1.0;
     if(player.jumpT<=0&&!shieldBlocks(e)&&player.inv<=0){
       const got=takeDamage(5);player.inv=.5;
       particle(player.x,player.y-35,`-${got}`,'#c11',.4,16);
     }else if(shieldBlocks(e)){
       particle(player.x,player.y-25,'ガキン！','#111',.3,15);
     }
   }
 }


 powerFruitT=Math.max(0,powerFruitT-dt);
 guardFruitT=Math.max(0,guardFruitT-dt);
 for(const d of buffDrops){
   d.life-=dt;d.bob+=dt*4;
   if(d.life>0&&dist(player.x,player.y,d.x,d.y)<36){
     if(d.kind==='power'){
       powerFruitT=20;particle(d.x,d.y-18,'力の実！','#d33',.6,18);say('力の実：20秒 攻撃力アップ！');
     }else{
       guardFruitT=20;particle(d.x,d.y-18,'守りの実！','#3978c6',.6,18);say('守りの実：20秒 ダメージ半減！');
     }
     d.life=0;
   }
 }
 for(let i=buffDrops.length-1;i>=0;i--)if(buffDrops[i].life<=0)buffDrops.splice(i,1);


 for(const d of buffDrops){
   const yy=d.y+Math.sin(d.bob)*5;
   ctx.save();ctx.globalAlpha=Math.min(1,d.life);
   circle(d.x,yy,17,d.kind==='power'?'rgba(255,120,110,.25)':'rgba(120,180,255,.25)','transparent',0);
   circle(d.x,yy,9,d.kind==='power'?'#ef5a4f':'#67a7ee','#111',3);
   line(d.x+2,yy-8,d.x+7,yy-15,4,'#3b7d35');
   ctx.restore();
 }

 for(const d of healDrops){
   d.life-=dt;d.bob+=dt*4;
   if(d.life>0&&dist(player.x,player.y,d.x,d.y)<34){
     if(player.hp<player.maxHp){
       player.hp=Math.min(player.maxHp,player.hp+12);
       particle(d.x,d.y-15,'+12','#38a84a',.45,16);
       d.life=0;
     }
   }
 }
 for(let i=healDrops.length-1;i>=0;i--)if(healDrops[i].life<=0)healDrops.splice(i,1);



 // 通常ステージでは敵も落下死しない。レース専用コースのみ別扱い。


 for(const p of particles)p.life-=dt;while(particles.length&&particles[0].life<=0)particles.shift();
 hpfill.style.width=`${player.hp/player.maxHp*100}%`;
 camera.x=clamp(player.x-W/2,0,Math.max(0,world.w-W));camera.y=clamp(player.y-H/2,0,Math.max(0,world.h-H));
}

function line(x1,y1,x2,y2,w=5,color='#111'){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function circle(x,y,r,fill,stroke='#111',lw=5){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke()}
function roundRect(x,y,w,h,r,fill,stroke='#111',lw=5){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke()}

function drawWorld(){

 // 空と雲
 ctx.fillStyle='#82c9ef';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(-camera.x,-camera.y);

 // ステージ1：二段に見えない、一枚の浮遊島として描画。
 const s1=stageGeo.path[0];
 ctx.fillStyle='#7b5b3c';ctx.strokeStyle='#111';ctx.lineWidth=7;
 ctx.beginPath();
 ctx.roundRect(s1.x+18,s1.y+38,s1.w-36,s1.h+58,58);
 ctx.fill();ctx.stroke();
 ctx.fillStyle='#82cc6b';ctx.strokeStyle='#111';ctx.lineWidth=7;
 ctx.beginPath();ctx.roundRect(s1.x,s1.y,s1.w,s1.h,58);ctx.fill();ctx.stroke();

 
 // 第2島：種を飛ばす植物の草原
 if(stage.bridgeOpen){
   for(const r of stage2Geo.path){
     ctx.fillStyle='#77c765';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,48);ctx.fill();ctx.stroke();
     ctx.fillStyle='#73523a';ctx.globalAlpha=.9;
     ctx.beginPath();ctx.moveTo(r.x+30,r.y+r.h);ctx.lineTo(r.x+r.w-30,r.y+r.h);ctx.lineTo(r.x+r.w-80,r.y+r.h+58);ctx.lineTo(r.x+80,r.y+r.h+58);ctx.closePath();ctx.fill();
     ctx.globalAlpha=1;
   }
 }
 if(stage2BridgeOpen){
   const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
   cols.forEach((c,i)=>{
     ctx.strokeStyle=c;ctx.lineWidth=15;ctx.beginPath();
     ctx.moveTo(stage2Geo.bridge.x1,stage2Geo.bridge.y1+i*9-23);
     ctx.quadraticCurveTo(3420,535+i*6,stage2Geo.bridge.x2,stage2Geo.bridge.y2+i*9-23);
     ctx.stroke();
   });
 }

// 第3島：少し濃い草と木の実が多い草原
 if(stage2BridgeOpen){
   for(const r of stage3Geo.path){
     ctx.fillStyle='#69b85f';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,48);ctx.fill();ctx.stroke();
     ctx.fillStyle='#73523a';ctx.globalAlpha=.9;
     ctx.beginPath();ctx.moveTo(r.x+30,r.y+r.h);ctx.lineTo(r.x+r.w-30,r.y+r.h);ctx.lineTo(r.x+r.w-80,r.y+r.h+58);ctx.lineTo(r.x+80,r.y+r.h+58);ctx.closePath();ctx.fill();
     ctx.globalAlpha=1;
   }
 }


 // ステージ4
 if(stage3BridgeOpen){
  for(const r of stage4Geo.path){
   ctx.fillStyle='#62b957';ctx.strokeStyle='#111';ctx.lineWidth=7;
   ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,48);ctx.fill();ctx.stroke();
  }
  const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
  cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(4770,570+i*9-23);ctx.quadraticCurveTo(4865,530+i*6,4950,570+i*9-23);ctx.stroke()});
 }
 if(stage4BridgeOpen){
  for(const r of stage5Geo.path){
   ctx.fillStyle='#58ae51';ctx.strokeStyle='#111';ctx.lineWidth=7;
   ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,50);ctx.fill();ctx.stroke();
  }
  const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
  cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(stage4Geo.bridge.x1,stage4Geo.bridge.y1+i*9-23);ctx.quadraticCurveTo(6190,530+i*6,stage4Geo.bridge.x2,stage4Geo.bridge.y2+i*9-23);ctx.stroke()});
 }

 if(stage6Started){
   // 風の庭園から岩の分かれ道への橋
   const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
   cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(stage7Geo.bridge.x1,stage7Geo.bridge.y1+i*9-23);ctx.quadraticCurveTo(9505,505+i*6,stage7Geo.bridge.x2,stage7Geo.bridge.y2+i*9-23);ctx.stroke()});
   for(const r of stage7Geo.path){
     ctx.fillStyle='#89bf68';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,48);ctx.fill();ctx.stroke();
   }
 }

 if(grassAreaClear){
  // 次エリアへの虹の橋
  const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
  cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(stage6Geo.bridge.x1,stage6Geo.bridge.y1+i*9-23);ctx.quadraticCurveTo(7925,505+i*6,stage6Geo.bridge.x2,stage6Geo.bridge.y2+i*9-23);ctx.stroke()});
  for(const r of stage6Geo.path){
   ctx.fillStyle='#9bd77a';ctx.strokeStyle='#111';ctx.lineWidth=7;
   ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,52);ctx.fill();ctx.stroke();
   // 風の庭園らしい白い風模様
   ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#fff';ctx.lineWidth=12;ctx.lineCap='round';
   ctx.beginPath();ctx.arc(r.x+r.w*.48,r.y+r.h*.48,70,-2.7,.4);ctx.stroke();ctx.restore();
  }
 }

 // ボス後に現れる虹の橋
 if(stage.bridgeOpen){
   const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
   cols.forEach((c,i)=>{
     ctx.strokeStyle=c;ctx.lineWidth=15;ctx.beginPath();
     ctx.moveTo(stageGeo.bridge.x1,stageGeo.bridge.y1+i*9-23);
     ctx.quadraticCurveTo(1820,530+i*7,stageGeo.bridge.x2,stageGeo.bridge.y2+i*9-23);
     ctx.stroke();
   });
   ctx.fillStyle='#82cc6b';ctx.strokeStyle='#111';ctx.lineWidth=7;
   const ni=stageGeo.nextIsland;ctx.beginPath();ctx.roundRect(ni.x,ni.y,ni.w,ni.h,45);ctx.fill();ctx.stroke();
 }

 // 明るい草の道は「実際の地面」の内側だけに描く。
 // 島の輪郭でクリップして、空の上に緑が続いて見えないようにする。
 ctx.save();
 ctx.beginPath();ctx.roundRect(s1.x,s1.y,s1.w,s1.h,58);ctx.clip();
 ctx.strokeStyle='#b8e3a2';ctx.lineWidth=250;ctx.lineCap='round';ctx.lineJoin='round';
 ctx.beginPath();ctx.moveTo(170,570);ctx.lineTo(520,560);ctx.lineTo(800,580);ctx.lineTo(1060,520);ctx.lineTo(1330,610);ctx.lineTo(1580,565);ctx.stroke();
 ctx.restore();
 ctx.save();ctx.beginPath();ctx.roundRect(s1.x,s1.y,s1.w,s1.h,58);ctx.clip();
 ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=245;ctx.beginPath();ctx.moveTo(170,570);ctx.lineTo(520,560);ctx.lineTo(800,580);ctx.lineTo(1060,520);ctx.lineTo(1330,620);ctx.lineTo(1190,860);ctx.stroke();
 ctx.restore();
 // ground patches
 ctx.fillStyle='#a9df92';for(let x=80;x<world.w;x+=150)for(let y=90;y<world.h;y+=140){ctx.beginPath();ctx.arc(x+(y%3)*8,y,34,0,7);ctx.fill()}
 // water
 const wa=props.water;ctx.fillStyle=wa.frozen>0?'#bfeeff':'#60bdea';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(wa.x,wa.y,wa.w,wa.h,28);ctx.fill();ctx.stroke();if(wa.frozen>0){ctx.strokeStyle='#fff';ctx.lineWidth=3;for(let i=0;i<5;i++)line(wa.x+30+i*55,wa.y+15,wa.x+70+i*45,wa.y+wa.h-15,3,'rgba(255,255,255,.8)')}


 // 崖際の自然なガードレール。全部は囲わず、落ちられる場所も残す。
 for(const g of guardRails){
   ctx.save();
   if(g.type==='rock'){
     for(let x=g.x+14;x<g.x+g.w;x+=30){
       ctx.fillStyle='#8f918a';ctx.strokeStyle='#111';ctx.lineWidth=4;
       ctx.beginPath();ctx.ellipse(x,g.y+g.h/2,18,13,-.15,0,Math.PI*2);ctx.fill();ctx.stroke();
     }
   }else{
     for(let x=g.x+12;x<g.x+g.w;x+=26){
       circle(x,g.y+g.h/2,15,'#4b9f49','#111',4);
     }
   }
   ctx.restore();
 }

 // 剣で切らないと通れない小木
 for(const tr of props.smallTrees){
  if(tr.dead)continue;
  ctx.save();ctx.translate(tr.x,tr.y);
  line(0,12,0,37,12,'#111');line(0,12,0,37,6,'#7b4d2a');
  circle(-14,-2,18,'#4fae52','#111',5);circle(12,-6,20,'#56bc5d','#111',5);circle(0,-22,21,'#63c969','#111',5);
  ctx.restore();
 }
 // grass
 for(const g of props.grass){if(g.dead)continue;line(g.x-14,g.y+17,g.x,g.y-20,6,'#111');line(g.x,g.y+17,g.x+14,g.y-20,6,'#111');line(g.x,g.y+17,g.x,g.y-25,6,'#111');line(g.x-14,g.y+17,g.x,g.y-20,3,'#35a544');line(g.x,g.y+17,g.x+14,g.y-20,3,'#35a544');line(g.x,g.y+17,g.x,g.y-25,3,'#35a544')}
 // rocks
 for(const r of props.rocks){if(r.dead)continue;ctx.fillStyle='#999';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(r.x-30,r.y+18);ctx.lineTo(r.x-23,r.y-22);ctx.lineTo(r.x+5,r.y-34);ctx.lineTo(r.x+31,r.y-10);ctx.lineTo(r.x+24,r.y+24);ctx.closePath();ctx.fill();ctx.stroke()}
 for(const s of []){circle(s.x,s.y,24,s.on?'#7cff78':'#ffdb55','#111',6);circle(s.x,s.y,9,'#fff','#111',4)}
 for(const pr of projectiles)drawProjectile(pr);
 for(const e of enemies)if(!e.dead)drawEnemy(e);

 
 if(stage.bridgeOpen){
  for(const e of stage2Enemies){
   if(e.dead)continue;
   ctx.save();ctx.translate(e.x,e.y);
 if(e.flash>0){ctx.globalAlpha=.65;ctx.fillStyle='rgba(255,70,70,.48)';ctx.beginPath();ctx.arc(0,0,e.r+9,0,Math.PI*2);ctx.fill();}
   // 根を張って動かない種飛ばし植物
   line(0,10,0,35,12,'#111');line(0,10,0,35,6,'#4d9d48');
   line(-12,30,-27,40,8,'#111');line(12,30,27,40,8,'#111');
   const petals=e.type==='seedflower'?8:6;
   for(let i=0;i<petals;i++){
     const aa=i*Math.PI*2/petals;
     ctx.save();ctx.translate(Math.cos(aa)*20,Math.sin(aa)*20-10);ctx.rotate(aa);
     ctx.fillStyle=e.type==='seedflower'?'#ffa65b':'#8ed35d';ctx.strokeStyle='#111';ctx.lineWidth=4;
     ctx.beginPath();ctx.ellipse(0,0,9,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
   }
   circle(0,-10,15,'#6b8f32','#111',5);
   ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(5,-9,6,4,0,0,Math.PI*2);ctx.fill();
   ctx.restore();
  }

  if(!seedBoss.dead&&seedBoss.active){
   ctx.save();ctx.translate(seedBoss.x,seedBoss.y);if(seedBoss.flash>0)ctx.globalAlpha=.55;
   line(0,18,0,70,24,'#111');line(0,18,0,70,13,'#4c9342');
   for(let i=0;i<12;i++){
     const aa=i*Math.PI/6;
     ctx.save();ctx.translate(Math.cos(aa)*46,Math.sin(aa)*46-18);ctx.rotate(aa);
     ctx.fillStyle=i%2?'#ff9d4d':'#ffd35c';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.ellipse(0,0,17,31,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
   }
   circle(0,-18,38,'#738e32','#111',7);
   // 大きな種発射口
   ctx.fillStyle='#17120c';ctx.beginPath();ctx.ellipse(12,-16,13,9,0,0,Math.PI*2);ctx.fill();
   circle(-12,-26,5,'#111','#111',1);
   ctx.restore();
   ctx.fillStyle='#111';ctx.fillRect(seedBoss.x-92,seedBoss.y-110,184,16);
   ctx.fillStyle='#e84a3a';ctx.fillRect(seedBoss.x-88,seedBoss.y-106,176*Math.max(0,seedBoss.hp/seedBoss.maxHp),8);
  }
 }


 if(stage3Started&&!spearPickup.taken){
   ctx.save();ctx.translate(spearPickup.x,spearPickup.y);
   // 地面に斜めに刺さった槍
   ctx.rotate(-.28);
   line(0,18,0,-54,12,'#111');
   line(0,18,0,-54,6,'#8b5a35');
   ctx.fillStyle='#e9eef2';ctx.strokeStyle='#111';ctx.lineWidth=5;
   ctx.beginPath();ctx.moveTo(0,-74);ctx.lineTo(-10,-50);ctx.lineTo(10,-50);ctx.closePath();ctx.fill();ctx.stroke();
   line(-14,-42,14,-42,7,'#111');
   line(-12,-42,12,-42,3,'#e5b33b');
   ctx.restore();
   particle(spearPickup.x,spearPickup.y-70,'！','#ffe15a',.12,18);
 }

 if(stage2BridgeOpen){
  for(const e of stage3Enemies){
   if(e.dead)continue;
   ctx.save();ctx.translate(e.x,e.y);
   if(e.flash>0){ctx.fillStyle='rgba(255,70,70,.48)';ctx.beginPath();ctx.arc(0,0,e.r+9,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.7;}
   if(e.type==='walnut'){
     // 硬いクルミ。わずかな顔の隙間。
     ctx.fillStyle='#9b6637';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.ellipse(0,0,29,34,0,0,Math.PI*2);ctx.fill();ctx.stroke();
     line(0,-29,0,29,5,'#5d351f');
     ctx.fillStyle='#18120e';ctx.fillRect(-5,-10,10,20);
     circle(-1,-4,2.5,'#fff','#111',1);
   }else if(e.type==='acorn'){
     circle(0,2,21,'#a86a36','#111',6);
     ctx.fillStyle='#6c4828';ctx.strokeStyle='#111';ctx.lineWidth=5;
     ctx.beginPath();ctx.arc(0,-8,22,Math.PI,Math.PI*2);ctx.lineTo(20,-6);ctx.lineTo(-20,-6);ctx.closePath();ctx.fill();ctx.stroke();
     line(-7,18,-10,30,7,'#111');line(7,18,10,30,7,'#111');
     circle(-6,1,3,'#111','#111',1);circle(6,1,3,'#111','#111',1);
   }else{
     // stage1 flower reuse-ish
     for(let i=0;i<8;i++){const aa=i*Math.PI/4;ctx.save();ctx.translate(Math.cos(aa)*18,Math.sin(aa)*18-8);ctx.rotate(aa);ctx.fillStyle='#f49ad0';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,9,15,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
     circle(0,-8,15,'#ffd85a','#111',5);line(0,6,0,28,8,'#111');line(0,6,0,28,4,'#4fae52');
   }
   ctx.restore();
  }
 }



 if(stage3BridgeOpen){
  for(const e of stage4Enemies){
   if(e.dead)continue;
   ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.65;
   if(e.type==='vine'){
    line(-10,25,0,-18,9,'#111');line(-10,25,0,-18,4,'#37924a');
    line(10,25,0,-18,9,'#111');line(10,25,0,-18,4,'#37924a');
    circle(0,-20,19,'#6dc95e','#111',5);circle(-6,-23,3,'#111','#111',1);circle(6,-23,3,'#111','#111',1);
   }else{
    circle(0,0,25,'#62b24e','#111',6);
    for(let i=0;i<8;i++){const aa=i*Math.PI/4;line(Math.cos(aa)*18,Math.sin(aa)*18,Math.cos(aa)*34,Math.sin(aa)*34,7,'#111');line(Math.cos(aa)*18,Math.sin(aa)*18,Math.cos(aa)*34,Math.sin(aa)*34,3,'#9dcb55')}
    circle(-7,-4,3,'#111','#111',1);circle(7,-4,3,'#111','#111',1);
   }
   ctx.restore();
  }
 }
 if(stage5Started&&!grassFinalBoss.dead){
  ctx.save();ctx.translate(grassFinalBoss.x,grassFinalBoss.y);
  if(grassFinalBoss.flash>0)ctx.globalAlpha=.6;
  line(0,15,0,78,26,'#111');line(0,15,0,78,14,'#4a9a43');
  for(let i=0;i<12;i++){const aa=i*Math.PI/6;ctx.save();ctx.translate(Math.cos(aa)*52,Math.sin(aa)*52-22);ctx.rotate(aa);ctx.fillStyle='#ffd34f';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(0,0,18,33,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
  circle(0,-22,42,'#7b6a2e','#111',8);circle(-14,-28,6,'#111','#111',1);circle(14,-28,6,'#111','#111',1);line(-15,-4,15,-4,6,'#111');
  ctx.restore();
  if(grassFinalBoss.active){
   ctx.fillStyle='#111';ctx.fillRect(grassFinalBoss.x-105,grassFinalBoss.y-125,210,16);
   ctx.fillStyle='#e84a3a';ctx.fillRect(grassFinalBoss.x-101,grassFinalBoss.y-121,202*Math.max(0,grassFinalBoss.hp/grassFinalBoss.maxHp),8);
  }
 }


 // 風の庭園の敵
 if(stage6Started){
  for(const e of stage6Enemies){
   if(e.dead)continue;
   ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.55;
   if(e.type==='dandelion'){
    line(0,8,0,32,12,'#111');line(0,8,0,32,6,'#4c9c48');
    for(let i=0;i<10;i++){const a=i*Math.PI/5;circle(Math.cos(a)*20,Math.sin(a)*20-12,7,'#fff','#111',3)}
    circle(0,-12,16,'#f4e9a5','#111',5);circle(-5,-14,2.5,'#111','#111',1);circle(5,-14,2.5,'#111','#111',1);
   }else{
    line(0,5,0,35,13,'#111');line(0,5,0,35,7,'#478e42');
    ctx.fillStyle='#68c85e';ctx.strokeStyle='#111';ctx.lineWidth=6;
    ctx.beginPath();ctx.ellipse(-18,-8,24,13,-.5,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(18,-8,24,13,.5,0,Math.PI*2);ctx.fill();ctx.stroke();
    circle(0,-12,15,'#d7ef83','#111',5);circle(-5,-14,2.5,'#111','#111',1);circle(5,-14,2.5,'#111','#111',1);
   }
   ctx.restore();
  }
 }

 if(stage7Started){
   for(const r of stage7Rocks){
     if(r.dead)continue;
     ctx.fillStyle='#8c8f88';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.fill();ctx.stroke();
     line(r.x-r.r*.4,r.y-5,r.x+r.r*.25,r.y-15,4,'#666');
   }

   if(!hammerPickup.taken){
     ctx.save();ctx.translate(hammerPickup.x,hammerPickup.y);
     ctx.rotate(-.35);
     line(0,30,0,-25,12,'#111');line(0,30,0,-25,6,'#8b5c3b');
     roundRect(-22,-48,44,28,7,'#aaa','#111',6);
     ctx.restore();
     particle(hammerPickup.x,hammerPickup.y-70,'！','#ffe15a',.12,18);
   }

   for(const r of rollingRocks){
     if(r.dead)continue;
     circle(r.x,r.y,r.r,'#858781','#111',6);
     line(r.x-10,r.y-6,r.x+9,r.y-13,4,'#666');
   }

   for(const e of bossWalnuts){
     if(e.dead)continue;
     ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;
     ctx.fillStyle='#9b6637';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.ellipse(0,0,28,33,0,0,Math.PI*2);ctx.fill();ctx.stroke();
     line(0,-28,0,28,5,'#5d351f');circle(-6,-5,3,'#111','#111',1);circle(6,-5,3,'#111','#111',1);
     ctx.restore();
   }

   if(!rockBoss.dead){
     ctx.save();ctx.translate(rockBoss.x,rockBoss.y);if(rockBoss.flash>0)ctx.globalAlpha=.55;
     // 岩殻＋クルミ顔の大型ボス
     circle(0,0,68,'#7f817b','#111',8);
     circle(0,-5,48,'#9b6637','#111',7);
     line(0,-45,0,35,6,'#5d351f');
     circle(-17,-12,6,'#111','#111',1);circle(17,-12,6,'#111','#111',1);
     line(-20,17,20,17,7,'#111');
     ctx.restore();
     if(rockBoss.active){
       ctx.fillStyle='#111';ctx.fillRect(rockBoss.x-112,rockBoss.y-115,224,16);
       ctx.fillStyle='#e84a3a';ctx.fillRect(rockBoss.x-108,rockBoss.y-111,216*Math.max(0,rockBoss.hp/rockBoss.maxHp),8);
     }
   }
 }

 if(!boss.dead){
   ctx.save();ctx.translate(boss.x,boss.y);if(boss.flash>0)ctx.globalAlpha=.55;
   line(0,15,0,55,18,'#111');line(0,15,0,55,10,'#4e9e49');
   line(-4,48,-28,68,12,'#111');line(-4,48,-28,68,6,'#765038');
   line(4,48,28,68,12,'#111');line(4,48,28,68,6,'#765038');
   for(let i=0;i<10;i++){const aa=i*Math.PI/5;ctx.save();ctx.translate(Math.cos(aa)*39,Math.sin(aa)*39-15);ctx.rotate(aa);ctx.fillStyle=i%2?'#f092ce':'#ef70bd';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(0,0,15,28,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
   circle(0,-15,34,'#ffd552','#111',7);circle(-11,-20,5,'#111','#111',1);circle(11,-20,5,'#111','#111',1);line(-13,-1,13,-1,6,'#111');
   ctx.restore();
   ctx.fillStyle='#111';ctx.fillRect(boss.x-90,boss.y-95,180,16);ctx.fillStyle='#e84a3a';ctx.fillRect(boss.x-86,boss.y-91,172*Math.max(0,boss.hp/boss.maxHp),8);
 }
 drawStaffSkillEffects();
 drawPlayer();
 // 攻撃エフェクトはキャラと同じワールド座標系で描画。
 drawSwordSkillEffect();
 drawChargeEffects();
 drawSpinSlash();
 drawObjectiveArrow();
 for(const p of particles)if(p.life>0){ctx.save();ctx.globalAlpha=Math.min(1,p.life/.18);ctx.fillStyle=p.color;ctx.font=`900 ${p.size}px system-ui`;ctx.textAlign='center';ctx.strokeStyle='white';ctx.lineWidth=4;ctx.strokeText(p.text,p.x,p.y-(1-p.life/p.max)*25);ctx.fillText(p.text,p.x,p.y-(1-p.life/p.max)*25);ctx.restore()}
 ctx.restore();
}

function drawObjectiveArrow(){
 let tx,ty;
 if(!stage.bossDefeated){tx=boss.x;ty=boss.y;}
 else if(!stage2Started){tx=stage2Geo.path[0].x+120;ty=stage2Geo.path[0].y+150;}
 else if(!stage2BossDefeated){tx=seedBoss.x;ty=seedBoss.y;}
 else if(!stage3Started){tx=stage3Geo.path[0].x+130;ty=stage3Geo.path[0].y+150;}
 else if(!spearPickup.taken){tx=spearPickup.x;ty=spearPickup.y;}
 else if(!stage3BridgeOpen){tx=stage3Geo.path[stage3Geo.path.length-1].x+150;ty=550;}
 else if(!stage4Started){tx=stage4Geo.path[0].x+120;ty=540;}
 else if(!stage4Cleared){tx=stage4Geo.path[stage4Geo.path.length-1].x+180;ty=540;}
 else if(!stage5Started){tx=stage5Geo.path[0].x+130;ty=540;}
 else if(!grassAreaClear){tx=grassFinalBoss.x;ty=grassFinalBoss.y;}
 else if(!stage7Started){tx=stage7Geo.path[0].x+120;ty=550;}
 else if(!hammerPickup.taken){tx=hammerPickup.x;ty=hammerPickup.y;}
 else if(!rockBossDefeated){tx=rockBoss.x;ty=rockBoss.y;}
 else return;

 const dx=tx-player.x,dy=ty-player.y,d=Math.hypot(dx,dy);
 if(d<220)return;
 const a=Math.atan2(dy,dx);
 const x=player.x+Math.cos(a)*105,y=player.y+Math.sin(a)*105-70;
 ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=.45;
 ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-12,-11);ctx.lineTo(-5,0);ctx.lineTo(-12,11);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.restore();
}

function drawProjectile(pr){
 ctx.save();ctx.translate(pr.x,pr.y);
 const a=Math.atan2(pr.vy,pr.vx);ctx.rotate(a);
 if(pr.kind==='seed'){
   ctx.globalAlpha=.24;circle(0,0,pr.r+8,'#c9df78','transparent',0);
   ctx.globalAlpha=1;
   // 種らしい楕円形
   ctx.fillStyle='#718f39';ctx.strokeStyle='#111';ctx.lineWidth=4;
   ctx.beginPath();ctx.ellipse(0,0,pr.r+3,pr.r*.65,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   line(-pr.r-10,0,-pr.r+2,0,5,'#a8c35e');
 }else{
   ctx.globalAlpha=.28;
   circle(0,0,pr.r+9,pr.kind==='fire'?'#ff9b45':'#b8ecff','transparent',0);
   ctx.globalAlpha=1;
   circle(0,0,pr.r,pr.kind==='fire'?'#ff6247':'#63d7ff','#111',4);
   line(-pr.r-12,0,-pr.r+1,0,7,pr.kind==='fire'?'#ffcf58':'#eafcff');
 }
 ctx.restore();
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;
 if(e.type==='grass'){
   line(-7,12,-10,27,9,'#111');line(-7,12,-10,27,5,'#765038');
   line(7,12,10,27,9,'#111');line(7,12,10,27,5,'#765038');
   for(let i=-2;i<=2;i++){ctx.save();ctx.rotate(i*.27);ctx.fillStyle='#42b84e';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-6,9,27,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
   circle(-7,-3,3,'#111','#111',1);circle(7,-3,3,'#111','#111',1);line(-7,8,7,8,4,'#111');
 }else{
   line(0,5,0,24,10,'#111');line(0,5,0,24,5,'#4fae52');
   line(-2,21,-12,31,8,'#111');line(-2,21,-12,31,4,'#765038');
   line(2,21,12,31,8,'#111');line(2,21,12,31,4,'#765038');
   for(let i=0;i<8;i++){const aa=i*Math.PI/4;ctx.save();ctx.translate(Math.cos(aa)*18,Math.sin(aa)*18-8);ctx.rotate(aa);ctx.fillStyle='#f49ad0';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,9,15,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
   circle(0,-8,15,'#ffd85a','#111',5);circle(-5,-11,2.5,'#111','#111',1);circle(5,-11,2.5,'#111','#111',1);line(-6,-2,6,-2,3,'#111');
 }
 if(e.attackAnim>0){
   ctx.save();ctx.globalAlpha=Math.min(1,e.attackAnim/.12);
   ctx.strokeStyle='#43a84d';ctx.lineWidth=8;ctx.lineCap='round';
   ctx.beginPath();ctx.arc(0,-2,35,-.8,.8);ctx.stroke();
   ctx.restore();
 }
 ctx.restore();
}

function drawPlayer(){
 const jumpNorm=player.jumpT>0?1-player.jumpT/player.jumpDur:0;
 const normalLift=player.jumpT>0?Math.sin(jumpNorm*Math.PI)*player.jumpHeight*shields[player.shieldType].jump:0;
 // 通常ジャンプだけでなくハンマーチャージの高さもキャラ全体に反映。
 const lift=Math.max(normalLift,player.jumpZ||0,player.skillZ||0);
 const moving=player.moveMag>.16&&player.jumpT<=0;
 const step=moving?Math.sin(player.walkPhase):0;
 const bounce=moving?Math.abs(Math.sin(player.walkPhase))*2:0;
 ctx.save();ctx.translate(player.x,player.y-lift-bounce);
 if(player.skillKind==='hammer'&&player.skillT>0&&player.skillElapsed>=.24){ctx.rotate(player.hammerSpin||0);}
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
 // head and ears: 白をメイン、水色はアクセント
 ctx.fillStyle='#f7fbff';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-20,-8);ctx.lineTo(-17,-36);ctx.lineTo(-5,-24);ctx.quadraticCurveTo(0,-28,5,-24);ctx.lineTo(17,-36);ctx.lineTo(20,-8);ctx.quadraticCurveTo(19,8,0,10);ctx.quadraticCurveTo(-19,8,-20,-8);ctx.closePath();ctx.fill();ctx.stroke();
 // 水色の前髪アクセント
 ctx.fillStyle='#7bdaf1';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,-18);ctx.lineTo(-3,-24);ctx.lineTo(2,-20);ctx.lineTo(8,-24);ctx.lineTo(12,-17);ctx.lineTo(0,-13);ctx.closePath();ctx.fill();ctx.stroke();
 // ear inner color
 ctx.fillStyle='#f3a9b7';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-14,-30);ctx.lineTo(-8,-22);ctx.lineTo(-15,-18);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(14,-30);ctx.lineTo(8,-22);ctx.lineTo(15,-18);ctx.closePath();ctx.fill();ctx.stroke();
 if(f==='down'){
   circle(-8,-9,3,'#111','#111',1);circle(8,-9,3,'#111','#111',1);
   ctx.fillStyle='#f7fbff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,1,12,9,0,0,7);ctx.fill();ctx.stroke();circle(0,-2,3.5,'#111','#111',1);
 }else if(f==='up'){
   line(-11,-7,11,-7,4,'#74d5ef');
 }else{
   circle(f==='right'?8:-8,-9,3,'#111','#111',1);ctx.fillStyle='#f7fbff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f==='right'?10:-10,0,9,7,0,0,7);ctx.fill();ctx.stroke();circle(f==='right'?15:-15,-1,3,'#111','#111',1);
 }
 // arms. character-right always weapon, character-left always shield.
 const handR={x:rightX*23+frontX*5,y:rightY*19+frontY*5+3+(f==='right'?18:0)};
 const handL={x:-rightX*23+frontX*5,y:-rightY*19+frontY*5+3};
 if(f!=='right'&&f!=='up'){line(rightX*8,5,handR.x,handR.y,10,'#111');line(rightX*8,5,handR.x,handR.y,5,'#f7fbff');}
 line(-rightX*8,5,handL.x,handL.y,10,'#111');line(-rightX*8,5,handL.x,handL.y,5,'#f7fbff');
 // actual weapon motion
 let wa=player.aim;
 let thrust=0;

 // 剣スキル：頭上で振りかぶり、着地時に縦〜斜めへ振り下ろす。
 if(player.skillKind==='sword'&&player.skillT>0){
   const st=player.skillElapsed;
   if(st<.43){
     wa=player.skillBase-1.38;
   }else if(st<.59){
     const q=Math.max(0,Math.min(1,(st-.43)/.16));
     wa=(player.skillBase-1.38)+2.48*q;
   }else{
     wa=player.skillBase+1.10;
   }
 }

 // 槍スキル：前進側の着地だけ斜め前へ槍を向ける。
 if(player.skillKind==='spear'&&player.skillT>0){
   if(player.skillElapsed>=.42&&player.skillElapsed<.58){
     wa=player.skillBase+.72;thrust=10;
   }else{
     wa=player.skillBase;
   }
 }

 // 武器アニメーションはここだけで決める。後段で wa / thrust を上書きしない。
 if(player.attacking>0 && !player.spin && player.skillKind!=='sword'){
   const t=1-Math.max(0,Math.min(1,player.attacking/player.attackMax));

   if(player.weapon===0){
     // 剣
     if(f==='left'){
       // 左向き：左上 → 左下への振り下ろし
       wa=-Math.PI*0.75 - t*Math.PI*0.50;
     }else{
       // その他：狙い方向を中心に薙ぐ
       wa=player.aim-.95+t*1.9;
     }

   }else if(player.weapon===1){
     // 槍：角度固定で前へ突く
     wa=player.aim;
     thrust=Math.sin(t*Math.PI)*20;

   }else if(player.weapon===2){
     // ハンマー
     if(player.hammerSmash>0){
       const hp=Math.min(1,player.hammerSmashT/.72);
       // 空中では振りかぶり、着地直前の最後12%で一気に振り下ろす。
       const slam=Math.max(0,Math.min(1,(hp-.88)/.12));
       if(f==='left'){
         wa=-Math.PI*.72-slam*Math.PI*.58;
       }else{
         wa=player.aim-1.28+slam*2.55;
       }
     }else if(f==='left'){
       // 左向き：左上 → 左下への振り下ろし
       wa=-Math.PI*0.72 - t*Math.PI*0.58;
     }else{
       wa=player.aim-1.15+t*2.25;
     }

   }else{
     // 杖：向きは固定、少しだけ前へ出す
     wa=player.aim;
     thrust=Math.sin(t*Math.PI)*7;
   }
 }
 let sx=handL.x+frontX*(player.shield?22:10), sy=handL.y+frontY*(player.shield?22:10);
 if(f==='right') sy+=18;
 if(f==='left')  sy+=15;
 if(f==='up'){sx-=4;sy+=11;}

 // 向きごとの前後関係を固定する。
 // up: 盾(裏面+左手) → 武器 → 身体
 // right: 武器/右手は身体の奥 → 身体 → 盾
 // left: 盾 → 身体 → 武器/右手
 if(f==='up'){
   drawShieldBack(sx,sy,a,player.shield);
   drawWeapon(handR.x,handR.y+8,wa,thrust);
   redrawBodyLayer(f);
 }else if(f==='right'){
   // P09 右向き：盾は身体の真後ろ。外周が少しだけ覗く。
   // 通常時は背中側から縁だけ。盾ボタン中は身体の前方へ出す。
   // どちらも身体より奥のレイヤーに描く。
   const rsx=player.shield?18:-18, rsy=player.shield?2:5;
   if(player.shield){
     // 左腕は身体の奥から前へ伸び、盾の裏を支える。
     line(-3,5,rsx-7,rsy+2,12,'#111');
     line(-3,5,rsx-7,rsy+2,6,'#f7fbff');
     circle(rsx-7,rsy+2,6,'#f7fbff','#111',4);
   }
   drawShield(rsx,rsy,a,player.shield,true);
   // 右腕・剣は腰より少し上。腕の根元は身体に隠す。
   const rwx=20, rwy=13;
   line(5,7,rwx,rwy,11,'#111');line(5,7,rwx,rwy,6,'#f7fbff');
   drawWeapon(rwx,rwy,wa,thrust);
   redrawBodyLayer(f);
 }else if(f==='left'){
   // P09 左向き：剣/右腕は最奥、身体、盾腕、盾の順。
   const lwx=-18, lwy=12;
   drawWeapon(lwx,lwy,wa,thrust);
   redrawBodyLayer(f);
   // 左腕を胸の前から前方へ伸ばし、盾の中央裏を掴む。
   const lsx=-31, lsy=-1;
   line(-7,5,lsx+8,lsy+1,13,'#111');
   line(-7,5,lsx+8,lsy+1,7,'#f7fbff');
   circle(lsx+7,lsy+1,6,'#f7fbff','#111',4);
   drawShield(lsx,lsy,a,player.shield,true);
 }else{
   drawWeapon(handR.x,handR.y,wa,thrust);
   drawShield(sx,sy,a,player.shield,false);
 }
 if(player.skillKind==='sword'&&player.skillElapsed>=.43&&player.skillElapsed<.59){
   drawSwordDropSlash(player.skillBase,(player.skillElapsed-.43)/.16);
 }
 if(player.attacking>0&&player.weapon===0)drawAttackArc(player.aim);
 if(player.attacking>0&&player.weapon===2)drawAttackArc(player.aim);
 if(player.attacking>0&&player.weapon===1)drawThrustStreak(player.aim);
 if(player.charging){ctx.strokeStyle='#ffe551';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-5,43,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}


function drawSwordDropSlash(base,p){
 ctx.save();ctx.rotate(base);ctx.globalAlpha=.78*(1-p*.35);ctx.lineCap='round';
 ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=15;
 ctx.beginPath();ctx.arc(6,0,58,-1.42,-1.42+2.42*Math.max(.22,p));ctx.stroke();
 ctx.strokeStyle='rgba(20,20,20,.35)';ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(6,0,58,-1.42,-1.42+2.42*Math.max(.22,p));ctx.stroke();
 ctx.restore();
}

function redrawBodyLayer(f){
 // 装備の前後関係を成立させるため、胴体と頭を手前に描き直す。
 roundRect(-18,-1,36,27,10,'#2d78c4','#111',6);
 ctx.fillStyle='#f1c84b';ctx.strokeStyle='#111';ctx.lineWidth=4;
 ctx.beginPath();ctx.moveTo(-18,15);ctx.lineTo(18,15);ctx.lineTo(14,25);ctx.lineTo(-14,25);ctx.closePath();ctx.fill();ctx.stroke();
 line(-14,12,14,12,5,'#6e432b');circle(0,12,4,'#f2c14e','#111',2);
 ctx.fillStyle='#f7fbff';ctx.strokeStyle='#111';ctx.lineWidth=6;
 ctx.beginPath();ctx.moveTo(-20,-8);ctx.lineTo(-17,-36);ctx.lineTo(-5,-24);ctx.quadraticCurveTo(0,-28,5,-24);ctx.lineTo(17,-36);ctx.lineTo(20,-8);ctx.quadraticCurveTo(19,8,0,10);ctx.quadraticCurveTo(-19,8,-20,-8);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#7bdaf1';ctx.strokeStyle='#111';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(-10,-18);ctx.lineTo(-3,-24);ctx.lineTo(2,-20);ctx.lineTo(8,-24);ctx.lineTo(12,-17);ctx.lineTo(0,-13);ctx.closePath();ctx.fill();ctx.stroke();
 if(f==='up') line(-11,-7,11,-7,4,'#74d5ef');
 else if(f==='right'||f==='left'){
   circle(f==='right'?8:-8,-9,3,'#111','#111',1);
   ctx.fillStyle='#f7fbff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f==='right'?10:-10,0,9,7,0,0,7);ctx.fill();ctx.stroke();circle(f==='right'?15:-15,-1,3,'#111','#111',1);
 }
}
function drawShieldBack(hx,hy,a,raised){
 ctx.save();ctx.translate(hx,hy);const r=raised?34:27;
 circle(0,0,r,'#9aa6ad','#111',7);
 circle(0,0,r*.72,'#7f8b92','#59636a',4);
 // 裏面のベルトと、左手で握っているのが見える。
 ctx.save();ctx.rotate(a);
 roundRect(-19,-7,38,14,7,'#6e432b','#111',4);
 line(-12,-18,-12,18,7,'#111');line(-12,-15,-12,15,3,'#b47a49');
 circle(-7,0,7,'#f7fbff','#111',4);
 ctx.restore();ctx.restore();
}
function drawWeapon(hx,hy,a,ext=0){const w=player.weapon;ctx.save();ctx.translate(hx+Math.cos(a)*ext,hy+Math.sin(a)*ext);ctx.rotate(a);ctx.lineCap='round';if(w===0){line(0,0,45,0,11,'#111');line(0,0,45,0,5,'#eef5fa');line(5,-11,5,11,7,'#111');line(5,-7,5,7,3,'#d8a93d')}
 else if(w===1){line(-3,0,62,0,9,'#111');line(-3,0,62,0,4,'#b9783d');ctx.fillStyle='#e8eef2';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(62,-10);ctx.lineTo(82,0);ctx.lineTo(62,10);ctx.closePath();ctx.fill();ctx.stroke()}
 else if(w===2){line(0,0,38,0,11,'#111');line(0,0,38,0,5,'#8b5c3b');roundRect(29,-17,34,34,7,'#9ea6ad','#111',6)}
 else {line(-2,0,45,0,10,'#111');line(-2,0,45,0,5,'#6d3e2a');circle(50,0,11,w===3?'#ff5a4f':'#69c9ff','#111',5);circle(50,0,4,'#fff','#111',2)}ctx.restore()}
function drawShield(hx,hy,a,raised,sideView=false){
 ctx.save();ctx.translate(hx,hy);const r=raised?34:27;
 if(sideView){
   ctx.fillStyle='#e5eef3';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(0,0,r*.43,r,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.strokeStyle='#4f90bd';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,r*.28,r*.72,0,0,Math.PI*2);ctx.stroke();circle(0,0,5,'#f0c94d','#111',3);
 }else{circle(0,0,r,'#e5eef3','#111',7);circle(0,0,r*.72,'#d8edf7','#4f90bd',5);circle(0,0,8,'#f0c94d','#111',4)}
 ctx.restore();
}
function drawThrustStreak(a){const t=1-player.attacking/player.attackMax;ctx.save();ctx.rotate(a);ctx.globalAlpha=.62*Math.sin(t*Math.PI);line(38,-5,112,-5,7,'rgba(255,255,255,.75)');line(45,7,100,7,4,'rgba(255,255,255,.45)');ctx.restore()}




function drawStaffSkillEffects(){
 // 地面に残る炎
 if(player.fireTrail.length){
   for(const f of player.fireTrail){
     ctx.save();ctx.globalAlpha=Math.min(.7,f.life);
     ctx.fillStyle='rgba(255,85,20,.8)';
     ctx.beginPath();ctx.arc(f.x,f.y,18,0,Math.PI*2);ctx.fill();
     ctx.strokeStyle='rgba(255,210,60,.9)';ctx.lineWidth=4;ctx.stroke();
     ctx.restore();
   }
 }

 // 青杖スキルの通過跡：火ではなく氷のキラキラ。
 if(player.iceTrail.length){
   const tm=performance.now()*.012;
   for(const f of player.iceTrail){
     ctx.save();ctx.translate(f.x,f.y);
     ctx.globalAlpha=Math.min(.75,f.life*.72);
     ctx.strokeStyle='rgba(225,252,255,.95)';
     ctx.lineWidth=3;
     for(let i=0;i<3;i++){
       const a=f.phase+i*2.1+tm*.18;
       const ox=Math.cos(a)*12,oy=Math.sin(a)*7;
       const r=5+i*2;
       ctx.beginPath();
       ctx.moveTo(ox-r,oy);ctx.lineTo(ox+r,oy);
       ctx.moveTo(ox,oy-r);ctx.lineTo(ox,oy+r);
       ctx.stroke();
     }
     ctx.restore();
   }
 }

 if(player.skillT<=0)return;

 if(player.skillKind==='fire'){
   ctx.save();ctx.translate(player.x,player.y-(player.skillZ||0));
   const t=performance.now()*.018;
   ctx.globalAlpha=.8;
   ctx.strokeStyle='rgba(255,110,30,.95)';
   ctx.lineWidth=12;
   ctx.beginPath();ctx.arc(0,0,42,0,Math.PI*2);ctx.stroke();
   ctx.strokeStyle='rgba(255,220,90,.9)';
   ctx.lineWidth=5;
   for(let i=0;i<5;i++){
     const a=t+i*Math.PI*2/5;
     ctx.beginPath();ctx.arc(Math.cos(a)*35,Math.sin(a)*35,9,0,Math.PI*2);ctx.stroke();
   }
   ctx.restore();

 }else if(player.skillKind==='ice'){
   // 氷板はキャラの正面ではなく「足元」。キャラの下に敷く。
   // drawPlayerより後に呼ばれるため、足と重ならないよう下半分中心に描画。
   ctx.save();ctx.translate(player.x,player.y+24);
   ctx.rotate(player.skillBase);

   // 船/サーフボード風の細長い氷板
   ctx.globalAlpha=.92;
   ctx.fillStyle='rgba(190,240,255,.92)';
   ctx.strokeStyle='#157fa8';ctx.lineWidth=5;
   ctx.beginPath();
   ctx.moveTo(-48,-12);
   ctx.quadraticCurveTo(-60,0,-48,12);
   ctx.lineTo(42,12);
   ctx.quadraticCurveTo(62,0,42,-12);
   ctx.closePath();
   ctx.fill();ctx.stroke();

   // 氷の芯
   ctx.globalAlpha=.7;
   ctx.strokeStyle='rgba(245,255,255,.95)';ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(-35,0);ctx.lineTo(40,0);ctx.stroke();

   // 後ろへ滑走の白い尾
   ctx.globalAlpha=.34;
   ctx.strokeStyle='rgba(230,255,255,.95)';ctx.lineWidth=9;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(-88,-6);ctx.lineTo(-45,-3);ctx.stroke();
   ctx.beginPath();ctx.moveTo(-78,8);ctx.lineTo(-42,5);ctx.stroke();
   ctx.restore();
 }
}
function drawSwordSkillEffect(){
 if(player.weapon!==0 || player.skillT<=0 || player.skillElapsed<.14)return;

 const moveA=player.aim;
 const bladeA=moveA+player.skillSide*Math.PI/2;
 const fx=Math.cos(moveA),fy=Math.sin(moveA);
 const bx=Math.cos(bladeA),by=Math.sin(bladeA);

 ctx.save();ctx.translate(player.x,player.y);
 ctx.lineCap='round';

 // 剣そのものは drawPlayer() が1本だけ描く。
 // ここではラリアット斬りの「横に流れる残像」だけ描画。
 for(let i=0;i<4;i++){
   const back=10+i*15;
   const alpha=.34-i*.065;
   ctx.globalAlpha=alpha;
   ctx.strokeStyle='rgba(210,247,255,.95)';
   ctx.lineWidth=12-i*2;

   // 走行方向へ少し後ろにずらした、横向きの剣残像。
   const ox=-fx*back, oy=-fy*back;
   ctx.beginPath();
   ctx.moveTo(ox-bx*16,oy-by*16);
   ctx.lineTo(ox+bx*64,oy+by*64);
   ctx.stroke();
 }

 // 曲がった瞬間だけ短い斬撃の弧を添える。
 if(player.skillElapsed<.24){
   const p=(player.skillElapsed-.14)/.10;
   ctx.globalAlpha=Math.max(0,.45*(1-p));
   ctx.strokeStyle='rgba(245,255,255,.95)';
   ctx.lineWidth=8;
   ctx.beginPath();
   ctx.arc(0,0,58,bladeA-.5,bladeA+.5);
   ctx.stroke();
 }
 ctx.restore();
}
function drawChargeEffects(){
 // drawWorld() のカメラ変換内で呼ぶためワールド座標をそのまま使う。
 const px=player.x,py=player.y-(player.jumpZ||0);

 if(player.spiral>0){
   ctx.save();ctx.translate(px,py);ctx.rotate(player.spiralA);
   const life=player.spiral/.48;
   const tm=performance.now()*.018;

   // 槍そのものの周囲を巻く螺旋。
   for(let i=0;i<4;i++){
     ctx.globalAlpha=.78*life;
     ctx.strokeStyle=i%2?'rgba(255,255,255,.95)':'rgba(125,220,255,.95)';
     ctx.lineWidth=i%2?5:7;
     ctx.beginPath();
     for(let x=18;x<225;x+=7){
       const spread=8+x*.075;
       const y=Math.sin(x*.115+tm+i*Math.PI/2)*spread;
       if(x===18)ctx.moveTo(x,y);else ctx.lineTo(x,y);
     }
     ctx.stroke();
   }

   // 空気が引っ張られて前へ流れている長い残像。
   ctx.lineCap='round';
   for(let i=0;i<8;i++){
     const phase=(tm*22+i*29)%190;
     const x=35+phase;
     const side=(i%2?1:-1)*(15+(i%4)*7);
     const len=38+(i%3)*18;
     ctx.globalAlpha=.25+.35*life;
     ctx.strokeStyle='rgba(235,250,255,.95)';
     ctx.lineWidth=3+(i%2);
     ctx.beginPath();
     ctx.moveTo(x-len,side);
     ctx.quadraticCurveTo(x-len*.45,side*.58,x,side*.18);
     ctx.stroke();
   }

   // ドリル先端へ向かう空気リング。
   ctx.globalAlpha=.42*life;
   ctx.strokeStyle='rgba(210,247,255,.95)';
   ctx.lineWidth=5;
   for(let j=0;j<3;j++){
     const x=105+j*46;
     ctx.beginPath();
     ctx.ellipse(x,0,10+j*5,24+j*8,0,0,Math.PI*2);
     ctx.stroke();
   }
   ctx.restore();
 }

 if(player.hammerSmash>0 && player.hammerSmashT>.705){
   const p=Math.min(1,(player.hammerSmashT-.705)/.06);
   ctx.save();ctx.translate(player.x,player.y);
   ctx.globalAlpha=.6*(1-p);
   ctx.strokeStyle='#fff';ctx.lineWidth=9;
   ctx.beginPath();ctx.arc(0,0,30+p*120,0,Math.PI*2);ctx.stroke();
   ctx.restore();
 }
}
function drawSpinSlash(){
 if(!player.spin || player.weapon!==0) return;
 const t=player.spinT||0;
 const prog=Math.min(1,t/0.56);
 ctx.save();
 ctx.translate(player.x,player.y-(player.jumpZ||0));
 // 円形残像
 ctx.globalAlpha=0.58*(1-prog*0.25);
 ctx.strokeStyle='#f5fbff';
 ctx.lineWidth=18;
 ctx.beginPath();
 ctx.arc(0,0,58,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
 ctx.stroke();
 ctx.globalAlpha=0.8*(1-prog*0.15);
 ctx.strokeStyle='#9fe8ff';
 ctx.lineWidth=8;
 ctx.beginPath();
 ctx.arc(0,0,58,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);
 ctx.stroke();
 ctx.restore();
}

function drawAttackArc(a){const w=player.weapon,r=weapons[w].range;ctx.save();ctx.rotate(a);ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=w===2?19:11;ctx.lineCap='round';ctx.beginPath();const span=w===1?.45:1.15;ctx.arc(0,0,r*.76,-span/2,span/2);ctx.stroke();ctx.restore()}

let last=performance.now();function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);drawWorld();requestAnimationFrame(loop)}requestAnimationFrame(loop);

// keyboard fallback
addEventListener('keydown',e=>{if(e.repeat)return;const k=e.key.toLowerCase();if(k==='j')player.shield=true;if(k==='k')doAttack(false);if(k==='l')jump();if(k==='i')skill();if(k==='q')openEquipPanel()});
addEventListener('keyup',e=>{if(e.key.toLowerCase()==='j')player.shield=false});
})();let shortcut={type:null,index:-1,returnType:null,returnIndex:-1};
let currentStage=1;
let stage2Started=false;
let stage2BossDefeated=false;
let stage2BridgeOpen=false;
let stage3Started=false;
let stage3BossDefeated=false;
let stage3BridgeOpen=false;
let stage4Started=false;
let stage4Cleared=false;
let stage4BridgeOpen=false;
let stage5Started=false;
let grassAreaClear=false;
let stage6Started=false;
let stage7Started=false;
let rockBossDefeated=false;
let spearPickup={x:3605,y:545,taken:false};


