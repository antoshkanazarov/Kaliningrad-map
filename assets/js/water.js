/* Water-only displacement: the sky, buildings and camera remain still. */
(function(){
'use strict';
const hero=document.querySelector('.hero');
const photo=document.getElementById('evening-photo');
const canvas=document.getElementById('water-canvas');
const toggle=document.getElementById('water-toggle');
if(!hero||!photo||!canvas||!toggle)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const small=window.matchMedia('(max-width: 700px)');
const connection=navigator.connection;
let wantsMotion=!reduced.matches&&!small.matches&&!(connection&&connection.saveData);
let visible=true,ready=false,failed=false,frame=0,last=0,elapsed=0,gl,program;
let timeUniform,scaleUniform,offsetUniform;
function label(){toggle.setAttribute('aria-pressed',String(wantsMotion));toggle.textContent=wantsMotion?'Ⅱ  Остановить анимацию':'▷  Оживить воду';}
function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;}
function fallback(){failed=true;stop();canvas.hidden=true;toggle.hidden=true;}
function active(){return ready&&wantsMotion&&visible&&!document.hidden&&!failed&&!reduced.matches;}
function tick(now){
 frame=0;if(!active()){last=0;return;}
 if(!last||now-last>=1000/24){if(last)elapsed+=Math.min((now-last)/1000,.1);last=now;gl.uniform1f(timeUniform,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);}
 frame=requestAnimationFrame(tick);
}
function sync(){label();if(ready&&wantsMotion&&!reduced.matches)canvas.hidden=false;if(active()){if(!frame)frame=requestAnimationFrame(tick);}else stop();}
function resize(){
 if(!ready)return;
 const box=hero.getBoundingClientRect();if(!box.width||!box.height)return;
 const factor=Math.min(1.25,1600/box.width);
 canvas.width=Math.max(1,Math.round(box.width*factor));canvas.height=Math.max(1,Math.round(box.height*factor));gl.viewport(0,0,canvas.width,canvas.height);
 const iw=photo.naturalWidth,ih=photo.naturalHeight;
 const cover=Math.max(box.width/iw,box.height/ih);
 const sx=box.width/(iw*cover),sy=box.height/(ih*cover);
 const x=small.matches?.67:.5;
 gl.uniform2f(scaleUniform,sx,sy);gl.uniform2f(offsetUniform,(1-sx)*x,(1-sy)*.5);
 gl.uniform1f(timeUniform,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
}
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader unavailable');return s;}
function init(){
 if(ready||failed||!photo.naturalWidth)return;
 try{
 gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
 if(!gl){fallback();return;}
 const vert=shader(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 v_uv; void main(){v_uv=(position+1.0)*0.5;gl_Position=vec4(position,0.0,1.0);}');
 const frag=shader(gl.FRAGMENT_SHADER,`#ifdef GL_FRAGMENT_PRECISION_HIGH
 precision highp float;
 #else
 precision mediump float;
 #endif
 varying vec2 v_uv; uniform sampler2D picture; uniform vec2 sourceScale; uniform vec2 sourceOffset; uniform float time;
 void main(){
 vec2 uv=v_uv*sourceScale+sourceOffset;
 // Source-space mask: no displacement of buildings, bank or sky.
 float water=smoothstep(0.68,0.77,1.0-uv.y);
 float foreground=smoothstep(0.70,1.0,1.0-uv.y);
 float envelope=water*(0.22+0.78*foreground);
 // Independent directions, scales and speeds break up the uniform wave.
 float broad=sin(uv.y*86.0+uv.x*9.0-time*0.57+0.32*sin(uv.x*19.0+time*0.21));
 float middle=sin(uv.y*173.0-uv.x*16.0+time*0.93);
 float fine=sin(uv.y*319.0+uv.x*29.0-time*1.37);
 float drift=0.82+0.18*sin(uv.x*23.0+uv.y*11.0+time*0.29);
 vec2 displaced=uv;
 displaced.x+=(broad*0.00105+middle*0.00042+fine*0.00016)*envelope*drift;
 displaced.y+=(middle*0.00034+broad*0.00012)*envelope;
 vec3 color=texture2D(picture,clamp(displaced,0.001,0.999)).rgb;
 // Very subtle local glints only on the existing warm reflections.
 float warmth=smoothstep(0.06,0.30,color.r-color.b);
 float light=smoothstep(0.28,0.76,dot(color,vec3(0.299,0.587,0.114)));
 float glint=middle*0.6+fine*0.25+broad*0.15;
 color*=1.0+glint*0.022*warmth*light*envelope;
 gl_FragColor=vec4(color,1.0);
 }`);
 program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Program unavailable');gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 gl.activeTexture(gl.TEXTURE0);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,photo);
 gl.uniform1i(gl.getUniformLocation(program,'picture'),0);
 timeUniform=gl.getUniformLocation(program,'time');scaleUniform=gl.getUniformLocation(program,'sourceScale');offsetUniform=gl.getUniformLocation(program,'sourceOffset');
 ready=true;resize();canvas.hidden=false;sync();
 }catch(e){fallback();}
}
function start(){if(!ready&&wantsMotion)init();sync();}
label();toggle.hidden=reduced.matches;
toggle.addEventListener('click',()=>{wantsMotion=!wantsMotion;start();});
photo.addEventListener('load',start,{once:true});photo.addEventListener('error',fallback,{once:true});
canvas.addEventListener('webglcontextlost',fallback);
document.addEventListener('visibilitychange',sync);
if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(hero);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(hero);else window.addEventListener('resize',resize,{passive:true});
function preference(){toggle.hidden=reduced.matches;if(reduced.matches||small.matches){wantsMotion=false;canvas.hidden=true;}resize();sync();}
if(reduced.addEventListener)reduced.addEventListener('change',preference);
if(small.addEventListener)small.addEventListener('change',preference);
if(photo.complete)start();
})();
