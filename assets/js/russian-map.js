/* Russian labels from OpenFreeMap / OpenStreetMap, loaded only with the map. */
(()=>{
'use strict';
const assetBase=new URL('../vendor/',document.currentScript.src);
let libraries;
const resources=new Map();
function resource(tag,url){
 const key=String(url);if(resources.has(key))return resources.get(key);
 const task=new Promise((resolve,reject)=>{
  const node=document.createElement(tag);if(tag==='script'){node.src=key;node.async=true;}else{node.rel='stylesheet';node.href=key;}
  const timeout=setTimeout(()=>finish(new Error('Загрузка библиотеки карты заняла слишком много времени.')),15000);
  function finish(error){clearTimeout(timeout);node.onload=null;node.onerror=null;if(error){node.remove();reject(error);}else resolve();}
  node.onload=()=>finish();node.onerror=()=>finish(new Error('Не удалось загрузить библиотеку карты.'));document.head.append(node);
 }).catch(error=>{resources.delete(key);throw error;});
 resources.set(key,task);return task;
}
function loadLeaflet(){return Promise.all([resource('link',new URL('../css/leaflet.css',assetBase)),resource('script',new URL('../js/leaflet.js',assetBase))]);}
function loadLibraries(){
 if(!libraries)libraries=(async()=>{
  await Promise.all([resource('link',new URL('maplibre-gl.css',assetBase)),resource('script',new URL('maplibre-gl.js',assetBase))]);
  await resource('script',new URL('leaflet-maplibre-gl.js',assetBase));
 })().catch(error=>{libraries=null;throw error;});
 return libraries;
}
function russianStyle(style){
 for(const layer of style.layers){
  const text=layer.layout?.['text-field'];
  // Keep road numbers, elevations and other non-name labels as supplied.
  if(text&&JSON.stringify(text).includes('name'))layer.layout['text-field']=['coalesce',['get','name:ru'],['get','name']];
 }
 return style;
}
async function addTo(map){
 const [_,response]=await Promise.all([loadLibraries(),fetch('https://tiles.openfreemap.org/styles/liberty',{signal:AbortSignal.timeout(20000)})]);
 if(!response.ok)throw new Error('Картографический сервис временно недоступен.');
 const style=russianStyle(await response.json());
 const layer=L.maplibreGL({style,interactive:false,attributionControl:false}).addTo(map);
 const gl=layer.getMaplibreMap();
 try{
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{gl.off('load',ready);reject(new Error('Не удалось загрузить подложку карты вовремя.'));},25000);
   function ready(){clearTimeout(timeout);resolve();}
   gl.once('load',ready);
  });
 }catch(error){map.removeLayer(layer);throw error;}
 map.attributionControl.addAttribution('<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>');
 return gl;
}
window.BaltikaRussianMap={addTo,loadLeaflet};
})();
