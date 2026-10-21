// BricksBeater 网页移植版 —— 逻辑忠实移植自 zouhuidong/BricksBeater main.cpp (MIT License, © 2023 huidong)
'use strict';
const PI=3.1415926;
const STATE_BAR_HEIGHT=150,WINDOW_BOTTOM_MARGIN=187;
const INNER=7,INTERVAL=1,SIDE_LEN=INNER+2*INTERVAL;
const BOARD_HALF_WIDTH=40,BOARD_HALF_THICKNESS=3,BOARD_Y_DISTACE=100,BOARD_BALL_DISTANCE=16;
const BALL_MAX_NUM=1024,BALL_LIFE_NUM=4,BALL_SPEED=2.4,PROCESS_REPEAT=3;
const COLORS={'#':'rgb(163,163,162)',R:'rgb(214,63,37)',Y:'rgb(228,174,31)',G:'rgb(15,216,15)',C:'rgb(39,253,251)',B:'rgb(68,112,202)',W:'rgb(234,234,234)'};
const EMPTY=0,WALL=1,BRICK=2;
const PROP_3X=0,PROP_SHOOT_3=1,PROP_HEART=2,PROP_MAX_NUM=1024,PROP_DROP_SPEED=0.2,PROP_SIZE=20;
const HIT_NONE=0,HIT_NORMAL=1,HIT_VERTEX=2;
const MAP_W=51,MAP_H=31,LEVEL_NUM=LEVELS.length;
const BOARD_Y=MAP_H*SIDE_LEN+BOARD_Y_DISTACE;
const BALL_R=3;
const W=MAP_W*SIDE_LEN, H=STATE_BAR_HEIGHT+BOARD_Y+BOARD_HALF_THICKNESS+WINDOW_BOTTOM_MARGIN;
const P3X=8,PSHOOT=12,PHEART=5;

const rand=()=>Math.floor(Math.random()*32768); // 模拟 C rand()
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
function img(s){const i=new Image();i.src='assets/'+s;return i}
const IMG={restart:img('restart.gif'),p3x:img('prop_3x.gif'),shoot:img('prop_shoot_3.gif'),heart:img('prop_heart.gif')};
// 音效（WebAudio，首次触摸后解锁）
let actx=null;const bufs={};
function initAudio(){if(actx)return;try{actx=new (window.AudioContext||window.webkitAudioContext)();
 for(const n of['ping','pong','prop'])fetch('assets/'+n+'.mp3').then(r=>r.arrayBuffer()).then(b=>actx.decodeAudioData(b)).then(d=>bufs[n]=d).catch(()=>{});}catch(e){}}
function play(n){if(!actx||!bufs[n])return;const s=actx.createBufferSource();s.buffer=bufs[n];s.connect(actx.destination);s.start()}
let pingFlag=true,lastSound=0;
function PlayHitSound(prop){if(prop){play('prop');return}const t=performance.now();if(t-lastSound>30){play(pingFlag?'ping':'pong');lastSound=t;pingFlag=!pingFlag}}

let level=0,inMenu=true,state='gaming',map,boardX,balls,ballWait,remaining,props;
let restartBtn={l:W-30-15,t:15,r:W-15,b:45};
let soundOn=true;
function InitLevel(){
 map=[];for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const ch=LEVELS[level][y][x];
  const sx=x*SIDE_LEN,sy=y*SIDE_LEN;const b={rct:{l:sx,t:sy,r:sx+SIDE_LEN,b:sy+SIDE_LEN},type:EMPTY,color:null};
  if(ch==='#'){b.type=WALL;b.color=COLORS['#']}else if(COLORS[ch]){b.type=BRICK;b.color=COLORS[ch]}
  map[x+y*MAP_W]=b;}
 boardX=W/2;balls=[];ballWait=true;remaining=BALL_LIFE_NUM;props=[];
}
function distPR(x,y,r){let xr,yr;
 if(x>=r.l&&x<=r.r)xr=x;else xr=Math.abs(x-r.l)<Math.abs(x-r.r)?r.l:r.r;
 if(y>=r.t&&y<=r.b)yr=y;else yr=Math.abs(y-r.t)<Math.abs(y-r.b)?r.t:r.b;
 return Math.hypot(x-xr,y-yr);}
function tangent(x0,y0,x1,y1,x2,y2,r){
 if(Math.abs(x1-x2)<0.00001){const d2=r*r-(x0-x1)*(x0-x1);if(d2<0)return null;const d=Math.sqrt(d2);
  const a=y0+d,b=y0-d;return[x1,Math.abs(y1-a)<Math.abs(y1-b)?a:b];}
 const k=(y2-y1)/(x2-x1),m=-k*x1+y1-y0,a=k*k+1,b=2*(k*m-x0),c=x0*x0+m*m-r*r,dl=b*b-4*a*c;
 if(dl<0)return null;const s=Math.sqrt(dl),r1=(-b+s)/(2*a),r2=(-b-s)/(2*a);
 const xc=Math.abs(x1-r1)<Math.abs(x1-r2)?r1:r2;return[xc,k*xc-k*x1+y1];}
function rectHit(ball,rct,isBoard,left=true,up=true,right=true,down=true){
 const lx=ball.x-ball.vx,ly=ball.y-ball.vy;
 const inside=()=>ball.x>=rct.l&&ball.x<=rct.r&&ball.y>=rct.t&&ball.y<=rct.b;
 if(inside()){ball.x=lx;ball.y=ly;
  if(inside()){if(ball.vx>0&&left)ball.x=rct.l-BALL_R;else if(ball.vx<0&&right)ball.x=rct.r+BALL_R;
   if(ball.vy>0&&up)ball.y=rct.t-BALL_R;else if(ball.vy<0&&down)ball.y=rct.b+BALL_R;}
  ball.vx*=-1+rand()%10/1000;ball.vy*=-1+rand()%10/1000;
  if(isBoard)ball.y=BOARD_Y-BOARD_HALF_THICKNESS-BALL_R-1;
  return HIT_NORMAL;}
 if(!(distPR(ball.x,ball.y,rct)<=BALL_R*0.98))return HIT_NONE;
 let ret=HIT_NONE;
 const cl=rct.l>ball.x&&Math.abs(ball.x-rct.l)<=BALL_R&&left;
 const cr=ball.x>rct.r&&Math.abs(ball.x-rct.r)<=BALL_R&&right;
 const ct=rct.t>ball.y&&Math.abs(ball.y-rct.t)<=BALL_R&&up;
 const cb=ball.y>rct.b&&Math.abs(ball.y-rct.b)<=BALL_R&&down;
 let vj=true,vx=0,vy=0;
 if(cl&&ct){vx=rct.l;vy=rct.t}else if(cr&&ct){vx=rct.r;vy=rct.t}else if(cl&&cb){vx=rct.l;vy=rct.b}else if(cr&&cb){vx=rct.r;vy=rct.b}
 else if(ct||cb){vy=ct?rct.t:rct.b;if(left&&right)vx=Math.abs(ball.x-rct.l)<Math.abs(ball.x-rct.r)?rct.l:rct.r;else if(left)vx=rct.l;else if(right)vx=rct.r;else vj=false;}
 else if(cl||cr){vx=cl?rct.l:rct.r;if(up&&down)vy=Math.abs(ball.y-rct.t)<Math.abs(ball.y-rct.b)?rct.t:rct.b;else if(up)vy=rct.t;else if(down)vy=rct.b;else vj=false;}
 else vj=false;
 let isV=false;
 if(vj){const p=tangent(vx,vy,lx,ly,ball.x,ball.y,BALL_R);
  if(p&&!(distPR(p[0],p[1],rct)<BALL_R*0.98)){
   const surf=Math.atan2(p[1]-vy,p[0]-vx),nrm=surf+PI/2,inc=Math.atan2(ball.vy,ball.vx),rf=2*nrm-inc;
   ball.vx=Math.cos(rf)*BALL_SPEED;ball.vy=Math.sin(rf)*BALL_SPEED;ball.x=p[0];ball.y=p[1];isV=true;}}
 if(isV)ret=HIT_VERTEX;else{
  if(cl||cr){ball.vx=-ball.vx;ret=HIT_NORMAL}
  if(ct||cb){if(isBoard){ball.vx=(ball.x-boardX)/BOARD_HALF_WIDTH*BALL_SPEED;
    if(Math.abs(ball.vx)>BALL_SPEED){ball.vx=ball.vx>0?BALL_SPEED:-BALL_SPEED;ball.vy=0}
    else ball.vy=(ball.vy<0?1:-1)*Math.sqrt(BALL_SPEED*BALL_SPEED-ball.vx*ball.vx);}
   else ball.vy=-ball.vy;ret=HIT_NORMAL;}}
 if(ret!==HIT_NONE)PlayHitSound(false);
 if(!isV&&ret!==HIT_NONE){ball.x=lx;ball.y=ly}
 return ret;}
function genProp(x,y){if(props.length>=PROP_MAX_NUM)return;const t=[[PROP_3X,P3X],[PROP_SHOOT_3,PSHOOT],[PROP_HEART,PHEART]];
 const c=rand()%3;if(rand()%100<t[c][1])props.push({type:t[c][0],used:false,x,y});}
const isEmpty=id=>id<0||map[id].type===EMPTY;
function singleBallHit(ball){const bt=100,gh=H;
 rectHit(ball,{l:-bt,t:0,r:1,b:gh},false);rectHit(ball,{l:W-1,t:0,r:W+bt,b:gh},false);rectHit(ball,{l:-bt,t:-bt,r:W+bt,b:1},false);
 if(ball.y>H-STATE_BAR_HEIGHT){ball.alive=false;return}
 const bx=Math.floor(ball.x/SIDE_LEN),by=Math.floor(ball.y/SIDE_LEN);
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const x=bx+dx,y=by+dy;if(x<0||x>=MAP_W||y<0||y>=MAP_H)continue;
  const cur=x+y*MAP_W;if(map[cur].type===EMPTY)continue;
  const L=x>0?cur-1:-1,R=x<MAP_W-1?cur+1:-1,U=y>0?cur-MAP_W:-1,D=y<MAP_H-1?cur+MAP_W:-1;
  const h=rectHit(ball,map[cur].rct,false,isEmpty(L),isEmpty(U),isEmpty(R),isEmpty(D));
  if(h===HIT_NONE)continue;
  if(map[cur].type===BRICK){map[cur].type=EMPTY;genProp(map[cur].rct.l,map[cur].rct.t)}
  dy=dx=2;}
 rectHit(ball,{l:boardX-BOARD_HALF_WIDTH,t:BOARD_Y-BOARD_HALF_THICKNESS,r:boardX+BOARD_HALF_WIDTH,b:BOARD_Y+BOARD_HALF_THICKNESS},true);}
function allBall(){if(ballWait)return;let any=false;
 for(const b of balls){if(!b.alive)continue;any=true;singleBallHit(b);
  b.x+=b.vx+rand()%10/100;b.y+=b.vy+rand()%10/100;
  if(b.x<BALL_R)b.x=BALL_R;else if(b.x>W-BALL_R)b.x=W-BALL_R;if(b.y<BALL_R)b.y=BALL_R;}
 if(!any){if(remaining)ballWait=true;else state='fail';}}
function checkSuccess(){if(!map.some(b=>b.type===BRICK))state='win';}
function randSpeed(){const vx=((rand()%(BALL_SPEED*1e4))/1e4 % (BALL_SPEED-rand()%10/10000))*(rand()%2?1:-1);
 return[vx,Math.sqrt(BALL_SPEED*BALL_SPEED-vx*vx)*(rand()%2?1:-1)];}
function genBall(board,x=0,y=0,up=false){if(balls.length>=BALL_MAX_NUM)return;const b={alive:true};
 if(board){b.x=boardX;b.y=BOARD_Y-BOARD_BALL_DISTANCE;b.vx=0;b.vy=-BALL_SPEED}
 else{b.x=x;b.y=y;[b.vx,b.vy]=randSpeed();if(up&&b.vy>0)b.vy=-b.vy}
 balls.push(b);}
function launch(){if(!ballWait)return;if(remaining){genBall(true);remaining--;ballWait=false}}
function applyProp(p){if(p.type===PROP_3X){const n=balls.length;for(let i=0;i<n;i++){if(!balls[i].alive)continue;for(let j=0;j<3;j++)genBall(false,balls[i].x,balls[i].y)}}
 else if(p.type===PROP_SHOOT_3){for(let i=0;i<3;i++)genBall(false,p.x,BOARD_Y-BOARD_Y_DISTACE,true)}
 else remaining++;}
const ptHit=(x,y)=>y>=BOARD_Y-BOARD_HALF_THICKNESS&&y<=BOARD_Y+BOARD_HALF_THICKNESS&&x>=boardX-BOARD_HALF_WIDTH&&x<=boardX+BOARD_HALF_WIDTH;
function propProc(){for(const p of props){if(p.used)continue;const x1=p.x,y1=p.y,x2=x1+PROP_SIZE,y2=y1+PROP_SIZE;
 if(ptHit(x1,y1)||ptHit(x2,y2)||ptHit((x1+x2)/2,(y1+y2)/2)){applyProp(p);p.used=true;PlayHitSound(true);continue}
 p.y+=PROP_DROP_SPEED;}
 // 清理已用/落出画面的道具（性能优化，不影响玩法）
 if(props.length>200)props=props.filter(p=>!p.used&&p.y<H);}
function gameProcess(){if(inMenu||state!=='gaming')return;allBall();propProc();checkSuccess();
 if(balls.length>300&&balls.length%50===0)balls=balls.filter(b=>b.alive);}

// ---------- 绘制 ----------
function text(s,x,y,size,align='center'){ctx.font=`bold ${size}px system-ui,"PingFang SC",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(s,x,y)}
function overlay(title,small){ctx.fillStyle='#000';if(title){ctx.fillRect(0,20,W,120);text(title,W/2,80,44)}
 if(small){ctx.fillRect(0,150,W,50);text(small,W/2,175,22)}}
function draw(){ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle='rgb(19,19,92)';ctx.fillRect(0,0,W,H);
 if(!inMenu){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(W/2-20,28,10,0,7);ctx.fill();
  text(`第 ${level+1} / ${LEVEL_NUM} 关`,10,28,22,'left');text(String(remaining).padStart(2,'0'),W/2,28,22,'left');
  ctx.drawImage(IMG.restart,restartBtn.l,restartBtn.t,30,30);
  text('剩余球数',W/2+40,28,13,'left');}
 text(soundOn?'🔊':'🔇',W-70,30,20);
 ctx.translate(0,STATE_BAR_HEIGHT);
 for(const p of props){if(p.used)continue;ctx.drawImage([IMG.p3x,IMG.shoot,IMG.heart][p.type],p.x|0,p.y|0,PROP_SIZE,PROP_SIZE)}
 for(const b of map)if(b.type!==EMPTY){ctx.fillStyle=b.color;ctx.fillRect(b.rct.l+INTERVAL,b.rct.t+INTERVAL,INNER,INNER)}
 ctx.fillStyle='#fff';ctx.fillRect(boardX-BOARD_HALF_WIDTH,BOARD_Y-BOARD_HALF_THICKNESS,BOARD_HALF_WIDTH*2,BOARD_HALF_THICKNESS*2);
 ctx.beginPath();if(ballWait)ctx.arc(boardX,BOARD_Y-BOARD_BALL_DISTANCE,BALL_R,0,7);
 else for(const b of balls)if(b.alive){ctx.moveTo(b.x+BALL_R,b.y);ctx.arc(b.x,b.y,BALL_R,0,7)}ctx.fill();
 if(inMenu){overlay('Bricks Beater','致敬 Many Bricks Breaker');text('点击屏幕开始',W/2,BOARD_Y+BOARD_HALF_THICKNESS+22,18);
  text('拖动手指移动挡板 · 点击发球',W/2,BOARD_Y+60,14);text('键盘：←/→ 或 A/D 移动，空格发球',W/2,BOARD_Y+82,12);}
 else if(state==='win')overlay('过关！',level===LEVEL_NUM-1?'全部通关！点此返回主菜单':'点此进入下一关');
 else if(state==='fail')overlay(null,'失败了，点此重新开始');
 else if(ballWait)text('点击发球',W/2,BOARD_Y+30,16);
 ctx.setTransform(1,0,0,1,0,0);}

// ---------- 输入 ----------
function toGame(e){const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]}
function moveBoard(x){if(!ballWait)boardX=x}  // 与原版一致：等待发球时挡板不动
function press(x,y){initAudio();
 if(x>=W-90&&x<=W-50&&y<=50){soundOn=!soundOn;return}
 if(inMenu){inMenu=false;launch();return}
 if(state!=='gaming'){if(y>150+STATE_BAR_HEIGHT-20&&y<200+STATE_BAR_HEIGHT+20)endLevel();return}
 if(x>=restartBtn.l&&x<=restartBtn.r&&y>=restartBtn.t&&y<=restartBtn.b){InitLevel();return}
 if(ballWait)launch();}
function endLevel(){if(state==='win'){if(level===LEVEL_NUM-1){level=0;inMenu=true}else level++}InitLevel();state='gaming'}
cv.addEventListener('pointerdown',e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);const[x,y]=toGame(e);press(x,y);moveBoard(x)});
cv.addEventListener('pointermove',e=>{e.preventDefault();if(e.pointerType==='mouse'||e.buttons||e.pressure>0)moveBoard(toGame(e)[0])});
for(const ev of['touchstart','touchmove','gesturestart','dblclick','contextmenu'])document.addEventListener(ev,e=>{if(e.target===cv||ev!=='touchstart')e.preventDefault()},{passive:false});
const keys={};addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' '||e.key==='Enter'){e.preventDefault();
 if(inMenu||state!=='gaming')press(W/2,175+STATE_BAR_HEIGHT);else launch();}});
addEventListener('keyup',e=>keys[e.key]=false);
const _play=play;play=n=>{if(soundOn)_play(n)};

// ---------- 缩放与主循环 ----------
let scale=1;
function resize(){const dpr=devicePixelRatio||1,aw=innerWidth,ah=innerHeight-20,s=Math.min(aw/W,ah/H);
 cv.style.width=W*s+'px';cv.style.height=H*s+'px';cv.width=Math.round(W*s*dpr);cv.height=Math.round(H*s*dpr);scale=s*dpr;}
addEventListener('resize',resize);resize();
InitLevel();
let acc=0,last=performance.now();const FRAME=30; // 原版每帧 30ms，每帧处理 3 次
function loop(t){acc+=Math.min(t-last,250);last=t;
 while(acc>=FRAME){acc-=FRAME;if(!ballWait&&!inMenu){if(keys.ArrowLeft||keys.a)boardX-=8;if(keys.ArrowRight||keys.d)boardX+=8;}
  for(let i=0;i<PROCESS_REPEAT;i++)gameProcess();}
 draw();requestAnimationFrame(loop);}
requestAnimationFrame(loop);
// 测试钩子
window.__bb={get state(){return{level,inMenu,state,balls:balls.length,remaining}}};
