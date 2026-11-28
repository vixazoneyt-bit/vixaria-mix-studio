importScripts("https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js");
self.onmessage=function(event){
 const {tracks,sampleRate,bitrate}=event.data;
 try{
  const fades=tracks.slice(1).map((t,i)=>Math.round(Math.min(t.fade,tracks[i].duration/2,t.duration/2)*sampleRate));
  const starts=[0];
  for(let i=1;i<tracks.length;i++)starts[i]=starts[i-1]+tracks[i-1].length-fades[i-1];
  const total=starts[starts.length-1]+tracks[tracks.length-1].length;
  const left=new Float32Array(total),right=new Float32Array(total);
  for(let i=0;i<tracks.length;i++){
   const t=tracks[i],l=new Float32Array(t.left),r=new Float32Array(t.right),start=starts[i],gain=t.gain,fadeIn=i>0?fades[i-1]:0,fadeOut=i<tracks.length-1?fades[i]:0;
   for(let k=0;k<t.length;k++){
    let g=gain;
    if(fadeIn&&k<fadeIn)g*=Math.sin(k/fadeIn*Math.PI/2);
    if(fadeOut&&k>t.length-fadeOut)g*=Math.cos((k-(t.length-fadeOut))/fadeOut*Math.PI/2);
    left[start+k]+=l[k]*g;right[start+k]+=r[k]*g;
   }
   self.postMessage({type:"mix-progress",percent:Math.round(22+28*(i+1)/tracks.length)});
  }
  const encoder=new lamejs.Mp3Encoder(2,sampleRate,bitrate),chunks=[],block=1152;
  for(let i=0;i<total;i+=block){
   const n=Math.min(block,total-i),l=new Int16Array(n),r=new Int16Array(n);
   for(let j=0;j<n;j++){
    l[j]=Math.max(-32768,Math.min(32767,left[i+j]*32767));
    r[j]=Math.max(-32768,Math.min(32767,right[i+j]*32767));
   }
   const out=encoder.encodeBuffer(l,r);if(out.length)chunks.push(new Uint8Array(out));
   if(i%(block*100)===0)self.postMessage({type:"encode-progress",percent:Math.round(52+45*i/total)});
  }
  const end=encoder.flush();if(end.length)chunks.push(new Uint8Array(end));
  const size=chunks.reduce((n,c)=>n+c.length,0),result=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length}
  self.postMessage({type:"done",buffer:result.buffer,duration:total/sampleRate},[result.buffer]);
 }catch(error){self.postMessage({type:"error",message:error&&error.message?error.message:String(error)})}
};