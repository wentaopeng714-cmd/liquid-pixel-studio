const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');const source=html.split('<script>')[1].split('// BOOT')[0];
let serial=0;const noop=()=>{};
const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop}),getImageData:()=>({data:new Uint8ClampedArray(360*300*4).fill(serial++%255)})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
const nodes=new Map();function node(){return{textContent:'',hidden:false,disabled:false,open:false,style:{},dataset:{},classList:{toggle:noop,add:noop,remove:noop},append:noop,replaceChildren:noop,setAttribute:noop,getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,test',showModal(){this.open=true},close(){this.open=false}}}
const sandbox={console,Math,Date,JSON,Uint8Array,Uint8ClampedArray,Uint32Array,Int16Array,Map,Set,Blob,performance,document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll:()=>[],querySelector:()=>null,createElement:node,body:node()},localStorage:{setItem:noop},setTimeout:()=>0,clearTimeout:noop};
vm.createContext(sandbox);vm.runInContext(source,sandbox);
vm.runInContext(`
function expect(v,m){if(!v)throw new Error(m)}
function advance(t){for(let i=0;i<Math.round(t/.02);i++)update(.02)}
world.drag={turn:0,travel:0,dx:0,dy:0,tone:0};
let x=artDoc.pieces[0].x;addCurrent(210,155,80,8,.2);advance(.2);expect(Math.abs(artDoc.pieces[0].x-x)>5,'stir moves shards');expect(found.includes('current'),'first current');
for(let i=1;i<=24;i++){const a=i/24*TAU,prev=(i-1)/24*TAU;addCurrent(180+Math.cos(a)*50,145+Math.sin(a)*50,(Math.cos(a)-Math.cos(prev))*50,(Math.sin(a)-Math.sin(prev))*50,.025)}expect(found.includes('whirl'),'circular stir');world.drag=null;
beginMagnet(180,145);advance(2.3);expect(found.includes('disc'),'hold completes disc');expect(artDoc.pieces.every(p=>Math.hypot(p.x-p.bx,p.y-p.by)<1.5),'magnet alignment');
releaseMagnet();expect(found.includes('bloom')&&world.motes.length>60,'release burst');advance(.15);
action('reform');advance(3);world.vortices=[];
const p=artDoc.pieces[2];meltAt(p.x,p.y,45);expect(activeCells()>65&&found.includes('liquid'),'local melt');
const cell=p.cells.find(c=>c.heat>0),sx=cell.x;advance(.5);expect(Math.abs(cell.x-sx)>.1,'melted pixels move');
beginMagnet(180,145);expect(found.includes('orbit'),'liquid + magnet combo');advance(2.3);expect(activeCells()===0,'magnet reforms liquid');releaseMagnet();
expect(found.length===6,'all six discoveries');
world.t=100;const target=artDoc.pieces[0];meltAt(target.x,target.y,40);const count=activeCells();checkpoint();artDoc.glow=.2;undo();expect(artDoc.glow===.75&&activeCells()===count,'undo reconstructs active cells');expect(artDoc.pieces.flatMap(p=>p.cells).filter(c=>c.heat>0).every(c=>c.until<3),'undo rebases melt cooldown');redo();expect(artDoc.glow===.2,'redo');
world.drag=null;startCapture(false);for(let i=0;i<80;i++)tickCapture(.1);expect(capture.frames.length<=60&&!capture.active,'auto capture ends and caps memory');const oldClip=capture.frames;advance(1);expect(capture.frames===oldClip,'frozen clip preserved');
startCapture(true);world.drag={tool:'stir'};for(let i=0;i<65;i++)tickCapture(.1);world.drag=null;expect(capture.frames.length===60&&!capture.active,'fixed six-second take');expect(capture.frames[0][0]!==capture.frames[59][0],'actual sampled frames kept');
const packed=packDoc();expect(!('shape' in packed.pieces[0]),'compact persistence');const restored=unpackDoc(packed);expect(restored.pieces.length===8&&restored.pieces[0].cells.length>30,'editable reconstruction');
action('reset');expect(activeCells()===0,'reset clears melt');undo();expect(artDoc.glow===.2,'reset undo');
const pauseTime=world.t;artDoc.playing=false;update(1);expect(world.t===pauseTime,'pause freezes material and water phase');artDoc.playing=true;render(mainCtx);console.log('PASS stir, whirlpool, magnet hold/release, local melt, reformation, combined liquid orbit, all discoveries, undo/redo cooldowns, true-frame recording and reset');
`,sandbox);
sandbox.frames=[new Uint8ClampedArray(128*128*4),new Uint8ClampedArray(128*128*4)];
let seed=123;for(const f of sandbox.frames)for(let i=0;i<f.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;f[i]=i%4===3?255:seed>>>24}
const bytes=vm.runInContext('bytesGIF(frames,128,128,[10,10])',sandbox);assert.equal(Buffer.from(bytes).subarray(0,6).toString(),'GIF89a');fs.writeFileSync(__dirname+'/test-encoder.gif',bytes);
console.log('PASS GIF encoder dictionary stress sample generated');
