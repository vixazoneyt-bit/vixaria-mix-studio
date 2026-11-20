const $=s=>document.querySelector(s);
const DB="vixaria-studio-db",STORE="projects";let db,project=null,mp3Blob=null,videoBlob=null,animURL=null,audioCtx=null;
const req=(r)=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"id"});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function allProjects(){return req(db.transaction(STORE).objectStore(STORE).getAll())}
async function put(){if(!project)return;project.updated=Date.now();await req(db.transaction(STORE,"readwrite").objectStore(STORE).put(project));renderProjects();$("#projectStatus").textContent="Zapisano automatycznie · "+new Date().toLocaleTimeString()}
async function loadProject(p){project=p;$("#projectName").value=p.name;$("#fade").value=p.fade??8;$("#fadeVal").textContent=$("#fade").value;$("#normalize").checked=p.normalize!==false;$("#bitrate").value=p.bitrate||320;renderTracks();renderOutputs();if(p.animation){setVideoPreview(p.animation)}else{$("#videoInfo").textContent="Nie dodano animacji."}$("#audioStatus").textContent=p.audioOutput?"W projekcie jest gotowy mix MP3.":"Dodaj utwory, aby rozpocząć.";renderProjects()}
async function renderProjects(){let ps=await allProjects();$("#projects").innerHTML="";ps.sort((a,b)=>b.updated-a.updated).forEach(p=>{let d=document.createElement("div");d.className="project row between";let label=document.createElement("button");label.className="ghost";label.textContent=p.name+" · "+(p.tracks?.length||0)+" utworów";label.onclick=()=>loadProject(p);let del=document.createElement("button");del.className="secondary";del.textContent="Usuń";del.onclick=async()=>{if(confirm("Usunąć projekt wraz z zapisanymi plikami źródłowymi?")){await req(db.transaction(STORE,"readwrite").objectStore(STORE).delete(p.id));if(project?.id===p.id)project=null;renderProjects()}};d.append(label,del);$("#projects").append(d)})}
function newProject(){project={id:crypto.randomUUID(),name:"Nowy mix",tracks:[],fade:8,normalize:true,bitrate:320,animation:null,audioOutput:null,videoOutput:null,audioDownloaded:false};$("#projectName").value=project.name;put();renderTracks();renderOutputs()}
$("#newProject").onclick=newProject;$("#projectName").onchange=()=>{if(project){project.name=$("#projectName").value||"Mój mix";put()}};
function fmt(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`}
function renderTracks(){let box=$("#tracks");box.innerHTML="";if(!project?.tracks?.length){box.textContent="Brak utworów w projekcie."}else project.tracks.forEach((t,i)=>{let d=document.createElement("div");d.className="track";let n=document.createElement("span");n.className="muted";n.textContent=String(i+1).padStart(2,"0");let info=document.createElement("div");let nm=document.createElement("div");nm.className="trackname";nm.textContent=t.name;let mt=document.createElement("div");mt.className="trackmeta";mt.textContent=t.duration?fmt(t.duration):"Czas odczytany podczas eksportu · plik zapisany";info.append(nm,mt);let acts=document.createElement("div");acts.className="row";[["↑",-1],["↓",1],["×",0]].forEach(([s,dir])=>{let b=document.createElement("button");b.className="secondary";b.textContent=s;b.onclick=async()=>{if(dir===0)project.tracks.splice(i,1);else{let j=i+dir;if(j<0||j>=project.tracks.length)return;[project.tracks[i],project.tracks[j]]=[project.tracks[j],project.tracks[i]]}project.audioOutput=null;renderTracks();await put()};acts.append(b)});d.append(n,info,acts);box.append(d)});
let total=(project?.tracks||[]).reduce((a,t)=>a+(t.duration||0),0)-Math.max(0,(project?.tracks?.length||0)-1)*(+$("#fade").value||0);$("#duration").textContent=project?.tracks?.length?fmt(Math.max(0,total)):"—";$("#makeAudio").disabled=!(project?.tracks?.length)}
async function saveSettings(){if(!project)return;project.fade=+$("#fade").value;project.normalize=$("#normalize").checked;project.bitrate=+$("#bitrate").value;project.audioOutput=null;await put();renderTracks()}
$("#fade").oninput=()=>{$("#fadeVal").textContent=$("#fade").value;renderTracks()};["change"].forEach(ev=>{$("#fade").addEventListener(ev,saveSettings);$("#normalize").addEventListener(ev,saveSettings);$("#bitrate").addEventListener(ev,saveSettings)});
async function readDuration(file){
 return await new Promise(resolve=>{
  const a=new Audio(),u=URL.createObjectURL(file);let settled=false;
  const finish=v=>{if(settled)return;settled=true;URL.revokeObjectURL(u);a.removeAttribute("src");resolve(Number.isFinite(v)?v:0)};
  a.preload="metadata";a.onloadedmetadata=()=>finish(a.duration);a.onerror=()=>finish(0);
  a.src=u;setTimeout(()=>finish(0),12000);
 });
}
$("#audioFiles").addEventListener("change",async e=>{
 if(!project)newProject();
 const chosen=[...e.target.files];e.target.value="";
 if(!chosen.length)return;
 $("#tracks").textContent="Dodawanie plików…";
 let added=0,failed=[];
 for(const f of chosen){
  try{
   const duration=await readDuration(f);
   project.tracks.push({name:f.name,file:f,duration});
   added++;
   $("#tracks").textContent=`Dodano ${added} z ${chosen.length} plików…`;
  }catch(err){failed.push(f.name)}
 }
 project.audioOutput=null;project.videoOutput=null;
 await put();renderTracks();
 $("#audioStatus").textContent=failed.length?`Dodano ${added}; nie udało się dodać: ${failed.join(", ")}`:`Dodano ${added} plików. Możesz zmienić ich kolejność.`;
});

async function loadLame(){if(window.lamejs)return;let s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js";document.head.append(s);await new Promise((ok,no)=>{s.onload=ok;s.onerror=()=>no(Error("Nie udało się pobrać kodera MP3. Połącz się z internetem i spróbuj ponownie."))});if(!window.lamejs)throw Error("Koder MP3 nie został uruchomiony.")}
function peak(buf){let m=0;for(let c=0;c<buf.numberOfChannels;c++){let a=buf.getChannelData(c);for(let i=0;i<a.length;i+=128)m=Math.max(m,Math.abs(a[i]))}return m||1}
$("#makeAudio").onclick=async()=>{let btn=$("#makeAudio");btn.disabled=true;$("#audioStatus").textContent="Wczytuję koder MP3…";$("#audioBar").style.width="3%";try{
 await loadLame();if(!audioCtx)audioCtx=new AudioContext();let decoded=[];
 for(let t of project.tracks){decoded.push(await audioCtx.decodeAudioData(await t.file.arrayBuffer()))}
 const sr=decoded[0].sampleRate,ch=2,fade=+project.fade,fadeSamples=decoded.slice(1).map((b,i)=>Math.round(Math.min(fade,decoded[i].duration/2,b.duration/2)*sr));
 let starts=[0];for(let i=1;i<decoded.length;i++)starts[i]=starts[i-1]+decoded[i-1].length-fadeSamples[i-1];
 let total=starts.at(-1)+decoded.at(-1).length,left=new Float32Array(total),right=new Float32Array(total);
 decoded.forEach((b,i)=>{let l=b.getChannelData(0),r=b.numberOfChannels>1?b.getChannelData(1):l,start=starts[i],gain=project.normalize?Math.min(2,.88/peak(b)):1;for(let k=0;k<b.length;k++){let g=gain;if(i>0&&k<fadeSamples[i-1])g*=Math.sin(k/fadeSamples[i-1]*Math.PI/2);if(i<decoded.length-1&&k>b.length-fadeSamples[i])g*=Math.cos((k-(b.length-fadeSamples[i]))/fadeSamples[i]*Math.PI/2);left[start+k]+=l[k]*g;right[start+k]+=r[k]*g}});
 let enc=new lamejs.Mp3Encoder(2,sr,project.bitrate),chunks=[],block=1152;for(let i=0;i<total;i+=block){let n=Math.min(block,total-i),l=new Int16Array(n),r=new Int16Array(n);for(let j=0;j<n;j++){l[j]=Math.max(-32768,Math.min(32767,left[i+j]*32767));r[j]=Math.max(-32768,Math.min(32767,right[i+j]*32767))}let out=enc.encodeBuffer(l,r);if(out.length)chunks.push(new Uint8Array(out));$("#audioBar").style.width=(5+90*(i/total))+"%"}let end=enc.flush();if(end.length)chunks.push(new Uint8Array(end));mp3Blob=new Blob(chunks,{type:"audio/mpeg"});project.audioOutput=mp3Blob;project.audioDuration=total/sr;await put();$("#audioBar").style.width="100%";$("#audioStatus").textContent="Gotowe: "+fmt(total/sr)+", MP3 "+project.bitrate+" kb/s.";$("#downloadAudio").classList.remove("hidden");renderOutputs();
 }catch(e){$("#audioStatus").textContent=e.message}finally{btn.disabled=false}};
function setVideoPreview(file){if(animURL)URL.revokeObjectURL(animURL);animURL=URL.createObjectURL(file);let v=$("#preview");v.src=animURL;v.classList.remove("hidden");$("#videoInfo").textContent=file.name+" · plik zapisany w projekcie";$("#makeVideo").disabled=!project?.audioOutput}
$("#videoFile").onchange=async e=>{if(!project)newProject();let f=e.target.files[0];if(!f)return;project.animation=f;await put();setVideoPreview(f);e.target.value=""};
async function loadMediabunny(){
 if(window.__vixMediabunny)return window.__vixMediabunny;
 const m=await import('https://cdn.jsdelivr.net/npm/mediabunny@1. best/+esm'.replace('1. best','latest'));
 window.__vixMediabunny=m;return m;
}
async function makeVideoLegacy(){
 let mime=supportedMp4();
 if(!mime)throw Error('Ta przeglądarka nie udostępnia kodowania MP4.');
 let v=document.createElement('video'),ctx=null,src=null,stream=null,rec=null,timer=null,raf=0,chunks=[];
 try{
  v.src=URL.createObjectURL(project.animation);v.muted=true;v.loop=true;v.playsInline=true;v.preload='auto';
  await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=()=>no(Error('Nie udało się odczytać animacji MP4.'))});
  ctx=new AudioContext();let ab=await ctx.decodeAudioData(await project.audioOutput.arrayBuffer());
  src=ctx.createBufferSource();src.buffer=ab;let dest=ctx.createMediaStreamDestination();src.connect(dest);
  let canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;let c=canvas.getContext('2d',{alpha:false});
  stream=canvas.captureStream(30);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000,audioBitsPerSecond:192000});
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  let done=new Promise((ok,no)=>{rec.onstop=ok;rec.onerror=e=>no(e.error||Error('Błąd MediaRecorder.'))});
  await v.play();await ctx.resume();const duration=ab.duration,started=performance.now();
  function draw(){if(!rec||rec.state!=='recording')return;try{if(v.readyState>=2)c.drawImage(v,0,0,1920,1080)}catch(e){}raf=requestAnimationFrame(draw)}
  rec.start(1000);draw();src.start();$('#videoStatus').textContent='Eksport zgodnościowy w czasie rzeczywistym…';
  timer=setInterval(()=>{$('#videoBar').style.width=Math.min(99,(performance.now()-started)/(duration*1000)*100)+'%'},500);
  src.onended=()=>{if(timer)clearInterval(timer);if(rec&&rec.state!=='inactive')rec.stop();v.pause()};await done;
  let result=new Blob(chunks,{type:mime});if(!result.size)throw Error('Eksport zwrócił pusty plik.');
  project.videoOutput=result;project.videoSaved=false;await put();$('#videoBar').style.width='100%';
  $('#videoStatus').textContent='Gotowy film MP4 · '+fmt(duration)+' · '+(result.size/1048576).toFixed(1)+' MB · tryb zgodnościowy.';
  $('#downloadVideo').classList.remove('hidden');renderOutputs();
 }finally{if(timer)clearInterval(timer);cancelAnimationFrame(raf);if(rec&&rec.state!=='inactive'){try{rec.stop()}catch{}}if(stream)stream.getTracks().forEach(t=>t.stop());if(ctx)try{await ctx.close()}catch{}if(v.src)URL.revokeObjectURL(v.src);v.remove()}
}
async function makeVideoFast(fileHandle){
 const M=await loadMediabunny();
 const {Input,BlobSource,ALL_FORMATS,AudioBufferSink,AudioBufferSource,CanvasSink,CanvasSource,Output,Mp4OutputFormat,StreamTarget,BufferTarget,Quality}=M;
 const duration=project.audioDuration||await (async()=>{const a=new AudioContext();try{return (await a.decodeAudioData(await project.audioOutput.arrayBuffer())).duration}finally{await a.close()}})();
 const useStream=!!fileHandle;
 if(!useStream&&duration>300)throw Error('Ten telefon nie udostępnia bezpośredniego zapisu dużych plików. Dla mixów dłuższych niż 5 minut szybki eksport wymaga Chrome z opcją „Zapisz jako”.');
 let writable=null,output=null;
 try{
  const target=useStream?(writable=await fileHandle.createWritable(),new StreamTarget(writable,{chunked:true,chunkSize:4*1024*1024})):new BufferTarget();
  output=new Output({format:new Mp4OutputFormat(),target});
  const input=new Input({formats:ALL_FORMATS,source:new BlobSource(project.animation)});
  const vTrack=await input.getPrimaryVideoTrack();if(!vTrack)throw Error('Animacja nie zawiera ścieżki wideo.');
  const animDuration=await vTrack.computeDuration();if(!animDuration||!Number.isFinite(animDuration))throw Error('Nie udało się odczytać czasu animacji.');
  const aInput=new Input({formats:ALL_FORMATS,source:new BlobSource(project.audioOutput)});
  const aTrack=await aInput.getPrimaryAudioTrack();if(!aTrack)throw Error('Gotowy mix nie zawiera ścieżki audio.');
  const aSink=new AudioBufferSink(aTrack),aSource=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:192000})});
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
  const c=canvas.getContext('2d',{alpha:false});if(!c)throw Error('Nie można utworzyć płótna Full HD.');
  const vSink=new CanvasSink(vTrack,{width:1920,height:1080,fit:'fill',poolSize:1});
  const vSource=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:6000000}),hardwareAcceleration:'prefer-hardware',latencyMode:'quality',keyFrameInterval:2});
  output.addVideoTrack(vSource,{frameRate:30});output.addAudioTrack(aSource);
  await output.start();
  // Add compressed AAC audio before video so the muxer does not retain a long video track in memory.
  let audioSeconds=0;
  for await(const item of aSink.buffers()){
   await aSource.add(item.buffer);audioSeconds+=item.duration||item.buffer.duration;
   $('#videoBar').style.width=Math.min(12,12*audioSeconds/duration)+'%';
  }
  aSource.close();
  const frames=Math.ceil(duration*30);let done=0;
  const timestamps=(async function*(){for(let i=0;i<frames;i++)yield (i/30)%animDuration})();
  for await(const item of vSink.canvasesAtTimestamps(timestamps)){
   if(!item)continue;c.drawImage(item.canvas,0,0,1920,1080);
   await vSource.add(done/30,Math.min(1/30,duration-done/30));done++;
   if(done%15===0){$('#videoBar').style.width=(12+85*done/frames)+'%';$('#videoStatus').textContent='Szybki eksport WebCodecs · '+fmt(done/30)+' / '+fmt(duration)+' · '+Math.round(done/frames*100)+'%';await new Promise(r=>setTimeout(r,0))}
  }
  vSource.close();await output.finalize();
  if(useStream){project.videoOutput=null;project.videoSaved=true;await put();$('#videoBar').style.width='100%';$('#videoStatus').textContent='Gotowy film MP4 zapisany bezpośrednio w wybranym miejscu · '+fmt(duration)+'.';$('#downloadVideo').classList.add('hidden');renderOutputs()}
  else{const result=new Blob([target.buffer],{type:'video/mp4'});if(!result.size)throw Error('Eksport zwrócił pusty plik.');project.videoOutput=result;project.videoSaved=false;await put();$('#videoBar').style.width='100%';$('#videoStatus').textContent='Gotowy film MP4 · '+fmt(duration)+' · '+(result.size/1048576).toFixed(1)+' MB · szybki eksport.';$('#downloadVideo').classList.remove('hidden');renderOutputs()}
 }catch(err){if(output&&output.state!=='finalized'&&output.state!=='canceled'){try{await output.cancel()}catch{}}throw err}
}
function supportedMp4(){return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1.42E01E','video/mp4'].find(x=>window.MediaRecorder?.isTypeSupported(x))}
$('#makeVideo').onclick=async()=>{
 if(!project?.audioOutput||!project.animation){$('#videoStatus').textContent='Najpierw utwórz MP3 i dodaj animację.';return}
 const btn=$('#makeVideo');btn.disabled=true;$('#videoBar').style.width='0%';
 try{
  let handle=null;
  if('showSaveFilePicker'in window){handle=await window.showSaveFilePicker({suggestedName:(project.name||'VIXARIA mix').replace(/[^\w .-]/g,'_')+'.mp4',types:[{description:'Film MP4',accept:{'video/mp4':['.mp4']}}]})}
  $('#videoStatus').textContent='Przygotowuję szybki eksport…';
  try{await makeVideoFast(handle)}catch(fastErr){
   if(fastErr?.name==='AbortError')throw fastErr;
   if(handle)throw fastErr;
   if((project.audioDuration||0)>300)throw fastErr;
   $('#videoStatus').textContent='Szybki silnik niedostępny na tym urządzeniu. Uruchamiam tryb zgodnościowy…';
   await makeVideoLegacy();
  }
 }catch(e){$('#videoStatus').textContent=e?.name==='AbortError'?'Anulowano wybór miejsca zapisu.':('Eksport przerwany: '+(e?.message||String(e))+'. Projekt i pliki źródłowe zachowano.')}
 finally{btn.disabled=false}
};

async function renderOutputs(){let box=$("#outputs");box.innerHTML="";if(project?.audioOutput){let b=document.createElement("button");b.className="secondary";b.textContent="Pobierz MP3";b.onclick=()=>downloadAndClear("audioOutput",project.name+".mp3");box.append(b)}if(project?.videoOutput){let b=document.createElement("button");b.className="secondary";b.textContent="Pobierz MP4";b.onclick=()=>downloadAndClear("videoOutput",project.name+".mp4");box.append(b)}if(!box.children.length)box.textContent="Brak gotowych plików."}
function downloadAndClear(key,name){
 let blob=project?.[key];if(!blob)return;
 let a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name.replace(/[^\w .-]/g,"_");a.click();
 setTimeout(async()=>{
  URL.revokeObjectURL(u);
  if(key==="audioOutput"){
   project.audioDownloaded=true;
   if(project.videoOutput)project.audioOutput=null;
  }else if(key==="videoOutput"){
   project.videoDownloaded=true;
   if(project.audioDownloaded)project.audioOutput=null;
   project.videoOutput=null;
  }
  await put();renderOutputs();
 },5000);
}
$("#downloadAudio").onclick=()=>downloadAndClear("audioOutput",project.name+".mp3");$("#downloadVideo").onclick=()=>downloadAndClear("videoOutput",project.name+".mp4");
async function init(){db=await openDB();let ps=await allProjects();if(ps.length)await loadProject(ps.sort((a,b)=>b.updated-a.updated)[0]);else newProject();await renderProjects()}
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));init().catch(e=>alert("Błąd pamięci lokalnej: "+e.message));