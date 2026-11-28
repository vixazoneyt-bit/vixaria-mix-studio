const $=s=>document.querySelector(s);let appReady;
const DB="vixaria-studio-db",STORE="projects";let db,project=null,mp3Blob=null,videoBlob=null,animURL=null,imageURL=null,audioCtx=null,projectNameSaveTimer=null;const deletedProjectIds=new Set();
const req=(r)=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"id"});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function allProjects(){return req(db.transaction(STORE).objectStore(STORE).getAll())}
function updateStepChecks(){if(!project)return;const d=[!!project.tracks?.length,!!project.audioOutput||!!project.audioDownloaded,!!(project.animation||project.stillImage),!!project.videoOutput||!!project.videoSaved||!!project.videoDownloaded];d.forEach((v,i)=>{const el=$("#step"+(i+1)+"Check");if(el)el.classList.toggle("done",v)})}
async function put(){if(!project||deletedProjectIds.has(project.id))return;const savedProject=project;savedProject.updated=Date.now();await req(db.transaction(STORE,"readwrite").objectStore(STORE).put(savedProject));if(project!==savedProject||deletedProjectIds.has(savedProject.id))return;renderProjects();updateStepChecks();$("#projectStatus").textContent="Zapisano automatycznie · "+new Date().toLocaleTimeString()}
async function loadProject(p){clearProjectMediaUI();project=p;$("#projectName").value=p.name;$("#fade").value=p.fade??8;$("#fadeVal").textContent=$("#fade").value;project.normalize=true;project.bitrate=320;renderTracks();renderOutputs();updateStepChecks();if(p.animation){setVideoPreview(p.animation)}else if(p.stillImage){setImagePreview(p.stillImage)}renderProjects()}
function clearProjectMediaUI(){if(animURL){URL.revokeObjectURL(animURL);animURL=null}if(imageURL){URL.revokeObjectURL(imageURL);imageURL=null}["audioFiles","readyMixFile","videoFile","imageFile"].forEach(id=>{const el=$("#"+id);if(el)el.value=""});const v=$("#preview");v.pause();v.removeAttribute("src");v.load();v.classList.add("hidden");const im=$("#imagePreview");im.removeAttribute("src");im.classList.add("hidden");$("#videoInfo").textContent="Nie dodano animacji ani obrazu.";}
function resetProjectView(){
 if(projectNameSaveTimer){clearTimeout(projectNameSaveTimer);projectNameSaveTimer=null}
 if(animURL){URL.revokeObjectURL(animURL);animURL=null}if(imageURL){URL.revokeObjectURL(imageURL);imageURL=null}
 mp3Blob=null;videoBlob=null;project=null;
 ["audioFiles","videoFile","imageFile"].forEach(id=>{const el=$("#"+id);if(el)el.value=""});
 const v=$("#preview");v.pause();v.removeAttribute("src");v.load();v.classList.add("hidden");
 const im=$("#imagePreview");im.removeAttribute("src");im.classList.add("hidden");
 $("#projectName").value="";$("#fade").value=8;$("#fadeVal").textContent="8";
 $("#tracks").textContent="Brak utworów w projekcie.";
 $("#duration").textContent="—";$("#makeAudio").disabled=true;$("#audioBar").style.width="0%";$("#audioProgressLabel").textContent="Gotowy do eksportu MP3";
 
 $("#downloadAudio").classList.add("hidden");$("#downloadAudio").disabled=true;
 $("#videoInfo").textContent="Nie dodano animacji ani obrazu.";
 $("#makeVideo").disabled=true;$("#videoBar").style.width="0%";$("#videoStatus").textContent="Najpierw utwórz mix MP3 i dodaj animację.";
 $("#downloadVideo").classList.add("hidden");$("#downloadVideo").disabled=true;
 $("#videoTimerActual").textContent="00:00";$("#videoTimerEstimate").textContent="—";stopVideoClock();
 [1,2,3,4].forEach(i=>$("#step"+i+"Check")?.classList.remove("done"));
 $("#projectStatus").textContent="Projekt usunięty.";
}
async function renderProjects(){let ps=await allProjects();$("#projects").innerHTML="";ps.sort((a,b)=>b.updated-a.updated).forEach(p=>{let d=document.createElement("div");d.className="project row between";let label=document.createElement("button");label.className="ghost";label.textContent=p.name+" · "+(p.tracks?.length||0)+" utworów";label.onclick=()=>loadProject(p);let del=document.createElement("button");del.className="secondary";del.textContent="Usuń";del.onclick=async()=>{if(confirm("Usunąć projekt wraz z zapisanymi plikami źródłowymi?")){const wasActive=project?.id===p.id;deletedProjectIds.add(p.id);if(wasActive&&projectNameSaveTimer){clearTimeout(projectNameSaveTimer);projectNameSaveTimer=null}const tx=db.transaction(STORE,"readwrite");const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("Nie udało się usunąć projektu."))});tx.objectStore(STORE).delete(p.id);await done;if(wasActive)resetProjectView();const remaining=await allProjects();if(wasActive&&remaining.length){remaining.sort((x,y)=>y.updated-x.updated);await loadProject(remaining[0])}else{await renderProjects()}}};d.append(label,del);$("#projects").append(d)})}
function newProject(){resetProjectView();project={id:crypto.randomUUID(),name:"Nowy mix",tracks:[],fade:8,normalize:true,bitrate:320,animation:null,stillImage:null,audioOutput:null,videoOutput:null,audioDownloaded:false,videoSaved:false,videoDownloaded:false};$("#projectName").value=project.name;$("#projectStatus").textContent="Utworzono nowy projekt.";put();renderTracks();renderOutputs();updateStepChecks()}
$("#newProject").onclick=newProject;
function commitProjectName(){if(!project)return;const value=$("#projectName").value.trim();project.name=value||"Nowy mix";$("#projectName").value=project.name;if(projectNameSaveTimer){clearTimeout(projectNameSaveTimer);projectNameSaveTimer=null}put()}
$("#projectName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commitProjectName();$("#projectName").blur()}});
$("#projectName").addEventListener("change",()=>{if(!project)return;$("#projectName").value=project.name||"Nowy mix"});
function fmt(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`}
let videoRenderStarted=0,videoTimerInterval=null;
function fmtClock(s){s=Math.max(0,Math.floor(s||0));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function startVideoClock(){videoRenderStarted=performance.now();clearInterval(videoTimerInterval);$('#videoTimerActual').textContent='00:00';$('#videoTimerEstimate').textContent='Obliczanie…';videoTimerInterval=setInterval(updateVideoClock,500)}
function updateVideoClock(){if(!videoRenderStarted)return;const elapsed=(performance.now()-videoRenderStarted)/1000;$('#videoTimerActual').textContent=fmtClock(elapsed);const pct=parseFloat($('#videoBar').style.width)||0;if(pct>=2&&pct<100){const remaining=elapsed*(100-pct)/pct;$('#videoTimerEstimate').textContent='około '+fmtClock(remaining)}else if(pct>=100){$('#videoTimerEstimate').textContent='Gotowe'}}
function stopVideoClock(){if(videoRenderStarted){updateVideoClock();$('#videoTimerEstimate').textContent='Zakończono · '+$('#videoTimerActual').textContent;videoRenderStarted=0}clearInterval(videoTimerInterval);videoTimerInterval=null}
function renderTracks(){let box=$("#tracks");box.innerHTML="";if(!project?.tracks?.length){box.textContent="Brak utworów w projekcie."}else project.tracks.forEach((t,i)=>{let d=document.createElement("div");d.className="track";let n=document.createElement("span");n.className="muted";n.textContent=String(i+1).padStart(2,"0");let info=document.createElement("div");let nm=document.createElement("div");nm.className="trackname";nm.textContent=t.name;let mt=document.createElement("div");mt.className="trackmeta";mt.textContent=t.duration?fmt(t.duration):"Czas odczytany podczas eksportu · plik zapisany";info.append(nm,mt);let acts=document.createElement("div");acts.className="row";[["↑",-1],["↓",1],["×",0]].forEach(([s,dir])=>{let b=document.createElement("button");b.className="secondary";b.textContent=s;b.onclick=async()=>{if(dir===0)project.tracks.splice(i,1);else{let j=i+dir;if(j<0||j>=project.tracks.length)return;[project.tracks[i],project.tracks[j]]=[project.tracks[j],project.tracks[i]]}project.audioOutput=null;renderTracks();await put()};acts.append(b)});d.append(n,info,acts);box.append(d)});
let total=(project?.tracks||[]).reduce((a,t)=>a+(t.duration||0),0)-Math.max(0,(project?.tracks?.length||0)-1)*(+$("#fade").value||0);$("#duration").textContent=project?.tracks?.length?fmt(Math.max(0,total)):(project?.audioOutput?fmt(project.audioDuration||0):"—");$("#makeAudio").disabled=!(project?.tracks?.length)}
async function saveSettings(){if(!project)return;project.fade=+$("#fade").value;project.normalize=true;project.bitrate=320;project.audioOutput=null;await put();renderTracks()}
$("#fade").oninput=()=>{$("#fadeVal").textContent=$("#fade").value;renderTracks()};$("#fade").addEventListener("change",saveSettings);
async function readDuration(file){
 return await new Promise(resolve=>{
  const a=new Audio(),u=URL.createObjectURL(file);let settled=false;
  const finish=v=>{if(settled)return;settled=true;URL.revokeObjectURL(u);a.removeAttribute("src");resolve(Number.isFinite(v)?v:0)};
  a.preload="metadata";a.onloadedmetadata=()=>finish(a.duration);a.onerror=()=>finish(0);
  a.src=u;setTimeout(()=>finish(0),12000);
 });
}
$("#readyMixFile").addEventListener("change",async e=>{
 const file=e.target.files?.[0];e.target.value="";
 if(!file)return;
 if(!(file.type==="audio/mpeg"||/\\.mp3$/i.test(file.name))){alert("Wybierz gotowy mix w formacie MP3.");return}
 if(!project)newProject();
 const duration=await readDuration(file);
 project.tracks=[];
 project.audioOutput=file;
 project.audioDuration=duration;
 project.audioDownloaded=false;
 project.videoOutput=null;
 project.videoSaved=false;
 mp3Blob=file;
 await put();
 renderTracks();
 await renderOutputs();
 
 $("#makeVideo").disabled=!(project.animation||project.stillImage);
 $("#projectStatus").textContent="Gotowy mix dodany do projektu.";
});
$("#audioFiles").addEventListener("change",async e=>{
 const input=e.currentTarget;
 const chosen=Array.from(input.files||[]);
 if(!chosen.length)return;
 input.value="";
 // Wait for IndexedDB initialization before creating or saving the first project.
 try{await appReady}catch(err){alert("Nie udało się uruchomić pamięci projektów. Odśwież aplikację i spróbuj ponownie.");return}
 // Create the project directly here to avoid racing the asynchronous newProject() save.
 if(!project){
  project={id:crypto.randomUUID(),name:"Nowy mix",tracks:[],fade:8,normalize:true,bitrate:320,animation:null,stillImage:null,audioOutput:null,videoOutput:null,audioDownloaded:false,videoSaved:false,videoDownloaded:false};
  $("#projectName").value=project.name;
  $("#fade").value=8;$("#fadeVal").textContent="8";
 }
 const activeProject=project;
 const added=chosen.map(file=>({name:file.name,file,duration:0}));
 activeProject.tracks.push(...added);
 activeProject.audioOutput=null;activeProject.audioDownloaded=false;activeProject.videoOutput=null;activeProject.videoSaved=false;
 // Show selected tracks immediately, before reading metadata or saving to IndexedDB.
 renderTracks();updateStepChecks();
 await put();
 // Read durations against the actual track objects, not array positions that may change.
 await Promise.all(added.map(async track=>{
  try{track.duration=await readDuration(track.file)}catch(err){track.duration=0}
 }));
 if(project===activeProject){renderTracks();await put()}
});

function peak(buf){let m=0;for(let c=0;c<buf.numberOfChannels;c++){let a=buf.getChannelData(c);for(let i=0;i<a.length;i+=128)m=Math.max(m,Math.abs(a[i]))}return m||1}
$("#makeAudio").onclick=async()=>{
 const btn=$("#makeAudio");btn.disabled=true;$("#audioBar").style.width="1%";$("#audioProgressLabel").textContent="Przygotowywanie eksportu MP3 · 1%";
 let worker=null;
 try{
  if(!audioCtx)audioCtx=new AudioContext();
  const tracks=project.tracks;
  const decoded=await Promise.all(tracks.map(async(track,i)=>{
   const pct=2+18*i/tracks.length;
   $("#audioBar").style.width=pct+"%";$("#audioProgressLabel").textContent="Odczytywanie utworów · "+Math.round(pct)+"%";
   return audioCtx.decodeAudioData(await track.file.arrayBuffer());
  }));
  $("#audioBar").style.width="22%";$("#audioProgressLabel").textContent="Przygotowywanie ścieżek do miksowania · 22%";
  const sr=decoded[0].sampleRate,fade=+project.fade||0,transfer=[],payload=decoded.map((b,i)=>{
   const left=b.getChannelData(0),right=b.numberOfChannels>1?b.getChannelData(1):left;
   const gain=Math.min(2,.88/peak(b));
   if(!transfer.includes(left.buffer))transfer.push(left.buffer);
   if(!transfer.includes(right.buffer))transfer.push(right.buffer);
   return {left:left.buffer,right:right.buffer,length:b.length,duration:b.duration,gain,fade};
  });
  decoded.length=0;
  worker=new Worker("./mp3-worker.js");
  const result=await new Promise((resolve,reject)=>{
   worker.onmessage=e=>{
    const d=e.data;
    if(d.type==="mix-progress"){$("#audioBar").style.width=d.percent+"%";$("#audioProgressLabel").textContent="Łączenie utworów i crossfade · "+d.percent+"%"}
    else if(d.type==="encode-progress"){$("#audioBar").style.width=d.percent+"%";$("#audioProgressLabel").textContent="Kodowanie MP3 · "+d.percent+"%"}
    else if(d.type==="done")resolve(d);
    else if(d.type==="error")reject(new Error(d.message));
   };
   worker.onerror=e=>reject(new Error(e.message||"Nie udało się uruchomić szybkiego kodowania MP3."));
   worker.postMessage({tracks:payload,sampleRate:sr,bitrate:320},transfer);
  });
  worker.terminate();worker=null;
  mp3Blob=new Blob([result.buffer],{type:"audio/mpeg"});project.audioOutput=mp3Blob;project.audioDuration=result.duration;
  await put();$("#audioBar").style.width="100%";$("#audioProgressLabel").textContent="Gotowy mix MP3 · 100%";
  $("#downloadAudio").classList.remove("hidden");renderOutputs();
 }catch(e){$("#audioProgressLabel").textContent="Błąd eksportu MP3: "+(e?.message||"spróbuj ponownie");}
 finally{if(worker)worker.terminate();btn.disabled=false}
};
function setVideoPreview(file){if(animURL)URL.revokeObjectURL(animURL);animURL=URL.createObjectURL(file);let v=$("#preview");v.src=animURL;v.classList.remove("hidden");$("#imagePreview").classList.add("hidden");$("#videoInfo").textContent=file.name+" · animacja zapisana w projekcie";$("#makeVideo").disabled=!project?.audioOutput}
function setImagePreview(file){if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);let im=$("#imagePreview");im.src=imageURL;im.classList.remove("hidden");$("#preview").classList.add("hidden");$("#videoInfo").textContent=file.name+" · obraz zapisany w projekcie (będzie widoczny przez cały film)";$("#makeVideo").disabled=!project?.audioOutput}
$("#videoFile").onchange=async e=>{if(!project)newProject();let f=e.target.files[0];if(!f)return;project.animation=f;project.stillImage=null;project.videoOutput=null;project.videoSaved=false;await put();setVideoPreview(f);e.target.value=""};
$("#imageFile").onchange=async e=>{if(!project)newProject();let f=e.target.files[0];if(!f)return;if(!f.type.startsWith("image/")){alert("Wybierz plik JPG, PNG lub WEBP.");e.target.value="";return}project.stillImage=f;project.animation=null;project.videoOutput=null;project.videoSaved=false;await put();setImagePreview(f);e.target.value=""};

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
  const still=!!project.stillImage;let stillImg=null;if(still){stillImg=new Image();stillImg.src=URL.createObjectURL(project.stillImage);await new Promise((ok,no)=>{stillImg.onload=ok;stillImg.onerror=()=>no(Error('Nie udało się odczytać obrazu.'))})}else{v.src=URL.createObjectURL(project.animation);v.muted=true;v.loop=true;v.playsInline=true;v.preload='auto';await new Promise((ok,no)=>{v.onloadedmetadata=ok;v.onerror=()=>no(Error('Nie udało się odczytać animacji MP4.'))})}
  ctx=new AudioContext();let ab=await ctx.decodeAudioData(await project.audioOutput.arrayBuffer());
  src=ctx.createBufferSource();src.buffer=ab;let dest=ctx.createMediaStreamDestination();src.connect(dest);
  let canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;let c=canvas.getContext('2d',{alpha:false});
  stream=canvas.captureStream(24);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
  rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4000000,audioBitsPerSecond:192000});
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  let done=new Promise((ok,no)=>{rec.onstop=ok;rec.onerror=e=>no(e.error||Error('Błąd MediaRecorder.'))});
  await v.play();await ctx.resume();const duration=ab.duration,started=performance.now();
  function draw(){if(!rec||rec.state!=='recording')return;try{if(still&&stillImg)c.drawImage(stillImg,0,0,1920,1080);else if(v.readyState>=2)c.drawImage(v,0,0,1920,1080)}catch(e){}raf=requestAnimationFrame(draw)}
  rec.start(1000);draw();src.start();$('#videoStatus').textContent=(still?'Eksport obrazu w czasie rzeczywistym…':'Eksport zgodnościowy w czasie rzeczywistym…');
  timer=setInterval(()=>{$('#videoBar').style.width=Math.min(99,(performance.now()-started)/(duration*1000)*100)+'%'},500);
  src.onended=()=>{if(timer)clearInterval(timer);if(rec&&rec.state!=='inactive')rec.stop();v.pause()};await done;
  let result=new Blob(chunks,{type:mime});if(!result.size)throw Error('Eksport zwrócił pusty plik.');
  project.videoOutput=result;project.videoSaved=false;await put();$('#videoBar').style.width='100%';
  $('#videoStatus').textContent='Gotowy film MP4 · '+fmt(duration)+' · '+(result.size/1048576).toFixed(1)+' MB · tryb zgodnościowy'+(still?' · obraz statyczny':'')+'.';
  $('#downloadVideo').classList.remove('hidden');renderOutputs();
 }finally{if(timer)clearInterval(timer);cancelAnimationFrame(raf);if(rec&&rec.state!=='inactive'){try{rec.stop()}catch{}}if(stream)stream.getTracks().forEach(t=>t.stop());if(ctx)try{await ctx.close()}catch{}if(v.src)URL.revokeObjectURL(v.src);if(stillImg?.src)URL.revokeObjectURL(stillImg.src);v.remove()}
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
  const isStill=!!project.stillImage;
  let vTrack=null,animDuration=0,stillBitmap=null,vSink=null;
  if(isStill){stillBitmap=await createImageBitmap(project.stillImage)}
  else{const input=new Input({formats:ALL_FORMATS,source:new BlobSource(project.animation)});vTrack=await input.getPrimaryVideoTrack();if(!vTrack)throw Error('Animacja nie zawiera ścieżki wideo.');animDuration=await vTrack.computeDuration();if(!animDuration||!Number.isFinite(animDuration))throw Error('Nie udało się odczytać czasu animacji.');}
  const aInput=new Input({formats:ALL_FORMATS,source:new BlobSource(project.audioOutput)});
  const aTrack=await aInput.getPrimaryAudioTrack();if(!aTrack)throw Error('Gotowy mix nie zawiera ścieżki audio.');
  const aSink=new AudioBufferSink(aTrack),aSource=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:192000})});
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
  const c=canvas.getContext('2d',{alpha:false});if(!c)throw Error('Nie można utworzyć płótna Full HD.');
  if(!isStill)vSink=new CanvasSink(vTrack,{width:1920,height:1080,fit:'fill',poolSize:1});
  const outputFps=24;
  const vSource=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate:4000000}),hardwareAcceleration:'prefer-hardware',latencyMode:'quality',keyFrameInterval:2});
  output.addVideoTrack(vSource,{frameRate:outputFps});output.addAudioTrack(aSource);
  await output.start();
  // Add compressed AAC audio before video so the muxer does not retain a long video track in memory.
  let audioSeconds=0;
  
  for await(const item of aSink.buffers()){
   const buf=item.buffer;await aSource.add(buf);
   audioSeconds+=item.duration||buf.duration;
   $('#videoBar').style.width=Math.min(12,12*audioSeconds/duration)+'%';
  }
  aSource.close();
  const frames=Math.ceil(duration*outputFps);let done=0;
  if(isStill){
   const baseScale=Math.max(1920/stillBitmap.width,1080/stillBitmap.height),w=stillBitmap.width*baseScale,h=stillBitmap.height*baseScale;
   for(let i=0;i<frames;i++){
    const t=i/outputFps;c.fillStyle='#08060b';c.fillRect(0,0,1920,1080);c.drawImage(stillBitmap,(1920-w)/2,(1080-h)/2,w,h);
    await vSource.add(t,Math.min(1/outputFps,duration-t));done++;
    if(done%15===0){$('#videoBar').style.width=(12+85*done/frames)+'%';$('#videoStatus').textContent='Szybki eksport WebCodecs · '+fmt(done/outputFps)+' / '+fmt(duration)+' · '+Math.round(done/frames*100)+'%';await new Promise(r=>setTimeout(r,0))}
   }
   stillBitmap.close();
  }else{
   const timestamps=(async function*(){for(let i=0;i<frames;i++)yield (i/outputFps)%animDuration})();
   for await(const item of vSink.canvasesAtTimestamps(timestamps)){
    if(!item)continue;c.drawImage(item.canvas,0,0,1920,1080);await vSource.add(done/outputFps,Math.min(1/outputFps,duration-done/outputFps));done++;
    if(done%15===0){$('#videoBar').style.width=(12+85*done/frames)+'%';$('#videoStatus').textContent='Szybki eksport WebCodecs · '+fmt(done/30)+' / '+fmt(duration)+' · '+Math.round(done/frames*100)+'%';await new Promise(r=>setTimeout(r,0))}
   }
  }
  vSource.close();await output.finalize();
  if(useStream){project.videoOutput=null;project.videoSaved=true;await put();$('#videoBar').style.width='100%';$('#videoStatus').textContent='Gotowy film MP4 zapisany bezpośrednio w wybranym miejscu · '+fmt(duration)+'.';$('#downloadVideo').classList.add('hidden');renderOutputs()}
  else{const result=new Blob([target.buffer],{type:'video/mp4'});if(!result.size)throw Error('Eksport zwrócił pusty plik.');project.videoOutput=result;project.videoSaved=false;await put();$('#videoBar').style.width='100%';$('#videoStatus').textContent='Gotowy film MP4 · '+fmt(duration)+' · '+(result.size/1048576).toFixed(1)+' MB · szybki eksport'+(isStill+'').replace('true',' · obraz statyczny').replace('false','')+'.';$('#downloadVideo').classList.remove('hidden');renderOutputs()}
 }catch(err){if(output&&output.state!=='finalized'&&output.state!=='canceled'){try{await output.cancel()}catch{}}throw err}
}
function supportedMp4(){return ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1.42E01E','video/mp4'].find(x=>window.MediaRecorder?.isTypeSupported(x))}
$('#makeVideo').onclick=async()=>{
 if(!project?.audioOutput||(!project.animation&&!project.stillImage)){$('#videoStatus').textContent='Najpierw utwórz MP3 i dodaj animację albo gotowy obraz.';return}
 const btn=$('#makeVideo');btn.disabled=true;$('#videoBar').style.width='0%';
 try{
  let handle=null;
  if('showSaveFilePicker'in window){handle=await window.showSaveFilePicker({suggestedName:(project.name||'VIXARIA mix').replace(/[^\w .-]/g,'_')+'.mp4',types:[{description:'Film MP4',accept:{'video/mp4':['.mp4']}}]})}
  startVideoClock();$('#videoStatus').textContent='Przygotowuję szybki eksport…';
  try{await makeVideoFast(handle)}catch(fastErr){
   if(fastErr?.name==='AbortError')throw fastErr;
   if(handle)throw fastErr;
   if((project.audioDuration||0)>300)throw fastErr;
   $('#videoStatus').textContent='Szybki silnik niedostępny na tym urządzeniu. Uruchamiam tryb zgodnościowy…';
   await makeVideoLegacy();
  }
 }catch(e){$('#videoStatus').textContent=e?.name==='AbortError'?'Anulowano wybór miejsca zapisu.':('Eksport przerwany: '+(e?.message||String(e))+'. Projekt i pliki źródłowe zachowano.')}
 finally{stopVideoClock();btn.disabled=false}
};

async function renderOutputs(){const audioReady=!!project?.audioOutput&&!project?.audioDownloaded;$("#downloadAudio").classList.toggle("hidden",!audioReady);$("#downloadAudio").disabled=!audioReady;const videoReady=!!project?.videoOutput&&!project?.videoDownloaded;$("#downloadVideo").classList.toggle("hidden",!videoReady);$("#downloadVideo").disabled=!videoReady;}
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
async function init(){db=await openDB();let ps=await allProjects();if(ps.length)await loadProject(ps.sort((a,b)=>b.updated-a.updated)[0]);else resetProjectView();await renderProjects()}
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));appReady=init().catch(e=>{alert("Błąd pamięci lokalnej: "+e.message);throw e});