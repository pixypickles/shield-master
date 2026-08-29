(() => {
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hpfill = document.getElementById('hpfill');
const weaponNameEl = document.getElementById('weaponName');
const leafStockEl=document.getElementById('leafStock');
const messageEl = document.getElementById('message');
const DPR = Math.min(2, window.devicePixelRatio || 1);
let W=0,H=0;
function resize(){W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();

const world={minX:-1500,minY:-3900,w:15050,h:1100};
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
const player={x:230,y:545,r:28,speed:230,hp:100,maxHp:100,fallGrace:0,ledgeT:0,ledgeX:0,ledgeY:0,falling:false,fallT:0,fallDur:.55,fallFromX:0,fallFromY:0,fallReturnX:0,fallReturnY:0,face:'down',aim:0,shield:false,jumpT:0,jumpDur:.62,jumpHeight:105,attacking:0,spin:0,spinT:0,attackMax:.22,attackCooldown:0,charging:false,chargeStart:0,skillT:0,skillElapsed:0,skillBase:0,skillSide:1,skillHit:new Set(),skillKind:'',skillPhase:0,skillZ:0,hammerSpin:0,fireTrail:[],iceTrail:[],spiral:0,spiralA:0,hammerSmash:0,hammerSmashT:0,weapon:0,shieldType:0,inv:0,walkPhase:0,moveMag:0,dashT:0,dashAuto:false,dashDir:0,dashAttack:false,dashShieldHit:new Set(),shieldStepT:0,shieldStepDir:0,airAttack:false,airAttackDone:false,airMagic:null,airSlam:false,staffChargeFx:null};

// Prototype 134: 最初の浮遊草原ステージ
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
 {name:'雲の盾',heal:5,move:1.08,jump:1.42,magic:false,reflect:false}
];
const unlockedShields=[true,false,false,false,false];


let areaMapOpen=false,area1Cleared=false;
const areaPanel=document.getElementById('areaPanel');
const area1Btn=document.getElementById('area1Btn');
const area2Btn=document.getElementById('area2Btn');

function refreshAreaMap(){
 // 草原群島は最初から選択可能。風の庭園は草原エリアを抜けた後だけ解放。
 area1Cleared=grassAreaClear||stage6Started||stage7Started||rockBossDefeated||stage8Started||stage9Started||stage10Started;
 const area2Unlocked=grassAreaClear||stage6Started||stage7Started||rockBossDefeated||stage8Started||stage9Started||stage10Started;
 area1Btn.innerHTML=`エリア1　草原群島<br><small>${area1Cleared?'クリア済み・移動':'現在のエリア'}</small>`;
 area2Btn.innerHTML=`エリア2　風の庭園<br><small>${area2Unlocked?'移動可能':'未到達'}</small>`;
 area2Btn.classList.toggle('locked',!area2Unlocked);
 area2Btn.disabled=!area2Unlocked;
}
function openAreaMap(){
 if(player.charging){player.charging=false;attackBtn?.classList.remove('active')}
 player.shield=false;
 areaMapOpen=true;refreshAreaMap();areaPanel.classList.remove('hidden');
}
function closeAreaMap(){areaMapOpen=false;areaPanel.classList.add('hidden')}
function travelArea1(){
 closeAreaMap();currentStage=1;player.x=250;player.y=545;stage.checkpoint={x:250,y:545};
 say('エリア1：草原群島');
}
function travelArea2(){
 const unlocked=grassAreaClear||stage6Started||stage7Started||rockBossDefeated||stage8Started||stage9Started||stage10Started;
 if(!unlocked){say('まだ風の庭園には行けない');return}
 closeAreaMap();stage6Started=true;currentStage=Math.max(currentStage,6);
 player.x=8170;player.y=545;stage.checkpoint={x:8170,y:545};say('エリア2：風の庭園');
}
area1Btn.addEventListener('pointerdown',travelArea1);
area2Btn.addEventListener('pointerdown',travelArea2);
document.getElementById('mapBtn').addEventListener('pointerdown',openAreaMap);
document.getElementById('areaMapClose').addEventListener('pointerdown',closeAreaMap);

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
 rocks:[],
 water:{x:260,y:590,w:300,h:105,frozen:0},
 // 浅瀬は歩ける。右方向へ流れる小川は少しだけ身体を運ぶ。
 shallowWater:{x:620,y:610,w:530,h:72,flowX:34,flowY:0,frozen:0},
 spring:{x:620,y:646,r:36,cloudX:620,cloudY:455},
 // 少し高い場所の池と、そこから落ちる滝。池は浅めで入れる。
 upperPond:{x:1230,y:365,w:250,h:105,flowX:0,flowY:0,cloudX:1355,cloudY:165,frozen:0},
 waterfall:{x:1396,y:454,w:72,h:390,flowX:0,flowY:58,frozen:0},
 smallTrees:[
  // この3本だけは序盤の道を塞ぐ「剣で切って進む」木。
  {x:850,y:485,dead:false,gate:true},{x:850,y:550,dead:false,gate:true},{x:850,y:615,dead:false,gate:true},
  // それ以外は意味のない自然配置。斬っても斬らなくてもよい。
  {x:790,y:675,dead:false},{x:1040,y:515,dead:false},
  {x:1280,y:390,dead:false},{x:1340,y:675,dead:false},{x:455,y:470,dead:false}
 ]
};

// スタート地点の左にある、後でハンマーを取って戻って壊す岩壁。
const startRockWall={x:125,y:525,w:76,h:360,hp:1,dead:false};

// 大陸を横切る水流。速度差・曲がり・岩の湧き口を混ぜる。
// flow は px/sec。frozen>0 の間は青杖で凍結して流れが完全停止する。
const currentStreams=[
 {id:'s1cross',source:'cloud',cloudX:1010,cloudY:180,width:72,speed:62,frozen:0,
  pts:[{x:1010,y:330},{x:1015,y:500},{x:1065,y:610},{x:1060,y:730},{x:1060,y:900}]},
 {id:'s2rock',source:'cloud',cloudX:2440,cloudY:280,width:68,speed:118,frozen:0,
  pts:[{x:2440,y:430},{x:2520,y:455},{x:2610,y:520},{x:2840,y:560},{x:3020,y:760}]},
 {id:'s3bend',source:'cloud',cloudX:3820,cloudY:190,width:78,speed:46,frozen:0,
  pts:[{x:3820,y:340},{x:3820,y:475},{x:3920,y:520},{x:4210,y:570},{x:4210,y:820}]},
 {id:'s4fast',source:'cloud',cloudX:5480,cloudY:315,width:74,speed:176,frozen:0,
  pts:[{x:5480,y:465},{x:5600,y:465},{x:5690,y:530},{x:5900,y:690},{x:5900,y:900}]},
 {id:'s6wind',source:'cloud',cloudX:8610,cloudY:180,width:82,speed:96,frozen:0,
  pts:[{x:8610,y:330},{x:8610,y:470},{x:8720,y:520},{x:9000,y:590},{x:9000,y:850}]},
 {id:'s7rock',source:'cloud',cloudX:10720,cloudY:280,width:76,speed:145,frozen:0,
  pts:[{x:10720,y:430},{x:10810,y:480},{x:10860,y:590},{x:11030,y:735},{x:11030,y:930}]},
 {id:'upper',source:'cloud',cloudX:7560,cloudY:-65,width:64,speed:82,frozen:0,
  pts:[{x:7560,y:85},{x:7460,y:115},{x:7350,y:150},{x:7100,y:150},{x:7000,y:220},{x:7000,y:390}]},
 {id:'leftfire',source:'cloud',cloudX:-1110,cloudY:150,width:72,speed:132,frozen:0,
  pts:[{x:-1110,y:300},{x:-1110,y:455},{x:-1010,y:520},{x:-790,y:640},{x:-790,y:880}]},
 {id:'cloudUpperA',source:'cloud',cloudX:9850,cloudY:-45,width:78,speed:108,frozen:0,pts:[{x:9850,y:60},{x:9850,y:125},{x:9700,y:155},{x:9300,y:155},{x:9200,y:235},{x:9200,y:390}]},
 // 生命の盾後の上段はショートカット兼ご褒美ルート。右→左へ高速で運ぶ。
 {id:'upperExpress',source:'cloud',cloudX:14020,cloudY:-70,width:72,speed:235,frozen:0,
  pts:[{x:14020,y:80},{x:13700,y:125},{x:12800,y:135},{x:11800,y:135},{x:10800,y:140},{x:9800,y:140},{x:8800,y:140},{x:7800,y:140},{x:6800,y:140},{x:5800,y:140},{x:4800,y:140},{x:3800,y:140},{x:2800,y:140},{x:1800,y:140},{x:850,y:145},{x:520,y:165}]},
 {id:'vegRushA',source:'cloud',cloudX:6650,cloudY:-3000,width:38,speed:340,frozen:0,pts:[{x:6650,y:-3000},{x:6650,y:-2820},{x:6700,y:-2630},{x:6810,y:-2460},{x:6910,y:-2140}]},
 {id:'vegRushB',source:'cloud',cloudX:7420,cloudY:-3070,width:34,speed:385,frozen:0,pts:[{x:7420,y:-3070},{x:7420,y:-2880},{x:7460,y:-2680},{x:7560,y:-2470},{x:7630,y:-2090}]},
 {id:'vegRushC',source:'cloud',cloudX:8150,cloudY:-2990,width:40,speed:360,frozen:0,pts:[{x:8150,y:-2990},{x:8150,y:-2810},{x:8090,y:-2630},{x:8170,y:-2430},{x:8240,y:-2110}]},

];
const cloudJumpPads=[
 {x:620,y:455,r:54},{x:1355,y:165,r:58},{x:2440,y:280,r:52},
 {x:5480,y:315,r:52},{x:10720,y:280,r:52},{x:-1110,y:150,r:52}
];


function freezeLegacyWaterAt(x,y,rad=60){
 let hit=false;
 for(const wa of [props.water,props.shallowWater,props.upperPond,props.waterfall]){
   const cx=clamp(x,wa.x,wa.x+wa.w),cy=clamp(y,wa.y,wa.y+wa.h);
   if(Math.hypot(x-cx,y-cy)<=rad){
     wa.frozen=Math.max(wa.frozen||0,5.5);hit=true;
   }
 }
 return hit;
}
function nearestStreamSegment(st,x,y,pad=0){
 let best=null,bestD=1e18;
 for(let i=0;i<st.pts.length-1;i++){
   const a=st.pts[i],b=st.pts[i+1],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1;
   const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/l2,0,1);
   const px=a.x+dx*t,py=a.y+dy*t,dd=(x-px)**2+(y-py)**2;
   if(dd<bestD){bestD=dd;best={d:Math.sqrt(dd),dx,dy,len:Math.sqrt(l2),px,py}}
 }
 return best&&best.d<=st.width*.5+pad?best:null;
}
function freezeStreamsAt(x,y,rad=100){
 let froze=false;
 for(const st of currentStreams){
   if(nearestStreamSegment(st,x,y,rad)){
     st.frozen=Math.max(st.frozen,5.5);froze=true;
     particle(x,y,'カチン！','#167bad',.4,15);
   }
 }
 return froze;
}


// 岩壁の向こう側。ハンマーを持って戻ると開く、スタート左の寄り道エリア。
const leftZoneGeo={
 path:[
   {x:-1380,y:335,w:620,h:390},
   {x:-850,y:300,w:650,h:460},
   {x:-300,y:350,w:390,h:370}
 ]
};
// 岩壁の向こうが空洞に見えないよう、最初から見える岩盤の連なり。
// 通行判定は岩壁を壊すまで開かないが、道そのものは奥へ続いて見える。
const leftRockPreview=[
 {x:-90,y:410,w:150,h:260},
 {x:-230,y:395,w:150,h:290},
 {x:-370,y:390,w:170,h:300},
 {x:-530,y:405,w:190,h:280}
];

const fireBoss={
 x:-760,y:545,r:82,hp:46,maxHp:46,active:false,dead:false,
 attackCd:1.0,flash:0,phase:0
};
let fireBossDefeated=false;
const redStaffPickup={x:-760,y:545,taken:false,active:false};
// 灼熱花の先：右へ進める通常分岐と、上へ長く登る氷ルート。
// 青杖は必須ではなく、右ルートはそのまま進行可能。
const postFireGeo={
 junction:{x:-920,y:40,w:520,h:300},
 right:[
   {x:-430,y:-20,w:520,h:250},
   {x:30,y:40,w:520,h:250}
 ],
 iceRight:[
   {x:-570,y:-900,w:520,h:250},
   {x:-90,y:-860,w:560,h:250},
   {x:430,y:-810,w:620,h:250}
 ],
 ice:[
   {x:-1110,y:-250,w:420,h:360},
   {x:-1080,y:-590,w:420,h:360},
   {x:-1030,y:-930,w:460,h:360},
   {x:-960,y:-1270,w:520,h:380},
   {x:-900,y:-1630,w:560,h:390},
   {x:-820,y:-1990,w:600,h:390},
   {x:-760,y:-2350,w:640,h:390},
   {x:-700,y:-2710,w:680,h:390},
   {x:-620,y:-3070,w:720,h:390},
   {x:-540,y:-3430,w:820,h:430}
 ]
};
const iceRouteBlocks=[
 {x:-950,y:-940,r:48,hp:1,dead:false},{x:-850,y:-935,r:48,hp:1,dead:false},
 {x:-750,y:-930,r:48,hp:1,dead:false},{x:-650,y:-925,r:48,hp:1,dead:false},
 {x:-950,y:-1020,r:48,hp:1,dead:false},{x:-850,y:-1015,r:48,hp:1,dead:false},
 {x:-750,y:-1010,r:48,hp:1,dead:false},{x:-650,y:-1005,r:48,hp:1,dead:false},

 {x:-1040,y:-150,r:42,hp:1,dead:false},{x:-1010,y:-470,r:44,hp:1,dead:false},{x:-960,y:-810,r:46,hp:1,dead:false},
 // 3つ目より上は「氷で封鎖された道」。横に何個も並び、赤杖で崩して進む。
 {x:-900,y:-1130,r:48,hp:1,dead:false},{x:-760,y:-1145,r:47,hp:1,dead:false},{x:-620,y:-1125,r:46,hp:1,dead:false},
 {x:-850,y:-1470,r:50,hp:1,dead:false},{x:-690,y:-1490,r:49,hp:1,dead:false},{x:-520,y:-1465,r:48,hp:1,dead:false},
 {x:-790,y:-1810,r:52,hp:1,dead:false},{x:-610,y:-1830,r:51,hp:1,dead:false},{x:-430,y:-1805,r:50,hp:1,dead:false},
 {x:-730,y:-2150,r:54,hp:1,dead:false},{x:-540,y:-2170,r:53,hp:1,dead:false},{x:-340,y:-2145,r:52,hp:1,dead:false},
 {x:-660,y:-2490,r:55,hp:1,dead:false},{x:-450,y:-2510,r:54,hp:1,dead:false},{x:-230,y:-2485,r:53,hp:1,dead:false},
 {x:-590,y:-2830,r:57,hp:1,dead:false},{x:-360,y:-2850,r:56,hp:1,dead:false},{x:-120,y:-2825,r:55,hp:1,dead:false},
 {x:-500,y:-3170,r:59,hp:1,dead:false},{x:-250,y:-3190,r:58,hp:1,dead:false},{x:10,y:-3165,r:57,hp:1,dead:false}
];
const iceEnemies=[
 {x:-930,y:-900,r:30,hp:4,maxHp:4,type:'penguin',attackCd:1.2,flash:0,dead:false},
 {x:-720,y:-1260,r:30,hp:4,maxHp:4,type:'penguin',attackCd:1.05,flash:0,dead:false},
 {x:-520,y:-1570,r:31,hp:5,maxHp:5,type:'penguin',attackCd:1.0,flash:0,dead:false},
 {x:-300,y:-1930,r:31,hp:5,maxHp:5,type:'penguin',attackCd:.95,flash:0,dead:false},
 {x:-120,y:-2280,r:32,hp:6,maxHp:6,type:'penguin',attackCd:.9,flash:0,dead:false},
 {x:40,y:-2640,r:32,hp:6,maxHp:6,type:'penguin',attackCd:.9,flash:0,dead:false}
];
const iceThrowers=[
 {x:-760,y:-1180,r:34,hp:6,maxHp:6,attackCd:1.45,flash:0,dead:false},
 {x:-450,y:-1730,r:34,hp:7,maxHp:7,attackCd:1.3,flash:0,dead:false},
 {x:-180,y:-2420,r:36,hp:8,maxHp:8,attackCd:1.2,flash:0,dead:false}
];

const iceBoss={
 x:-250,y:-3260,r:86,hp:48,maxHp:48,active:false,dead:false,flash:0,attackCd:1.05
};
const blueStaffPickup={x:-250,y:-3260,active:false,taken:false};
// 右分岐：動く植物エリア。ツタ壁は時間で再生する。
const vineAreaGeo={
 path:[
   {x:360,y:-820,w:650,h:300},
   {x:940,y:-900,w:680,h:330},
   {x:1550,y:-830,w:720,h:330},
   {x:2200,y:-900,w:720,h:360}
 ],
 safePads:[
   {x:2450,y:-1220,w:150,h:115},
   {x:2690,y:-1370,w:150,h:115},
   {x:2930,y:-1220,w:150,h:115}
 ],
 arena:{x:2750,y:-980,w:720,h:500}
};
// 植物エリア上空：小島と雲を交互に跳ぶルート。
const vineSkyGeo={
 islands:[
  {x:650,y:-1160,w:230,h:155},{x:1080,y:-1400,w:240,h:155},
  {x:1510,y:-1190,w:230,h:150},{x:1930,y:-1450,w:250,h:160},
  {x:2370,y:-1230,w:240,h:155},{x:2780,y:-1480,w:270,h:170}
 ],
 clouds:[
  {x:790,y:-1215,r:56},{x:930,y:-1280,r:62},
  {x:1190,y:-1240,r:54},{x:1360,y:-1300,r:62},
  {x:1615,y:-1260,r:55},{x:1790,y:-1330,r:64},
  {x:2050,y:-1285,r:55},{x:2220,y:-1360,r:64},
  {x:2460,y:-1310,r:56},{x:2650,y:-1380,r:66},
  {x:2920,y:-1535,r:58},{x:3110,y:-1645,r:60}
 ],
 // 杖スキルの高速移動で踏み込むと、下から突き上げる特殊ジャンプ台。
 launchPads:[
  {x:560,y:-670,r:48,dir:-1.42,tx:760,ty:-1110},
  {x:1185,y:-1325,r:44,dir:-.22,tx:1570,ty:-1140},
  {x:2035,y:-1370,r:46,dir:.10,tx:2440,ty:-1180},
  // ツタボス撃破後、右端から上空ルートへ復帰する打ち上げ台。
  {x:3190,y:-790,r:50,dir:-1.57,tx:3240,ty:-1070}
 ],
 postBossIslands:[
  {x:3120,y:-1120,w:250,h:150},
  {x:2870,y:-1330,w:230,h:150}
 ],
 postBossClouds:[
  {x:3070,y:-1255,r:66},
  // 上の小島側からボス跡地へ戻るための下降用雲。
  {x:3260,y:-1035,r:62}
 ],
 postBossBridge:{x:3170,y:-1010,w:170,h:245}
};

// 雲ジャンプ地帯の先：一周レース場。
// スタート門に入ると雲ライダーと1周勝負。勝てば次島へ虹の橋。
const cloudRaceGeo={
 entryIsland:{x:3020,y:-1785,w:330,h:200},

 // 大きく歪んだ楕円ドーナツ。中心の芝は走れず、外周だけがコース。
 cx:4050,cy:-2350,
 outerRx:1280,outerRy:610,
 innerRx:1040,innerRy:390,

 start:{x:2920,y:-2320,r:96},
 checkpoints:[
  // コース約1/3地点・約2/3地点・ゴールだけ。
  // cp1/cp2 は「点」ではなく、コース横幅を丸ごと横切る太いゲートとして判定する。
  {x:4310,y:-2970,r:165,label:'1',gateA:-0.10,gateLen:230},
  {x:4200,y:-1770,r:165,label:'2',gateA:Math.PI,gateLen:230},
  {x:2920,y:-2320,r:110,label:'GOAL'}
 ],
 nextIsland:{x:6200,y:-2520,w:500,h:400},
 rainbow:{x1:5230,y1:-2325,x2:6240,y2:-2325,w:150}
};

// 物理的な足場も「巨大な楕円ドーナツ」に近づける。
// 14本の細い矩形を周囲へ並べ、中央には地面判定を置かない。
const cloudRaceTrackRects=(()=>{
 const arr=[],pts=[];
 const n=16;
 for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2;
   const wobble=1+0.08*Math.sin(a*3+0.7)+0.045*Math.sin(a*5);
   pts.push({
     x:cloudRaceGeo.cx+Math.cos(a)*cloudRaceGeo.outerRx*wobble*.91,
     y:cloudRaceGeo.cy+Math.sin(a)*cloudRaceGeo.outerRy*(1+0.07*Math.cos(a*2-.4))*.88
   });
 }
 for(let i=0;i<n;i++){
   const a=pts[i],b=pts[(i+1)%n];
   const minX=Math.min(a.x,b.x)-78,minY=Math.min(a.y,b.y)-78;
   arr.push({x:minX,y:minY,w:Math.abs(b.x-a.x)+156,h:Math.abs(b.y-a.y)+156});
 }
 return arr;
})();

let cloudRaceWon=false;
const cloudRace={started:false,countdown:0,time:0,cp:0,retryCd:0,rivalTime:13.6,intro:false,introPage:0,introT:0,lastIntroPage:-1,startHold:0};
const vegGeo={path:[
 {x:6200,y:-2520,w:500,h:400},{x:6600,y:-2750,w:720,h:650},
 {x:7220,y:-2810,w:720,h:700},{x:7840,y:-2740,w:760,h:620}
]};
const vegArmy=[
 {type:'carrotSword',x:6450,y:-2390,r:27,hp:9,maxHp:9,speed:76,attackCd:.6,flash:0,dead:false},
 {type:'leekSpear',x:6680,y:-2520,r:29,hp:10,maxHp:10,speed:68,attackCd:1.0,flash:0,dead:false},
 {type:'turnipHammer',x:6900,y:-2320,r:32,hp:12,maxHp:12,speed:58,attackCd:1.2,flash:0,dead:false},
 {type:'carrotSword',x:7420,y:-2600,r:27,hp:9,maxHp:9,speed:82,attackCd:.7,flash:0,dead:false},
 {type:'leekSpear',x:7700,y:-2350,r:29,hp:10,maxHp:10,speed:72,attackCd:.9,flash:0,dead:false},
 {type:'turnipHammer',x:8100,y:-2500,r:32,hp:12,maxHp:12,speed:60,attackCd:1.1,flash:0,dead:false}
];
const vegFireFlowers=[
 {x:6570,y:-2260,r:25,hp:7,maxHp:7,attackCd:.8,flash:0,dead:false},
 {x:7310,y:-2400,r:25,hp:7,maxHp:7,attackCd:1.2,flash:0,dead:false},
 {x:7900,y:-2600,r:25,hp:7,maxHp:7,attackCd:.9,flash:0,dead:false},
 {x:8350,y:-2320,r:25,hp:7,maxHp:7,attackCd:1.4,flash:0,dead:false}
];
const flyingVeg=[
 {type:'flyingPepper',x:7040,y:-2520,r:28,hp:8,maxHp:8,z:118,phase:.2,dropCd:.8,flash:0,dead:false},
 {type:'flyingEggplant',x:7590,y:-2510,r:30,hp:9,maxHp:9,z:128,phase:2.0,dropCd:1.4,flash:0,dead:false},
 {type:'flyingPepper',x:8190,y:-2450,r:28,hp:8,maxHp:8,z:122,phase:4.1,dropCd:1.0,flash:0,dead:false}
];
const fallingVegSeeds=[];



const vineWalls=[
 {x:620,y:-690,r:48,hp:3,maxHp:3,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:720,y:-620,r:50,hp:3,maxHp:3,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:820,y:-735,r:50,hp:3,maxHp:3,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:1030,y:-680,r:52,hp:3,maxHp:3,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:1150,y:-785,r:52,hp:3,maxHp:3,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:1270,y:-640,r:54,hp:3,maxHp:3,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:1450,y:-720,r:54,hp:4,maxHp:4,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:1580,y:-610,r:54,hp:4,maxHp:4,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:1710,y:-780,r:56,hp:4,maxHp:4,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:1840,y:-650,r:56,hp:4,maxHp:4,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:2280,y:-700,r:56,hp:4,maxHp:4,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:2390,y:-790,r:58,hp:4,maxHp:4,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:2500,y:-640,r:58,hp:4,maxHp:4,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false},
 {x:2610,y:-755,r:60,hp:5,maxHp:5,dead:false,regenT:0,burned:false,iceStage:0,iceT:0,perma:false}
];
const vineSeedFlowers=[
 {x:1040,y:-770,r:30,hp:4,maxHp:4,attackCd:1.2,flash:0,dead:false},
 {x:1660,y:-690,r:31,hp:5,maxHp:5,attackCd:1.0,flash:0,dead:false},
 {x:2180,y:-760,r:32,hp:5,maxHp:5,attackCd:.95,flash:0,dead:false}
];
const whipVines=[
 {x:1450,y:-760,r:34,hp:6,maxHp:6,attackCd:1.25,flash:0,dead:false},
 {x:2350,y:-760,r:36,hp:7,maxHp:7,attackCd:1.15,flash:0,dead:false}
];
const vineKnot=[
 {x:1970,y:-700,r:35,hp:2,maxHp:2,dead:false,regenT:0},
 {x:2070,y:-735,r:35,hp:2,maxHp:2,dead:false,regenT:0},
 {x:2170,y:-700,r:35,hp:2,maxHp:2,dead:false,regenT:0}
];
let cloudShieldDropped=false;
const cloudShieldPickup={x:2070,y:-650,active:false,taken:false};

const vineBoss={
 x:3370,y:-730,r:105,hp:62,maxHp:62,active:false,dead:false,
 attackCd:1.25,flash:0,whipT:0,windupT:0,sweepDir:0
};
let vineBossDefeated=false;


const healShieldPickup={x:14060,y:555,active:false,taken:false};

// 上段ルートの新敵：跳ねる岩を投げる植物。
const bouncingRocks=[];
const rockThrower={x:10420,y:135,r:31,hp:5,maxHp:5,dead:false,flash:0,attackCd:1.3};


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
  r:type==='seedflower'?46:40,
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
 // 第3島：回転花が登場し、ここで槍を入手。
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
 const spinner=type==='spinnerflower';
 stage3Enemies.push({
  x,y,type,r:spinner?32:23,hp:1,maxHp:1,
  speed:spinner?0:68,attackCd:.5+Math.random(),flash:0,dead:false,open:0,
  petalA:Math.random()*Math.PI*2
 });
}
[[3670,530,'acorn'],[3980,510,'flower'],[4250,570,'spinnerflower'],[4510,500,'acorn'],[4630,610,'spinnerflower']].forEach(v=>spawnStage3Enemy(...v));


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
  {x:11010,y:330,w:735,h:430}          // ボス広場：小島コースへの踏切まで
 ],
 bridge:{x1:9435,y1:545,x2:9580,y2:545}
};

const stage7Rocks=[
 {x:9880,y:405,r:34,dead:false},{x:9970,y:485,r:34,dead:false},
 {x:10040,y:640,r:34,dead:false},{x:10190,y:390,r:34,dead:false},
 {x:10350,y:675,r:34,dead:false},{x:10680,y:465,r:38,dead:false},
 {x:10780,y:610,r:38,dead:false}
];

let hammerPickup={x:10470,y:685,taken:false};
const hammerGuardian={
 x:10380,y:690,r:55,hp:18,maxHp:18,active:false,dead:false,
 attackCd:.85,flash:0
};
const hammerGuardianRocks=[];

const rockBoss={
 x:11420,y:545,r:82,hp:44,maxHp:44,active:false,dead:false,
 attackCd:1.15,spawnCd:2.8,flash:0,phase:0
};

const rollingRocks=[];
const bossWalnuts=[];
const stage8Geo={path:[
 {x:11780,y:410,w:250,h:300},{x:12095,y:390,w:155,h:150},{x:12305,y:545,w:145,h:145},
 {x:12510,y:370,w:150,h:150},{x:12720,y:525,w:145,h:145},{x:12930,y:360,w:160,h:155},
 {x:13155,y:455,w:330,h:255}
]};
const stage8Enemies=[
 // 着地点を塞ぐ回転花。接触ダメージあり。槍の中心突きでのみ倒せる。
 {x:12172,y:448,r:34,hp:1,maxHp:1,type:'spinnerflower',attackCd:0,flash:0,dead:false,petalA:0},
 {x:12586,y:428,r:34,hp:1,maxHp:1,type:'spinnerflower',attackCd:0,flash:0,dead:false,petalA:1.2},
 {x:13012,y:418,r:34,hp:1,maxHp:1,type:'spinnerflower',attackCd:0,flash:0,dead:false,petalA:2.4}
];
let stage8Started=false;

// ステージ9：跳び石群島の先にある円形ボス島。
// 左の虹で入場し、撃破後に右の虹が開く。
const stage9Geo={
 arena:{x:13680,y:300,w:760,h:500},
 entryBridge:{x1:13460,y1:575,x2:13680,y2:555},
 exitBridge:{x1:14440,y1:555,x2:14630,y2:555},
 exitIsland:{x:14620,y:420,w:260,h:270}
};
const islandBoss={
 x:14060,y:555,r:92,hp:52,maxHp:52,active:false,dead:false,
 attackCd:1.15,flash:0,phase:0,petalA:0
};
let stage9Started=false;
let islandBossDefeated=false;
// 次区間は右へ延々伸ばさず、ボス島から上へ登って左へ折り返す。
// 同じ横幅を再利用してマップ密度を上げる。
const stage10Geo={
 // 大輪ボス島から上へ登り、そのまま既存コースの「上空」を左へ大きく折り返す。
 bridge:{x:14055,y1:300,y2:205,w:190},
 path:[
   {x:13915,y:20,w:340,h:190},
   {x:13460,y:20,w:500,h:210},
   {x:12840,y:35,w:680,h:220},
   {x:12020,y:20,w:900,h:230},
   {x:11080,y:45,w:1020,h:220},
   {x:10120,y:20,w:1040,h:235},
   {x:9140,y:55,w:1060,h:220},
   {x:8140,y:25,w:1080,h:235},
   {x:7130,y:50,w:1090,h:220},
   {x:6110,y:25,w:1100,h:235},
   {x:5080,y:55,w:1110,h:220},
   {x:4040,y:25,w:1120,h:235},
   {x:3000,y:55,w:1120,h:220},
   {x:1960,y:25,w:1120,h:235},
   {x:920,y:50,w:1120,h:220},
   {x:330,y:45,w:670,h:220}
 ],
 // 上段を走り切るとスタート地点の上へ戻り、虹で下の草原へ接続。
 homeBridge:{x:465,y1:330,y2:250,w:190}
};
let stage10Started=false;
const upperSwordPickup={x:1580,y:135,taken:false};
const stage10Enemies=[
 {x:13610,y:125,r:26,hp:3,maxHp:3,type:'fanleaf',attackCd:1.5,flash:0,dead:false},
 {x:13110,y:165,r:27,hp:3,maxHp:3,type:'dandelion',attackCd:1.8,flash:0,dead:false},
 {x:12580,y:145,r:30,hp:1,maxHp:1,type:'spinnerflower',attackCd:0,flash:0,dead:false,petalA:.7},
 {x:11620,y:145,r:27,hp:3,maxHp:3,type:'fanleaf',attackCd:1.4,flash:0,dead:false},
 {x:9650,y:145,r:28,hp:4,maxHp:4,type:'dandelion',attackCd:1.2,flash:0,dead:false},
 {x:8840,y:130,r:27,hp:4,maxHp:4,type:'fanleaf',attackCd:.9,flash:0,dead:false},
 {x:8060,y:145,r:30,hp:1,maxHp:1,type:'spinnerflower',attackCd:0,flash:0,dead:false,petalA:1.4},
 {x:6740,y:135,r:28,hp:4,maxHp:4,type:'dandelion',attackCd:1.1,flash:0,dead:false},
 {x:5720,y:145,r:27,hp:4,maxHp:4,type:'fanleaf',attackCd:1.0,flash:0,dead:false},
 {x:4630,y:135,r:30,hp:1,maxHp:1,type:'spinnerflower',attackCd:0,flash:0,dead:false,petalA:2.1},
 {x:3540,y:145,r:28,hp:5,maxHp:5,type:'dandelion',attackCd:1.0,flash:0,dead:false},
 {x:2470,y:135,r:27,hp:5,maxHp:5,type:'fanleaf',attackCd:.9,flash:0,dead:false},
 {x:1430,y:145,r:28,hp:5,maxHp:5,type:'dandelion',attackCd:.95,flash:0,dead:false}
];

// 各エリアに「攻略とは無関係な自然物」を少量散らす。
// 木・岩など、世界に生活感/自然さを出すための飾り。水は必ず発生源と流れ先が分かる形だけにする。
// 進行必須ギミックにはせず、基本は避けても無視してもよい。
const ambientTerrain=[
 // area 1
 {kind:'tree',x:1080,y:665},{kind:'rock',x:1450,y:410,r:24},
 // area 2
 {kind:'tree',x:2470,y:640},{kind:'rock',x:2810,y:410,r:22},
 // area 3
 {kind:'tree',x:4320,y:650},{kind:'rock',x:3990,y:445,r:24},
 // area 4
 {kind:'tree',x:5590,y:655},{kind:'rock',x:5900,y:420,r:24},
 // area 5
 {kind:'tree',x:6930,y:660},{kind:'rock',x:7300,y:410,r:25},
 // area 6
 {kind:'tree',x:8720,y:660},{kind:'rock',x:9140,y:415,r:24},
 // area 7
 {kind:'tree',x:10850,y:690},{kind:'rock',x:10300,y:690,r:23},
 // area 8
 {kind:'tree',x:13390,y:650},{kind:'rock',x:13195,y:625,r:22},
 // boss island
 {kind:'tree',x:14300,y:680},{kind:'rock',x:13770,y:675,r:24},
];











function ambientZoneStyle(x){
 if(x<3200)return {top:'#9ad57a',side:'#6fae58',tree:'#35b84d',tree2:'#57c969',rock:'#8f978d'};
 if(x<4800)return {top:'#91cf73',side:'#669f54',tree:'#54b957',tree2:'#79c85e',rock:'#a18f72'};
 if(x<6200)return {top:'#8bcf75',side:'#629f57',tree:'#4fae62',tree2:'#78c777',rock:'#87958a'};
 if(x<7900)return {top:'#8ed26c',side:'#659e50',tree:'#4fb44a',tree2:'#79c84d',rock:'#a48c67'};
 if(x<9500)return {top:'#9bd47c',side:'#719e5d',tree:'#62b85f',tree2:'#87ca79',rock:'#8c9994'};
 if(x<11750)return {top:'#82b96a',side:'#5d8551',tree:'#668f55',tree2:'#87a967',rock:'#777b7b'};
 return {top:'#86cf72',side:'#609d55',tree:'#3eb65a',tree2:'#64ca70',rock:'#8d9690'};
}
function ambientDrop(a){
 if(a.dropDone)return;a.dropDone=true;
 if(Math.random()<.14)floatLeafDrops.push({x:a.x+(a.w||0)/2,y:a.y-12,r:12,life:16,bob:Math.random()*6.28});
 else if(Math.random()<.28)healDrops.push({x:a.x+(a.w||0)/2,y:a.y-12,r:10,life:10,bob:Math.random()*6.28});
}
function damageAmbient(a,weapon,power=1){
 if(a.dead||!(a.kind==='tree'||a.kind==='rock'))return;
 if(a.hp==null)a.hp=a.kind==='tree'?2:5;
 if(a.kind==='tree'){
   if(weapon===0||weapon===2){a.hp-=power}else if(weapon===1){a.hp-=Math.max(1,power)}
 }else{
   if(weapon===2)a.hp=0;
   else if(weapon===1)a.hp-=power;
   else return;
 }
 particle(a.x,a.y-18,a.hp<=0?(a.kind==='tree'?'バサッ！':'ガシャッ！'):'ガキン！','#555',.35,14);
 if(a.hp<=0){a.dead=true;ambientDrop(a)}
}
function jumpLiftNow(){
 if(player.jumpT<=0)return 0;
 const dur=Math.max(.001,Number.isFinite(player.jumpDur)?player.jumpDur:.62);
 const p=Math.max(0,Math.min(1,1-player.jumpT/dur));
 const raw=Math.sin(p*Math.PI)*(Number.isFinite(player.jumpHeight)?player.jumpHeight:105)*(shields[player.shieldType]?.jump||1);
 // 高高度の描画系を安定させる上限。雲盾の滞空時間は維持しつつ、見た目高度だけ暴走させない。
 return Number.isFinite(raw)?Math.max(0,Math.min(220,raw)):0;
}

const guardRails=[
 // stage1: rocks / low trees along portions of cliff
 {x:180,y:340,w:260,h:24,type:'bush'},{x:1020,y:340,w:180,h:24,type:'bush'},
 {x:300,y:690,w:220,h:24,type:'bush'},{x:1050,y:690,w:120,h:24,type:'bush'},
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
const floatLeafDrops=[];
let floatLeafStock=0;
const particles=[];
const projectiles=[];
const airMagicImpacts=[];
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
 if(rockBossDefeated){
   grounds.push(...stage8Geo.path);
   grounds.push({
     x:Math.min(stage9Geo.entryBridge.x1,stage9Geo.entryBridge.x2)-30,
     y:stage9Geo.entryBridge.y1-105,
     w:Math.abs(stage9Geo.entryBridge.x2-stage9Geo.entryBridge.x1)+60,
     h:210
   });
   grounds.push(stage9Geo.arena);
 }
 if(startRockWall.dead)grounds.push(...leftZoneGeo.path);
 if(fireBossDefeated){
   grounds.push(postFireGeo.junction,...postFireGeo.right,...postFireGeo.iceRight,...postFireGeo.ice,...vineAreaGeo.path,vineAreaGeo.arena,...vineAreaGeo.safePads,...vineSkyGeo.islands);
   if(vineBossDefeated){
     grounds.push(...vineSkyGeo.postBossIslands,vineSkyGeo.postBossBridge,cloudRaceGeo.entryIsland,...cloudRaceTrackRects);
     if(cloudRaceWon){
       grounds.push(cloudRaceGeo.nextIsland,...vegGeo.path,{
         x:Math.min(cloudRaceGeo.rainbow.x1,cloudRaceGeo.rainbow.x2)-30,
         y:cloudRaceGeo.rainbow.y1-cloudRaceGeo.rainbow.w/2,
         w:Math.abs(cloudRaceGeo.rainbow.x2-cloudRaceGeo.rainbow.x1)+60,
         h:cloudRaceGeo.rainbow.w
       });
     }
   }
 }
 if(islandBossDefeated){
   grounds.push({
     x:stage10Geo.bridge.x-stage10Geo.bridge.w/2,
     y:stage10Geo.bridge.y2-20,
     w:stage10Geo.bridge.w,
     h:stage10Geo.bridge.y1-stage10Geo.bridge.y2+40
   });
   grounds.push(...stage10Geo.path);
   grounds.push({
     x:stage10Geo.homeBridge.x-stage10Geo.homeBridge.w/2,
     y:stage10Geo.homeBridge.y2-15,
     w:stage10Geo.homeBridge.w,
     h:stage10Geo.homeBridge.y1-stage10Geo.homeBridge.y2+30
   });
 }
 return grounds;
}
function pointSupportedByGround(x,y,pad=24){
 return visibleGroundRects().some(r=>{
   const cx=clamp(x,r.x,r.x+r.w),cy=clamp(y,r.y,r.y+r.h);
   const dx=x-cx,dy=y-cy;
   return dx*dx+dy*dy<=pad*pad;
 });
}



function enemySupportedByGround(e,pad=10){
 if(!e||!Number.isFinite(e.x)||!Number.isFinite(e.y))return false;
 const p=Math.max(pad,(e.r||18)*.35);
 // 野菜軍団エリアは専用地形でも明示判定。追加直後の敵が一斉に崖落下扱いになるのを防ぐ。
 if(cloudRaceWon && typeof vegGeo!=='undefined'){
   for(const r of vegGeo.path){
     if(e.x>=r.x-p&&e.x<=r.x+r.w+p&&e.y>=r.y-p&&e.y<=r.y+r.h+p)return true;
   }
 }
 return pointSupportedByGround(e.x,e.y,p);
}
function keepGroundEnemyOnGround(e,dt){
 if(!e||e.dead||e.enemyFalling)return;
 // 敵はプレイヤーのように空中ジャンプしない。足場を外れたらその場から落下。
 if(!enemySupportedByGround(e,8)){
   e.enemyFalling=true;e.enemyFallT=0;e.enemyFallX=e.x;e.enemyFallY=e.y;
 }
}
function updateGroundEnemyFall(e,dt){
 if(!e||!e.enemyFalling)return false;
 e.enemyFallT=(e.enemyFallT||0)+dt;
 // 下へ落ちて小さくなる代わりに、一定時間後に消滅。
 e.y=(e.enemyFallY||e.y)+260*e.enemyFallT*e.enemyFallT;
 if(e.enemyFallT>.75){e.dead=true;e.enemyFalling=false;}
 return true;
}
function enforceAllGroundEnemies(dt){
 const lists=[enemies,stage2Enemies,stage3Enemies,stage4Enemies,stage6Enemies,stage8Enemies,vegArmy];
 if(typeof stage10Enemies!=='undefined')lists.push(stage10Enemies);
 if(typeof iceEnemies!=='undefined')lists.push(iceEnemies);
 if(typeof iceThrowers!=='undefined')lists.push(iceThrowers);
 if(typeof vineSeedFlowers!=='undefined')lists.push(vineSeedFlowers);
 if(typeof whipVines!=='undefined')lists.push(whipVines);
 for(const list of lists)for(const e of list){
   if(!e||e.dead)continue;
   if(updateGroundEnemyFall(e,dt))continue;
   keepGroundEnemyOnGround(e,dt);
 }
 // 単体の地上雑魚も同じ扱い。ボスは各専用アリーナ制御を優先。
 if(typeof rockThrower!=='undefined'&&rockThrower&&!rockThrower.dead){
   if(!updateGroundEnemyFall(rockThrower,dt))keepGroundEnemyOnGround(rockThrower,dt);
 }
}
const SAVE_KEY='shieldHeroSave_v112';
function saveProgress(){
 try{
  localStorage.setItem(SAVE_KEY,JSON.stringify({
   saveVersion:116,
   x:player.x,y:player.y,hp:player.hp,weapon:player.weapon,shieldType:player.shieldType,inv:player.inv,
   currentStage,checkpoint:stage.checkpoint,swordPlus:!!player.swordPlus,
   unlockedWeapons:[...unlockedWeapons],unlockedShields:[...unlockedShields],
   stageBossDefeated:!!stage.bossDefeated,stageBridgeOpen:!!stage.bridgeOpen,
   stage2Started,stage2BossDefeated,stage2BridgeOpen,
   stage3Started,stage3BossDefeated,stage3BridgeOpen,
   stage4Started,stage4Cleared,stage4BridgeOpen,
   stage5Started,grassAreaClear,stage6Started,stage7Started,stage8Started,stage9Started,stage10Started,
   rockBossDefeated,islandBossDefeated,fireBossDefeated,vineBossDefeated,cloudRaceWon,
   spearTaken:!!spearPickup.taken,hammerTaken:!!hammerPickup.taken,upperSwordTaken:!!upperSwordPickup.taken,
   redStaffTaken:!!redStaffPickup.taken,blueStaffTaken:!!blueStaffPickup.taken,
   healShieldTaken:!!healShieldPickup.taken,cloudShieldTaken:!!cloudShieldPickup.taken,
   seedBossDead:!!seedBoss.dead,grassFinalBossDead:!!grassFinalBoss.dead,
   fireBossDead:!!fireBoss.dead,iceBossDead:!!iceBoss.dead,rockBossDead:!!rockBoss.dead,
   hammerGuardianDead:!!hammerGuardian.dead,islandBossDead:!!islandBoss.dead,vineBossDead:!!vineBoss.dead,
   startRockWallDead:!!startRockWall.dead
  }));
 }catch(e){}
}
function loadProgress(){
 let d;try{d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){}
 if(!d)return false;

 Object.assign(player,{
  x:d.x??player.x,y:d.y??player.y,hp:d.hp??player.hp,
  weapon:d.weapon??player.weapon,shieldType:d.shieldType??player.shieldType,
  swordPlus:!!d.swordPlus
 });
 if(Number.isFinite(d.inv))player.inv=d.inv;
 if(Number.isInteger(d.currentStage))currentStage=d.currentStage;
 if(d.checkpoint)stage.checkpoint=d.checkpoint;

 // 新しいセーブは配列をそのまま復元。旧セーブは取得物から補完する。
 if(Array.isArray(d.unlockedWeapons)){
  for(let i=0;i<unlockedWeapons.length;i++)unlockedWeapons[i]=!!d.unlockedWeapons[i];
 }
 if(Array.isArray(d.unlockedShields)){
  for(let i=0;i<unlockedShields.length;i++)unlockedShields[i]=!!d.unlockedShields[i];
 }

 stage.bossDefeated=!!d.stageBossDefeated || currentStage>=2;
 stage.bridgeOpen=!!d.stageBridgeOpen || currentStage>=2;

 stage2Started=!!d.stage2Started || currentStage>=2;
 stage2BossDefeated=!!d.stage2BossDefeated || currentStage>=3 || !!d.seedBossDead;
 stage2BridgeOpen=!!d.stage2BridgeOpen || currentStage>=3;

 stage3Started=!!d.stage3Started || currentStage>=3;
 stage3BossDefeated=!!d.stage3BossDefeated || currentStage>=4;
 stage3BridgeOpen=!!d.stage3BridgeOpen || currentStage>=4;

 stage4Started=!!d.stage4Started || currentStage>=4;
 stage4Cleared=!!d.stage4Cleared || currentStage>=5;
 stage4BridgeOpen=!!d.stage4BridgeOpen || currentStage>=5;

 stage5Started=!!d.stage5Started || currentStage>=5;
 grassAreaClear=!!d.grassAreaClear || currentStage>=6 || !!d.grassFinalBossDead;
 stage6Started=!!d.stage6Started || currentStage>=6;
 stage7Started=!!d.stage7Started || currentStage>=7 || !!d.hammerGuardianDead || !!d.hammerTaken;
 stage8Started=!!d.stage8Started || currentStage>=8 || !!d.rockBossDead;
 stage9Started=!!d.stage9Started || currentStage>=9 || !!d.islandBossDead;
 stage10Started=!!d.stage10Started || currentStage>=10;

 if(d.seedBossDead||stage2BossDefeated){seedBoss.dead=true;seedBoss.active=false}
 if(d.grassFinalBossDead||grassAreaClear){grassFinalBoss.dead=true;grassFinalBoss.active=false}
 if(d.hammerGuardianDead||d.hammerTaken){hammerGuardian.dead=true;hammerGuardian.active=false}
 if(d.rockBossDead){rockBoss.dead=true;rockBoss.active=false}
 if(d.islandBossDead){islandBoss.dead=true;islandBoss.active=false}
 if(d.fireBossDead){fireBoss.dead=true;fireBoss.active=false}
 if(d.iceBossDead){iceBoss.dead=true;iceBoss.active=false}
 if(d.vineBossDead){vineBoss.dead=true;vineBoss.active=false}

 rockBossDefeated=!!d.rockBossDefeated || !!d.rockBossDead || stage8Started;
 islandBossDefeated=!!d.islandBossDefeated || !!d.islandBossDead || stage10Started;
 // 旧セーブでは「倒したフラグ」を保存していなかったため、dead から復元する。
 fireBossDefeated=!!d.fireBossDefeated || !!d.fireBossDead;
 vineBossDefeated=!!d.vineBossDefeated || !!d.vineBossDead;
 cloudRaceWon=!!d.cloudRaceWon;

 spearPickup.taken=!!d.spearTaken;
 hammerPickup.taken=!!d.hammerTaken;
 upperSwordPickup.taken=!!d.upperSwordTaken;
 redStaffPickup.taken=!!d.redStaffTaken || (!!d.fireBossDead && (d.weapon===3||d.weapon===4));
 blueStaffPickup.taken=!!d.blueStaffTaken || (!!d.iceBossDead && d.weapon===4);
 healShieldPickup.taken=!!d.healShieldTaken || d.shieldType===1;
 cloudShieldPickup.taken=!!d.cloudShieldTaken || d.shieldType===4;

 // 装備アンロックも旧セーブから復元。
 if(spearPickup.taken||currentStage>=3)unlockedWeapons[1]=true;
 if(hammerPickup.taken||d.hammerGuardianDead||currentStage>=8)unlockedWeapons[2]=true;
 if(redStaffPickup.taken||fireBossDefeated)unlockedWeapons[3]=true;
 if(blueStaffPickup.taken||d.iceBossDead)unlockedWeapons[4]=true;
 if(healShieldPickup.taken||islandBossDefeated)unlockedShields[1]=true;
 if(cloudShieldPickup.taken){unlockedShields[4]=true;cloudShieldDropped=true;}

 if(d.startRockWallDead || fireBossDefeated || d.fireBossDead){startRockWall.dead=true;startRockWall.hp=0}

 // 主要報酬の表示状態も復元。
 redStaffPickup.active=fireBoss.dead&&!redStaffPickup.taken;
 blueStaffPickup.active=iceBoss.dead&&!blueStaffPickup.taken;
 healShieldPickup.active=islandBoss.dead&&!healShieldPickup.taken;
 cloudShieldPickup.active=cloudShieldDropped&&!cloudShieldPickup.taken;

 // ハンマー未取得の旧セーブでも、報酬は必ず道上へ戻す。
 if(hammerGuardian.dead&&!hammerPickup.taken){hammerPickup.x=10470;hammerPickup.y=685;}

 weaponNameEl.textContent=player.weapon===0&&player.swordPlus?'翠鋼の剣':weapons[player.weapon].name;
 return true;
}
setInterval(()=>{let m=document.getElementById('startMenu');if(m&&m.classList.contains('hidden'))saveProgress()},2500);
window.addEventListener('pagehide',saveProgress);
window.addEventListener('DOMContentLoaded',()=>{
 const m=document.getElementById('startMenu'),c=document.getElementById('continueBtn'),n=document.getElementById('newGameBtn');
 let has=false;try{has=!!localStorage.getItem(SAVE_KEY)}catch(e){}
 c.disabled=!has;
 c.onclick=()=>{loadProgress();m.classList.add('hidden')};
 n.onclick=()=>{try{localStorage.removeItem(SAVE_KEY)}catch(e){}m.classList.add('hidden')};
});

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

let attackPointerId=null;
attackBtn.addEventListener('pointerdown',e=>{
 e.preventDefault();
 if(player.attackCooldown<=0&&!player.charging){
   attackPointerId=e.pointerId;
   try{attackBtn.setPointerCapture(e.pointerId)}catch(_){}
   player.charging=true;player.chargeStart=performance.now()/1000;
   attackBtn.classList.add('active');
 }
});
function releaseAttack(e){
 if(!player.charging)return;
 if(e&&attackPointerId!==null&&e.pointerId!==attackPointerId)return;
 let held=performance.now()/1000-player.chargeStart;
 player.charging=false;attackPointerId=null;attackBtn.classList.remove('active');
 doAttack(held>=.42);
}
attackBtn.addEventListener('pointerup',releaseAttack);
attackBtn.addEventListener('pointercancel',releaseAttack);

document.getElementById('jumpBtn').addEventListener('pointerdown',()=>jump());
const skillBtn=document.getElementById('skillBtn');
skillBtn.addEventListener('pointerdown',e=>{
 e.preventDefault();
 if(player.weapon===1)player.spearSkillHeld=true;
 skill();skillBtn.classList.add('active');
});
function releaseSkill(){
 skillBtn.classList.remove('active');
 if(player.skillKind==='spear'&&player.spearSkillHeld){
   player.spearSkillHeld=false;
   // 離した瞬間から突きフェーズへ。
   player.skillElapsed=.46;player.skillT=.26;
 }
}
for(const ev of ['pointerup','pointercancel','pointerleave'])skillBtn.addEventListener(ev,releaseSkill);
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
       say(`${w.name}に持ち替え`);renderEquipPanel()
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
       say(`${sh.name}に持ち替え`);renderEquipPanel()
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
let shortcutHoldTimer=null,shortcutLong=false,shortcutPointer=null;
shortcutBtn.addEventListener('pointerdown',(ev)=>{
 ev.preventDefault();shortcutPointer=ev.pointerId;shortcutLong=false;
 try{shortcutBtn.setPointerCapture(ev.pointerId)}catch(_){}
 shortcutHoldTimer=setTimeout(()=>{
   shortcutLong=true;
   // 長押し＝今使っている武器を登録。武器タブ/盾タブとは切り離す。
   shortcut={type:'weapon',index:player.weapon,returnType:null,returnIndex:-1};
   updateShortcutLabel();say(`${weapons[player.weapon].name}をSHORTに登録`);
 },520);
});
function releaseShortcut(ev){
 if(shortcutPointer!==null&&ev&&ev.pointerId!==shortcutPointer)return;
 if(shortcutHoldTimer){clearTimeout(shortcutHoldTimer);shortcutHoldTimer=null}
 shortcutPointer=null;
 if(shortcutLong){shortcutLong=false;return}
 if(shortcut.index<0){say('SHORTを長押しすると、今の武器を登録できます');return}
 if(shortcut.type==='weapon'){
   if(player.weapon!==shortcut.index){
     shortcut.returnType='weapon';shortcut.returnIndex=player.weapon;
     player.weapon=shortcut.index;weaponNameEl.textContent=weapons[player.weapon].name;
   }else if(shortcut.returnType==='weapon'&&shortcut.returnIndex>=0&&unlockedWeapons[shortcut.returnIndex]){
     const back=shortcut.returnIndex;shortcut.returnIndex=shortcut.index;
     player.weapon=back;weaponNameEl.textContent=weapons[player.weapon].name;
   }
 }else{
   if(player.shieldType!==shortcut.index){
     shortcut.returnType='shield';shortcut.returnIndex=player.shieldType;player.shieldType=shortcut.index;
   }else if(shortcut.returnType==='shield'&&shortcut.returnIndex>=0&&unlockedShields[shortcut.returnIndex]){
     const back=shortcut.returnIndex;shortcut.returnIndex=shortcut.index;player.shieldType=back;
   }
 }
}
shortcutBtn.addEventListener('pointerup',releaseShortcut);
shortcutBtn.addEventListener('pointercancel',ev=>{if(shortcutHoldTimer)clearTimeout(shortcutHoldTimer);shortcutHoldTimer=null;shortcutPointer=null;shortcutLong=false;});


function jump(){if(player.jumpT<=0){player.jumpDur=player.shieldType===4?.92:.62;player.jumpHeight=player.shieldType===4?118:105;player.airAttack=false;player.airAttackDone=false;player.airMagic=null;player.airSlam=false;player.jumpT=player.jumpDur;player.shield=false;shieldBtn.classList.remove('active');particle(player.x,player.y+24,'バッ！','#111',.45,18)}}

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
   // 剣：一歩ずつ高速で踏み込みながら3連撃。
   player.skillKind='sword';
   player.skillT=.66;
   particle(player.x,player.y,'三連斬り！','#7e20a6',.4,18);

 }else if(player.weapon===1){
   // 槍：風車のように回して周囲を攻撃→最後に一歩踏み込み突き。
   player.skillKind='spear';
   player.spearSkillHeld=true;
   player.skillT=999;
   player.spiral=0;
   particle(player.x,player.y,'風車突き！','#2f6db0',.4,18);

 }else if(player.weapon===2){
   // ハンマー：剣の回転斬りのように、その場で明確に3回転。
   player.skillKind='hammer';
   player.skillT=.90;
   player.skillSide=player.skillSide>0?-1:1;
   particle(player.x,player.y,'三回転！','#7e20a6',.45,18);

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
 for(const e of stage8Enemies)if(!e.dead)candidates.push(e);
 for(const e of vegArmy)if(!e.dead)candidates.push(e);
 for(const e of vegFireFlowers)if(!e.dead)candidates.push(e);
 for(const e of flyingVeg)if(!e.dead)candidates.push(e);
 if(typeof stage10Enemies!=='undefined')for(const e of stage10Enemies)if(!e.dead)candidates.push(e);
 if(boss.active&&!boss.dead)candidates.push(boss);
 if(seedBoss.active&&!seedBoss.dead)candidates.push(seedBoss);
 if(grassFinalBoss.active&&!grassFinalBoss.dead)candidates.push(grassFinalBoss);
 if(hammerGuardian.active&&!hammerGuardian.dead)candidates.push(hammerGuardian);
 if(rockBoss.active&&!rockBoss.dead)candidates.push(rockBoss);
 if(islandBoss.active&&!islandBoss.dead)candidates.push(islandBoss);
 if(fireBoss.active&&!fireBoss.dead)candidates.push(fireBoss);
 if(iceBoss.active&&!iceBoss.dead)candidates.push(iceBoss);
 if(stage10Started&&!rockThrower.dead)candidates.push(rockThrower);
 for(const e of bossWalnuts)if(!e.dead)candidates.push(e);
 // 杖は敵だけでなく、属性ギミックや氷塊も「的」として補正対象にする。
 for(const o of elementalObstacles)if(!o.dead)candidates.push(o);
 for(const o of iceRouteBlocks)if(!o.dead)candidates.push(o);

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
 // 杖は入力方向を優先しつつ、その方向にいる敵・的へ軽く吸い付く。
 const magicSnap=skillAutoAim(base,charged?390:520,charged?.48:.62);
 if(magicSnap.target)base=magicSnap.angle;
 // 杖チャージは「弾を大量に出す」のではなく、武器ごとの固有範囲技。
 if(charged){
   const kind=w===3?'fireCone':'blizzardCone';
   player.staffChargeFx={kind,base,t:.52,max:.52};

   const maxRange=w===3?260:275;
   const half=w===3?.52:.58;
   const damage=w===3?7:6;

   // 扇形の中にいる敵へ一度だけダメージ。
   const hitOne=(e)=>{
     if(!e||e.dead)return;
     const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);
     if(d>maxRange+(e.r||20))return;
     const a=Math.atan2(dy,dx);
     if(Math.abs(angleDiff(a,base))>half)return;
     e.hp-=damage;e.flash=.22;
     if(w===4)e.stagger=Math.max(e.stagger||0,.65);
     particle(e.x,e.y-24,`-${damage}`,w===3?'#e34a3a':'#d9f7ff',.42,16);
     if(e.hp<=0)e.dead=true;
   };

   for(const e of enemies)hitOne(e);
   for(const e of stage2Enemies)hitOne(e);
   for(const e of stage3Enemies){
     if(e.type==='spinnerflower'){
       if(w===4&&dist(player.x,player.y,e.x,e.y)<maxRange+e.r)particle(e.x,e.y-24,'キン！','#fff',.3,14);
     }else hitOne(e);
   }
   for(const e of stage4Enemies)hitOne(e);
   for(const e of stage6Enemies)hitOne(e);
   for(const e of stage10Enemies)if(e.type!=='spinnerflower')hitOne(e);
   for(const e of bossWalnuts)hitOne(e);

   for(const b of [boss,seedBoss,grassFinalBoss,rockBoss,islandBoss,fireBoss,iceBoss]){
     if(!b||b.dead||!b.active)continue;
     const dx=b.x-player.x,dy=b.y-player.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
     if(d<=maxRange+b.r&&Math.abs(angleDiff(a,base))<=half){
       b.hp-=damage;b.flash=.22;particle(b.x,b.y-45,`-${damage}`,w===3?'#e34a3a':'#d9f7ff',.42,17);
     }
   }

   if(w===3){
     for(const o of iceRouteBlocks){
       if(o.dead)continue;
       const dx=o.x-player.x,dy=o.y-player.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
       if(d<maxRange+o.r&&Math.abs(angleDiff(a,base))<half){
         o.dead=true;particle(o.x,o.y,'ジュワァ！','#bfeeff',.5,17);
       }
     }
     // 赤杖：草を広く燃やす。
     for(const g of props.grass){
       if(g.dead)continue;
       const dx=g.x-player.x,dy=g.y-player.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
       if(d<maxRange&&Math.abs(angleDiff(a,base))<half){g.dead=true;particle(g.x,g.y,'ボワッ','#e43',.35,14)}
     }
     particle(player.x+Math.cos(base)*70,player.y+Math.sin(base)*70,'ゴォォッ！','#e43',.4,18);
     hitVineContent(7,maxRange,base,half*2,'fire');
   }else{
     // 青杖：前方の水流・池・滝をまとめて凍結。
     for(let d=55;d<=maxRange;d+=45){
       const fx=player.x+Math.cos(base)*d,fy=player.y+Math.sin(base)*d;
       freezeStreamsAt(fx,fy,58);freezeLegacyWaterAt(fx,fy,58);
     }
     particle(player.x+Math.cos(base)*70,player.y+Math.sin(base)*70,'キィィン！','#eafaff',.4,18);
   }
   return;
 }

 const speed=470,damage=2,radius=11;
 const fa=faceAngle(player.face),rx=Math.cos(fa+Math.PI/2),ry=Math.sin(fa+Math.PI/2),fx=Math.cos(fa),fy=Math.sin(fa);
 let hx=player.x+rx*23+fx*5,hy=player.y+ry*19+fy*5+3;
 if(player.face==='right'){hx=player.x+20;hy=player.y+13;}
 else if(player.face==='left'){hx=player.x-18;hy=player.y+12;}
 const tip=56,sx=hx+Math.cos(base)*tip,sy=hy+Math.sin(base)*tip;
 projectiles.push({x:sx,y:sy,vx:Math.cos(base)*speed,vy:Math.sin(base)*speed,r:radius,life:1.18,kind:w===3?'fire':'ice',damage,charged:false,hit:false,magicPhase:Math.random()*Math.PI*2});
 particle(sx,sy,w===3?'ボッ！':'キン！',w===3?'#e43':'#268bc1',.3,15);
}






function takeDamage(amount){
 const dmg=amount;
 player.hp=Math.max(1,player.hp-dmg);
 if(player.shieldType===1){
   const heal=Math.min(3,player.maxHp-player.hp);
   if(heal>0){player.hp+=heal;particle(player.x,player.y-55,`+${heal}`,'#3aa85a',.38,14)}
 }
 return dmg;
}
function maybeDropHeal(x,y,chance=.48){
 if(Math.random()<chance)healDrops.push({x,y,r:10,life:10,bob:Math.random()*6.28});
}
function killDrop(e,chance=.48){
 maybeDropHeal(e.x,e.y,chance);
 if(Math.random()<.11)floatLeafDrops.push({x:e.x+14,y:e.y-8,r:12,life:16,bob:Math.random()*6.28});
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
 damage=damage;
 for(const e of stage2Enemies){
   if(e.dead)continue;
   const d=dist(player.x,player.y,e.x,e.y);
   const a=Math.atan2(e.y-player.y,e.x-player.x);
   if(d<=range+e.r+18&&Math.abs(angleDiff(a,base))<=cone/2+.14){
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
 damage=damage;
 for(const e of stage3Enemies){
  if(e.dead)continue;
  const d=dist(player.x,player.y,e.x,e.y);
  const a=Math.atan2(e.y-player.y,e.x-player.x);
  if(d>range+e.r||Math.abs(angleDiff(a,base))>cone/2)continue;

  if(e.type==='spinnerflower'){
    // 花びらが常時回っているため、横から叩く武器は弾かれる。
    // 槍だけは中心へ細く突き込めば一撃。
    if(weapon===1){
      // 槍の細い中心判定。向きが合っていれば一撃。
      const fx=Math.cos(base),fy=Math.sin(base);
      const dx=e.x-player.x,dy=e.y-player.y;
      const along=dx*fx+dy*fy;
      const side=Math.abs(dx*fy-dy*fx);
      if(along>0&&along<range+e.r+18&&side<22){
        e.hp=0;e.flash=.2;
        particle(e.x,e.y-25,'中心！','#fff',.38,16);
      }else{
        particle(e.x,e.y-25,'スカッ','#555',.28,13);
      }
    }else{
      particle(e.x,e.y-25,'キン！','#111',.32,15);
    }
  }else{
    e.hp-=damage;enemyHitReact(e,22);
    particle(e.x,e.y-25,`-${damage}`,'#b31313',.4,15);
  }

  if(e.hp<=0){
    e.dead=true;
    particle(e.x,e.y,e.type==='spinnerflower'?'パァン！':'ポン！','#fff',.4,15);
    killDrop(e,.55);
  }
 }
}



function hitStage8Spinner(range,base){
 const fx=Math.cos(base),fy=Math.sin(base);
 const lists=[];
 if(stage8Started)lists.push(stage8Enemies);
 if(stage10Started)lists.push(stage10Enemies);
 for(const list of lists)for(const e of list){
   if(e.dead||e.type!=='spinnerflower')continue;
   const dx=e.x-player.x,dy=e.y-player.y,along=dx*fx+dy*fy,side=Math.abs(dx*fy-dy*fx);
   if(along>-10&&along<range+e.r+34&&side<46){
     e.hp=0;e.dead=true;e.flash=.2;particle(e.x,e.y-25,'中心！','#fff',.38,16);particle(e.x,e.y,'パァン！','#fff',.4,15);
   }
 }
}


function hitVegArea(damage,range,base,cone,weapon){
 if(!cloudRaceWon)return;
 const hit=(e)=>{
   if(!e||e.dead)return;
   const d=dist(player.x,player.y,e.x,e.y),a=Math.atan2(e.y-player.y,e.x-player.x);
   if(d>range+(e.r||25)||Math.abs(angleDiff(a,base))>cone/2)return;
   e.hp-=damage;e.flash=.2;enemyHitReact(e,45);
   particle(e.x,e.y-24,`-${damage}`,'#b31313',.38,15);
   if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ポン！','#fff',.42,15);killDrop(e,.4)}
 };
 for(const e of vegArmy)hit(e);
 for(const e of vegFireFlowers)hit(e);
 for(const e of flyingVeg){
   if(e.dead)continue;
   if(weapon<=2 && player.jumpT<=0 && !player.airAttack)continue;
   hit(e);
 }
}
function hitStage45(damage,range,base,cone,weapon){
 damage=damage;
 hitVegArea(damage,range,base,cone,weapon);
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
 if(stage7Started&&hammerGuardian.active&&!hammerGuardian.dead){
  const d=dist(player.x,player.y,hammerGuardian.x,hammerGuardian.y);
  const a=Math.atan2(hammerGuardian.y-player.y,hammerGuardian.x-player.x);
  if(d<=range+hammerGuardian.r+14&&Math.abs(angleDiff(a,base))<=cone/2+.08){
   hammerGuardian.hp-=damage;hammerGuardian.flash=.2;enemyHitReact(hammerGuardian,45);
   particle(hammerGuardian.x,hammerGuardian.y-42,`-${damage}`,'#b31313',.38,16);
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
 if(stage10Started){
  for(const e of stage10Enemies){
   if(e.dead)continue;
   const d=dist(player.x,player.y,e.x,e.y),a=Math.atan2(e.y-player.y,e.x-player.x);
   // 槍は細い武器なので、見た目より少しだけ中心吸着を広げる。
   const extra=weapon===1?22:0;
   if(d>range+e.r+extra||Math.abs(angleDiff(a,base))>cone/2+(weapon===1?.12:0))continue;
   if(e.type==='spinnerflower'){
    if(weapon===1){
      e.dead=true;e.hp=0;e.flash=.2;
      particle(e.x,e.y-22,'中心！','#fff',.38,16);
      particle(e.x,e.y,'パァン！','#fff',.4,15);
    }else{
      particle(e.x,e.y-22,'キン！','#111',.28,13);
    }
   }else{
    e.hp-=damage;e.flash=.18;enemyHitReact(e,45);
    particle(e.x,e.y-22,`-${damage}`,'#b31313',.35,14);
    if(e.hp<=0){e.dead=true;particle(e.x,e.y,'パァッ！','#fff',.4,15);killDrop(e,.45)}
   }
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


function damageBreakableRock(r,weapon,amount=1){
 if(r.dead)return;
 if(r.hp==null)r.hp=5;
 if(weapon===2){
   r.hp=0;r.dead=true;particle(r.x,r.y,'粉砕！','#444',.45,17);return;
 }
 if(weapon===1){
   r.hp-=amount;
   particle(r.x,r.y,r.hp>0?`ガキン！ ${r.hp}`:'砕けた！','#555',.34,14);
   if(r.hp<=0)r.dead=true;
 }else{
   particle(r.x,r.y,'カン！','#555',.28,13);
 }
}

// 氷塊：ハンマー1発、槍5発、炎1発。
// 再生ツタ：通常武器では即再生。青杖で凍らせれば剣・槍・ハンマーのどれでも破壊可能。
const elementalObstacles=[
 {x:14735,y:485,r:34,type:'iceBlock',hp:5,dead:false},
 {x:14795,y:610,r:42,type:'regenVine',frozen:false,dead:false,wiggle:0}
];
function hitElementalObstacle(x,y,r,kind,power=1){
 for(const o of elementalObstacles){
  if(o.dead||dist(x,y,o.x,o.y)>r+o.r)continue;
  if(o.type==='iceBlock'){
   if(kind==='hammer'||kind==='fire'){o.dead=true;particle(o.x,o.y,'パリン！','#b8ecff',.45,17)}
   else if(kind==='spear'){o.hp-=power;particle(o.x,o.y,o.hp>0?`キン！ ${o.hp}`:'パリン！','#8bdcf4',.35,14);if(o.hp<=0)o.dead=true}
   else particle(o.x,o.y,'カチン！','#8bdcf4',.3,13);
  }else if(o.type==='regenVine'){
   if(kind==='ice'&&!o.frozen){
     o.frozen=true;particle(o.x,o.y,'カチコチ！','#63d7ff',.5,16);
   }else if(o.frozen&&(kind==='hammer'||kind==='spear'||kind==='sword')){
     o.dead=true;particle(o.x,o.y,'パキパキッ！','#dff8ff',.5,17);
   }else if(o.frozen&&kind==='fire'){
     o.frozen=false;particle(o.x,o.y,'ジュッ…再生！','#e66',.4,14);
   }else if(kind==='hammer'||kind==='spear'||kind==='sword'){
     particle(o.x,o.y,'グニャ…再生！','#287b3c',.42,14);
   }else{
     particle(o.x,o.y,o.frozen?'凍っている':'うごめいている…','#287b3c',.3,13);
   }
  }
 }

}


function hitVineContent(damage,range,base,cone,kind='physical'){
 const hit=(e)=>{
   if(!e||e.dead)return;
   const d=dist(player.x,player.y,e.x,e.y),a=Math.atan2(e.y-player.y,e.x-player.x);
   if(d>range+(e.r||25)||Math.abs(angleDiff(a,base))>cone/2+.12)return;
   e.hp-=damage;e.flash=.16;if(e.hp<=0)e.dead=true;
 };
 for(const e of vineSeedFlowers)hit(e);
 for(const e of whipVines)hit(e);
 for(const e of iceThrowers)hit(e);
 for(const e of iceEnemies)hit(e);
 for(const v of vineWalls){
   if(v.dead||v.perma)continue;
   const d=dist(player.x,player.y,v.x,v.y),a=Math.atan2(v.y-player.y,v.x-player.x);
   if(d<=range+v.r&&Math.abs(angleDiff(a,base))<=cone/2+.12){
     if(v.iceStage===2&&kind!=='fire'){
       v.perma=true;v.dead=true;v.iceStage=0;v.regenT=999999;
       particle(v.x,v.y,'パキィン！','#e9fbff',.75,22);
       continue;
     }
     v.hp-=damage;
     if(v.hp<=0){v.dead=true;v.burned=kind==='fire';v.regenT=kind==='fire'?5:3;particle(v.x,v.y,kind==='fire'?'ボワッ！':'ザシュ！',kind==='fire'?'#e43':'#2e843a',.4,15);}
   }
 }
 for(const v of vineKnot){
   if(v.dead)continue;
   const d=dist(player.x,player.y,v.x,v.y),a=Math.atan2(v.y-player.y,v.x-player.x);
   if(d<=range+v.r&&Math.abs(angleDiff(a,base))<=cone/2+.15){
     v.hp-=damage;if(v.hp<=0){v.dead=true;v.regenT=6;particle(v.x,v.y,'ブチッ！','#2e843a',.4,15);}
   }
 }
 if(vineBoss.active&&!vineBoss.dead){
   const d=dist(player.x,player.y,vineBoss.x,vineBoss.y),a=Math.atan2(vineBoss.y-player.y,vineBoss.x-player.x);
   if(d<=range+vineBoss.r&&Math.abs(angleDiff(a,base))<=cone/2+.12){
     vineBoss.hp-=damage;vineBoss.flash=.16;particle(vineBoss.x,vineBoss.y-55,`-${damage}`,'#b31313',.4,16);
   }
 }
}
function hitIslandBoss(damage,range,base,cone){
 if(!stage9Started||!islandBoss.active||islandBoss.dead)return;
 const d=dist(player.x,player.y,islandBoss.x,islandBoss.y);
 const a=Math.atan2(islandBoss.y-player.y,islandBoss.x-player.x);
 if(d<=range+islandBoss.r&&Math.abs(angleDiff(a,base))<=cone/2){
   islandBoss.hp-=damage;islandBoss.flash=.18;
   particle(islandBoss.x,islandBoss.y-65,`-${damage}`,'#b31313',.42,16);
 }
}

function hitIceBoss(damage,range,base,cone=Math.PI*2){
 if(!iceBoss.active||iceBoss.dead)return;
 const d=dist(player.x,player.y,iceBoss.x,iceBoss.y),a=Math.atan2(iceBoss.y-player.y,iceBoss.x-player.x);
 if(d<=range+iceBoss.r+24&&Math.abs(angleDiff(a,base))<=cone/2+.16){
   iceBoss.hp-=damage;iceBoss.flash=.2;particle(iceBoss.x,iceBoss.y-50,`-${damage}`,'#9ddff6',.4,16);
 }
}
function hitFireBoss(damage,range,base,cone=Math.PI*2){
 if(!fireBoss.active||fireBoss.dead)return;
 const d=dist(player.x,player.y,fireBoss.x,fireBoss.y);
 const a=Math.atan2(fireBoss.y-player.y,fireBoss.x-player.x);
 if(d<=range+fireBoss.r+34&&Math.abs(angleDiff(a,base))<=cone/2+.20){
   fireBoss.hp-=damage;fireBoss.flash=.18;
   particle(fireBoss.x,fireBoss.y-55,`-${damage}`,'#b31313',.4,17);
 }
}

function hitBoss(damage,range,base,cone=Math.PI*2){
 if(!boss.active||boss.dead)return;
 const d=dist(player.x,player.y,boss.x,boss.y);
 const a=Math.atan2(boss.y-player.y,boss.x-player.x);
 if(d<=range+boss.r && Math.abs(angleDiff(a,base))<=cone/2){
   boss.hp-=damage;boss.flash=.14;particle(boss.x,boss.y-35,`-${damage}`,'#b31313',.45,18);
 }
}

function swordDamage(v){return player.swordPlus?v+2:v}
function doAttack(charged=false){
 if(player.attackCooldown>0)return;
 const wasDash=player.dashT>0||player.dashAuto;
 if(wasDash)player.dashAttack=true;
 const w=player.weapon, wp=weapons[w];
 const jumpStrike=player.jumpT>0&&!charged;
 let range=wp.range*(charged?1.45:1);
 let base=autoAim(faceAngle(player.face),Math.PI*.58,w>=3?440:range+90);
 if(w===1&&charged){
   // 入力方向（無入力なら向いている方向）を基準に、近い敵へ軽く吸い付く。
   // 完全自動ではなく、約35度以内の敵だけを補正する。
   const intended=stickAngle()??faceAngle(player.face);
   const snap=skillAutoAim(intended,350,.62);
   base=snap.target?snap.angle:intended;
 }
 if(fireBoss.active&&!fireBoss.dead&&w<=2){
   const fd=dist(player.x,player.y,fireBoss.x,fireBoss.y),fa=Math.atan2(fireBoss.y-player.y,fireBoss.x-player.x);
   if(fd<370&&Math.abs(angleDiff(fa,base))<.95)base=fa;
 }
 player.aim=base;

 // ジャンプ中の通常攻撃は、地上攻撃とは別の「下方向攻撃」。
 if(jumpStrike){
   player.attackMax=.34;player.attacking=.34;player.attackCooldown=.38;
   player.airAttack=true;player.airAttackDone=false;
   if(w===0||w===1){
     // 剣/槍：真下へ武器を向けて落下地点を突く。
     player.airSlam=true;
     particle(player.x,player.y+22,w===0?'急降下突き！':'落下突き！','#fff',.32,15);
   }else if(w===2){
     // ハンマー：着地と同時に振り下ろす。チャージ版と違い衝撃波なし。
     player.airSlam=true;
     particle(player.x,player.y+22,'着地叩き！','#fff',.32,15);
   }else{
     // 杖：ジャンプ中に斜め下へ「実際に見える弾」を撃つ。
     const landX=player.x+Math.cos(base)*125,landY=player.y+Math.sin(base)*125;
     player.airMagic={
       kind:w===3?'fire':'ice',
       sx:player.x,sy:player.y,
       x:landX,y:landY,
       t:0,dur:.28,done:false,
       startLift:jumpLiftNow()
     };
     particle(player.x,player.y-30,w===3?'火球！':'氷弾！',w===3?'#e43':'#268bc1',.24,14);
   }
   return;
 }

 // 剣チャージ：360度回転斬り（既存）
 if(w===0 && charged){
   player.spin=1;player.spinT=0;player.attackMax=.56;player.attacking=.56;player.attackCooldown=.72;
   particle(player.x,player.y-50,'回転斬り！','#fff',.45,15);
   for(const e of enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<=range+38){const sd=swordDamage(5);e.hp-=sd;enemyHitReact(e,58);particle(e.x,e.y-22,`-${sd}`,'#b31313',.45,16);if(e.hp<=0){e.dead=true;stage1DeathEffect(e);killDrop(e,.55)}}}
   for(const g of props.grass){if(!g.dead&&dist(player.x,player.y,g.x,g.y)<range+40){g.dead=true;particle(g.x,g.y,'ザシュ','#267524')}}
   for(const tr of props.smallTrees){if(!tr.dead&&dist(player.x,player.y,tr.x,tr.y)<range+55){tr.dead=true;particle(tr.x,tr.y-18,'バサッ！','#3a7e35',.45,16)}}
   const spinD=swordDamage(5);hitBoss(spinD,range+38,base,Math.PI*2);hitIslandBoss(spinD,range+38,base,Math.PI*2);hitFireBoss(spinD,range+38,base,Math.PI*2);hitStage2(spinD,range+38,base,Math.PI*2);hitStage3(spinD,range+38,base,Math.PI*2,w,true);hitStage45(spinD,range+38,base,Math.PI*2,w);
   return;
 }

 // 槍チャージ：スパイラル貫通突き。長射程・敵を貫通・岩も破壊。
 if(w===1 && charged){
   player.attackMax=.48;player.attacking=.48;player.attackCooldown=.72;
   player.spiral=.48;player.spiralA=base;
   particle(player.x,player.y-48,'スパイラル！','#fff',.45,15);
   const reach=285, width=34;
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
   hitBoss(4,285,base,.55);hitIslandBoss(4,285,base,.55);hitFireBoss(4,285,base,.55);hitStage2(4,285,base,.55);hitStage3(4,285,base,.55,w,true);hitStage45(8,285,base,.55,w);hitStage8Spinner(285,base);
   // 槍でも岩は削れるが、5回必要。ハンマーなら1発。
   for(const r of stage7Rocks){
     if(r.dead)continue;
     const dx=r.x-player.x,dy=r.y-player.y;
     const along=dx*fx+dy*fy,side=Math.abs(dx*fy-dy*fx);
     if(along>0&&along<reach&&side<r.r+24)damageBreakableRock(r,1,3);
   }
   for(const o of elementalObstacles){
     if(o.dead)continue;const dx=o.x-player.x,dy=o.y-player.y;
     const along=dx*fx+dy*fy,side=Math.abs(dx*fy-dy*fx);
     if(along>0&&along<reach&&side<o.r+20)hitElementalObstacle(o.x,o.y,2,'spear',3);
   }
   for(const a of ambientTerrain){
     if(a.dead||!(a.kind==='tree'||a.kind==='rock'))continue;
     const dx=a.x-player.x,dy=a.y-player.y,along=dx*fx+dy*fy,side=Math.abs(dx*fy-dy*fx);
     if(along>0&&along<reach&&side<44)damageAmbient(a,1,3);
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
 // 自然物も武器で壊せる。木・岩からは低確率で羽の葉っぱ/回復が出る。
 for(const a of ambientTerrain){
   if(a.dead||!(a.kind==='tree'||a.kind==='rock'))continue;
   const d=dist(player.x,player.y,a.x,a.y),aa=Math.atan2(a.y-player.y,a.x-player.x);
   if(d<range+38&&Math.abs(angleDiff(aa,base))<cone*.75)damageAmbient(a,w,1);
 }
 for(const e of enemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y);const aa=Math.atan2(e.y-player.y,e.x-player.x);if(d<=range+e.r&&Math.abs(angleDiff(aa,base))<=cone/2){let dmg=jumpStrike?5:(wasDash?5:(w===2?4:3));if(w===0)dmg=swordDamage(dmg);e.hp-=dmg;e.flash=.14;particle(e.x,e.y-22,`-${dmg}`,'#b31313',.45,16);if(e.hp<=0){e.dead=true;stage1DeathEffect(e);killDrop(e,.55)}}}
 let commonD=jumpStrike?5:(wasDash?5:(w===2?4:3));if(w===0)commonD=swordDamage(commonD);
 for(const e of iceEnemies){if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y),aa=Math.atan2(e.y-player.y,e.x-player.x);if(d<range+e.r&&Math.abs(angleDiff(aa,base))<cone){e.hp-=commonD;e.flash=.16;enemyHitReact(e,48);particle(e.x,e.y-20,`-${commonD}`,'#b31313',.35,15);if(e.hp<=0)e.dead=true}}
 hitVineContent(commonD,range,base,cone,w===3?'fire':'physical');
 hitBoss(commonD,range,base,cone);hitIslandBoss(commonD,range,base,cone);hitFireBoss(commonD,range,base,cone);hitIceBoss(commonD,range,base,cone);
 hitStage2(commonD,range,base,cone);hitStage3(commonD,range,base,cone,w,false);hitStage45(commonD,range,base,cone,w);
 if(w===1)hitStage8Spinner(range+48,base);
 if(w===0){
  for(const g of props.grass){if(!g.dead&&dist(player.x,player.y,g.x,g.y)<range+28){g.dead=true;particle(g.x,g.y,'ザシュ','#267524')}}
  for(const tr of props.smallTrees){if(!tr.dead&&dist(player.x,player.y,tr.x,tr.y)<range+45){tr.dead=true;particle(tr.x,tr.y-18,'バサッ！','#3a7e35',.45,16)}}
 }
 if(w===2){for(const r of props.rocks){if(!r.dead&&dist(player.x,player.y,r.x,r.y)<range+35){r.dead=true;particle(r.x,r.y,'バキッ','#444')}}}
 if(stage10Started&&!rockThrower.dead){
   const d=dist(player.x,player.y,rockThrower.x,rockThrower.y),aa=Math.atan2(rockThrower.y-player.y,rockThrower.x-player.x);
   if(d<range+rockThrower.r+18&&Math.abs(angleDiff(aa,base))<cone/2+.15){
     const dmg=w===2?5:3;rockThrower.hp-=dmg;rockThrower.flash=.2;particle(rockThrower.x,rockThrower.y-24,`-${dmg}`,'#b31313',.35,14);
     if(rockThrower.hp<=0){rockThrower.dead=true;particle(rockThrower.x,rockThrower.y,'粉砕！','#777',.5,17)}
   }
 }
 if(w===2){
   for(const br of bouncingRocks){
     if(!br.dead&&dist(player.x,player.y,br.x,br.y)<range+br.r+34&&br.z<72){
       br.dead=true;particle(br.x,br.y,'ガシャッ！','#777',.38,16);
     }
   }
 }
 if(!startRockWall.dead){
   const wx=startRockWall.x+startRockWall.w/2, wy=clamp(player.y,startRockWall.y-startRockWall.h/2,startRockWall.y+startRockWall.h/2);
   if(dist(player.x,player.y,wx,wy)<range+70){
     if(w===2){
       startRockWall.dead=true;startRockWall.hp=0;
       particle(startRockWall.x,startRockWall.y,'岩壁 粉砕！','#fff',.65,20);say('スタート左の岩壁を壊した！');
     }else if(w===0||w===1){
       particle(startRockWall.x+35,player.y,'ガキン！','#777',.3,14);
     }
   }
 }
 if((w===1||w===2)&&stage7Started){
  for(const r of stage7Rocks){
   if(!r.dead&&dist(player.x,player.y,r.x,r.y)<range+55){
    damageBreakableRock(r,w,1);
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
 if(w===0||w===1||w===2){
   const fx=Math.cos(base),fy=Math.sin(base);
   for(const o of elementalObstacles){
     if(o.dead)continue;const dx=o.x-player.x,dy=o.y-player.y;
     const along=dx*fx+dy*fy,side=Math.abs(dx*fy-dy*fx);
     if(along>0&&along<range+o.r+28&&side<o.r+22)hitElementalObstacle(o.x,o.y,2,w===0?'sword':(w===1?'spear':'hammer'),1);
   }
 }
}
function shieldBlocks(enemy){if(!player.shield||player.jumpT>0)return false;
 if(shields[player.shieldType].magic)return true;
 const incoming=Math.atan2(enemy.y-player.y,enemy.x-player.x);
 const facing=faceAngle(player.face);
 return Math.abs(angleDiff(incoming,facing))<Math.PI*.52;}


function resolveAirMagic(m){
 if(!m||m.done)return;
 m.done=true;
 particle(m.x,m.y,m.kind==='fire'?'ボォン！':'キィン！',m.kind==='fire'?'#e43':'#268bc1',.55,20);
 airMagicImpacts.push({x:m.x,y:m.y,kind:m.kind,life:.52,max:.52});
 const rad=86,dmg=5;
 const hit=(e)=>{
   if(!e||e.dead)return;
   if(dist(m.x,m.y,e.x,e.y)<rad+(e.r||20)){
     e.hp=(e.hp??1)-dmg;e.flash=.2;
     particle(e.x,e.y-25,`-${dmg}`,m.kind==='fire'?'#e43':'#268bc1',.4,16);
     if(e.hp<=0)e.dead=true;
   }
 };
 for(const list of [enemies,stage2Enemies,stage3Enemies,stage4Enemies,stage6Enemies,stage8Enemies,stage10Enemies,iceEnemies,iceThrowers,vineSeedFlowers,whipVines,bossWalnuts,vegArmy,vegFireFlowers,flyingVeg]){
   for(const e of list){
     if(e.type==='spinnerflower'){if(dist(m.x,m.y,e.x,e.y)<rad+e.r)particle(e.x,e.y-25,'キン！','#111',.3,14)}
     else hit(e);
   }
 }
 for(const b of [boss,seedBoss,grassFinalBoss,hammerGuardian,rockBoss,islandBoss,fireBoss,iceBoss,vineBoss]){
   if(b&&(!('active' in b)||b.active)&&!b.dead)hit(b);
 }
 if(m.kind==='fire'){
   for(const g of props.grass){if(!g.dead&&dist(m.x,m.y,g.x,g.y)<100){g.dead=true;particle(g.x,g.y,'ボワッ','#e43')}}
   for(const o of iceRouteBlocks){if(!o.dead&&dist(m.x,m.y,o.x,o.y)<100){o.dead=true;particle(o.x,o.y,'ジュワッ！','#bfeeff',.4,15)}}
 }else{
   freezeLegacyWaterAt(m.x,m.y,100);
   freezeStreamsAt(m.x,m.y,100);
 }
}


function startCloudRaceIntro(){cloudRace.started=false;cloudRace.intro=true;cloudRace.introPage=0;cloudRace.introT=0;cloudRace.lastIntroPage=-1;cloudRace.time=0;cloudRace.cp=0;player.skillT=0;player.skillKind='';player.shield=false;player.charging=false}
function cloudRaceIntroText(p){if(p===0)return ['雲ライダー','「ここまで来たか！ この雲上サーキットで勝負だ！」'];if(p===1)return ['コース説明','大きく歪んだ楕円コースを1周。1/3地点と2/3地点の太いチェックラインを順番に通ろう。'];if(p===2)return ['勝利条件','相手はかなり速い。普通に走るだけでは追いつけないぞ。'];return ['攻略のコツ','赤杖の炎輪／青杖のアイスサーフで加速を繋げ！']}
function update(dt){if(cloudRace.intro){cloudRace.introT+=dt;const p=Math.min(3,Math.floor(cloudRace.introT/2.25));cloudRace.introPage=p;if(p!==cloudRace.lastIntroPage){cloudRace.lastIntroPage=p;const t=cloudRaceIntroText(p);say(`${t[0]}：${t[1]}`)}if(cloudRace.introT>=9){cloudRace.intro=false;cloudRace.started=true;cloudRace.countdown=2;cloudRace.time=0;cloudRace.cp=0;particle(cloudRaceGeo.start.x,cloudRaceGeo.start.y-55,'READY!','#fff',.65,21);say('READY… 杖スキルを準備！')}return;}

 // 凍結ツタは実際のガードステップ（shieldStepT）で永久破壊。
 if((player.shieldStepT||0)>0){
  for(const v of vineWalls){
   if(!v.dead&&!v.perma&&v.iceStage===2&&dist(player.x,player.y,v.x,v.y)<player.r+v.r+40){
    v.perma=true;v.dead=true;v.iceStage=0;v.regenT=999999;
    particle(v.x,v.y,'パキィン！','#e9fbff',.75,22);
   }
  }
 }
 if(areaMapOpen||!equipPanel.classList.contains('hidden'))return;
 player.fallGrace=Math.max(0,(player.fallGrace||0)-dt);
 // P17: 敵のよろけ時間はゲーム更新側で減らす。
 for(const e of enemies){
   if(e.stagger>0)e.stagger=Math.max(0,e.stagger-dt);
 }

 // P16 チャージ攻撃の時間処理
 if(player.spiral>0)player.spiral=Math.max(0,player.spiral-dt);
 if(player.staffChargeFx){player.staffChargeFx.t-=dt;if(player.staffChargeFx.t<=0)player.staffChargeFx=null;}
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
     for(const o of elementalObstacles){
       if(!o.dead&&dist(player.x,player.y,o.x,o.y)<155)hitElementalObstacle(o.x,o.y,2,'hammer',1);
     }
     if(!startRockWall.dead){
       const wx=startRockWall.x+startRockWall.w/2,wy=clamp(player.y,startRockWall.y-startRockWall.h/2,startRockWall.y+startRockWall.h/2);
       if(dist(player.x,player.y,wx,wy)<190){
         startRockWall.dead=true;startRockWall.hp=0;particle(startRockWall.x,startRockWall.y,'岩壁 粉砕！','#fff',.65,20);
       }
     }
     for(const a of ambientTerrain){
       if(!a.dead&&(a.kind==='tree'||a.kind==='rock')&&dist(player.x,player.y,a.x,a.y)<165)damageAmbient(a,2,5);
     }
     for(const br of bouncingRocks){
       if(!br.dead&&dist(player.x,player.y,br.x,br.y)<180){br.dead=true;particle(br.x,br.y,'ガシャッ！','#777',.4,16)}
     }
     if(stage10Started&&!rockThrower.dead&&dist(player.x,player.y,rockThrower.x,rockThrower.y)<185){
       rockThrower.hp-=8;rockThrower.flash=.2;if(rockThrower.hp<=0)rockThrower.dead=true;
     }
     for(const e of enemies){
       if(e.dead)continue;
       const d=dist(player.x,player.y,e.x,e.y);
       if(d<62){e.hp-=5;e.flash=.2;particle(e.x,e.y-22,'-5','#b31313',.5,17)}
       else if(d<145){e.hp-=1;e.flash=.14;e.stagger=.75;particle(e.x,e.y-20,'よろっ','#555',.45,14)}
       if(e.hp<=0){e.dead=true;particle(e.x,e.y,'ボン！','#111',.55,18)}
     }
     if(boss.active&&!boss.dead&&dist(player.x,player.y,boss.x,boss.y)<145){boss.hp-=dist(player.x,player.y,boss.x,boss.y)<62?5:1;boss.flash=.16;}
     for(const e of stage3Enemies){
       if(e.dead||dist(player.x,player.y,e.x,e.y)>=110)continue;
       if(e.type==='spinnerflower'){particle(e.x,e.y-25,'キン！','#111',.3,14);continue}
       e.hp-=4;e.flash=.16;if(e.hp<=0)e.dead=true;
     }
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
     player.aim=sa;player.face=faceFromVec(Math.cos(sa),Math.sin(sa));
     player.skillZ=0;
     // 3回の短い踏み込み。各斬撃に独立判定。
     const phase=Math.min(2,Math.floor(t/.20));
     const local=t-phase*.20;
     if(t<.60&&local<.13){
       mx=Math.cos(sa);my=Math.sin(sa);speed=430;
     }else{mx=0;my=0;speed=0}
     if(t<.60&&local>.055&&local<.12&&!player.skillHit.has('s'+phase)){
       player.skillHit.add('s'+phase);
       particle(player.x+Math.cos(sa)*55,player.y+Math.sin(sa)*55,'ザシュ！','#fff',.25,15);
       const sd=swordDamage(3);
       hitVineContent(sd,112,sa,1.25,'physical');hitBoss(sd,112,sa,1.25);hitIslandBoss(sd,112,sa,1.25);hitFireBoss(sd,112,sa,1.25);hitIceBoss(sd,112,sa,1.25);hitStage2(sd,112,sa,1.25);hitStage3(sd,112,sa,1.25,0,false);hitStage45(sd,112,sa,1.25,0);
       for(const e of enemies){
         if(e.dead)continue;const d=dist(player.x,player.y,e.x,e.y),aa=Math.atan2(e.y-player.y,e.x-player.x);
         if(d<112+e.r&&Math.abs(angleDiff(aa,sa))<.7){e.hp-=sd;e.flash=.15;enemyHitReact(e,55);if(e.hp<=0){e.dead=true;stage1DeathEffect(e);killDrop(e,.55)}}
       }
       // 剣スキルの3連撃でも、通常の剣攻撃と同じく小さい木を斬れる。
       for(const tr of props.smallTrees){
         if(tr.dead)continue;
         const d=dist(player.x,player.y,tr.x,tr.y),aa=Math.atan2(tr.y-player.y,tr.x-player.x);
         if(d<150&&Math.abs(angleDiff(aa,sa))<.8){tr.dead=true;particle(tr.x,tr.y-18,'バサッ！','#3a7e35',.45,16)}
       }
     }

   }else if(player.skillKind==='spear'){
     const sa=player.skillBase;
     player.aim=sa;player.face=faceFromVec(Math.cos(sa),Math.sin(sa));player.skillZ=0;
     if(player.spearSkillHeld){
       mx=0;my=0;speed=0;player.spiral=0;
       // 押している間は何周でも回転。敵弾もこの間ずっと弾く。
       const tick=Math.floor(t/.20);
       const key='p'+tick;
       if(!player.skillHit.has(key)){
         player.skillHit.add(key);
         hitVineContent(2,76,sa,Math.PI*2,'physical');hitBoss(2,76,sa,Math.PI*2);hitIslandBoss(2,76,sa,Math.PI*2);hitFireBoss(2,76,sa,Math.PI*2);hitIceBoss(2,76,sa,Math.PI*2);hitStage2(2,76,sa,Math.PI*2);hitStage3(2,76,sa,Math.PI*2,1,false);hitStage45(2,76,sa,Math.PI*2,1);
         for(const e of enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<76+e.r){e.hp-=2;e.flash=.12;enemyHitReact(e,35);if(e.hp<=0)e.dead=true}}
       }
     }else{
       // ボタンを離したら一歩踏み込んで強い突き。
       const p=(t-.46)/.26;
       if(p<.62){mx=Math.cos(sa);my=Math.sin(sa);speed=440}else{mx=0;my=0;speed=0}
       if(p>.35&&!player.skillHit.has('finish')){
         player.skillHit.add('finish');
         particle(player.x+Math.cos(sa)*90,player.y+Math.sin(sa)*90,'ズドッ！','#fff',.3,17);
         hitVineContent(6,165,sa,.42,'physical');hitBoss(6,165,sa,.42);hitIslandBoss(6,165,sa,.42);hitFireBoss(6,165,sa,.42);hitIceBoss(6,165,sa,.42);hitStage2(6,165,sa,.42);hitStage3(6,165,sa,.42,1,true);hitStage45(6,165,sa,.42,1);hitStage8Spinner(165,sa);
         for(const e of enemies){if(e.dead)continue;const dx=e.x-player.x,dy=e.y-player.y,along=dx*Math.cos(sa)+dy*Math.sin(sa),side=Math.abs(dx*Math.sin(sa)-dy*Math.cos(sa));if(along>0&&along<165&&side<35+e.r*.4){e.hp-=6;e.flash=.18;enemyHitReact(e,70);if(e.hp<=0)e.dead=true}}
       }
     }

   }else if(player.skillKind==='hammer'){
     // ハンマー：スキル開始から終了まで、見た目にもきっちり3回転。
     mx=0;my=0;speed=0;player.skillZ=0;
     const p=Math.min(1,t/.90);
     player.hammerSpin=p*Math.PI*6*player.skillSide;
     // 1回転ごとに1回ずつ当たり判定。
     const spin=Math.min(2,Math.floor(Math.min(.999,p)*3));
     const key='hammerSpin'+spin;
     if(!player.skillHit.has(key)){
       player.skillHit.add(key);
       particle(player.x,player.y,'ブォン！','#7e20a6',.28,16);
       const dmg=4,rad=118;
       hitBoss(dmg,rad,0,Math.PI*2);
       hitStage2(dmg,rad,0,Math.PI*2);
       hitStage3(dmg,rad,0,Math.PI*2,2,true);
       hitStage45(dmg,rad,0,Math.PI*2,2);
       for(const e of enemies){
         if(e.dead)continue;
         if(dist(player.x,player.y,e.x,e.y)<rad+e.r){
           e.hp-=dmg;e.flash=.16;enemyHitReact(e,70);
           particle(e.x,e.y-20,`-${dmg}`,'#b31313',.35,15);
           if(e.hp<=0){e.dead=true;stage1DeathEffect(e);killDrop(e,.55)}
         }
       }
       // 岩・クルミも回転ハンマーで粉砕可能。
       for(const r of stage7Rocks){
         if(!r.dead&&dist(player.x,player.y,r.x,r.y)<rad+r.r){r.dead=true;particle(r.x,r.y,'粉砕！','#444',.4,16)}
       }
       for(const e of bossWalnuts){
         if(!e.dead&&dist(player.x,player.y,e.x,e.y)<rad+e.r){e.dead=true;particle(e.x,e.y,'パカン！','#9b6637',.4,16)}
       }
       for(const r of rollingRocks){
         if(!r.dead&&dist(player.x,player.y,r.x,r.y)<rad+r.r){r.dead=true;particle(r.x,r.y,'ガシャッ！','#666',.35,15)}
       }
     }

   }else if(player.skillKind==='fire'){
     // 赤杖：燃えるタイヤのように旋回。氷塊へ触れればスキルでも溶かせる。
     for(const o of iceRouteBlocks){
       if(!o.dead&&dist(player.x,player.y,o.x,o.y)<105+o.r*.35){
         o.dead=true;particle(o.x,o.y,'ジュワァ！','#bfeeff',.45,16);
       }
     }
     for(const v of [...vineWalls,...vineKnot]){
       if(!v.dead&&!v.perma&&dist(player.x,player.y,v.x,v.y)<115){
         if(v.iceStage){v.iceStage=0;v.iceT=0;}
         v.hp-=2;if(v.hp<=0){v.dead=true;v.burned=true;v.regenT=5;particle(v.x,v.y,'ボワッ！','#e43',.4,15);}
       }
     }
     player.fireWheelVisual=(player.fireWheelVisual||0)+dt*18;
     const inputA=stickAngle();
     if(inputA!==null)player.skillBase=steerAngle(player.skillBase,inputA,dt*5.2);
     player.aim=player.skillBase;
     mx=Math.cos(player.skillBase)*2.55;my=Math.sin(player.skillBase)*2.55;speed=340;
     player.face=faceFromVec(mx,my);
     // 地面に短時間残る火を置く。
     if(!player.fireTrail.length || dist(player.x,player.y,player.fireTrail[player.fireTrail.length-1].x,player.fireTrail[player.fireTrail.length-1].y)>34){
       player.fireTrail.push({x:player.x,y:player.y,life:2.15});
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
     // 完全凍結した再生ツタへアイスサーフで体当たりすると、そのまま永久破壊。
     for(const v of vineWalls){
       if(v.dead||v.perma||v.iceStage!==2)continue;
       if(dist(player.x,player.y,v.x,v.y)<player.r+v.r+44){
         v.perma=true;v.dead=true;v.iceStage=0;v.regenT=999999;
         particle(v.x,v.y,'パキィン！','#e9fbff',.75,22);
       }
     }
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
 if((player.vineBound||0)>0){mx=0;my=0;player.shield=false;}
 if(player.falling){mx=0;my=0;}
 if(player.launchTravel){mx=0;my=0;}
 const prevX=player.x,prevY=player.y;
 player.x=clamp(player.x+mx*speed*dt,world.minX+45,world.w-45);player.y=clamp(player.y+my*speed*dt,world.minY+45,world.h-45);
 // 打ち上げ台の飛行中は、画面外へ消えるほどの擬似高度ではなく島まで実際に移動する。
 if(player.launchTravel){
   const L=player.launchTravel;
   L.t=Math.min(L.dur,L.t+dt);
   const q=L.t/L.dur, ease=q*q*(3-2*q);
   player.x=L.sx+(L.tx-L.sx)*ease;
   player.y=L.sy+(L.ty-L.sy)*ease;
   if(q>=1){
     player.x=L.tx;player.y=L.ty;
     player.launchTravel=null;
     player.jumpT=Math.min(player.jumpT,.18);
     player.fallGrace=Math.max(player.fallGrace||0,.9);
   }
 }
 for(const o of elementalObstacles){if(o.type==='regenVine'&&!o.dead)o.wiggle=(o.wiggle||0)+dt*7;}
 // 意味のない浅い水流。入っても通れるが、少しだけ流される。
 for(const a of ambientTerrain){
   if(a.kind!=='stream')continue;
   if(player.x>a.x&&player.x<a.x+a.w&&player.y>a.y&&player.y<a.y+a.h){
     player.x+=(a.fx||0)*dt;player.y+=(a.fy||0)*dt;
   }
 }
 // 再生ツタ壁は壊れている間だけ通れる。
 for(const v of vineWalls){
   if(!v.dead&&!v.perma&&dist(player.x,player.y,v.x,v.y)<player.r+v.r-6){
     player.x=prevX;player.y=prevY;break;
   }
 }
 // 氷ルートの氷塊。赤杖で溶かすまで通れない。
 for(const o of iceRouteBlocks){
   if(!o.dead&&dist(player.x,player.y,o.x,o.y)<player.r+o.r-5){
     player.x=prevX;player.y=prevY;break;
   }
 }
 // 属性障害物は壊すまで通行不可。
 for(const o of elementalObstacles){
   if(!o.dead&&dist(player.x,player.y,o.x,o.y)<player.r+o.r-4){
     player.x=prevX;player.y=prevY;break;
   }
 }
 // gate付きの木だけは道を塞ぐ。ほかの小木は自然物なので通行を妨げない。
 for(const tr of props.smallTrees){
   if(tr.gate&&!tr.dead&&dist(player.x,player.y,tr.x,tr.y)<47){
     player.x=prevX;player.y=prevY;break;
   }
 }
 // 序盤の水場は最初は越えられない。青杖で凍らせた時だけ通れる。
 const earlyWater=props.water;
 if(earlyWater.w>0&&earlyWater.h>0&&earlyWater.frozen<=0){
   const wp=player.r*.55;
   if(player.x>earlyWater.x-wp&&player.x<earlyWater.x+earlyWater.w+wp&&
      player.y>earlyWater.y-wp&&player.y<earlyWater.y+earlyWater.h+wp){
     player.x=prevX;player.y=prevY;
   }
 }
 // 水色の浅瀬・小川・滝は侵入可能。流れの方向へ少しずつ押される。
 for(const wa of [props.water,props.shallowWater,props.upperPond,props.waterfall])wa.frozen=Math.max(0,(wa.frozen||0)-dt);
 for(const wa of [props.shallowWater,props.upperPond,props.waterfall]){
   if((wa.frozen||0)<=0&&player.x>wa.x&&player.x<wa.x+wa.w&&player.y>wa.y&&player.y<wa.y+wa.h){
     player.x+=wa.flowX*dt;player.y+=wa.flowY*dt;
   }
 }
 // 横断水流は中心線に沿って押す。速い流れほど波も速く動く。
 for(const st of currentStreams){
   st.frozen=Math.max(0,st.frozen-dt);
   const seg=nearestStreamSegment(st,player.x,player.y,player.r*.55);
   const visibleHere=pointSupportedByGround(player.x,player.y,player.r*.35);
   const visibleWater=seg&&pointSupportedByGround(seg.px,seg.py,10);
   const sameGround=seg&&pointOnSameVisibleGround({x:player.x,y:player.y},{x:seg.px,y:seg.py},10);
   if(seg&&visibleHere&&visibleWater&&sameGround&&st.frozen<=0){
     const nx=seg.dx/(seg.len||1),ny=seg.dy/(seg.len||1);
     player.x+=nx*st.speed*dt;player.y+=ny*st.speed*dt;
   }
 }
 // 序盤の岩も最初は越えられない。ハンマー入手後に戻れば壊せる。
 for(const r of props.rocks){
   if(!r.dead&&dist(player.x,player.y,r.x,r.y)<player.r+31){
     player.x=prevX;player.y=prevY;break;
   }
 }
 // スタート左の岩壁。ハンマーで壊すまでは左側へ抜けられない。
 if(!startRockWall.dead){
   const left=startRockWall.x-startRockWall.w/2,right=startRockWall.x+startRockWall.w/2;
   const top=startRockWall.y-startRockWall.h/2,bottom=startRockWall.y+startRockWall.h/2;
   if(player.x+player.r>left&&player.x-player.r<right&&player.y+player.r>top&&player.y-player.r<bottom){
     player.x=prevX;player.y=prevY;
   }
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

 // ジャンプ中は足元の地面判定が切れて当然なので、崖落下にはしない。
 // 「十分な高さで空中にいるのに落下扱い」になっていた原因は、
 // ワールド座標だけを見て地面から外れた瞬間に falling を開始していたこと。
 // 通常ジャンプ・雲ジャンプ・打ち上げ台の飛行は、着地するまで空中移動として扱う。
 if(player.jumpT>0 || player.launchTravel){
   safe=true;
 }

 // 岩クルミ後の跳び石区間：ジャンプ中は短い隙間を空中移動できる。
 // 従来は地面判定が切れた瞬間に崖際処理が発動し、ジャンプしても引っ掛かっていた。
 if(rockBossDefeated&&player.jumpT>0&&player.x>=11670&&player.x<=13490){
   const nearIsland=visibleGroundRects().some(r=>{
     const cx=clamp(player.x,r.x,r.x+r.w),cy=clamp(player.y,r.y,r.y+r.h);
     return Math.hypot(player.x-cx,player.y-cy)<=110;
   });
   if(nearIsland)safe=true;
 } if(stage.bridgeOpen){
   const bx1=Math.min(stageGeo.bridge.x1,stageGeo.bridge.x2)-25,bx2=Math.max(stageGeo.bridge.x1,stageGeo.bridge.x2)+25;
   const by=stageGeo.bridge.y1;
   if(player.x>=bx1&&player.x<=bx2&&Math.abs(player.y-by)<140)safe=true;
   if(stage2BridgeOpen){
     const b2x1=Math.min(stage2Geo.bridge.x1,stage2Geo.bridge.x2)-25,b2x2=Math.max(stage2Geo.bridge.x1,stage2Geo.bridge.x2)+25;
     if(player.x>=b2x1&&player.x<=b2x2&&Math.abs(player.y-stage2Geo.bridge.y1)<100)safe=true;
   }
   if(stage3BridgeOpen&&player.x>=4770&&player.x<=4980&&Math.abs(player.y-570)<105)safe=true;
   if(stage4BridgeOpen&&player.x>=6100&&player.x<=6280&&Math.abs(player.y-570)<105)safe=true;
 }
 // 地面を外れたら、その地点から実際に落ちる演出へ。
 // 以前の「おっと！」連打式の崖粘りは廃止。復帰先はチェックポイントではなく、
 // 落ちた場所から最も近い安全な地面なので、滝から落ちてもスタートへ飛ばされない。
 const inWaterfall=player.x>props.waterfall.x&&player.x<props.waterfall.x+props.waterfall.w&&player.y>props.waterfall.y;
 player.fallGrace=Math.max(0,(player.fallGrace||0)-dt);
 if(player.fallGrace>0)safe=true;
 if(player.falling){
   player.inv=Math.max(player.inv,.2);
   player.fallT+=dt;
   // 落下中は移動でキャンセルできない。
   player.x=player.fallFromX;player.y=player.fallFromY;
   if(player.fallT>=player.fallDur){
     if(floatLeafStock>0){
       floatLeafStock--;particle(player.fallReturnX,player.fallReturnY-35,'ふわっ！','#7edb72',.55,18);
       say(`羽の葉っぱで助かった！ 残り${floatLeafStock}`);
     }else{
       const got=takeDamage(3);particle(player.fallReturnX,player.fallReturnY-35,`落下 -${got}`,'#c11',.5,16);
     }
     player.x=player.fallReturnX;player.y=player.fallReturnY;
     player.falling=false;player.fallT=0;player.inv=.65;player.ledgeT=0;
     if(player.skillT>0){player.skillT=0;player.skillKind='';player.skillZ=0}
   }
 }else if(!safe){
   const grounds=visibleGroundRects();let best=null,bestD=1e18;
   // ジャンプ終了直後、島の縁を数pxだけ外した場合は着地として吸着させる。
   // モバイル操作で「届いて見えるのに落ちる」を防ぐ。
   let landingSnap=null,landingSnapD=1e18;
   for(const r of grounds){
     const sx=clamp(player.x,r.x+8,r.x+r.w-8);
     const sy=clamp(player.y,r.y+8,r.y+r.h-8);
     const sd=Math.hypot(sx-player.x,sy-player.y);
     if(sd<landingSnapD){landingSnapD=sd;landingSnap={x:sx,y:sy};}
   }
   if(landingSnap&&landingSnapD<=42){
     player.x=landingSnap.x;player.y=landingSnap.y;
     safe=true;player.fallGrace=.18;
   }
   if(safe){
     player.ledgeT=0;
   }else{
   // 直前の位置を最優先候補にしつつ、現在地点に最も近い地面内側へ戻す。
   for(const r of grounds){
     const rx=clamp(player.x,r.x+player.r+5,r.x+r.w-player.r-5);
     const ry=clamp(player.y,r.y+player.r+5,r.y+r.h-player.r-5);
     const dd=(rx-player.x)**2+(ry-player.y)**2;
     if(dd<bestD){bestD=dd;best={x:rx,y:ry}}
   }
   player.falling=true;player.fallT=0;
   player.fallFromX=player.x;player.fallFromY=player.y;
   player.fallReturnX=best?best.x:prevX;player.fallReturnY=best?best.y:prevY;
   player.shield=false;player.charging=false;
   if(player.skillT>0){player.skillT=0;player.skillKind='';player.skillZ=0}
   }
 }else{
   player.ledgeT=0;
 }

  // 灼熱花の中心へは入り込めない。
 if(fireBoss.active&&!fireBoss.dead){
   const dx=player.x-fireBoss.x,dy=player.y-fireBoss.y,d=Math.hypot(dx,dy)||1;
   const minD=player.r+fireBoss.r*.72;
   if(d<minD){player.x=fireBoss.x+dx/d*minD;player.y=fireBoss.y+dy/d*minD;}
 }
 // 大型ボスの中心には入り込めない。接触自体は攻撃ではない。
 for(const b of [boss,seedBoss,grassFinalBoss,rockBoss]){
   if(!b.active||b.dead)continue;
   const dx=player.x-b.x,dy=player.y-b.y,d=Math.hypot(dx,dy)||1,minD=player.r+b.r*.72;
   if(d<minD){const push=minD-d;player.x+=dx/d*push;player.y+=dy/d*push}
 }

 for(const fx of airMagicImpacts)fx.life-=dt;
 for(let i=airMagicImpacts.length-1;i>=0;i--)if(airMagicImpacts[i].life<=0)airMagicImpacts.splice(i,1);

 // 杖ジャンプ弾は着地を待たず、約0.28秒で斜め下へ飛んで着弾する。
 if(player.airMagic&&!player.airMagic.done){
   player.airMagic.t+=dt;
   if(player.airMagic.t>=player.airMagic.dur)resolveAirMagic(player.airMagic);
 }

 // ジャンプ攻撃の着地判定
 if(player.airAttack&&player.jumpT>0&&player.jumpT<=dt+.025&&!player.airAttackDone){
   player.airAttackDone=true;
   const w=player.weapon;
   if(w===0||w===1){
     const rad=w===0?64:72,dmg=5;
     particle(player.x,player.y,w===0?'ズブッ！':'ドスッ！','#fff',.38,17);
     hitBoss(dmg,rad,0,Math.PI*2);hitFireBoss(dmg,rad,0,Math.PI*2);hitStage2(dmg,rad,0,Math.PI*2);hitStage3(dmg,rad,0,Math.PI*2,w,false);hitStage45(dmg,rad,0,Math.PI*2,w);
     for(const e of enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<rad+e.r){e.hp-=dmg;e.flash=.18;enemyHitReact(e,42);if(e.hp<=0)e.dead=true}}
   }else if(w===2){
     // 直撃範囲のみ。チャージのような外周衝撃波は無し。
     particle(player.x,player.y,'ドン！','#555',.34,17);
     hitBoss(5,68,0,Math.PI*2);hitFireBoss(5,68,0,Math.PI*2);hitStage2(5,68,0,Math.PI*2);hitStage3(5,68,0,Math.PI*2,2,false);hitStage45(5,68,0,Math.PI*2,2);
     for(const e of enemies){if(!e.dead&&dist(player.x,player.y,e.x,e.y)<68+e.r){e.hp-=5;e.flash=.18;enemyHitReact(e,65);if(e.hp<=0)e.dead=true}}
   }else if(player.airMagic&&!player.airMagic.done){
     resolveAirMagic(player.airMagic);
   }
 }
  if(player.jumpT>0)player.jumpT=Math.max(0,player.jumpT-dt);
  player.cloudBounceCd=Math.max(0,(player.cloudBounceCd||0)-dt);
  if(player.jumpT>0&&player.cloudBounceCd<=0){
    const lift=jumpLiftNow();
    if(Number.isFinite(lift)){
      for(const c of cloudJumpPads){
        if(dist(player.x,player.y-lift,c.x,c.y)<c.r+player.r*.65 && player.y-lift<c.y+12){
          player.jumpDur=.92;player.jumpHeight=185;player.jumpT=.92;player.cloudBounceCd=.7;
          particle(c.x,c.y-35,'ボヨン！','#fff',.45,17);break;
        }
      }
    }
  }

 if(player.shield&&player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+shields[player.shieldType].heal*dt)}


 // 赤杖スキルの火の跡
 for(const f of player.fireTrail){
   for(const o of iceRouteBlocks){
     if(!o.dead&&dist(f.x,f.y,o.x,o.y)<48){
       o.dead=true;particle(o.x,o.y,'ジュワッ！','#bfeeff',.4,15);
     }
   }
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
 if(player.skillKind==='ice'&&player.skillT>0){freezeStreamsAt(player.x,player.y,72);freezeLegacyWaterAt(player.x,player.y,72)}
 function iceHitTarget(pr,e){
   if(!e||e.dead)return false;
   if(dist(pr.x,pr.y,e.x,e.y)>=pr.r+(e.r||24))return false;
   e.hp=(e.hp??1)-pr.damage;e.flash=.16;e.stagger=Math.max(e.stagger||0,.55);
   if('attackCd' in e)e.attackCd+=.55;
   particle(e.x,e.y-22,`-${pr.damage}`,'#d9f7ff',.4,15);
   if(e.hp<=0)e.dead=true;
   pr.hit=true;return true;
 }
 function iceHitAnything(pr){
   const lists=[enemies,stage2Enemies,stage3Enemies,stage4Enemies,stage6Enemies,stage8Enemies,stage10Enemies,bossWalnuts,vegArmy,vegFireFlowers,flyingVeg];
   for(const list of lists){
     for(const e of list){
       // 回転花も氷は有効。少し凍って動きを止める。
       if(iceHitTarget(pr,e))return true;
     }
   }
   for(const b of [boss,seedBoss,grassFinalBoss,rockBoss,islandBoss,fireBoss,hammerGuardian,iceBoss]){
     if(!b||b.dead||!b.active)continue;
     if(iceHitTarget(pr,b))return true;
   }
   if(stage10Started&&!rockThrower.dead&&iceHitTarget(pr,rockThrower))return true;
   return false;
 }

 // magic projectiles
 for(const pr of projectiles){
   if(pr.hit)continue;
   pr.life-=dt;pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
   if(pr.life<=0||pr.x<world.minX||pr.y<world.minY||pr.x>world.w||pr.y>world.h){pr.hit=true;continue}

   // 敵が撃った種・花粉弾は、プレイヤー専用の当たり判定。
   // 自分自身や他の敵には当たらず、プレイヤー弾処理にも流さない。
   if(pr.enemyShot){
     // 槍スキルの風車回転中は、槍そのものが弾を弾く。
     if(pr.kind!=='enemyFire'&&player.skillKind==='spear'&&player.skillT>0&&player.spearSkillHeld&&dist(pr.x,pr.y,player.x,player.y)<pr.r+82){
       pr.hit=true;particle(pr.x,pr.y,'キン！','#fff',.28,14);continue;
     }
     if(dist(pr.x,pr.y,player.x,player.y)<pr.r+player.r){
       if(pr.kind!=='enemyFire'&&player.jumpT>0){
         particle(player.x,player.y-45,'スカッ','#333',.3,13);
       }else if(shieldBlocks({x:pr.x,y:pr.y})){
         particle(pr.x,pr.y,pr.kind==='enemyFire'?'ボォン！':(pr.kind==='seed'?'カン！':'ポフン！'),'#111',.35,14);
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

   if(pr.kind==='fire'||pr.kind==='fireWheel'){
     for(const o of iceRouteBlocks){
       if(!o.dead&&dist(pr.x,pr.y,o.x,o.y)<pr.r+o.r){
         o.dead=true;particle(o.x,o.y,'ジュワッ！','#bfeeff',.45,16);pr.hit=true;
       }
     }
     for(const g of props.grass){if(!g.dead&&dist(pr.x,pr.y,g.x,g.y)<pr.r+24){g.dead=true;particle(g.x,g.y,'ボワッ','#e43');pr.hit=true;break}}
   }else if(pr.kind==='ice'){
     const frozeLegacy=freezeLegacyWaterAt(pr.x,pr.y,pr.r+22);
     const frozeStream=freezeStreamsAt(pr.x,pr.y,pr.r+16);
     if(frozeLegacy||frozeStream)particle(pr.x,pr.y,'カチッ','#167bad',.22,12);
     // 水を凍らせても氷弾は消えず、そのまま敵まで飛ぶ。
   }
   if(pr.hit)continue;
   if(pr.kind==='ice'&&iceHitAnything(pr))continue;
   if(pr.kind==='fire'||pr.kind==='fireWheel'||pr.kind==='ice'){
     for(const o of elementalObstacles){
       if(o.dead)continue;
       if(dist(pr.x,pr.y,o.x,o.y)<pr.r+o.r){
         hitElementalObstacle(o.x,o.y,o.r,pr.kind==='fireWheel'?'fire':pr.kind,1);pr.hit=true;break;
       }
     }
   }
   if(pr.hit)continue;
   if(cloudRaceWon){
     let vh=false;
     for(const list of [vegArmy,vegFireFlowers,flyingVeg]){
       for(const e of list){
         if(e.dead)continue;
         if(dist(pr.x,pr.y,e.x,e.y)<pr.r+(e.r||25)){
           e.hp-=pr.damage;e.flash=.16;pr.hit=true;vh=true;
           particle(e.x,e.y-24,`-${pr.damage}`,pr.kind==='fire'?'#e43':'#176d9a',.35,15);
           if(e.hp<=0)e.dead=true;break;
         }
       }
       if(vh)break;
     }
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
   if(fireBoss.active&&!fireBoss.dead&&dist(pr.x,pr.y,fireBoss.x,fireBoss.y)<pr.r+fireBoss.r+14){
     fireBoss.hp-=pr.damage;fireBoss.flash=.14;particle(fireBoss.x,fireBoss.y-45,`-${pr.damage}`,'#b31313',.4,16);pr.hit=true;
   }
   if(pr.hit)continue;
   if(iceBoss.active&&!iceBoss.dead&&dist(pr.x,pr.y,iceBoss.x,iceBoss.y)<pr.r+iceBoss.r+18){
     const dmg=pr.kind==='fire'?Math.max(3,pr.damage+1):pr.damage;
     iceBoss.hp-=dmg;iceBoss.flash=.18;particle(iceBoss.x,iceBoss.y-48,`-${dmg}`,'#e55232',.4,16);pr.hit=true;
   }
   if(pr.hit)continue;
   for(const e of [...vineSeedFlowers,...whipVines,...iceThrowers]){
     if(e.dead)continue;if(dist(pr.x,pr.y,e.x,e.y)<pr.r+e.r+8){let dmg=pr.damage||2;if(pr.kind==='fire')dmg++;e.hp-=dmg;e.flash=.15;pr.hit=true;if(e.hp<=0)e.dead=true;break}
   }
   if(pr.hit)continue;
   for(const v of [...vineWalls,...vineKnot]){
     if(v.dead||v.perma)continue;
     if(dist(pr.x,pr.y,v.x,v.y)<pr.r+v.r){
       if(pr.kind==='ice'&&vineWalls.includes(v)){
         if(v.iceStage===0){
           v.iceStage=1;v.hp=v.maxHp;pr.hit=true;
           particle(v.x,v.y-18,'キュッ…','#bdeeff',.5,16);
         }else if(v.iceStage===1){
           // 縮んだ後は根元付近に当てる。根元は壁中心より下側。
           if(pr.y>v.y-8){
             v.iceStage=2;v.iceT=5;pr.hit=true;
             particle(v.x,v.y+22,'カチコチ！','#e8fbff',.65,19);
           }
         }else{
           pr.hit=true;particle(v.x,v.y,'カン！','#dff8ff',.25,12);
         }
       }else{
         const dmg=pr.damage||2;v.hp-=dmg;pr.hit=true;
         if(v.hp<=0){v.dead=true;v.burned=pr.kind==='fire';v.regenT=pr.kind==='fire'?5:3;particle(v.x,v.y,pr.kind==='fire'?'ボワッ！':'ザシュ！',pr.kind==='fire'?'#e43':'#2e843a',.4,15);}
       }
       break;
     }
   }
   if(pr.hit)continue;
   if(vineBoss.active&&!vineBoss.dead&&dist(pr.x,pr.y,vineBoss.x,vineBoss.y)<pr.r+vineBoss.r+12){vineBoss.hp-=pr.damage;vineBoss.flash=.15;pr.hit=true;}
   if(pr.hit)continue;
   for(const e of iceEnemies){if(e.dead)continue;if(dist(pr.x,pr.y,e.x,e.y)<pr.r+e.r+10){let dmg=pr.damage||3;if(pr.kind==='fire')dmg++;e.hp-=dmg;e.flash=.16;particle(e.x,e.y-24,`-${dmg}`,'#b31313',.35,15);pr.hit=true;if(e.hp<=0)e.dead=true;break}}if(pr.hit)continue;
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
   // ボスとは重ならない。近すぎれば離れ、適度な距離から葉っぱを飛ばす。
   if(d<150){boss.x-=dx/d*boss.speed*.85*dt;boss.y-=dy/d*boss.speed*.85*dt}
   else if(d>285){boss.x+=dx/d*boss.speed*.65*dt;boss.y+=dy/d*boss.speed*.65*dt}
   // ボスは必ずボス広場の内側に留まる。
   boss.x=clamp(boss.x,stageGeo.bossArena.x+boss.r,stageGeo.bossArena.x+stageGeo.bossArena.w-boss.r);
   boss.y=clamp(boss.y,stageGeo.bossArena.y+boss.r,stageGeo.bossArena.y+stageGeo.bossArena.h-boss.r);
   if(d<boss.r+player.r+10){
     const push=boss.r+player.r+10-d;player.x+=dx/d*push;player.y+=dy/d*push;
   }
   if(boss.attackCd<=0&&d<390){
     boss.attackCd=1.55;
     const a=Math.atan2(player.y-boss.y,player.x-boss.x);
     projectiles.push({x:boss.x+Math.cos(a)*65,y:boss.y+Math.sin(a)*65-8,vx:Math.cos(a)*205,vy:Math.sin(a)*205,r:13,life:2.0,kind:'leafshot',damage:5,enemyShot:true,hit:false});
     particle(boss.x,boss.y-48,'シュッ！','#3a8d3f',.3,15);
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
       e.attackCd=e.type==='seedflower'?1.85:2.15;
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
       seedBoss.attackCd=1.45;seedBoss.phase++;
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
       // 生命の盾と同じ方式：ボスが消えたその場所に報酬を残す。
       spearPickup.x=seedBoss.x;
       spearPickup.y=seedBoss.y;
       particle(seedBoss.x,seedBoss.y,'撃破！','#fff',.8,26);
       say('ボスがいた場所に槍が残った！');
     }
   }
 }

if(stage2BridgeOpen && player.x>3470 && !stage3Started){
   stage3Started=true;currentStage=3;
   stage.checkpoint={x:3600,y:550};
   say('第3島。何か地面に刺さっている…');
 }


 if(stage2BossDefeated&&!spearPickup.taken&&dist(player.x,player.y,spearPickup.x,spearPickup.y)<58){
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
     if(e.type==='spinnerflower'){
       e.petalA=(e.petalA||0)+dt*5.2;
       // 防御ギミックなので移動・通常近接攻撃はしない。
       continue;
     }
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
         else if(player.inv<=0){const got=takeDamage(e.type==='spinnerflower'?4:4);player.inv=.5;particle(player.x,player.y-35,`-${got}`,'#c11',.4,16)}
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
     grassFinalBoss.attackCd=1.25;grassFinalBoss.phase++;
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
     grassFinalBoss.dead=true;grassFinalBoss.active=false;grassAreaClear=true;area1Cleared=true;
     particle(grassFinalBoss.x,grassFinalBoss.y,'AREA CLEAR！','#fff',1.0,28);
     say('草原エリア クリア！ そのまま風の庭園へ進める！');
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
       e.attackCd=e.type==='dandelion'?1.85:1.55;
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

 // ハンマー直前の中ボス。倒すまではハンマーは存在しない。
 if(stage7Started&&!hammerGuardian.dead&&!hammerGuardian.active&&player.x>10180){
   hammerGuardian.active=true;
   say('岩甲羅の中ボス！');
 }
 if(hammerGuardian.active&&!hammerGuardian.dead){
   hammerGuardian.flash=Math.max(0,hammerGuardian.flash-dt);
   hammerGuardian.attackCd-=dt;
   if(hammerGuardian.attackCd<=0){
     hammerGuardian.attackCd=1.05;
     const a=Math.atan2(player.y-hammerGuardian.y,player.x-hammerGuardian.x);
     hammerGuardianRocks.push({
       x:hammerGuardian.x+Math.cos(a)*48,y:hammerGuardian.y+Math.sin(a)*48,
       vx:Math.cos(a)*215,vy:Math.sin(a)*215,r:18,life:2.7,dead:false
     });
     particle(hammerGuardian.x,hammerGuardian.y-40,'ゴロッ！','#777',.3,14);
   }
   if(hammerGuardian.hp<=0){
     hammerGuardian.dead=true;hammerGuardian.active=false;
     // 中ボスが道の外側へ押し出されていても、報酬は必ず下側の岩道へ落とす。
     hammerPickup.x=10470;hammerPickup.y=685;
     particle(hammerPickup.x,hammerPickup.y-20,'ハンマーが道に落ちた！','#fff',.7,20);
     say('ハンマーが岩道に落ちた！');
   }
 }
 for(const r of hammerGuardianRocks){
   if(r.dead)continue;
   r.x+=r.vx*dt;r.y+=r.vy*dt;r.life-=dt;
   if(r.life<=0){r.dead=true;continue}
   if(dist(player.x,player.y,r.x,r.y)<player.r+r.r){
     if(player.shield){r.dead=true;particle(r.x,r.y,'ガン！','#fff',.3,14)}
     else if(player.inv<=0){const got=takeDamage(5);player.inv=.55;r.dead=true;particle(player.x,player.y-35,`-${got}`,'#c11',.35,15)}
   }
 }

 // 中ボス撃破後、消えた場所に落ちたハンマーを取得。
 if(stage7Started&&hammerGuardian.dead&&!hammerPickup.taken&&dist(player.x,player.y,hammerPickup.x,hammerPickup.y)<86){
   hammerPickup.taken=true;
   unlockedWeapons[2]=true;
   player.weapon=2;
   weaponNameEl.textContent=weapons[2].name;
   particle(hammerPickup.x,hammerPickup.y-30,'ハンマー GET！','#fff',.8,22);
   say('ハンマーを手に入れた！ 岩もクルミも一撃！');
 }

 // ボス起動
 if(stage7Started&&hammerGuardian.dead&&hammerPickup.taken&&!rockBoss.dead&&!rockBoss.active&&player.x>11220){
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

 // 岩ボス撃破後：橋ではなく、小島をジャンプで渡る次コース。
 if(rockBossDefeated&&player.x>11620&&!stage8Started){
   stage8Started=true;currentStage=8;stage.checkpoint={x:11870,y:545};
   say('跳び石群島：短い隙間はジャンプで！');
 }
 if(stage8Started){
   for(const e of stage8Enemies){
     if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.petalA=(e.petalA||0)+dt*5.6;
     const d=dist(player.x,player.y,e.x,e.y);
     if(d<player.r+e.r+12&&player.jumpT<=0&&player.inv<=0){
       const got=takeDamage(4);player.inv=.5;particle(player.x,player.y-35,`-${got}`,'#c11',.4,16);
       const a=Math.atan2(player.y-e.y,player.x-e.x);player.x+=Math.cos(a)*18;player.y+=Math.sin(a)*18;
     }
   }
 }

 // 跳び石群島の最奥：円形のボス島へ。
 if(rockBossDefeated&&player.x>13640&&!stage9Started){
   stage9Started=true;currentStage=9;stage.checkpoint={x:13780,y:555};
   islandBoss.active=true;
   say('大輪の闘技島！');
 }
 if(stage9Started&&!islandBoss.dead){
   islandBoss.flash=Math.max(0,islandBoss.flash-dt);
   islandBoss.petalA=(islandBoss.petalA||0)+dt*1.8;
   islandBoss.attackCd-=dt;

   // ボスは島から出ない。プレイヤーにも重ならない。
   islandBoss.x=clamp(islandBoss.x,stage9Geo.arena.x+120,stage9Geo.arena.x+stage9Geo.arena.w-120);
   islandBoss.y=clamp(islandBoss.y,stage9Geo.arena.y+120,stage9Geo.arena.y+stage9Geo.arena.h-105);
   const dx=player.x-islandBoss.x,dy=player.y-islandBoss.y,d=Math.hypot(dx,dy)||1;
   if(d<islandBoss.r+player.r+14){
     const push=islandBoss.r+player.r+14-d;
     player.x+=dx/d*push;player.y+=dy/d*push;
   }

   if(islandBoss.attackCd<=0){
     islandBoss.attackCd=1.35;
     islandBoss.phase++;
     const base=Math.atan2(player.y-islandBoss.y,player.x-islandBoss.x);
     // 大輪から葉っぱ弾。時々3方向。
     const count=islandBoss.phase%3===0?3:1;
     for(let i=0;i<count;i++){
       const a=base+(i-(count-1)/2)*.28;
       projectiles.push({
         x:islandBoss.x+Math.cos(a)*70,y:islandBoss.y+Math.sin(a)*70-8,
         vx:Math.cos(a)*195,vy:Math.sin(a)*195,r:12,life:2.3,
         kind:'leafshot',damage:5,enemyShot:true,hit:false
       });
     }
     particle(islandBoss.x,islandBoss.y-70,'サァッ！','#5a9d45',.3,15);
   }

   if(islandBoss.hp<=0){
     islandBoss.dead=true;islandBoss.active=false;islandBossDefeated=true;
     healShieldPickup.active=true;healShieldPickup.x=islandBoss.x;healShieldPickup.y=islandBoss.y;
     particle(islandBoss.x,islandBoss.y,'撃破！','#fff',.9,26);
     say('上へ続く虹の橋と、生命の盾が現れた！');
   }
 }

 if(healShieldPickup.active&&!healShieldPickup.taken&&dist(player.x,player.y,healShieldPickup.x,healShieldPickup.y)<62){
   healShieldPickup.taken=true;unlockedShields[1]=true;player.shieldType=1;
   player.hp=Math.min(player.maxHp,player.hp+18);
   particle(healShieldPickup.x,healShieldPickup.y-30,'生命の盾 GET！','#77dd8a',.8,21);
   say('生命の盾：ガード回復が速い＋被弾時に少し回復');
 }

 // 大輪ボス後：虹を上へ渡り、そこから左へ折り返す高庭コース。
 if(islandBossDefeated&&!stage10Started&&player.y<245&&player.x>13870&&player.x<14280){
   stage10Started=true;currentStage=10;stage.checkpoint={x:14080,y:120};
   say('高庭の折り返し道：ここから左へ');
 }
 if(stage10Started&&!upperSwordPickup.taken&&dist(player.x,player.y,upperSwordPickup.x,upperSwordPickup.y)<58){
   upperSwordPickup.taken=true;player.swordPlus=true;
   if(player.weapon===0)weaponNameEl.textContent='翠鋼の剣';
   particle(upperSwordPickup.x,upperSwordPickup.y-30,'剣強化！','#d8ffd0',.8,22);
   say('翠鋼の剣！ 剣の威力が上がった！');
 }
 if(stage10Started){
   for(const e of stage10Enemies){
     if(e.dead)continue;
     e.flash=Math.max(0,e.flash-dt);
     if(e.type==='spinnerflower'){
       e.petalA=(e.petalA||0)+dt*5.2;
       // 回転花は接触ダメージ。槍の中心突き/スパイラルで処理。
       if(dist(player.x,player.y,e.x,e.y)<player.r+e.r+10&&player.jumpT<=0&&player.inv<=0){
         const got=takeDamage(4);player.inv=.5;particle(player.x,player.y-35,`-${got}`,'#c11',.4,16);
       }
       continue;
     }
     e.attackCd-=dt;
     const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
     if(e.attackCd<=0&&d<360){
       e.attackCd=e.type==='dandelion'?1.9:1.55;
       const a=Math.atan2(dy,dx);
       projectiles.push({x:e.x,y:e.y-12,vx:Math.cos(a)*175,vy:Math.sin(a)*175,r:10,life:2.2,kind:e.type==='dandelion'?'puff':'wind',damage:4,enemyShot:true,hit:false});
     }
   }
 }


 // 上段の岩投げ植物。岩は地面で2回バウンドして迫る。
 if(stage10Started&&!rockThrower.dead){
   rockThrower.flash=Math.max(0,rockThrower.flash-dt);
   rockThrower.attackCd-=dt;
   const dx=player.x-rockThrower.x,dy=player.y-rockThrower.y,d=Math.hypot(dx,dy)||1;
   if(rockThrower.attackCd<=0&&d<520){
     rockThrower.attackCd=1.75;
     const a=Math.atan2(dy,dx);
     bouncingRocks.push({
       x:rockThrower.x,y:rockThrower.y-8,vx:Math.cos(a)*205,vy:Math.sin(a)*205,
       z:42,vz:225,r:22,bounces:0,life:4.2,dead:false
     });
     particle(rockThrower.x,rockThrower.y-36,'ポーン！','#666',.35,15);
   }
 }
 for(const br of bouncingRocks){
   if(br.dead)continue;
   br.life-=dt;br.x+=br.vx*dt;br.y+=br.vy*dt;br.z+=br.vz*dt;br.vz-=540*dt;
   if(br.z<=0){
     br.z=0;
     if(br.bounces<2){
       br.bounces++;br.vz=150-br.bounces*28;br.vx*=.92;br.vy*=.92;
       particle(br.x,br.y,'ドン！','#777',.22,12);
     }else br.vz=0;
   }
   if(br.life<=0){br.dead=true;continue}
   // 高く跳ねている最中は頭上を通る。低い時だけ当たる。
   if(br.z<34&&dist(player.x,player.y,br.x,br.y)<player.r+br.r){
     if(player.shield&&shieldBlocks({x:br.x,y:br.y})){
       particle(br.x,br.y,'ガァン！','#111',.35,16);
       br.vx*=-.45;br.vy*=-.45;br.vz=120;
     }else if(player.inv<=0){
       const got=takeDamage(6);player.inv=.5;br.dead=true;
       particle(player.x,player.y-35,`-${got}`,'#c11',.4,16);
     }
   }
 }

 // 岩壁の先へ入ると火吹き植物ボスが起動。
 if(startRockWall.dead&&!fireBoss.dead){
   const inLeft=player.x<20;
   if(inLeft&&!fireBoss.active){fireBoss.active=true;currentStage=11;stage.checkpoint={x:-260,y:545};say('灼熱花！ 火は盾で受けろ！');}
   if(fireBoss.active){
     fireBoss.flash=Math.max(0,fireBoss.flash-dt);fireBoss.attackCd-=dt;
     const dx=player.x-fireBoss.x,dy=player.y-fireBoss.y,d=Math.hypot(dx,dy)||1;
     if(d<150){fireBoss.x-=dx/d*28*dt;fireBoss.y-=dy/d*28*dt}
     else if(d>260){fireBoss.x+=dx/d*20*dt;fireBoss.y+=dy/d*20*dt}
     fireBoss.x=clamp(fireBoss.x,-1120,-430);fireBoss.y=clamp(fireBoss.y,390,680);
     if(fireBoss.attackCd<=0){
       fireBoss.attackCd=1.45;fireBoss.phase++;
       const base=Math.atan2(player.y-fireBoss.y,player.x-fireBoss.x);
       // 炎は槍の風車では弾けず、ジャンプ回避も不可。盾だけが確実な防御。
       for(const off of [-.34,-.17,0,.17,.34]){
         const a=base+off;
         projectiles.push({
           x:fireBoss.x+Math.cos(a)*62,y:fireBoss.y+Math.sin(a)*62-8,
           vx:Math.cos(a)*190,vy:Math.sin(a)*190,r:15,life:1.55,
           kind:'enemyFire',damage:6,enemyShot:true,hit:false
         });
       }
       particle(fireBoss.x,fireBoss.y-55,'ボォォッ！','#e54b24',.4,18);
     }
     if(fireBoss.hp<=0){
       fireBoss.dead=true;fireBoss.active=false;fireBossDefeated=true;
       redStaffPickup.active=true;redStaffPickup.x=fireBoss.x;redStaffPickup.y=fireBoss.y;
       particle(fireBoss.x,fireBoss.y,'撃破！','#fff',.85,25);
       say('炎が消えた。赤杖が残っている！');
     }
   }
 }
 if(redStaffPickup.active&&!redStaffPickup.taken&&dist(player.x,player.y,redStaffPickup.x,redStaffPickup.y)<58){
   redStaffPickup.taken=true;unlockedWeapons[3]=true;player.weapon=3;weaponNameEl.textContent=weapons[3].name;
   particle(redStaffPickup.x,redStaffPickup.y-30,'赤杖 GET！','#ff675d',.8,22);
   say('赤杖を手に入れた！');
 }

 // 杖スキル専用の突き上げジャンプ台。
 // 赤杖の炎輪/青杖のアイスサーフの勢いで突っ込んだ時だけ作動する。
 player.launchPadCd=Math.max(0,(player.launchPadCd||0)-dt);
 if(player.launchPadCd<=0&&(player.skillKind==='fire'||player.skillKind==='ice')&&player.skillT>0){
  for(const p of vineSkyGeo.launchPads){
   if(p.x>3000&&!vineBossDefeated)continue;
   if(dist(player.x,player.y,p.x,p.y)<p.r+player.r+12){
    // スキルの勢いを実座標の放物移動へ変換。巨大な見た目ジャンプだけにしない。
    player.skillT=0;
    player.launchTravel={
      sx:player.x,sy:player.y,tx:p.tx??p.x,ty:p.ty??(p.y-320),
      t:0,dur:player.shieldType===4?.78:.68
    };
    player.jumpDur=.72;player.jumpHeight=player.shieldType===4?115:95;player.jumpT=.72;
    player.launchPadCd=1.0;
    player.fallGrace=Math.max(player.fallGrace||0,1.5);
    particle(p.x,p.y-35,'ドンッ！','#fff',.55,21);
    particle(player.x,player.y-70,'大ジャンプ！','#7adcf5',.55,18);
    break;
   }
  }
 }
 // 上空ルートの雲ジャンプ台。
 // 空中から雲へ乗るルートなので、fallingになる前提ではなく現在の見た目上の足位置で判定する。
 player.vineCloudCd=Math.max(0,(player.vineCloudCd||0)-dt);
 if(player.vineCloudCd<=0){
  const lift=jumpLiftNow();
  for(const c of [...vineSkyGeo.clouds,...(vineBossDefeated?vineSkyGeo.postBossClouds:[])]){
   const footY=player.y-lift;
   if(dist(player.x,footY,c.x,c.y)<c.r+player.r*.8+16){
    player.jumpDur=player.shieldType===4?1.18:.88;
    player.jumpHeight=player.shieldType===4?145:158;
    player.jumpT=player.jumpDur;
    player.vineCloudCd=.55;
    player.fallGrace=Math.max(player.fallGrace||0,.75);
    particle(c.x,c.y-25,'ぽよん！','#fff',.35,15);
    break;
   }
  }
 }
 // 右分岐：再生ツタ壁。
 for(const v of vineWalls){
   if(v.perma)continue;
   if(v.iceStage===2){
     v.iceT-=dt;
     if(v.iceT<=0){v.iceStage=0;v.hp=v.maxHp;particle(v.x,v.y,'パキ…モゾモゾ','#8ddff4',.4,13);}
     continue;
   }
   if(v.dead){
     v.regenT-=dt;
     if(v.regenT<=0){v.dead=false;v.hp=v.maxHp;v.burned=false;v.iceStage=0;particle(v.x,v.y,'モゾモゾ…','#2f8a45',.35,13);}
   }
 }
 // ぐるぐるツタは約5秒で個別再生。3本全部が同時に倒れている時だけ報酬。
 for(const v of vineKnot){
   if(v.dead){v.regenT-=dt;if(v.regenT<=0&&!cloudShieldDropped){v.dead=false;v.hp=v.maxHp;}}
 }
 if(!cloudShieldDropped&&vineKnot.every(v=>v.dead)){
   cloudShieldDropped=true;cloudShieldPickup.active=true;
   particle(cloudShieldPickup.x,cloudShieldPickup.y,'雲の盾！','#fff',.75,20);
   say('絡まったツタがほどけ、雲の盾が現れた！');
 }
 if(cloudShieldPickup.active&&!cloudShieldPickup.taken&&dist(player.x,player.y,cloudShieldPickup.x,cloudShieldPickup.y)<65){
   cloudShieldPickup.taken=true;unlockedShields[4]=true;player.shieldType=4;
   particle(player.x,player.y-50,'雲の盾 GET！','#eafcff',.8,21);
   say('雲の盾：高く跳び、ゆっくり降りられる！');
 }

 const inVineArea=fireBossDefeated && player.x>320 && player.y>-1120 && player.y<-420;
 // 種花とムチツタ。
 for(const e of vineSeedFlowers){
   if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.attackCd-=dt;
   if(!inVineArea)continue;
   const d=dist(player.x,player.y,e.x,e.y);
   if(d<430&&e.attackCd<=0){
     const a=Math.atan2(player.y-e.y,player.x-e.x);
     projectiles.push({x:e.x,y:e.y-8,vx:Math.cos(a)*190,vy:Math.sin(a)*190,r:10,life:2.3,kind:'seed',damage:5,enemyShot:true,hit:false});
     e.attackCd=1.45;
   }
 }
 for(const e of whipVines){
   if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.attackCd-=dt;
   if(!inVineArea)continue;
   const d=dist(player.x,player.y,e.x,e.y);
   if(d<180&&e.attackCd<=0){
     e.attackCd=1.55;
     if(player.jumpT<=0&&player.inv<=0){
       if(player.shield){player.vineBound=Math.max(player.vineBound||0,1.4);particle(player.x,player.y-40,'絡まった！','#236b38',.7,17);}
       else{const got=takeDamage(6);player.inv=.55;particle(player.x,player.y-40,`-${got}`,'#c11',.4,15);}
     }
   }
 }

 // ツタボス：右端に根を張り、前方（左側）を巨大なツタで薙ぎ払う。
 // 背面は根と崖で塞ぎ、周り込み不可。ガードすると盾ごと絡め取られる。
 if(!vineBoss.dead&&inVineArea&&player.x>2740)vineBoss.active=true;
 if(vineBoss.active&&!vineBoss.dead){
   vineBoss.flash=Math.max(0,vineBoss.flash-dt);
   vineBoss.attackCd-=dt;
   vineBoss.whipT=Math.max(0,vineBoss.whipT-dt);

   // 背面へ回り込めない。
   if(player.x>vineBoss.x-72)player.x=Math.min(player.x,vineBoss.x-72);

   const dx=player.x-vineBoss.x,dy=player.y-vineBoss.y,d=Math.hypot(dx,dy);

   // 大薙ぎ前に0.72秒の明確な溜め。ここを見てジャンプできる。
   if(vineBoss.attackCd<=0&&d<520&&vineBoss.windupT<=0&&vineBoss.whipT<=0){
     vineBoss.attackCd=2.35;
     vineBoss.windupT=.72;
     vineBoss.sweepDir=dy>=0?1:-1;
     particle(vineBoss.x-85,vineBoss.y-115,'グググ…！','#fff',.55,19);
   }

   if(vineBoss.windupT>0){
     const before=vineBoss.windupT;
     vineBoss.windupT=Math.max(0,vineBoss.windupT-dt);
     if(before>0&&vineBoss.windupT<=0){
       vineBoss.whipT=.62;
       particle(vineBoss.x-80,vineBoss.y-100,'ブンッ！','#fff',.32,18);

       // 予備動作のあとに初めて当たり判定。ジャンプ中は安全。
       const hdx=player.x-vineBoss.x,hdy=player.y-vineBoss.y,hd=Math.hypot(hdx,hdy);
       const inFront=hdx<0&&Math.abs(hdy)<215&&hd<465;
       if(inFront&&player.jumpT<=0){
         if(player.shield){
           // 盾で受け止めても、巨大ツタの勢いでプレイヤーごと場外へ弾き飛ばされる。
           // 盾は失わない。少し外側へ飛ばしてから通常の崖落下処理へつなぐ。
           player.shield=false;shieldBtn.classList.remove('active');
           player.vineBound=0;
           player.jumpT=0;
           player.launchTravel=null;
           const awayY=(hdy>=0?1:-1);
           player.x=vineBoss.x-445;
           player.y=vineBoss.y+awayY*360;
           player.fallGrace=0;
           player.falling=false;
           particle(player.x,player.y-45,'ドガッ！','#fff',.55,20);
           say('盾ごと場外へ弾き飛ばされた！');
         }else if(player.inv<=0){
           const got=takeDamage(10);player.inv=.75;
           particle(player.x,player.y-40,`-${got}`,'#c11',.45,16);
           player.x-=26;
         }
       }
     }
   }
   if(vineBoss.hp<=0){
     vineBoss.dead=true;vineBoss.active=false;vineBossDefeated=true;
     particle(vineBoss.x,vineBoss.y,'撃破！','#fff',.8,24);say('ツタの主を倒した！');
   }
 }
 function cloudRaceGateHit(g){
 if(g.label==='GOAL')return dist(player.x,player.y,g.x,g.y)<g.r;
 const a=g.gateA||0, nx=Math.cos(a),ny=Math.sin(a), tx=-ny,ty=nx;
 const dx=player.x-g.x,dy=player.y-g.y;
 const across=Math.abs(dx*nx+dy*ny);
 const along=Math.abs(dx*tx+dy*ty);
 // コースの横幅全体を覆う、幅広い帯状チェック。
 return across<54 && along<(g.gateLen||230);
}

// 雲レース：スタート門で2秒カウント後、1/3・2/3の2ゲートを通って1周。


 // レース勝利後：武器を振り回す野菜軍団。
 if(cloudRaceWon){
   for(const e of vegArmy){
     if(e.dead||e.enemyFalling)continue;
     e.flash=Math.max(0,e.flash-dt);e.attackCd-=dt;e.swingT=Math.max(0,(e.swingT||0)-dt);
     const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
     if(d>74&&d<460){
       const ox=e.x,oy=e.y;
       e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;
       if(!enemySupportedByGround(e,5)){e.x=ox;e.y=oy;}
     }
     const reach=e.type==='leekSpear'?116:(e.type==='turnipHammer'?82:76);
     if(d<reach&&e.attackCd<=0){
       e.attackCd=e.type==='turnipHammer'?1.45:(e.type==='leekSpear'?1.05:.78);e.swingT=.28;
       const dmg=e.type==='turnipHammer'?7:(e.type==='leekSpear'?5:4);
       if(player.jumpT<=0){
         if(shieldBlocks(e))particle(player.x,player.y-30,'ガキン！','#fff',.25,14);
         else if(player.inv<=0){const got=takeDamage(dmg);player.inv=.45;particle(player.x,player.y-35,`-${got}`,'#c11',.4,15)}
       }
     }
   }
   for(const f of vegFireFlowers){
     if(f.dead||f.enemyFalling)continue;
     f.flash=Math.max(0,f.flash-dt);f.attackCd-=dt;
     if(dist(player.x,player.y,f.x,f.y)<520&&f.attackCd<=0){
       f.attackCd=1.6+Math.random()*.45;const a=Math.atan2(player.y-f.y,player.x-f.x);
       projectiles.push({x:f.x,y:f.y-10,vx:Math.cos(a)*235,vy:Math.sin(a)*235,r:11,life:2.1,kind:'enemyFire',damage:5,enemyShot:true,hit:false});
       particle(f.x,f.y-38,'ボッ！','#ff7a2d',.28,14);
     }
   }
   for(const f of flyingVeg){
     if(f.dead)continue;
     f.flash=Math.max(0,f.flash-dt);f.phase+=dt;f.x+=Math.sin(f.phase*.9)*10*dt;f.dropCd-=dt;
     if(f.dropCd<=0&&dist(player.x,player.y,f.x,f.y)<520){
       f.dropCd=1.45+Math.random()*.55;
       fallingVegSeeds.push({x:player.x+Math.cos(f.phase)*18,y:player.y+Math.sin(f.phase)*18,z:f.z+85,vz:230,life:1.2,dead:false});
     }
   }
   for(const q of fallingVegSeeds){
     if(q.dead)continue;q.z-=q.vz*dt;q.life-=dt;
     if(q.z<=0||q.life<=0){
       q.dead=true;particle(q.x,q.y,'ドン！','#718f39',.35,15);
       if(dist(player.x,player.y,q.x,q.y)<46&&player.jumpT<=0&&player.inv<=0){
         const got=takeDamage(5);player.inv=.45;particle(player.x,player.y-35,`-${got}`,'#c11',.4,15);
       }
     }
   }
   for(let i=fallingVegSeeds.length-1;i>=0;i--)if(fallingVegSeeds[i].dead)fallingVegSeeds.splice(i,1);
 }
 cloudRace.retryCd=Math.max(0,cloudRace.retryCd-dt);
 if(vineBossDefeated){
   const st=cloudRaceGeo.start;
   if(!cloudRace.started&&!cloudRace.intro&&cloudRace.retryCd<=0){
     if(dist(player.x,player.y,st.x,st.y)<st.r){
       cloudRace.startHold+=dt;
       if(cloudRace.startHold>=.7){cloudRace.startHold=0;startCloudRaceIntro();}
     }else cloudRace.startHold=0;
   }
   if(cloudRace.started){
     if(cloudRace.countdown>0){
       cloudRace.countdown=Math.max(0,cloudRace.countdown-dt);
       if(cloudRace.countdown<=0){particle(st.x,st.y-55,'GO!','#fff',.6,24);say('GO！ 普通に走るだけでは勝てない！ 杖スキルで加速！');}
     }else{
       cloudRace.time+=dt;
       const cp=cloudRaceGeo.checkpoints[cloudRace.cp];
       if(cp&&cloudRaceGateHit(cp)){
         cloudRace.cp++;
         particle(cp.x,cp.y-40,cloudRace.cp>=cloudRaceGeo.checkpoints.length?'FINISH!':`CHECK ${cloudRace.cp}`,'#fff',.45,17);
         if(cloudRace.cp>=cloudRaceGeo.checkpoints.length){
           const firstWin=!cloudRaceWon;cloudRaceWon=true;cloudRace.started=false;cloudRace.retryCd=2.2;
           particle(player.x,player.y-60,'YOU WIN!','#fff',1.0,25);
           say(firstWin?'レース勝利！ 虹の橋の先に武器を持った野菜軍団がいる！':'再戦勝利！ スタート門で何度でも挑戦できる！');
           saveProgress();
         }
       }
       if(cloudRace.time>cloudRace.rivalTime){
         cloudRace.started=false;cloudRace.retryCd=2.0;cloudRace.cp=0;
         particle(player.x,player.y-55,'LOSE…','#fff',.8,22);
         say('雲ライダーの勝ち！ スタート門で再挑戦');
       }
     }
   }
 }
 player.vineBound=Math.max(0,(player.vineBound||0)-dt);

 // 灼熱花撃破後、上の氷ルートは任意攻略。右分岐は青杖なしでも通れる。
 if(fireBossDefeated&&!iceBoss.dead&&player.y<-3050&&player.x<100){
   iceBoss.active=true;
 }
 // 氷ルートの敵は、分岐の氷壁を越えて入った時だけ反応する。
 const enteredIceDanger=player.y<-1030;
 for(const e of iceEnemies){
   if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.attackCd-=dt;
   if(!enteredIceDanger)continue;
   const d=dist(player.x,player.y,e.x,e.y);
   if(d<410&&e.attackCd<=0){
     const a=Math.atan2(player.y-e.y,player.x-e.x);
     projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,r:9,life:2.2,kind:'snowball',damage:4,enemyShot:true,hit:false});
     e.attackCd=1.45;
   }
 }
 for(const e of iceThrowers){
   if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.attackCd-=dt;
   if(!enteredIceDanger)continue;
   const d=dist(player.x,player.y,e.x,e.y);
   if(d<470&&e.attackCd<=0){
     const a=Math.atan2(player.y-e.y,player.x-e.x);
     projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*205,vy:Math.sin(a)*205,r:16,life:2.5,kind:'thrownIce',damage:6,enemyShot:true,hit:false});
     e.attackCd=1.55;particle(e.x,e.y-30,'ポーン！','#d9f7ff',.25,13);
   }
 }
 if(iceBoss.active&&!iceBoss.dead){
   iceBoss.flash=Math.max(0,iceBoss.flash-dt);iceBoss.attackCd-=dt;
   if(iceBoss.attackCd<=0){
     iceBoss.attackCd=1.2;
     const base=Math.atan2(player.y-iceBoss.y,player.x-iceBoss.x);
     for(const off of [-.28,0,.28]){
       const a=base+off;
       projectiles.push({x:iceBoss.x,y:iceBoss.y-20,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:12,life:2.1,kind:'iceShard',damage:6,enemyShot:true,hit:false});
     }
     particle(iceBoss.x,iceBoss.y-55,'シャァッ！','#eafaff',.35,16);
   }
   if(iceBoss.hp<=0){
     iceBoss.dead=true;iceBoss.active=false;blueStaffPickup.active=true;
     blueStaffPickup.x=iceBoss.x;blueStaffPickup.y=iceBoss.y;
     particle(iceBoss.x,iceBoss.y,'氷王 撃破！','#fff',.85,24);
     say('氷のボスがいた場所に青杖が残った！');
   }
 }
 if(blueStaffPickup.active&&!blueStaffPickup.taken&&dist(player.x,player.y,blueStaffPickup.x,blueStaffPickup.y)<62){
   blueStaffPickup.taken=true;unlockedWeapons[4]=true;player.weapon=4;weaponNameEl.textContent=weapons[4].name;
   particle(blueStaffPickup.x,blueStaffPickup.y-30,'青杖 GET！','#dff8ff',.8,22);
   say('青杖を手に入れた！ 水流を凍らせられる！');
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


 for(const d of floatLeafDrops){
   d.life-=dt;d.bob+=dt*4;
   if(d.life>0&&dist(player.x,player.y,d.x,d.y)<36){
     floatLeafStock++;d.life=0;particle(d.x,d.y-18,'羽の葉っぱ +1','#4fba68',.6,17);say(`羽の葉っぱ　${floatLeafStock}枚`);
   }
 }
 for(let i=floatLeafDrops.length-1;i>=0;i--)if(floatLeafDrops[i].life<=0)floatLeafDrops.splice(i,1);
 for(const d of floatLeafDrops){
   const yy=d.y+Math.sin(d.bob)*5;ctx.save();ctx.translate(d.x,yy);ctx.rotate(-.55);
   ctx.fillStyle='#7edb72';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,13,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
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
 hpfill.style.width=`${player.hp/player.maxHp*100}%`;leafStockEl.textContent=`🍃 ${floatLeafStock}`;
  enforceAllGroundEnemies(dt);
 camera.x=clamp(player.x-W/2,world.minX,Math.max(world.minX,world.w-W));camera.y=clamp(player.y-H/2,world.minY,Math.max(world.minY,world.h-H));
}

function line(x1,y1,x2,y2,w=5,color='#111'){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function circle(x,y,r,fill,stroke='#111',lw=5){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke()}
function roundRect(x,y,w,h,r,fill,stroke='#111',lw=5){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke()}


function traceStreamPath(st){
 ctx.beginPath();ctx.moveTo(st.pts[0].x,st.pts[0].y);
 for(let i=1;i<st.pts.length;i++)ctx.lineTo(st.pts[i].x,st.pts[i].y);
}
function clipVisibleGround(){
 ctx.beginPath();
 for(const g of visibleGroundRects()){
   const rr=Math.max(10,Math.min(48,g.h*.2,g.w*.2));
   ctx.roundRect(g.x,g.y,g.w,g.h,rr);
 }
 ctx.clip();
}
function pointOnSameVisibleGround(a,b,pad=4){
 return visibleGroundRects().some(g=>
   a.x>=g.x+pad&&a.x<=g.x+g.w-pad&&a.y>=g.y+pad&&a.y<=g.y+g.h-pad&&
   b.x>=g.x+pad&&b.x<=g.x+g.w-pad&&b.y>=g.y+pad&&b.y<=g.y+g.h-pad
 );
}
function streamHasSurface(st){
 const p=st.pts[0];return pointSupportedByGround(p.x,p.y,28);
}
function streamExitPoint(st){
 let had=false,last=null;
 for(let i=0;i<st.pts.length-1;i++){
   const a=st.pts[i],b=st.pts[i+1];
   for(let k=0;k<=30;k++){
     const t=k/30,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
     const on=pointSupportedByGround(x,y,5);
     if(on){had=true;last={x,y};}
     else if(had&&last)return last;
   }
 }
 return null;
}
function drawStreamCloud(st){
 if(st.source!=='cloud'||!streamHasSurface(st))return;
 const active=st.frozen<=0,cx=st.cloudX,cy=st.cloudY,first=st.pts[0];
 circle(cx-42,cy+22,32,'#eef5f8','#111',5);circle(cx,cy+8,42,'#f7fbfd','#111',5);circle(cx+43,cy+24,31,'#e7f1f5','#111',5);
 const bottom=Math.max(cy+85,first.y+12),span=Math.max(70,bottom-(cy+48)),tm=performance.now()*.012*(st.speed/100);
 for(let i=0;i<9;i++){const yy=cy+48+((tm*18+i*27)%span);line(cx-60+i*15,yy,cx-60+i*15,Math.min(yy+21,bottom),4,active?'#45aef0':'#d9f6ff')}
}
function drawStreamFalls(){
 for(const st of currentStreams){
   if(!streamHasSurface(st))continue;
   const p=streamExitPoint(st);if(!p)continue;
   const active=st.frozen<=0,drop=185;
   ctx.save();
   const grad=ctx.createLinearGradient(0,p.y,0,p.y+drop);
   if(active){grad.addColorStop(0,'rgba(70,174,240,.82)');grad.addColorStop(.56,'rgba(95,190,242,.40)');grad.addColorStop(1,'rgba(95,190,242,0)')}
   else{grad.addColorStop(0,'rgba(210,245,255,.78)');grad.addColorStop(.60,'rgba(220,248,255,.32)');grad.addColorStop(1,'rgba(220,248,255,0)')}
   ctx.strokeStyle=grad;ctx.lineWidth=Math.max(20,st.width*.55);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.bezierCurveTo(p.x+5,p.y+48,p.x-4,p.y+118,p.x,p.y+drop);ctx.stroke();
   ctx.restore();
 }
}
function drawSurfaceStreams(){
 for(const st of currentStreams){
   if(!streamHasSurface(st))continue;
   const active=st.frozen<=0;
   ctx.save();clipVisibleGround();ctx.globalAlpha=.84;ctx.lineJoin='round';ctx.lineCap='round';
   ctx.strokeStyle=active?'#159fe9':'#bdeeff';ctx.lineWidth=st.width+8;traceStreamPath(st);ctx.stroke();
   ctx.strokeStyle=active?'#72d0f6':'#e9fbff';ctx.lineWidth=Math.max(14,st.width-7);traceStreamPath(st);ctx.stroke();
   if(active){
     const tm=performance.now()/1000*st.speed*.72;
     for(let i=0;i<st.pts.length-1;i++){
       const a=st.pts[i],b=st.pts[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=dx/len,ny=dy/len,px=-ny,py=nx;
       for(let q=((tm+i*19)%58)-58;q<len;q+=58){
         if(q<0)continue;
         const side=((Math.floor(q/58)+i)%3-1)*st.width*.18,x=a.x+nx*q+px*side,y=a.y+ny*q+py*side;
         line(x-nx*13,y-ny*13,x+nx*13,y+ny*13,4,'rgba(255,255,255,.88)');
       }
     }
   }
   ctx.restore();drawStreamCloud(st);
 }
}
function drawWorld(){

 // 空と雲
 ctx.fillStyle='#82c9ef';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(-camera.x,-camera.y);
 drawStreamFalls();

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
     ctx.strokeStyle=c;ctx.lineWidth=29;ctx.lineCap='butt';ctx.beginPath();
     ctx.moveTo(stage2Geo.bridge.x1-18,stage2Geo.bridge.y1+i*18-45);
     ctx.quadraticCurveTo(3420,535+i*8,stage2Geo.bridge.x2+18,stage2Geo.bridge.y2+i*18-45);
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
  cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=29;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(4752,570+i*18-45);ctx.quadraticCurveTo(4865,530+i*8,4968,570+i*18-45);ctx.stroke()});
 }
 if(stage4BridgeOpen){
  for(const r of stage5Geo.path){
   ctx.fillStyle='#58ae51';ctx.strokeStyle='#111';ctx.lineWidth=7;
   ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,50);ctx.fill();ctx.stroke();
  }
  const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
  cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=29;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(stage4Geo.bridge.x1-18,stage4Geo.bridge.y1+i*18-45);ctx.quadraticCurveTo(6190,530+i*8,stage4Geo.bridge.x2+18,stage4Geo.bridge.y2+i*18-45);ctx.stroke()});
 }

 if(stage6Started){
   // 風の庭園から岩の分かれ道への橋
   const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
   cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=29;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(stage7Geo.bridge.x1-18,stage7Geo.bridge.y1+i*18-45);ctx.quadraticCurveTo(9505,505+i*8,stage7Geo.bridge.x2+18,stage7Geo.bridge.y2+i*18-45);ctx.stroke()});
   for(const r of stage7Geo.path){
     ctx.fillStyle='#89bf68';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,48);ctx.fill();ctx.stroke();
   }
 }

 if(grassAreaClear){
  // 次エリアへの虹の橋
  const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
  cols.forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=28;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(stage6Geo.bridge.x1-18,stage6Geo.bridge.y1+i*18-45);ctx.quadraticCurveTo(7925,505+i*8,stage6Geo.bridge.x2+18,stage6Geo.bridge.y2+i*18-45);ctx.stroke()});
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
     ctx.strokeStyle=c;ctx.lineWidth=30;ctx.lineCap='butt';ctx.beginPath();
     ctx.moveTo(stageGeo.bridge.x1-20,stageGeo.bridge.y1+i*19-48);
     ctx.quadraticCurveTo(1820,530+i*8,stageGeo.bridge.x2+20,stageGeo.bridge.y2+i*19-48);
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

 // 水流は全地形描画後に描く。
 // 丸い模様：緑丸は外枠の黒線より内側に完全に収まる場合だけ描く。
 // 中心だけ地面判定にすると崖から半分はみ出すため、円周8方向も確認する。
 for(let x=world.minX+80;x<world.w;x+=150)for(let y=90;y<world.h;y+=140){
   const px=x+(y%3)*8,py=y,r=34;
   // 黒い外枠をまたぐ丸は描かない。
   // 隣り合う2つの島を合わせて「地面」と判定せず、1枚の陸地の内側に円全体が収まる時だけ緑。
   const margin=r+13;
   const fullyOnGround=visibleGroundRects().some(g=>
     px-margin>=g.x && px+margin<=g.x+g.w &&
     py-margin>=g.y && py+margin<=g.y+g.h
   );
   ctx.fillStyle=fullyOnGround?'#a9df92':'rgba(203,235,239,.12)';
   ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
 }
 // water
 const wa=props.water;ctx.fillStyle=wa.frozen>0?'#bfeeff':'#60bdea';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(wa.x,wa.y,wa.w,wa.h,28);ctx.fill();ctx.stroke();if(wa.frozen>0){ctx.strokeStyle='#fff';ctx.lineWidth=3;for(let i=0;i<5;i++)line(wa.x+30+i*55,wa.y+15,wa.x+70+i*45,wa.y+wa.h-15,3,'rgba(255,255,255,.8)')}

 // 水系A：低い雲の豪雨→浅い小川。
 const sw=props.shallowWater,sp=props.spring,scx=sp.cloudX,scy=sp.cloudY;
 ctx.save();
 circle(scx-40,scy+18,31,'#eef5f8','#111',5);circle(scx,scy,42,'#f8fcfe','#111',5);circle(scx+43,scy+20,32,'#e7f1f5','#111',5);
 const rt=performance.now()*.018;
 for(let i=0;i<11;i++){const xx=scx-58+i*12,yy=scy+42+((rt*26+i*23)%145);line(xx,yy,xx,yy+23,5,'#45aef0')}
 ctx.fillStyle=sw.frozen>0?'#d7f5ff':'#9fe5f5';ctx.strokeStyle=sw.frozen>0?'#8ddcf3':'#4ca6c8';ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();
 ctx.moveTo(sp.x,sw.y);ctx.lineTo(sw.x+sw.w-22,sw.y);ctx.quadraticCurveTo(sw.x+sw.w,sw.y,sw.x+sw.w,sw.y+22);
 ctx.lineTo(sw.x+sw.w,sw.y+sw.h-22);ctx.quadraticCurveTo(sw.x+sw.w,sw.y+sw.h,sw.x+sw.w-22,sw.y+sw.h);
 ctx.lineTo(sp.x,sw.y+sw.h);ctx.bezierCurveTo(sp.x-48,sw.y+sw.h,sp.x-48,sw.y,sp.x,sw.y);ctx.closePath();ctx.fill();ctx.stroke();
 for(let x=sp.x+25;x<sw.x+sw.w-18;x+=54)line(x,sw.y+22,x+26,sw.y+22,3,'rgba(255,255,255,.72)');
 ctx.restore();

 // 小川の終点は島の縁から細い水膜になって落ちる。下ほど薄く細くなり、雲へ溶ける。
 const sx=sw.x+sw.w-58,spillTop=sw.y+sw.h-8;
 const grad=ctx.createLinearGradient(0,spillTop,0,spillTop+230);
 grad.addColorStop(0,'rgba(151,229,245,.88)');grad.addColorStop(.72,'rgba(151,229,245,.42)');grad.addColorStop(1,'rgba(151,229,245,0)');
 ctx.fillStyle=grad;ctx.beginPath();
 ctx.moveTo(sx,spillTop);ctx.lineTo(sx+58,spillTop);ctx.lineTo(sx+45,spillTop+230);ctx.lineTo(sx+14,spillTop+230);ctx.closePath();ctx.fill();

 // 水系B：低い雲の豪雨→高台の池→滝。
 const up=props.upperPond,wf=props.waterfall,ucx=up.cloudX,ucy=up.cloudY;
 circle(ucx-46,ucy+20,34,'#eef5f8','#111',5);circle(ucx,ucy,46,'#f8fcfe','#111',5);circle(ucx+48,ucy+22,34,'#e7f1f5','#111',5);
 const urt=performance.now()*.02;
 for(let i=0;i<12;i++){const xx=ucx-66+i*12,yy=ucy+48+((urt*28+i*19)%150);line(xx,yy,xx,Math.min(yy+25,up.y+15),5,'#45aef0')}

 // 元々の滝も、雲水流と同じ青・白い流線の表現へ統一。
 const wgrad=ctx.createLinearGradient(0,wf.y,0,wf.y+wf.h);
 if(wf.frozen>0){
   wgrad.addColorStop(0,'rgba(220,248,255,.94)');wgrad.addColorStop(.72,'rgba(180,232,248,.82)');wgrad.addColorStop(1,'rgba(180,232,248,.25)');
 }else{
   wgrad.addColorStop(0,'rgba(70,174,240,.88)');wgrad.addColorStop(.72,'rgba(95,190,242,.68)');wgrad.addColorStop(1,'rgba(95,190,242,.10)');
 }
 ctx.fillStyle=wgrad;ctx.beginPath();
 ctx.moveTo(wf.x,wf.y-18);ctx.lineTo(wf.x+wf.w,wf.y-18);
 ctx.lineTo(wf.x+wf.w-7,wf.y+wf.h);ctx.lineTo(wf.x+7,wf.y+wf.h);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#159fe9';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(wf.x,wf.y-12);ctx.lineTo(wf.x+5,wf.y+wf.h-5);ctx.stroke();
 ctx.beginPath();ctx.moveTo(wf.x+wf.w,wf.y-12);ctx.lineTo(wf.x+wf.w-5,wf.y+wf.h-5);ctx.stroke();
 const wtm=performance.now()*.16;
 for(let y=wf.y+18+wtm%62;y<wf.y+wf.h-18;y+=62){
   line(wf.x+18,y,wf.x+43,y+7,4,'rgba(255,255,255,.84)');
 }
 // 高台は池の周囲だけ。滝口部分の下辺は水で覆い、緑の隙間を見せない。
 ctx.fillStyle='#6f9e55';ctx.strokeStyle='#111';ctx.lineWidth=5;
 ctx.beginPath();ctx.roundRect(up.x-22,up.y-24,up.w+44,up.h+46,28);ctx.fill();ctx.stroke();
 ctx.fillStyle='#a8e9f5';ctx.strokeStyle='#4ca6c8';ctx.lineWidth=4;
 ctx.beginPath();ctx.roundRect(up.x,up.y,up.w,up.h,28);ctx.fill();ctx.stroke();
 // 池から滝へつながる「切れ目」の水だけを重ね、四角い枠線は描かない。
 ctx.fillStyle='#a8e9f5';ctx.strokeStyle='transparent';ctx.beginPath();
 ctx.moveTo(wf.x-4,up.y+up.h-28);ctx.lineTo(wf.x+wf.w+4,up.y+up.h-28);
 ctx.lineTo(wf.x+wf.w,up.y+up.h+18);ctx.lineTo(wf.x,up.y+up.h+18);ctx.closePath();ctx.fill();
 // 下端は霧状にほどける。
 ctx.globalAlpha=.58;circle(wf.x+wf.w*.5,wf.y+wf.h-5,26,'#eefcff','transparent',0);circle(wf.x+15,wf.y+wf.h+8,16,'#eefcff','transparent',0);circle(wf.x+wf.w-12,wf.y+wf.h+10,18,'#eefcff','transparent',0);ctx.globalAlpha=1;


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

 // 赤杖の火の跡は草原・岩場を問わず地面の上に残す。
 for(const f of player.fireTrail){
   ctx.save();ctx.globalAlpha=Math.min(.78,f.life*.72);
   ctx.fillStyle='rgba(255,72,18,.78)';ctx.beginPath();ctx.arc(f.x,f.y,20,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='rgba(255,205,45,.92)';ctx.lineWidth=4;ctx.stroke();ctx.restore();
 }

 // 川は地面の上、木・敵・プレイヤーの下に描く。
 // これで川がキャラクターや植物を覆う最前面レイヤーにならない。
 drawSurfaceStreams();

 // 剣で切らないと通れない小木
 for(const tr of props.smallTrees){
  if(tr.dead)continue;
  // 雨雲の真下に木が重なると「雲から木が生えている」ように見えるので空ける。
  let underCloud=false;
  for(const st of currentStreams){
    if(st.source==='cloud'&&Math.abs(tr.x-st.cloudX)<105&&tr.y>st.cloudY-15&&tr.y<st.pts[0].y+145){underCloud=true;break}
  }
  if(Math.abs(tr.x-props.upperPond.cloudX)<110&&tr.y>props.upperPond.cloudY-15&&tr.y<props.upperPond.y+145)underCloud=true;
  if(underCloud)continue;
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
   // 種を撃つ花にも左右2つの目をはっきり描く。
   circle(0,-10,19,'#d6c94d','#111',5);
   circle(-7,-13,4,'#111','#111',1);circle(7,-13,4,'#111','#111',1);
   ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,-6,6,.25,Math.PI-.25);ctx.stroke();
   ctx.restore();
  }

  if(!seedBoss.dead&&seedBoss.active){
   ctx.save();ctx.translate(seedBoss.x,seedBoss.y);if(seedBoss.flash>0)ctx.globalAlpha=.55;
   line(0,18,0,70,24,'#111');line(0,18,0,70,13,'#4c9342');
   // 槍入手前の大花ボスにも、茎の根元から左右へ大きな葉。
   ctx.fillStyle='#43b94f';ctx.strokeStyle='#111';ctx.lineWidth=6;
   ctx.save();ctx.translate(-28,58);ctx.rotate(-.42);ctx.beginPath();ctx.ellipse(0,0,25,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
   ctx.save();ctx.translate(28,58);ctx.rotate(.42);ctx.beginPath();ctx.ellipse(0,0,25,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
   for(let i=0;i<12;i++){
     const aa=i*Math.PI/6;
     ctx.save();ctx.translate(Math.cos(aa)*46,Math.sin(aa)*46-18);ctx.rotate(aa);
     ctx.fillStyle=i%2?'#ff9d4d':'#ffd35c';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.ellipse(0,0,17,31,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
   }
   // 顔：左右2つの目を同じ高さに置き、中央下に種を吹く口。
   circle(0,-18,38,'#91ad3f','#111',7);
   circle(-13,-27,5.5,'#111','#111',1);
   circle(13,-27,5.5,'#111','#111',1);
   ctx.fillStyle='#17120c';ctx.strokeStyle='#111';ctx.lineWidth=3;
   ctx.beginPath();ctx.ellipse(0,-10,11,8,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.globalAlpha=.45;circle(-11,-29,1.7,'#fff','transparent',0);circle(11,-29,1.7,'#fff','transparent',0);ctx.globalAlpha=1;
   ctx.restore();
   ctx.fillStyle='#111';ctx.fillRect(seedBoss.x-92,seedBoss.y-110,184,16);
   ctx.fillStyle='#e84a3a';ctx.fillRect(seedBoss.x-88,seedBoss.y-106,176*Math.max(0,seedBoss.hp/seedBoss.maxHp),8);
  }
 }


 if(stage2BossDefeated&&!spearPickup.taken){
   ctx.save();ctx.translate(spearPickup.x,spearPickup.y);
   // 拾った直後にそのまま使う槍なので、装備中と同じ金属製の槍として描く。
   ctx.rotate(-.28);
   line(0,20,0,-55,12,'#111');
   line(0,20,0,-55,6,'#e9eef2');
   ctx.fillStyle='#e9eef2';ctx.strokeStyle='#111';ctx.lineWidth=5;
   ctx.beginPath();ctx.moveTo(0,-82);ctx.lineTo(-11,-53);ctx.lineTo(0,-47);ctx.lineTo(11,-53);ctx.closePath();ctx.fill();ctx.stroke();
   line(-14,-43,14,-43,7,'#111');
   line(-12,-43,12,-43,3,'#e5b33b');
   ctx.restore();
   particle(spearPickup.x,spearPickup.y-70,'！','#ffe15a',.12,18);
 }

 if(stage2BridgeOpen){
  for(const e of stage3Enemies){
   if(e.dead)continue;
   ctx.save();ctx.translate(e.x,e.y);
   if(e.flash>0){ctx.fillStyle='rgba(255,70,70,.48)';ctx.beginPath();ctx.arc(0,0,e.r+9,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.7;}
   if(e.type==='spinnerflower'){
     // 花びらそのものが常時回転。中心だけ槍で狙える。
     ctx.save();ctx.rotate(e.petalA||0);
     for(let i=0;i<8;i++){
       const aa=i*Math.PI/4;
       ctx.save();ctx.rotate(aa);ctx.translate(27,0);
       ctx.fillStyle=i%2?'#f08acb':'#ffb0dc';ctx.strokeStyle='#111';ctx.lineWidth=5;
       ctx.beginPath();ctx.ellipse(0,0,17,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();
       ctx.restore();
     }
     ctx.restore();
     // 小さめの中心。ここを槍で突く。
     circle(0,0,13,'#ffd85a','#111',5);
     circle(-4,-2,2.3,'#111','#111',1);circle(4,-2,2.3,'#111','#111',1);
     line(0,12,0,31,8,'#111');line(0,12,0,31,4,'#4fae52');
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
  // 足元に大きな葉を2枚。茎だけより植物らしいシルエットにする。
  ctx.fillStyle='#65b94f';ctx.strokeStyle='#111';ctx.lineWidth=7;
  ctx.beginPath();ctx.ellipse(-34,54,34,17,-.55,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(34,58,35,17,.55,0,Math.PI*2);ctx.fill();ctx.stroke();
  line(-9,55,-50,43,4,'#397f3a');line(9,58,50,48,4,'#397f3a');
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

   if(hammerGuardian.dead&&!hammerPickup.taken){
     ctx.save();ctx.translate(hammerPickup.x,hammerPickup.y);
     ctx.rotate(-.35);
     line(0,30,0,-25,12,'#111');line(0,30,0,-25,6,'#8b5c3b');
     roundRect(-22,-48,44,28,7,'#aaa','#111',6);
     ctx.restore();
     particle(hammerPickup.x,hammerPickup.y-70,'！','#ffe15a',.12,18);
   }

   if(!hammerGuardian.dead){
     ctx.save();ctx.translate(hammerGuardian.x,hammerGuardian.y);if(hammerGuardian.flash>0)ctx.globalAlpha=.58;
     // 小型の岩甲羅獣。後ろの本ボスより一回り小さく、武器入手前でも倒せる。
     circle(0,0,47,'#858983','#111',7);
     ctx.fillStyle='#a26b3d';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.ellipse(0,4,31,35,0,0,Math.PI*2);ctx.fill();ctx.stroke();
     circle(-11,-8,4.5,'#111','#111',1);circle(11,-8,4.5,'#111','#111',1);
     line(-14,13,14,13,5,'#111');
     ctx.restore();
     if(hammerGuardian.active){
       ctx.fillStyle='#111';ctx.fillRect(hammerGuardian.x-72,hammerGuardian.y-80,144,13);
       ctx.fillStyle='#e85a42';ctx.fillRect(hammerGuardian.x-68,hammerGuardian.y-76,136*Math.max(0,hammerGuardian.hp/hammerGuardian.maxHp),6);
     }
   }
   for(const r of hammerGuardianRocks){
     if(r.dead)continue;circle(r.x,r.y,r.r,'#8b8d87','#111',5);line(r.x-7,r.y-3,r.x+5,r.y-8,3,'#666');
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
   // 最初の大花ボスも、茎の根元に左右2枚の葉っぱ。
   ctx.fillStyle='#58b957';ctx.strokeStyle='#111';ctx.lineWidth=6;
   ctx.beginPath();ctx.moveTo(-2,42);ctx.quadraticCurveTo(-30,31,-42,48);ctx.quadraticCurveTo(-24,62,-2,52);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(2,43);ctx.quadraticCurveTo(31,31,43,49);ctx.quadraticCurveTo(24,62,2,53);ctx.closePath();ctx.fill();ctx.stroke();
   line(-4,48,-28,68,12,'#111');line(-4,48,-28,68,6,'#765038');
   line(4,48,28,68,12,'#111');line(4,48,28,68,6,'#765038');
   for(let i=0;i<10;i++){const aa=i*Math.PI/5;ctx.save();ctx.translate(Math.cos(aa)*39,Math.sin(aa)*39-15);ctx.rotate(aa);ctx.fillStyle=i%2?'#f092ce':'#ef70bd';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(0,0,15,28,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
   circle(0,-15,34,'#ffd552','#111',7);circle(-11,-20,5,'#111','#111',1);circle(11,-20,5,'#111','#111',1);line(-13,-1,13,-1,6,'#111');
   ctx.restore();
   ctx.fillStyle='#111';ctx.fillRect(boss.x-90,boss.y-95,180,16);ctx.fillStyle='#e84a3a';ctx.fillRect(boss.x-86,boss.y-91,172*Math.max(0,boss.hp/boss.maxHp),8);
 }
 
 // ステージ8：虹橋より短い空白をジャンプで渡る小島の連続。
 if(rockBossDefeated){
   for(const r of stage8Geo.path){
     ctx.fillStyle='#8fd27a';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,42);ctx.fill();ctx.stroke();
   }
 }
 if(stage8Started){
   for(const e of stage8Enemies){
     if(e.dead)continue;ctx.save();ctx.translate(e.x,e.y);
     if(e.flash>0){ctx.fillStyle='rgba(255,80,80,.45)';ctx.beginPath();ctx.arc(0,0,e.r+7,0,Math.PI*2);ctx.fill()}
     ctx.save();ctx.rotate(e.petalA||0);
     for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.save();ctx.rotate(a);ctx.translate(27,0);ctx.fillStyle=i%2?'#f08acb':'#ffb0dc';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,17,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
     ctx.restore();circle(0,0,13,'#ffd85a','#111',5);line(0,12,0,31,8,'#111');line(0,12,0,31,4,'#4fae52');ctx.restore();
   }
 }

 // ステージ9：大きな円形ボス島。
 if(rockBossDefeated){
   const a=stage9Geo.arena;
   // 茶色の浮遊島の厚み
   ctx.fillStyle='#7b5b3c';ctx.strokeStyle='#111';ctx.lineWidth=8;
   ctx.beginPath();ctx.roundRect(a.x+20,a.y+38,a.w-40,a.h+70,150);ctx.fill();ctx.stroke();
   // 草の上面
   ctx.fillStyle='#7fd369';ctx.strokeStyle='#111';ctx.lineWidth=8;
   ctx.beginPath();ctx.roundRect(a.x,a.y,a.w,a.h,150);ctx.fill();ctx.stroke();

   // 外周に木・低木。中央は戦闘スペースとして空ける。
   for(let i=0;i<12;i++){
     const ang=i*Math.PI*2/12;
     const rx=a.x+a.w/2+Math.cos(ang)*(a.w*.40);
     const ry=a.y+a.h/2+Math.sin(ang)*(a.h*.38);
     if(Math.abs(Math.cos(ang))>.92)continue;
     circle(rx,ry,18,'#3fb95a','#111',5);
     if(i%3===0)circle(rx+12,ry-10,14,'#57ca67','#111',4);
   }

   // 左の入場虹
   const cols=['#ff6b6b','#ffb84d','#ffe55c','#6edb79','#5ecbff','#8e78ff'];
   cols.forEach((c,i)=>{
     ctx.strokeStyle=c;ctx.lineWidth=30;ctx.lineCap='butt';ctx.beginPath();
     ctx.moveTo(stage9Geo.entryBridge.x1-20,stage9Geo.entryBridge.y1+i*19-48);
     ctx.quadraticCurveTo(13575,520+i*8,stage9Geo.entryBridge.x2+20,stage9Geo.entryBridge.y2+i*19-48);
     ctx.stroke();
   });

   // 撃破後は上方向へ虹の橋。その先で左へ折り返す。
   if(islandBossDefeated){
     // 上向きなので、横方向に色帯を並べて縦へ伸ばす。
     cols.forEach((c,i)=>{
       const ox=(i-2.5)*18;
       ctx.strokeStyle=c;ctx.lineWidth=29;ctx.lineCap='butt';ctx.beginPath();
       ctx.moveTo(stage10Geo.bridge.x+ox,stage10Geo.bridge.y1+16);
       ctx.quadraticCurveTo(stage10Geo.bridge.x+ox+8,252,stage10Geo.bridge.x+ox,stage10Geo.bridge.y2-12);
       ctx.stroke();
     });

     for(const r of stage10Geo.path){
       ctx.fillStyle='#83cf72';ctx.strokeStyle='#111';ctx.lineWidth=7;
       ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,55);ctx.fill();ctx.stroke();
       // 浮島の厚みを少しだけ見せる
       ctx.fillStyle='rgba(110,77,52,.82)';
       ctx.beginPath();ctx.moveTo(r.x+45,r.y+r.h);ctx.lineTo(r.x+r.w-45,r.y+r.h);ctx.lineTo(r.x+r.w-75,r.y+r.h+36);ctx.lineTo(r.x+75,r.y+r.h+36);ctx.closePath();ctx.fill();
     }

     if(!upperSwordPickup.taken){
       ctx.save();ctx.translate(upperSwordPickup.x,upperSwordPickup.y);ctx.rotate(-.28);
       line(-8,0,42,0,12,'#111');line(-8,0,42,0,6,'#c8f2d2');line(3,-12,3,12,7,'#111');line(3,-8,3,8,3,'#6fbd78');
       ctx.globalAlpha=.22;circle(18,0,35,'#a8efbd','transparent',0);ctx.restore();
     }
   }
 }

 if(stage9Started&&!islandBoss.dead){
   ctx.save();ctx.translate(islandBoss.x,islandBoss.y);
   if(islandBoss.flash>0)ctx.globalAlpha=.58;
   // 大輪ボス。足元の葉を2枚、中央は広く読みやすく。
   ctx.fillStyle='#55b84f';ctx.strokeStyle='#111';ctx.lineWidth=7;
   ctx.beginPath();ctx.ellipse(-42,62,40,18,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.ellipse(42,62,40,18,.45,0,Math.PI*2);ctx.fill();ctx.stroke();
   line(0,18,0,76,24,'#111');line(0,18,0,76,13,'#4d9f48');
   // 花びらは顔の中心(0,-18)を軸に回す。以前は回転軸と描画中心がズレていた。
   ctx.save();ctx.translate(0,-18);ctx.rotate(islandBoss.petalA*.18);
   for(let i=0;i<14;i++){
     const aa=i*Math.PI*2/14;
     ctx.save();ctx.translate(Math.cos(aa)*58,Math.sin(aa)*58);ctx.rotate(aa);
     ctx.fillStyle=i%2?'#ff9f45':'#ffd24f';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.ellipse(0,0,18,34,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
   }
   ctx.restore();
   circle(0,-18,46,'#75952c','#111',8);
   circle(-15,-24,6,'#111','#111',1);circle(15,-24,6,'#111','#111',1);
   line(-16,2,16,2,6,'#111');
   ctx.restore();

   ctx.fillStyle='#111';ctx.fillRect(islandBoss.x-115,islandBoss.y-135,230,16);
   ctx.fillStyle='#e84a3a';ctx.fillRect(islandBoss.x-111,islandBoss.y-131,222*Math.max(0,islandBoss.hp/islandBoss.maxHp),8);
 }

 // 属性障害物の見本：出口小島に配置。
 for(const o of elementalObstacles){
   if(o.dead)continue;
   if(o.type==='iceBlock'){
     ctx.save();ctx.translate(o.x,o.y);ctx.fillStyle='#8de7ff';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.moveTo(-30,20);ctx.lineTo(-20,-24);ctx.lineTo(5,-38);ctx.lineTo(31,-12);ctx.lineTo(25,27);ctx.closePath();ctx.fill();ctx.stroke();
     line(-10,-20,10,15,4,'rgba(255,255,255,.85)');ctx.restore();
   }else{
     ctx.save();ctx.translate(o.x,o.y);
     const wig=o.frozen?0:Math.sin(o.wiggle||0)*7;
     ctx.lineCap='round';ctx.lineJoin='round';
     // 絡み合って道を塞ぐ、太い再生ツタ。
     ctx.strokeStyle='#111';ctx.lineWidth=18;
     ctx.beginPath();ctx.moveTo(-34,30);ctx.bezierCurveTo(-48,-8,-8,-12+wig,4,-42);ctx.stroke();
     ctx.beginPath();ctx.moveTo(32,31);ctx.bezierCurveTo(45,0,18,1-wig,-4,-40);ctx.stroke();
     ctx.beginPath();ctx.moveTo(-38,8);ctx.bezierCurveTo(-10,22+wig,15,-23,39,-4);ctx.stroke();
     ctx.strokeStyle=o.frozen?'#a8eaff':'#238b45';ctx.lineWidth=10;
     ctx.beginPath();ctx.moveTo(-34,30);ctx.bezierCurveTo(-48,-8,-8,-12+wig,4,-42);ctx.stroke();
     ctx.beginPath();ctx.moveTo(32,31);ctx.bezierCurveTo(45,0,18,1-wig,-4,-40);ctx.stroke();
     ctx.beginPath();ctx.moveTo(-38,8);ctx.bezierCurveTo(-10,22+wig,15,-23,39,-4);ctx.stroke();
     // 葉
     ctx.fillStyle=o.frozen?'#d9f8ff':'#3fbd55';ctx.strokeStyle='#111';ctx.lineWidth=4;
     for(const [lx,ly,a] of [[-25,-8,-.6],[24,-13,.6],[-7,17,.35]]){
       ctx.save();ctx.translate(lx,ly);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,13,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
     }
     if(o.frozen){
       ctx.globalAlpha=.75;ctx.strokeStyle='#fff';ctx.lineWidth=3;
       line(-22,-28,-10,-16,3,'#fff');line(16,-31,26,-20,3,'#fff');
     }
     ctx.restore();
   }
 }

 // 攻略と無関係な自然物。
 for(const a of ambientTerrain){
   if(a.dead)continue;
   const az=ambientZoneStyle(a.x);
   if(a.kind==='tree'){
     line(a.x,a.y,a.x,a.y-38,12,'#111');line(a.x,a.y,a.x,a.y-38,7,a.x>9500?'#695b49':'#765038');
     if(a.x>9500&&a.x<11750){
       // 岩場：低くねじれた風衝木
       circle(a.x-16,a.y-42,15,az.tree,'#111',5);circle(a.x+12,a.y-49,17,az.tree2,'#111',5);line(a.x,a.y-35,a.x+20,a.y-61,6,'#111');
     }else if(a.x>7900&&a.x<9500){
       // 風の庭園：軽い丸葉
       circle(a.x-18,a.y-46,15,az.tree,'#111',4);circle(a.x+15,a.y-45,15,az.tree2,'#111',4);circle(a.x,a.y-62,18,az.tree2,'#111',4);
     }else{
       circle(a.x-15,a.y-45,18,az.tree,'#111',5);circle(a.x+14,a.y-47,19,az.tree2,'#111',5);circle(a.x,a.y-63,22,az.tree,'#111',5);
     }
   }else if(a.kind==='rock'){
     ctx.fillStyle=az.rock;ctx.strokeStyle='#111';ctx.lineWidth=5;
     ctx.beginPath();ctx.moveTo(a.x-a.r,a.y+10);ctx.lineTo(a.x-a.r*.55,a.y-a.r*.65);ctx.lineTo(a.x+a.r*.25,a.y-a.r);ctx.lineTo(a.x+a.r,a.y-a.r*.2);ctx.lineTo(a.x+a.r*.7,a.y+a.r*.7);ctx.closePath();ctx.fill();ctx.stroke();
   }else if(a.kind==='stream'){
     ctx.fillStyle='rgba(155,229,245,.78)';ctx.strokeStyle='#58b8d2';ctx.lineWidth=3;
     ctx.beginPath();ctx.roundRect(a.x,a.y,a.w,a.h,14);ctx.fill();ctx.stroke();
     const vertical=Math.abs(a.fy||0)>Math.abs(a.fx||0);
     ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=2;
     if(vertical){
       for(let yy=a.y+8;yy<a.y+a.h-5;yy+=12){ctx.beginPath();ctx.moveTo(a.x+12,yy);ctx.lineTo(a.x+a.w-12,yy);ctx.stroke();}
     }else{
       for(let xx=a.x+14;xx<a.x+a.w-8;xx+=34){ctx.beginPath();ctx.moveTo(xx,a.y+9);ctx.lineTo(xx+18,a.y+9);ctx.stroke();}
     }
   }
 }
 if(stage10Started){
   for(const e of stage10Enemies){
     if(e.dead)continue;
     ctx.save();ctx.translate(e.x,e.y);
     if(e.flash>0)ctx.globalAlpha=.62;
     if(e.type==='spinnerflower'){
       ctx.save();ctx.rotate(e.petalA||0);
       for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.save();ctx.rotate(a);ctx.translate(27,0);ctx.fillStyle=i%2?'#f08acb':'#ffb0dc';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,17,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
       ctx.restore();circle(0,0,13,'#ffd85a','#111',5);line(0,12,0,31,8,'#111');line(0,12,0,31,4,'#4fae52');
     }else{
       line(0,5,0,28,9,'#111');line(0,5,0,28,5,'#4f9f49');
       const col=e.type==='dandelion'?'#eef8e8':'#8ddc72';
       for(let i=0;i<7;i++){const a=i*Math.PI*2/7;circle(Math.cos(a)*18,Math.sin(a)*18-8,9,col,'#111',3)}
       circle(0,-8,11,'#d9a94d','#111',4);
     }
     ctx.restore();
   }
 }


 // 灼熱花の先の分岐。右は通常ルート、上は長い氷ルート。
 if(fireBossDefeated){
   for(const r of [postFireGeo.junction,...postFireGeo.right,...postFireGeo.iceRight]){
     ctx.fillStyle='#6f9f61';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,44);ctx.fill();ctx.stroke();
   }
   postFireGeo.ice.forEach((r,i)=>{
     const normal=i<3;
     ctx.fillStyle=normal?'#78b96b':'#d8f3f8';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,44);ctx.fill();ctx.stroke();
     if(!normal){ctx.globalAlpha=.35;ctx.fillStyle='#fff';for(let k=0;k<4;k++)circle(r.x+70+k*95,r.y+70+(k%2)*80,24,'#fff','transparent',0);ctx.globalAlpha=1;}
   });
   for(const o of iceRouteBlocks){
     if(o.dead)continue;
     ctx.save();ctx.translate(o.x,o.y);ctx.fillStyle='#bcecff';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.moveTo(0,-o.r);ctx.lineTo(o.r*.78,-o.r*.25);ctx.lineTo(o.r*.55,o.r*.8);ctx.lineTo(-o.r*.55,o.r*.8);ctx.lineTo(-o.r*.8,-o.r*.2);ctx.closePath();ctx.fill();ctx.stroke();
     line(-14,-7,8,13,3,'#fff');line(5,-20,20,-3,3,'#fff');ctx.restore();
   }

   // 氷エリアはペンギン＋「岩投げ敵」の氷版。
   for(const e of iceEnemies){
     if(e.dead)continue;ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;
     circle(0,2,27,'#202a32','#111',5);ctx.fillStyle='#f5fbff';ctx.beginPath();ctx.ellipse(0,8,15,20,0,0,Math.PI*2);ctx.fill();
     circle(-8,-7,3,'#111','transparent',0);circle(8,-7,3,'#111','transparent',0);
     ctx.fillStyle='#f4a62a';ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(7,0);ctx.lineTo(0,7);ctx.closePath();ctx.fill();ctx.restore();
   }
   for(const e of iceThrowers){
     if(e.dead)continue;ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;
     circle(0,0,31,'#8ba8b4','#111',6);circle(0,15,16,'#d9f5ff','#111',4);
     circle(-10,-7,4,'#111','transparent',0);circle(10,-7,4,'#111','transparent',0);
     circle(0,18,12,'#bdeeff','#111',4);line(-24,5,-39,15,7,'#111');line(24,5,39,15,7,'#111');
     ctx.restore();
   }
   if(!iceBoss.dead){
     ctx.save();ctx.translate(iceBoss.x,iceBoss.y);if(iceBoss.flash>0)ctx.globalAlpha=.58;
     for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.save();ctx.rotate(a);ctx.translate(57,0);ctx.fillStyle='#bfeeff';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(0,-22);ctx.lineTo(13,0);ctx.lineTo(0,22);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
     circle(0,0,35,'#e8fbff','#111',7);circle(-11,-7,5,'#111','#111',1);circle(11,-7,5,'#111','#111',1);line(-13,13,13,13,4,'#5e7f88');
     ctx.restore();
     if(iceBoss.active){ctx.fillStyle='#111';ctx.fillRect(iceBoss.x-105,iceBoss.y-110,210,15);ctx.fillStyle='#73c8e8';ctx.fillRect(iceBoss.x-101,iceBoss.y-106,202*Math.max(0,iceBoss.hp/iceBoss.maxHp),7);}
   }
   if(blueStaffPickup.active&&!blueStaffPickup.taken){
     ctx.save();ctx.translate(blueStaffPickup.x,blueStaffPickup.y);ctx.rotate(-.3);line(0,28,0,-45,11,'#111');line(0,28,0,-45,6,'#7b5b44');circle(0,-56,15,'#82dcff','#111',5);line(-8,-56,8,-56,3,'#fff');line(0,-64,0,-48,3,'#fff');ctx.restore();
   }
 }

 // 右分岐：動く植物エリア。
 if(fireBossDefeated){
   for(const r of [...vineAreaGeo.path,vineAreaGeo.arena]){
     ctx.fillStyle='#69b65f';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,44);ctx.fill();ctx.stroke();
   }
   for(const r of vineAreaGeo.safePads){
     ctx.fillStyle='#b8e9a4';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,32);ctx.fill();ctx.stroke();
   }
   // 上空は小島と雲を交互に渡る。
   for(const q of vineSkyGeo.islands){
    ctx.fillStyle='#63b85b';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(q.x,q.y,q.w,q.h,40);ctx.fill();ctx.stroke();
    ctx.fillStyle='#8a5934';ctx.beginPath();ctx.moveTo(q.x+20,q.y+q.h-8);ctx.lineTo(q.x+q.w-20,q.y+q.h-8);ctx.lineTo(q.x+q.w*.56,q.y+q.h+65);ctx.lineTo(q.x+q.w*.44,q.y+q.h+65);ctx.closePath();ctx.fill();ctx.stroke();
   }
   // ボス撃破後だけ現れる、上空ルートへの帰り道。
   if(vineBossDefeated){
    const br=vineSkyGeo.postBossBridge;
    ctx.fillStyle='#77c96b';ctx.strokeStyle='#111';ctx.lineWidth=7;
    ctx.beginPath();ctx.roundRect(br.x,br.y,br.w,br.h,35);ctx.fill();ctx.stroke();
    for(const q of vineSkyGeo.postBossIslands){
     ctx.fillStyle='#69bd61';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(q.x,q.y,q.w,q.h,42);ctx.fill();ctx.stroke();
     ctx.fillStyle='#8a5934';ctx.beginPath();ctx.moveTo(q.x+20,q.y+q.h-8);ctx.lineTo(q.x+q.w-20,q.y+q.h-8);ctx.lineTo(q.x+q.w*.56,q.y+q.h+62);ctx.lineTo(q.x+q.w*.44,q.y+q.h+62);ctx.closePath();ctx.fill();ctx.stroke();
    }
    for(const c of vineSkyGeo.postBossClouds){
     circle(c.x-30,c.y+5,c.r*.48,'#f8fdff','#111',5);circle(c.x,c.y-12,c.r*.58,'#f8fdff','#111',5);circle(c.x+32,c.y+7,c.r*.45,'#f8fdff','#111',5);
    }
   }
   // 杖スキルの速度を受けて下から突き上げるジャンプ台。
   for(const p of vineSkyGeo.launchPads){
    if(p.x>3000&&!vineBossDefeated)continue;
    ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle='#2f8f47';ctx.strokeStyle='#111';ctx.lineWidth=6;
    ctx.beginPath();ctx.ellipse(0,17,p.r*.85,p.r*.34,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#184f2b';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(0,-12);ctx.stroke();
    ctx.fillStyle='#a9e96d';ctx.strokeStyle='#111';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(-30,-12);ctx.quadraticCurveTo(0,-38,30,-12);ctx.quadraticCurveTo(0,2,-30,-12);ctx.fill();ctx.stroke();
    // 上向きの記号。通常ジャンプ台ではなく「勢いをぶつける」目印。
    ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(0,-31);ctx.lineTo(-11,-17);ctx.lineTo(-5,-17);ctx.lineTo(-5,-7);ctx.lineTo(5,-7);ctx.lineTo(5,-17);ctx.lineTo(11,-17);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
   }
   for(const c of vineSkyGeo.clouds){
    circle(c.x-28,c.y+5,c.r*.48,'#f8fdff','#111',5);circle(c.x,c.y-10,c.r*.58,'#f8fdff','#111',5);circle(c.x+30,c.y+7,c.r*.45,'#f8fdff','#111',5);
   }


   if(vineBossDefeated){
     // 雲ジャンプの出口と、巨大な歪んだ楕円ドーナツ型レース場。
     const ei=cloudRaceGeo.entryIsland;
     ctx.fillStyle='#65b85d';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(ei.x,ei.y,ei.w,ei.h,42);ctx.fill();ctx.stroke();

     // 外周を太い黒→緑で重ね描きし、細めのドーナツコースに見せる。
     const racePts=[];
     for(let i=0;i<=96;i++){
       const a=i/96*Math.PI*2;
       const wobble=1+0.08*Math.sin(a*3+0.7)+0.045*Math.sin(a*5);
       racePts.push({
         x:cloudRaceGeo.cx+Math.cos(a)*cloudRaceGeo.outerRx*wobble*.91,
         y:cloudRaceGeo.cy+Math.sin(a)*cloudRaceGeo.outerRy*(1+0.07*Math.cos(a*2-.4))*.88
       });
     }
     ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
     ctx.strokeStyle='#111';ctx.lineWidth=190;ctx.beginPath();ctx.moveTo(racePts[0].x,racePts[0].y);
     for(let i=1;i<racePts.length;i++)ctx.lineTo(racePts[i].x,racePts[i].y);ctx.stroke();
     ctx.strokeStyle='#70bd65';ctx.lineWidth=166;ctx.stroke();
     // コース中央の白い点線。
     ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=11;ctx.setLineDash([30,24]);ctx.stroke();
     ctx.setLineDash([]);ctx.restore();

     // 内側は空中。中央に雲海を少し見せて「ショートカット不可」を分かりやすく。
     ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#dff7fb';ctx.beginPath();
     ctx.ellipse(cloudRaceGeo.cx,cloudRaceGeo.cy,cloudRaceGeo.innerRx,cloudRaceGeo.innerRy,0,0,Math.PI*2);ctx.fill();ctx.restore();

     // 1/3・2/3チェックはコース横幅を丸ごと横切る太いゲート。
     for(let i=0;i<cloudRaceGeo.checkpoints.length;i++){
       const g=cloudRaceGeo.checkpoints[i],active=i===cloudRace.cp&&cloudRace.started;
       ctx.save();ctx.strokeStyle=active?'#ffe45b':'#fff';
       if(g.label==='GOAL'){
         ctx.lineWidth=11;ctx.beginPath();ctx.arc(g.x,g.y,74,0,Math.PI*2);ctx.stroke();
       }else{
         const a=g.gateA||0,tx=-Math.sin(a),ty=Math.cos(a),L=g.gateLen||230;
         // 黒縁＋白/黄色の太い帯で、どこを通っても拾えることを明示。
         line(g.x-tx*L,g.y-ty*L,g.x+tx*L,g.y+ty*L,34,'#111');
         line(g.x-tx*L,g.y-ty*L,g.x+tx*L,g.y+ty*L,23,active?'#ffe45b':'#fff');
         ctx.fillStyle=active?'#ffe45b':'#fff';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.font='900 22px system-ui';
         ctx.strokeText(`CHECK ${g.label}`,g.x-48,g.y-30);ctx.fillText(`CHECK ${g.label}`,g.x-48,g.y-30);
       }
       ctx.restore();
     }
     ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.font='900 20px system-ui';
     // 開始位置を見失わない大きなチェッカー円＋START矢印。クリア後も常時表示。
     const st=cloudRaceGeo.start;
     ctx.save();ctx.globalAlpha=.95;ctx.strokeStyle='#111';ctx.lineWidth=14;ctx.beginPath();ctx.arc(st.x,st.y,76,0,Math.PI*2);ctx.stroke();
     ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.setLineDash([18,14]);ctx.beginPath();ctx.arc(st.x,st.y,61,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
     ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.font='900 30px system-ui';
     ctx.strokeText('▼ START ▼',st.x-92,st.y-112);ctx.fillText('▼ START ▼',st.x-92,st.y-112);
     ctx.restore();
     const raceLabel=cloudRaceWon?'CLOUD RACE / 再戦':'CLOUD RACE';
     ctx.strokeText(raceLabel,st.x-82,st.y-82);
     ctx.fillText(raceLabel,st.x-82,st.y-82);

     // 対戦相手の雲ライダー。時間でコースを1周する。
     if(cloudRace.started){
       const rr=Math.max(0,Math.min(1,cloudRace.countdown>0?0:cloudRace.time/cloudRace.rivalTime));
       const pts=[
         cloudRaceGeo.start,
         {x:3300,y:-2760},{x:4050,y:-2925},{x:4870,y:-2720},
         {x:5210,y:-2325},{x:4870,y:-1910},{x:4050,y:-1810},{x:3300,y:-1960},
         cloudRaceGeo.start
       ];
       const segCount=pts.length-1;
       const pos=rr*segCount,seg=Math.min(segCount-1,Math.floor(pos)),lt=pos-seg,a=pts[seg],b=pts[seg+1];
       const rx=a.x+(b.x-a.x)*lt,ry=a.y+(b.y-a.y)*lt;
       circle(rx-16,ry+8,24,'#f8fdff','#111',4);circle(rx+12,ry,28,'#f8fdff','#111',4);
       circle(rx,ry-20,14,'#ef8d55','#111',4);
     }

     if(cloudRaceWon){
       const ni=cloudRaceGeo.nextIsland,rb=cloudRaceGeo.rainbow;
       ctx.fillStyle='#68bc61';ctx.strokeStyle='#111';ctx.lineWidth=7;
       ctx.beginPath();ctx.roundRect(ni.x,ni.y,ni.w,ni.h,55);ctx.fill();ctx.stroke();
       const cols=['#ef5350','#ff9f43','#f5dc4d','#69c56a','#55aee8','#8e67d5'];
       // 新コース右端から次島へ接続。黒い土台を先に引いてズレを見やすくする。
       line(rb.x1,rb.y1,rb.x2,rb.y2,158,'#111');
       for(let i=0;i<6;i++){
         const yy=rb.y1+(i-2.5)*22;
         line(rb.x1,yy,rb.x2,yy,25,cols[i]);
       }

       for(const r of vegGeo.path){
         ctx.fillStyle='#69ba5d';ctx.strokeStyle='#111';ctx.lineWidth=7;
         ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,54);ctx.fill();ctx.stroke();
         ctx.save();ctx.globalAlpha=.20;ctx.strokeStyle='#e8efb5';ctx.lineWidth=7;
         for(let yy=r.y+70;yy<r.y+r.h-30;yy+=95){ctx.beginPath();ctx.moveTo(r.x+35,yy);ctx.lineTo(r.x+r.w-35,yy);ctx.stroke()}
         ctx.restore();
       }
       for(const e of vegArmy){
         if(e.dead)continue;ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.55;
         if(e.type==='carrotSword'){
           ctx.fillStyle='#ef843b';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-18,-20);ctx.lineTo(20,-20);ctx.lineTo(5,30);ctx.lineTo(-7,30);ctx.closePath();ctx.fill();ctx.stroke();
           line(-8,-22,-18,-42,7,'#3e9c49');line(5,-22,15,-43,7,'#4fb455');ctx.save();ctx.rotate((e.swingT||0)>0?-1:.25);line(20,0,64,0,10,'#111');line(20,0,64,0,5,'#e8edf0');ctx.restore();
         }else if(e.type==='leekSpear'){
           ctx.fillStyle='#eaf4d5';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,3,18,34,0,0,Math.PI*2);ctx.fill();ctx.stroke();line(0,-26,0,-48,9,'#42a54b');ctx.save();ctx.rotate((e.swingT||0)>0?.3:0);line(18,0,88,0,9,'#111');line(18,0,88,0,4,'#dce7ea');ctx.restore();
         }else{
           circle(0,2,30,'#e8e5cf','#111',5);line(-10,-25,-20,-45,8,'#4a9f48');line(8,-25,18,-46,8,'#4a9f48');ctx.save();ctx.rotate((e.swingT||0)>0?-.8:.35);line(24,0,58,0,12,'#111');circle(67,0,18,'#8e8e8e','#111',5);ctx.restore();
         }ctx.restore();
       }
       for(const f of vegFireFlowers){
         if(f.dead)continue;ctx.save();ctx.translate(f.x,f.y);if(f.flash>0)ctx.globalAlpha=.55;
         line(0,5,0,28,9,'#111');line(0,5,0,28,5,'#4b9a49');
         for(let i=0;i<7;i++){const a=i*Math.PI*2/7;circle(Math.cos(a)*18,Math.sin(a)*18-6,10,'#e95735','#111',3)}
         circle(0,-6,11,'#ffbd45','#111',4);ctx.restore();
       }
       for(const f of flyingVeg){
         if(f.dead)continue;const yy=f.y-f.z-Math.sin(f.phase*2)*7;ctx.save();ctx.translate(f.x,yy);if(f.flash>0)ctx.globalAlpha=.55;
         if(f.type==='flyingPepper'){ctx.fillStyle='#e94b3c';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,22,30,0,0,Math.PI*2);ctx.fill();ctx.stroke();line(0,-28,8,-42,7,'#3b9647')}
         else{ctx.fillStyle='#7750a8';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,25,31,0,0,Math.PI*2);ctx.fill();ctx.stroke();line(0,-28,0,-43,8,'#4ca052')}
         ctx.fillStyle='#9bdc76';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(-28,-2,18,8,-.3,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(28,-2,18,8,.3,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
       }
       for(const q of fallingVegSeeds){
         if(q.dead)continue;ctx.save();ctx.translate(q.x,q.y-q.z);ctx.fillStyle='#718f39';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,9,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
         ctx.save();ctx.globalAlpha=.22;circle(q.x,q.y,20,'#111','transparent',0);ctx.restore();
       }
     }
   }
   // 大きな幹ツタ＋再生壁
   for(const v of vineWalls){
     if(v.dead||v.perma)continue;ctx.save();ctx.translate(v.x,v.y);ctx.lineCap='round';
     if(v.iceStage===0){
       ctx.strokeStyle='#154f28';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(0,60);ctx.bezierCurveTo(-45,15,45,-18,0,-62);ctx.stroke();
       ctx.strokeStyle='#36a94f';ctx.lineWidth=11;ctx.stroke();
       for(let y=-40;y<=40;y+=27){circle(Math.sin(y*.1)*22,y,13,'#58c65d','#111',4)}
     }else if(v.iceStage===1){
       // 一度凍気を当てると葉とツタが縮み、根元が露出。
       ctx.strokeStyle='#174f28';ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(0,55);ctx.quadraticCurveTo(-18,35,0,15);ctx.stroke();
       ctx.strokeStyle='#61b96b';ctx.lineWidth=8;ctx.stroke();
       circle(0,48,18,'#704c31','#111',5);circle(-14,27,9,'#7ad080','#111',3);circle(14,29,9,'#7ad080','#111',3);
       ctx.globalAlpha=.5;circle(0,48,27,'#bdeeff','transparent',0);ctx.globalAlpha=1;
     }else{
       // 根元まで凍結：10秒間、この状態を武器で砕けば永久破壊。
       ctx.fillStyle='#bfeeff';ctx.strokeStyle='#256e93';ctx.lineWidth=6;
       ctx.beginPath();ctx.moveTo(0,-55);ctx.lineTo(35,-20);ctx.lineTo(30,48);ctx.lineTo(0,67);ctx.lineTo(-34,45);ctx.lineTo(-38,-18);ctx.closePath();ctx.fill();ctx.stroke();
       line(-15,-22,14,15,4,'#fff');line(7,-35,23,-12,3,'#fff');
     }
     ctx.restore();
   }
   for(const e of vineSeedFlowers){
     if(e.dead)continue;ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;
     line(0,15,0,45,10,'#111');line(0,15,0,45,5,'#3d9b45');
     for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.save();ctx.rotate(a);ctx.translate(29,0);ctx.fillStyle='#dc78c5';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,10,17,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
     circle(0,0,20,'#ffd453','#111',5);circle(-7,-4,3.5,'#111','transparent',0);circle(7,-4,3.5,'#111','transparent',0);ctx.restore();
   }
   for(const e of whipVines){
     if(e.dead)continue;ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;
     ctx.strokeStyle='#174f28';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(0,35);ctx.quadraticCurveTo(-35,0,0,-42);ctx.stroke();
     ctx.strokeStyle='#4fc25b';ctx.lineWidth=8;ctx.stroke();circle(0,-48,18,'#64cb5f','#111',5);ctx.restore();
   }
   for(const v of vineKnot){
     if(v.dead)continue;ctx.save();ctx.translate(v.x,v.y);ctx.strokeStyle='#174f28';ctx.lineWidth=13;
     for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,20+i*5,i*.7,Math.PI*2+i*.7);ctx.stroke()}ctx.restore();
   }
   if(cloudShieldPickup.active&&!cloudShieldPickup.taken){
     ctx.save();ctx.translate(cloudShieldPickup.x,cloudShieldPickup.y);ctx.fillStyle='#eefcff';ctx.strokeStyle='#111';ctx.lineWidth=6;
     ctx.beginPath();ctx.moveTo(0,-35);ctx.quadraticCurveTo(36,-25,34,10);ctx.quadraticCurveTo(26,38,0,50);ctx.quadraticCurveTo(-26,38,-34,10);ctx.quadraticCurveTo(-36,-25,0,-35);ctx.fill();ctx.stroke();
     circle(-10,2,11,'#fff','#79bcd3',3);circle(6,-5,14,'#fff','#79bcd3',3);circle(18,5,9,'#fff','#79bcd3',3);ctx.restore();
   }
   if(!vineBoss.dead){
     ctx.save();ctx.translate(vineBoss.x,vineBoss.y);if(vineBoss.flash>0)ctx.globalAlpha=.6;

     // 巨大な根株＋一本の主ツタ。クモ状にはしない。
     ctx.strokeStyle='#123c20';ctx.lineCap='round';
     ctx.lineWidth=34;ctx.beginPath();ctx.moveTo(70,95);ctx.bezierCurveTo(35,35,30,-55,-5,-105);ctx.stroke();
     ctx.strokeStyle='#3f9f48';ctx.lineWidth=18;ctx.stroke();

     // 右側へ食い込む根で背面を塞ぐ。
     for(const off of [-80,-35,20,65]){
       ctx.strokeStyle='#173f23';ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(45,55);ctx.quadraticCurveTo(100+off*.25,95,130+off,120);ctx.stroke();
       ctx.strokeStyle='#4aa64d';ctx.lineWidth=11;ctx.stroke();
     }

     // 花芯と大きな花弁。
     for(let i=0;i<6;i++){
       const a=i*Math.PI*2/6;ctx.save();ctx.rotate(a);ctx.translate(58,-28);
       ctx.fillStyle='#7ad067';ctx.strokeStyle='#111';ctx.lineWidth=5;
       ctx.beginPath();ctx.ellipse(0,0,18,34,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
     }
     circle(-5,-28,58,'#5bbb50','#111',8);
     circle(-20,-37,6,'#111','transparent',0);circle(10,-37,6,'#111','transparent',0);
     line(-23,-5,14,-5,6,'#111');

     // 大薙ぎの予備動作：ツタを大きく後ろへ引き、前方に危険扇を点滅。
     if(vineBoss.windupT>0){
       const w=vineBoss.windupT/.72,pulse=.45+.35*Math.sin(performance.now()*.03);
       ctx.save();ctx.translate(-38,-28);
       ctx.strokeStyle='#102f19';ctx.lineWidth=28;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(70,-105,145,-80);ctx.stroke();
       ctx.strokeStyle='#49b957';ctx.lineWidth=14;ctx.stroke();
       ctx.restore();
       ctx.save();ctx.globalAlpha=pulse;
       ctx.strokeStyle='#f6e65d';ctx.lineWidth=8;ctx.setLineDash([18,13]);
       ctx.beginPath();ctx.arc(-30,0,360,Math.PI*.70,Math.PI*1.30);ctx.stroke();
       ctx.setLineDash([]);ctx.restore();
       ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.font='900 36px system-ui';
       ctx.strokeText('!',-102,-118);ctx.fillText('!',-102,-118);
     }

     // 攻撃中は前方へ一本の巨大ツタを横薙ぎ。
     if(vineBoss.whipT>0){
       const p=1-vineBoss.whipT/.62;
       const sweep=-1.05+p*2.10;
       const len=430;
       ctx.save();ctx.translate(-35,-25);ctx.rotate(sweep);
       ctx.strokeStyle='#102f19';ctx.lineWidth=30;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-len*.45,-35,-len,0);ctx.stroke();
       ctx.strokeStyle='#49b957';ctx.lineWidth=15;ctx.stroke();
       for(let k=1;k<=5;k++)circle(-len*k/6,Math.sin(k)*8,12,'#69c966','#111',4);
       ctx.restore();
     }
     ctx.restore();

     if(vineBoss.active){
       ctx.fillStyle='#111';ctx.fillRect(vineBoss.x-250,vineBoss.y-170,250,16);
       ctx.fillStyle='#55b94f';ctx.fillRect(vineBoss.x-246,vineBoss.y-166,242*Math.max(0,vineBoss.hp/vineBoss.maxHp),8);
     }
   }
 }

 // 岩壁の先の火山草地。
 if(startRockWall.dead){
   for(const r of leftZoneGeo.path){
     ctx.fillStyle='#76513b';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(r.x+15,r.y+34,r.w-30,r.h+58,48);ctx.fill();ctx.stroke();
     ctx.fillStyle='#a8b85c';ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,48);ctx.fill();ctx.stroke();
   }
   if(!fireBoss.dead){
     ctx.save();ctx.translate(fireBoss.x,fireBoss.y);if(fireBoss.flash>0)ctx.globalAlpha=.6;
     line(0,15,0,60,18,'#111');line(0,15,0,60,10,'#4f8d3a');
     for(let i=0;i<10;i++){const a=i*Math.PI*2/10;ctx.save();ctx.rotate(a);ctx.translate(54,0);ctx.fillStyle=i%2?'#f05a30':'#ff8a32';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,0,27,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
     circle(0,0,27,'#5c2a20','#111',7);circle(-8,-5,4,'#ffd45a','#111',2);circle(8,-5,4,'#ffd45a','#111',2);
     ctx.restore();
     if(fireBoss.active){ctx.fillStyle='#111';ctx.fillRect(fireBoss.x-105,fireBoss.y-115,210,15);ctx.fillStyle='#e84a3a';ctx.fillRect(fireBoss.x-101,fireBoss.y-111,202*Math.max(0,fireBoss.hp/fireBoss.maxHp),7);}
   }
   if(redStaffPickup.active&&!redStaffPickup.taken){
     ctx.save();ctx.translate(redStaffPickup.x,redStaffPickup.y);ctx.rotate(-.32);
     line(0,28,0,-45,11,'#111');line(0,28,0,-45,6,'#8b4e35');
     circle(0,-55,15,'#ff5a36','#111',5);circle(0,-55,7,'#ffd45a','#111',2);ctx.restore();
     particle(redStaffPickup.x,redStaffPickup.y-78,'！','#ff675d',.12,18);
   }
 }
 if(stage10Started&&!rockThrower.dead){
   ctx.save();ctx.translate(rockThrower.x,rockThrower.y);if(rockThrower.flash>0)ctx.globalAlpha=.62;
   line(0,8,0,31,10,'#111');line(0,8,0,31,5,'#577c3f');
   circle(0,-4,27,'#71834d','#111',6);circle(-9,-8,4,'#111','#111',1);circle(9,-8,4,'#111','#111',1);
   // 岩を抱える腕
   line(-17,2,-31,15,7,'#111');line(17,2,31,15,7,'#111');circle(0,18,15,'#898b84','#111',5);
   ctx.restore();
 }
 for(const br of bouncingRocks){
   if(br.dead)continue;
   // 地面影＋高さのある岩
   ctx.globalAlpha=.22;ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(br.x,br.y+10,br.r*.9,br.r*.38,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
   circle(br.x,br.y-br.z*.45,br.r,'#858781','#111',5);
   line(br.x-7,br.y-br.z*.45-4,br.x+7,br.y-br.z*.45-10,3,'#666');
 }

 // 岩壁の奥には、最初から岩盤の道が続いて見える。
 // 「壁の向こうがただの空」ではなく、塞がれた岩道だと分かる見た目。
 if(!startRockWall.dead){
   for(const r of leftRockPreview){
     ctx.fillStyle='#66564b';ctx.strokeStyle='#111';ctx.lineWidth=7;
     ctx.beginPath();ctx.roundRect(r.x+8,r.y+28,r.w-16,r.h+38,34);ctx.fill();ctx.stroke();
     ctx.fillStyle='#777973';ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,34);ctx.fill();ctx.stroke();
     for(let yy=r.y+32;yy<r.y+r.h-18;yy+=58){
       for(let xx=r.x+28+((yy/58|0)%2)*20;xx<r.x+r.w-15;xx+=55){
         circle(xx,yy,18,'#92948e','#111',4);
         line(xx-6,yy-3,xx+6,yy-8,2,'#686a65');
       }
     }
   }
 }

 // スタート左のハンマー岩壁。ゲーム開始時から見えて、後で戻る理由になる。
 if(!startRockWall.dead){
   ctx.save();
   for(let yy=startRockWall.y-startRockWall.h/2+24;yy<startRockWall.y+startRockWall.h/2;yy+=48){
     const off=(Math.floor((yy-(startRockWall.y-startRockWall.h/2))/48)%2)*14;
     for(let xx=startRockWall.x-startRockWall.w/2+12-off;xx<startRockWall.x+startRockWall.w/2;xx+=42){
       circle(xx,yy,24,'#858781','#111',6);
       line(xx-8,yy-5,xx+8,yy-11,3,'#666');
     }
   }
   ctx.restore();
 }
 if(islandBossDefeated){
   // 長い上段ルートの終点からスタート草原へ降りるショートカット虹。
   const hb=stage10Geo.homeBridge,cols=['#ef5350','#ff9f43','#ffe35b','#66c96b','#54b8e8','#8b68d6'];
   cols.forEach((c,i)=>{
     const ox=(i-2.5)*18;
     ctx.strokeStyle=c;ctx.lineWidth=29;ctx.lineCap='butt';ctx.beginPath();
     ctx.moveTo(hb.x+ox,hb.y2-8);ctx.quadraticCurveTo(hb.x+ox+6,290,hb.x+ox,hb.y1+10);ctx.stroke();
   });
 }

 if(healShieldPickup.active&&!healShieldPickup.taken){
   ctx.save();ctx.translate(healShieldPickup.x,healShieldPickup.y);
   ctx.fillStyle='#74d88a';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();
   ctx.moveTo(0,-38);ctx.quadraticCurveTo(38,-28,34,8);ctx.quadraticCurveTo(28,38,0,52);ctx.quadraticCurveTo(-28,38,-34,8);ctx.quadraticCurveTo(-38,-28,0,-38);ctx.fill();ctx.stroke();
   ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-15,5);ctx.lineTo(-4,17);ctx.lineTo(18,-10);ctx.stroke();ctx.restore();
 }

 // 杖スキルの炎輪・氷板は全地形の上、プレイヤーの直前に描く。
 drawStaffSkillEffects();

 // 杖ジャンプ攻撃の着弾エフェクト。文字だけでなく火柱/氷柱を表示。
 for(const fx of airMagicImpacts){
   const q=1-fx.life/fx.max;
   ctx.save();ctx.translate(fx.x,fx.y);
   if(fx.kind==='fire'){
     const grow=Math.sin(Math.min(1,q*1.7)*Math.PI*.5);
     ctx.globalAlpha=Math.min(1,fx.life/.16);
     ctx.fillStyle='rgba(255,95,35,.28)';ctx.beginPath();ctx.ellipse(0,-42,46,82*grow,0,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#ff5a2d';ctx.strokeStyle='#111';ctx.lineWidth=5;
     ctx.beginPath();ctx.moveTo(-30,12);ctx.quadraticCurveTo(-42,-40,-10,-92*grow);ctx.quadraticCurveTo(0,-60,13,-112*grow);ctx.quadraticCurveTo(46,-48,28,12);ctx.closePath();ctx.fill();ctx.stroke();
     ctx.fillStyle='#ffd45a';ctx.beginPath();ctx.moveTo(-13,8);ctx.quadraticCurveTo(-15,-28,4,-70*grow);ctx.quadraticCurveTo(22,-28,15,8);ctx.closePath();ctx.fill();
   }else{
     ctx.globalAlpha=Math.min(1,fx.life/.15);
     ctx.fillStyle='#c9f3ff';ctx.strokeStyle='#256e93';ctx.lineWidth=5;
     for(const a of [-.8,-.35,0,.4,.82]){
       ctx.save();ctx.rotate(a*.35);
       ctx.beginPath();ctx.moveTo(-10,12);ctx.lineTo(0,-72*(1-q*.25));ctx.lineTo(12,12);ctx.closePath();ctx.fill();ctx.stroke();
       ctx.restore();
     }
   }
   ctx.restore();
 }

 // 杖ジャンプ攻撃の弾。プレイヤーの高さから地面へ斜めに飛ぶ。
 if(player.airMagic&&!player.airMagic.done){
   const m=player.airMagic,q=Math.min(1,m.t/m.dur);
   const ex=m.sx+(m.x-m.sx)*q,ey=m.sy+(m.y-m.sy)*q;
   const lift=(m.startLift||70)*(1-q);
   ctx.save();ctx.translate(ex,ey-lift);
   if(m.kind==='fire'){
     ctx.globalAlpha=.22;circle(0,0,25,'#ff9b35','transparent',0);ctx.globalAlpha=1;
     circle(0,0,15,'#ff5a2d','#111',4);circle(4,-2,7,'#ffd65a','transparent',0);
     ctx.fillStyle='#ff7a2c';ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(-31,-9);ctx.lineTo(-24,2);ctx.lineTo(-32,12);ctx.closePath();ctx.fill();
   }else{
     ctx.rotate(performance.now()*.012);
     ctx.globalAlpha=.2;circle(0,0,25,'#bfeeff','transparent',0);ctx.globalAlpha=1;
     ctx.fillStyle='#dff8ff';ctx.strokeStyle='#111';ctx.lineWidth=4;
     ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(14,-3);ctx.lineTo(8,17);ctx.lineTo(-10,16);ctx.lineTo(-15,-2);ctx.closePath();ctx.fill();ctx.stroke();
     ctx.strokeStyle='#78cfee';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,23,0,Math.PI*1.5);ctx.stroke();
   }
   ctx.restore();
 }

 // 敵弾・魔法弾は地面や島の下に潜らないよう、地形と敵を描いた後に描画。
 for(const pr of projectiles)if(!pr.hit)drawProjectile(pr);
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
 else if(!spearPickup.taken){tx=spearPickup.x;ty=spearPickup.y;}
 else if(!stage3Started){tx=stage3Geo.path[0].x+130;ty=stage3Geo.path[0].y+150;}
 else if(!stage3BridgeOpen){tx=stage3Geo.path[stage3Geo.path.length-1].x+150;ty=550;}
 else if(!stage4Started){tx=stage4Geo.path[0].x+120;ty=540;}
 else if(!stage4Cleared){tx=stage4Geo.path[stage4Geo.path.length-1].x+180;ty=540;}
 else if(!stage5Started){tx=stage5Geo.path[0].x+130;ty=540;}
 else if(!grassAreaClear){tx=grassFinalBoss.x;ty=grassFinalBoss.y;}
 else if(!stage7Started){tx=stage7Geo.path[0].x+120;ty=550;}
 else if(!hammerPickup.taken){tx=hammerPickup.x;ty=hammerPickup.y;}
 else if(!rockBossDefeated){tx=rockBoss.x;ty=rockBoss.y;}
 else if(!islandBossDefeated){tx=islandBoss.x;ty=islandBoss.y;}
 else if(!stage10Started){tx=stage10Geo.bridge.x;ty=stage10Geo.bridge.y2;}
 else {tx=465;ty=165;}

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
 if(pr.kind==='thrownIce'){
   ctx.save();ctx.translate(pr.x,pr.y);ctx.rotate(performance.now()*.012);
   ctx.fillStyle='#bdeeff';ctx.strokeStyle='#111';ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(0,-pr.r);ctx.lineTo(pr.r*.85,-3);ctx.lineTo(pr.r*.45,pr.r);ctx.lineTo(-pr.r*.65,pr.r*.7);ctx.lineTo(-pr.r,-4);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();return;
 }

 if(pr.kind==='iceShard'){
   ctx.save();ctx.translate(pr.x,pr.y);ctx.rotate(Math.atan2(pr.vy,pr.vx));
   ctx.fillStyle='#dff8ff';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-7,-9);ctx.lineTo(-2,0);ctx.lineTo(-7,9);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();return;
 }

 if(pr.kind==='fireWheel'){
   ctx.save();ctx.translate(pr.x,pr.y);ctx.rotate(performance.now()*.018);
   ctx.globalAlpha=.25;circle(0,0,43,'#ffb128','transparent',0);ctx.globalAlpha=1;
   ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.stroke();
   ctx.strokeStyle='#ff5a2d';ctx.lineWidth=13;ctx.beginPath();ctx.arc(0,0,26,0,Math.PI*2);ctx.stroke();
   ctx.strokeStyle='#ffd24a';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.fillStyle='#ff6a2a';ctx.beginPath();ctx.moveTo(Math.cos(a)*27,Math.sin(a)*27);ctx.lineTo(Math.cos(a-.22)*45,Math.sin(a-.22)*45);ctx.lineTo(Math.cos(a+.22)*39,Math.sin(a+.22)*39);ctx.closePath();ctx.fill();}
   ctx.restore();return;
 }

 if(pr.kind==='enemyFire'){
   ctx.save();ctx.translate(pr.x,pr.y);
   const a=Math.atan2(pr.vy,pr.vx);ctx.rotate(a);
   ctx.fillStyle='#ff6a2a';ctx.strokeStyle='#111';ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(17,0);ctx.quadraticCurveTo(-2,-16,-18,0);ctx.quadraticCurveTo(-2,16,17,0);ctx.fill();ctx.stroke();
   circle(3,0,7,'#ffd45a','#111',2);ctx.restore();return;
 }

 ctx.save();ctx.translate(pr.x,pr.y);
 const a=Math.atan2(pr.vy,pr.vx);ctx.rotate(a);
 if(pr.kind==='seed'){
   ctx.globalAlpha=.24;circle(0,0,pr.r+8,'#c9df78','transparent',0);
   ctx.globalAlpha=1;
   // 種らしい楕円形
   ctx.fillStyle='#718f39';ctx.strokeStyle='#111';ctx.lineWidth=4;
   ctx.beginPath();ctx.ellipse(0,0,pr.r+3,pr.r*.65,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   line(-pr.r-10,0,-pr.r+2,0,5,'#a8c35e');
 }else if(pr.kind==='leafshot'){
   ctx.globalAlpha=.18;circle(0,0,pr.r+7,'#bde99a','transparent',0);ctx.globalAlpha=1;
   ctx.fillStyle='#65b84d';ctx.strokeStyle='#111';ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(pr.r+5,0);ctx.quadraticCurveTo(0,-pr.r,-pr.r-5,0);ctx.quadraticCurveTo(0,pr.r,pr.r+5,0);ctx.fill();ctx.stroke();
   line(-pr.r-7,0,pr.r+2,0,3,'#397a35');
 }else if(pr.kind==='snowball'||pr.kind==='icechunk'){circle(0,0,pr.r,pr.kind==='snowball'?'#f8fdff':'#bcecff','#507c91',3);ctx.globalAlpha=.65;line(-pr.r-10,0,-pr.r-2,0,3,'#fff');ctx.globalAlpha=1;
 }else if(pr.kind==='fire'){
   // 赤杖：魔法感は残しつつ、中心を大きくした「火の玉」。
   const t=performance.now()*.018+(pr.magicPhase||0);
   ctx.globalAlpha=.18;circle(-5,0,pr.r+18,'#ff7b2d','transparent',0);ctx.globalAlpha=1;
   // 短い炎尾
   ctx.fillStyle='#ff7a28';
   ctx.beginPath();ctx.moveTo(-pr.r+2,-8);ctx.quadraticCurveTo(-pr.r-28,Math.sin(t)*7,-pr.r-39,0);ctx.quadraticCurveTo(-pr.r-23,13,-pr.r+2,8);ctx.closePath();ctx.fill();
   ctx.fillStyle='#ffd54f';
   ctx.beginPath();ctx.moveTo(-pr.r+1,-4);ctx.quadraticCurveTo(-pr.r-20,Math.sin(t+1)*4,-pr.r-27,0);ctx.quadraticCurveTo(-pr.r-15,7,-pr.r+1,4);ctx.closePath();ctx.fill();
   // 大きい球状の炎核
   circle(2,0,pr.r+5,'#ff4d2d','#8b271c',3);
   circle(6,-3,pr.r*.58,'#ff9f2f','transparent',0);
   circle(9,-5,pr.r*.28,'#fff08a','transparent',0);
   // 周囲の魔法火花
   ctx.fillStyle='#ffe36a';
   for(let i=0;i<3;i++){const aa=t+i*2.1,rr=pr.r+10;circle(Math.cos(aa)*rr,Math.sin(aa)*rr,2.4,'#ffe36a','transparent',0);}
 }else if(pr.kind==='ice'){
   // 青杖：結晶核＋回転する魔法リング。綿毛弾と完全に別シルエット。
   const t=performance.now()*.014+(pr.magicPhase||0);
   ctx.globalAlpha=.20;circle(0,0,pr.r+17,'#9deaff','transparent',0);ctx.globalAlpha=1;
   ctx.strokeStyle='#74dfff';ctx.lineWidth=4;
   ctx.beginPath();ctx.ellipse(-5,0,pr.r+15,7,Math.sin(t)*.35,0,Math.PI*2);ctx.stroke();
   ctx.rotate(-t*.35);
   ctx.fillStyle='#dffbff';ctx.strokeStyle='#237da8';ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(pr.r+12,0);ctx.lineTo(2,-8);ctx.lineTo(-pr.r-7,0);ctx.lineTo(2,8);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,-7);ctx.lineTo(-2,7);ctx.moveTo(-9,0);ctx.lineTo(6,0);ctx.stroke();
 }else{
   ctx.globalAlpha=.28;circle(0,0,pr.r+9,'#b8ecff','transparent',0);ctx.globalAlpha=1;circle(0,0,pr.r,'#63d7ff','#111',4);
 }
 ctx.restore();
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);if(e.flash>0)ctx.globalAlpha=.6;
 if(e.type==='grass'){
   // 最初の草敵：生き物っぽい黒い胴体をやめ、単純な二枚葉の雑草に。
   // 足や口はなく、根元が少し揺れて近づいてくるだけ。
   ctx.fillStyle='#45bf45';ctx.strokeStyle='#111';ctx.lineWidth=5;ctx.lineJoin='round';
   ctx.beginPath();ctx.moveTo(0,18);ctx.quadraticCurveTo(-7,-1,-31,-15);ctx.quadraticCurveTo(-27,10,-5,13);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(0,18);ctx.quadraticCurveTo(7,-5,31,-18);ctx.quadraticCurveTo(28,9,5,13);ctx.closePath();ctx.fill();ctx.stroke();
   line(0,18,0,29,7,'#111');line(0,18,0,29,3,'#3d9d3f');
   // 葉脈だけ。顔は付けない。
   line(-4,10,-23,-9,2,'#2e8f39');line(4,9,23,-12,2,'#2e8f39');
 }else{
   // ピンク花：中心を大きくして「顔」を明確に。黒い目を左右に2つ。
   line(0,6,0,27,10,'#111');line(0,6,0,27,5,'#4fae52');
   ctx.fillStyle='#45b84e';ctx.strokeStyle='#111';ctx.lineWidth=4;
   ctx.beginPath();ctx.ellipse(-11,23,13,7,-.45,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.ellipse(11,23,13,7,.45,0,Math.PI*2);ctx.fill();ctx.stroke();
   for(let i=0;i<8;i++){const aa=i*Math.PI/4;ctx.save();ctx.translate(Math.cos(aa)*20,Math.sin(aa)*20-9);ctx.rotate(aa);ctx.fillStyle='#f49ad0';ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,10,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()}
   circle(0,-9,18,'#ffd85a','#111',5);
   circle(-7,-12,3.8,'#111','#111',1);circle(7,-12,3.8,'#111','#111',1);
   // 小さな口で上下を分かりやすく。
   ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,-5,6,.25,Math.PI-.25);ctx.stroke();
 }
 if(e.attackAnim>0){
   ctx.save();ctx.globalAlpha=Math.min(1,e.attackAnim/.12);ctx.strokeStyle='#43a84d';ctx.lineWidth=8;ctx.lineCap='round';
   ctx.beginPath();ctx.arc(0,-2,35,-.8,.8);ctx.stroke();ctx.restore();
 }
 ctx.restore();
}

function drawPlayer(){
 const jumpNorm=player.jumpT>0?Math.max(0,Math.min(1,1-player.jumpT/Math.max(.001,player.jumpDur||.62))):0;
 const normalLift=player.jumpT>0?Math.min(220,Math.max(0,Math.sin(jumpNorm*Math.PI)*(player.jumpHeight||105)*(shields[player.shieldType]?.jump||1))):0;
 // 通常ジャンプだけでなくハンマーチャージの高さもキャラ全体に反映。
 const lift=Math.max(normalLift,player.jumpZ||0,player.skillZ||0);
 const moving=player.moveMag>.16&&player.jumpT<=0;
 const step=moving?Math.sin(player.walkPhase):0;
 const bounce=moving?Math.abs(Math.sin(player.walkPhase))*2:0;
 ctx.save();ctx.translate(player.x,player.y-lift-bounce);
 if(player.falling){
   const ft=clamp(player.fallT/player.fallDur,0,1);
   const sc=1-ft*.78;
   ctx.globalAlpha=1-ft*.82;
   ctx.scale(sc,sc);
   ctx.rotate(ft*.55);
 }
 if(player.skillKind==='hammer'&&player.skillT>0){ctx.rotate(player.hammerSpin||0);}
 if(player.skillKind==='hammer'&&player.skillT>0){
   ctx.save();
   ctx.globalAlpha=.28;
   ctx.strokeStyle='rgba(255,255,255,.9)';
   ctx.lineWidth=8;
   ctx.lineCap='round';
   ctx.beginPath();
   ctx.arc(0,0,70,-1.0,.35);
   ctx.stroke();
   ctx.restore();
 }
 // shadow stays on the ground
 // 高く跳びすぎると 1-lift/235 が負数になり、Canvas ellipse() が例外を投げて
 // 描画ループ全体が停止していた。半径は必ず正の値へクランプする。
 const shadowScale=Math.max(.10,1-lift/235);
 ctx.save();ctx.translate(0,lift+bounce);ctx.globalAlpha=.20;ctx.fillStyle='#111';ctx.beginPath();
 ctx.ellipse(0,37,28*shadowScale,11*shadowScale,0,0,Math.PI*2);
 ctx.fill();ctx.restore();
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

 // 剣スキル：3回とも高速の薙ぎ払い。
 if(player.skillKind==='sword'&&player.skillT>0){
   const ph=Math.min(2,Math.floor(player.skillElapsed/.20));
   const q=Math.max(0,Math.min(1,(player.skillElapsed-ph*.20)/.16));
   wa=player.skillBase-.95+q*1.9;
 }
 // 槍スキル：前半は風車回転、後半は前方へ突く。
 if(player.skillKind==='spear'&&player.skillT>0){
   if(player.spearSkillHeld){
     // 槍の中央を握って回すための角度。通常の「柄の端を持つ」描画は後段で差し替える。
     wa=player.skillBase+player.skillElapsed*20;
     thrust=0;
   }else {wa=player.skillBase;thrust=Math.sin(Math.min(1,(player.skillElapsed-.46)/.26)*Math.PI)*26}
 }
 // ジャンプ通常攻撃：剣/槍は下突き、ハンマーは着地へ振り下ろす。
 if(player.airAttack&&player.jumpT>0){
   const jp=1-player.jumpT/player.jumpDur;
   if(player.weapon===0){
     // 剣：真下へ構え、落下直前に短く振り抜く。
     wa=Math.PI/2 + (jp>.72?(jp-.72)*1.15:0);
     thrust=12;
   }else if(player.weapon===1){
     // 槍：剣より長く真下へ突き出す。
     wa=Math.PI/2;thrust=30;
   }else if(player.weapon===2){
     // ハンマー：空中で大きく振りかぶり、着地直前に真下へ叩きつける。
     wa=player.aim-1.35+Math.max(0,(jp-.58)/.42)*2.7;
   }
 }

 // 武器アニメーションはここだけで決める。後段で wa / thrust を上書きしない。
 if(player.attacking>0 && !player.spin && player.skillKind!=='sword' && !(player.airAttack&&player.jumpT>0)){
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
   drawActiveWeapon(handR.x,handR.y+8,wa,thrust);
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
   drawActiveWeapon(rwx,rwy,wa,thrust);
   redrawBodyLayer(f);
 }else if(f==='left'){
   // P09 左向き：剣/右腕は最奥、身体、盾腕、盾の順。
   const lwx=-18, lwy=12;
   drawActiveWeapon(lwx,lwy,wa,thrust);
   redrawBodyLayer(f);
   // 左腕を胸の前から前方へ伸ばし、盾の中央裏を掴む。
   const lsx=-31, lsy=-1;
   line(-7,5,lsx+8,lsy+1,13,'#111');
   line(-7,5,lsx+8,lsy+1,7,'#f7fbff');
   circle(lsx+7,lsy+1,6,'#f7fbff','#111',4);
   drawShield(lsx,lsy,a,player.shield,true);
 }else{
   drawActiveWeapon(handR.x,handR.y,wa,thrust);
   drawShield(sx,sy,a,player.shield,false);
 }
 
 if(player.attacking>0&&player.weapon===0)drawAttackArc(player.aim);
 if(player.attacking>0&&player.weapon===2)drawAttackArc(player.aim);
 if(player.attacking>0&&player.weapon===1)drawThrustStreak(player.aim);
 if(player.charging){
   const held=performance.now()/1000-player.chargeStart;
   const ready=held>=.42;
   const pulse=.5+.5*Math.sin(performance.now()*.012);
   // チャージ表示は身体だけ。武器側には一切発光を足さない。
   ctx.save();ctx.globalCompositeOperation='screen';
   ctx.fillStyle=player.weapon===3?'#ff765d':(player.weapon===4?'#5fdcff':'#48cfff');
   ctx.globalAlpha=ready?(.30+pulse*.12):Math.min(.17,.05+held*.20);
   ctx.beginPath();ctx.ellipse(0,-8,36,45,0,0,Math.PI*2);ctx.fill();
   if(ready){
     ctx.globalAlpha=.13+pulse*.08;ctx.fillStyle='#fff';
     ctx.beginPath();ctx.ellipse(0,-8,27,36,0,0,Math.PI*2);ctx.fill();
   }
   ctx.restore();
 }
 ctx.restore();
}



function drawActiveWeapon(wx,wy,wa,thrust){
 // 槍スキル前半：槍の「真ん中」を手で持つ。
 // 槍全長が回転円の直径になる。手から穂先までが半径ではない。
 if(player.skillKind==='spear'&&player.skillT>0&&player.spearSkillHeld){
   ctx.save();ctx.translate(wx,wy);ctx.rotate(wa);
   const half=68;
   // 回転中も通常時と同じ金属柄。白い棒にはしない。
   line(-half,0,half,0,11,'#111');
   line(-half+4,0,half-12,0,5,'#8d9aa3');
   line(-half+8,-1,half-16,-1,2,'#dbe4e9');
   // 穂先は細長い菱形。反対側は小さな金属製の石突。
   ctx.fillStyle='#aebbc4';ctx.strokeStyle='#111';ctx.lineWidth=4;
   ctx.beginPath();ctx.moveTo(half-5,0);ctx.lineTo(half+5,-10);ctx.lineTo(half+24,0);ctx.lineTo(half+5,10);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='#edf4f7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(half+2,-4);ctx.lineTo(half+18,0);ctx.lineTo(half+2,3);ctx.stroke();
   ctx.fillStyle='#7f8d96';ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-half-9,0);ctx.lineTo(-half+1,-6);ctx.lineTo(-half+1,6);ctx.closePath();ctx.fill();ctx.stroke();
   // 手が中央を握っているのを強調
   circle(0,0,7,'#f7fbff','#111',4);
   ctx.restore();
 }else{
   // 通常時は元の武器描画へ戻す。ここで自分自身を呼ぶと無限再帰してゲーム全体が停止する。
   drawWeapon(wx,wy,wa,thrust);
 }
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
function drawWeapon(hx,hy,a,ext=0){const w=player.weapon;ctx.save();ctx.translate(hx+Math.cos(a)*ext,hy+Math.sin(a)*ext);ctx.rotate(a);ctx.lineCap='round';if(w===0){line(0,0,45,0,11,'#111');line(0,0,45,0,5,player.swordPlus?'#c8f2d2':'#eef5fa');if(player.swordPlus)line(10,-2,41,-2,2,'#64c58b');line(5,-11,5,11,7,'#111');line(5,-7,5,7,3,player.swordPlus?'#6fbd78':'#d8a93d')}
 else if(w===1){
   // 槍は金属柄。穂先は単純な三角ではなく、細長い菱形の槍身。
   line(-3,0,62,0,10,'#111');line(-3,0,62,0,5,'#8d9aa3');line(1,-1,58,-1,2,'#dbe4e9');
   ctx.fillStyle='#aebbc4';ctx.strokeStyle='#111';ctx.lineWidth=5;
   ctx.beginPath();ctx.moveTo(58,0);ctx.lineTo(68,-9);ctx.lineTo(88,0);ctx.lineTo(68,9);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='#edf4f7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(65,-4);ctx.lineTo(82,0);ctx.lineTo(65,2);ctx.stroke();
 }
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
 // 地面の炎は地形描画側で先に描く。
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
 if(player.staffChargeFx){
   const fx=player.staffChargeFx;
   const life=clamp(fx.t/fx.max,0,1);
   ctx.save();ctx.translate(player.x,player.y);ctx.rotate(fx.base);

   if(fx.kind==='fireCone'){
     // 半透明の炎が幾重にも重なり、前へ広がる扇。
     ctx.globalCompositeOperation='source-over';
     for(let i=0;i<14;i++){
       const p=i/13;
       const x=50+p*205;
       const side=Math.sin(i*2.17+performance.now()*.01)*(20+p*65);
       const wob=Math.sin(performance.now()*.018+i)*8;
       ctx.globalAlpha=(.24+.34*(1-p))*life;
       ctx.fillStyle=i%3===0?'#ff2f2f':(i%3===1?'#ff6b32':'#ffb13b');
       ctx.beginPath();
       ctx.moveTo(x-28,side+18);
       ctx.quadraticCurveTo(x-10,side-8-wob,x+8,side-30-wob);
       ctx.quadraticCurveTo(x+18,side-5,x+30,side+12);
       ctx.quadraticCurveTo(x,side+28,x-28,side+18);
       ctx.fill();
     }
     // 外周に薄い熱気の扇形。
     ctx.globalAlpha=.27*life;ctx.fillStyle='#ff3a30';ctx.beginPath();ctx.moveTo(28,0);
     ctx.arc(28,0,250,-.52,.52);ctx.closePath();ctx.fill();

   }else{
     // 白く冷たい吹雪。小さな氷結晶とキラキラを扇状に流す。
     const tm=performance.now()*.016;
     for(let i=0;i<28;i++){
       const p=(i%14)/13;
       const x=45+p*220;
       const side=((i%7)-3)*14 + Math.sin(tm+i*1.7)*10*(.3+p);
       const r=3+(i%4);
       ctx.globalAlpha=(.42+.42*(1-p))*life;
       ctx.save();ctx.translate(x,side);ctx.rotate(tm*.2+i);
       ctx.strokeStyle=i%3===0?'#ffffff':'#d9f7ff';ctx.lineWidth=2;
       for(let a=0;a<3;a++){
         ctx.rotate(Math.PI/3);
         ctx.beginPath();ctx.moveTo(-r*1.8,0);ctx.lineTo(r*1.8,0);ctx.stroke();
       }
       ctx.restore();
     }
     // 冷気の白い霧。
     const grad=ctx.createLinearGradient(30,0,275,0);
     grad.addColorStop(0,'rgba(235,250,255,.24)');
     grad.addColorStop(.55,'rgba(220,246,255,.17)');
     grad.addColorStop(1,'rgba(255,255,255,0)');
     ctx.globalAlpha=life;ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(245,-145);ctx.lineTo(285,0);ctx.lineTo(245,145);ctx.closePath();ctx.fill();
   }
   ctx.restore();
 }

 if(player.skillKind==='fire'&&player.skillT>0){
   ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.fireWheelVisual||0);
   ctx.globalAlpha=.36;ctx.strokeStyle='#ff6a2a';ctx.lineWidth=13;ctx.beginPath();ctx.arc(0,0,48,0,Math.PI*2);ctx.stroke();
   ctx.globalAlpha=.82;ctx.strokeStyle='#ffd34d';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,38,0,Math.PI*2);ctx.stroke();ctx.restore();
 }

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
     for(let x=18;x<280;x+=7){
       const spread=8+x*.075;
       const y=Math.sin(x*.115+tm+i*Math.PI/2)*spread;
       if(x===18)ctx.moveTo(x,y);else ctx.lineTo(x,y);
     }
     ctx.stroke();
   }

   // 空気が引っ張られて前へ流れている長い残像。
   ctx.lineCap='round';
   for(let i=0;i<8;i++){
     const phase=(tm*22+i*29)%245;
     const x=30+phase;
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
     const x=125+j*58;
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

function drawCloudRaceIntroOverlay(){if(!cloudRace.intro)return;const t=cloudRaceIntroText(cloudRace.introPage);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='rgba(8,20,31,.78)';ctx.fillRect(0,0,canvas.width,canvas.height);const bw=Math.min(canvas.width-36,520),bh=245,bx=(canvas.width-bw)/2,by=(canvas.height-bh)/2;ctx.fillStyle='rgba(255,255,255,.97)';ctx.strokeStyle='#111';ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,24);ctx.fill();ctx.stroke();ctx.textAlign='center';ctx.fillStyle='#17384b';ctx.font='900 27px system-ui';ctx.fillText(t[0],canvas.width/2,by+48);ctx.fillStyle='#111';ctx.font='800 18px system-ui';let lines=[],cur='';for(const ch of t[1]){const test=cur+ch;if(ctx.measureText(test).width>bw-54){lines.push(cur);cur=ch}else cur=test}if(cur)lines.push(cur);lines.slice(0,4).forEach((x,i)=>ctx.fillText(x,canvas.width/2,by+91+i*30));for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(canvas.width/2-36+i*24,by+216,6,0,Math.PI*2);ctx.fillStyle=i===cloudRace.introPage?'#17384b':'#b9c9d1';ctx.fill()}ctx.restore()}
let last=performance.now();function loop(t){let dt=Math.min(.033,(t-last)/1000);last=t;update(dt);drawWorld();drawCloudRaceIntroOverlay();requestAnimationFrame(loop)}requestAnimationFrame(loop);

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

