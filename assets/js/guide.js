(() => {
'use strict';
const places=JSON.parse(document.getElementById('places-data').textContent);
const byId=new Map(places.map(p=>[p.id,p]));
const placeURL=id=>{const url=new URL(location.pathname,location.origin);url.hash='place-'+id;return url.href;};
const core=places.filter(p=>p.group!=='extra'),extras=places.filter(p=>p.group==='extra');
const cards=[...document.querySelectorAll('.place-card,.extra-card')];
const search=document.getElementById('search'),filters=[...document.querySelectorAll('[data-filter]')],switches=[...document.querySelectorAll('[data-view]')],modes=[...document.querySelectorAll('[data-map-mode]')];
const cardPanel=document.getElementById('cards-view'),mapPanel=document.getElementById('map-view'),mapList=document.getElementById('map-list'),count=document.getElementById('result-count'),empty=document.getElementById('empty'),status=document.getElementById('map-status'),extraSection=document.getElementById('extra-places');
const reduceMotion=matchMedia('(prefers-reduced-motion:reduce)').matches;
let activeFilter='all',activeInterest='all',activeView='cards',mapMode='main',map=null,selected=null;
const interests=[...document.querySelectorAll('[data-interest]')];
const routeKey='baltika-route-v1';let saved=[];let storageOK=true;
try{const data=JSON.parse(localStorage.getItem(routeKey)||'[]');if(Array.isArray(data))saved=[...new Set(data.filter(id=>Number.isInteger(id)&&byId.has(id)))];}catch(e){storageOK=false;}
const markers=new Map();
const normalize=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
// Normalize the catalogue once, rather than on every keystroke and map update.
const searchIndex=new Map(places.map(p=>[p.id,normalize([p.name,p.short,p.tag,p.intro,p.address].filter(Boolean).join(' '))]));
const searchClear=document.getElementById('search-clear');
searchClear.addEventListener('click',()=>{search.value='';search.dispatchEvent(new Event('input'));search.focus();});
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||placeDialog.open)return;
 const editing=event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable]');
 if(event.key==='/'&&!editing){event.preventDefault();search.focus();search.scrollIntoView({block:'center',behavior:reduceMotion?'instant':'smooth'});}
 if(event.key==='Escape'&&event.target===search&&search.value){event.preventDefault();searchClear.click();}
});
const badge=p=>p.group==='extra'?'Д'+(p.id-10):String(p.id).padStart(2,'0');
function matching(list){const terms=normalize(search.value).split(/\s+/).filter(Boolean);return list.filter(p=>(activeFilter==='all'||p.category===activeFilter)&&(activeInterest==='all'||p.interests.includes(activeInterest))&&(visitFilter==='all'||(visitFilter==='visited'?visited.has(p.id):!visited.has(p.id)))&&terms.every(term=>searchIndex.get(p.id).includes(term)));}
function visiblePlaces(){return matching(activeView==='map'&&mapMode==='route'?saved.map(id=>byId.get(id)):activeView==='map'&&mapMode==='extra'?extras:core);}
function contextPlaces(){return activeView==='map'&&mapMode==='extra'&&visiblePlaces().length?matching(core):[];}
function showMessage(message){status.textContent=message;status.hidden=false;}
function iconFor(p){const route=mapMode==='route';const context=mapMode==='extra'&&p.group!=='extra';const extra=p.group==='extra';const size=route?40:context?28:extra?40:34;return L.divIcon({className:'guide-marker '+(route?'route-marker':context?'context-marker':extra?'extra-marker':'main-marker'),html:`<div class="marker-pin ${route?'route':context?'context':extra?'extra':p.category}"><span>${route?saved.indexOf(p.id)+1:badge(p)}</span></div>`,iconSize:[size,size+4],iconAnchor:[size/2,size],popupAnchor:[0,-size]});}
function syncMarkers(){if(!map)return;const ids=new Set([...visiblePlaces(),...contextPlaces()].map(p=>p.id));for(const p of places){const marker=markers.get(p.id);if(!marker)continue;if(ids.has(p.id)){marker.setIcon(iconFor(p));marker.setZIndexOffset(p.group==='extra'?500:0);if(!map.hasLayer(marker))marker.addTo(map);}else if(map.hasLayer(marker))map.removeLayer(marker);}}
function mapButton(p,context=false){const b=document.createElement('button');b.type='button';b.className='map-item '+(context?'context':p.group==='extra'?'extra':p.category);b.setAttribute('aria-pressed',String(selected===p.id));b.setAttribute('aria-label','Показать на карте: '+p.name+(context?' — основное место':''));const n=document.createElement('span');n.textContent=mapMode==='route'?String(saved.indexOf(p.id)+1):badge(p);const text=document.createElement('span');const title=document.createElement('strong');title.textContent=p.short;const sub=document.createElement('small');sub.textContent=(p.category==='city'?'Город':'Область')+' · '+p.duration;text.append(title,sub);b.append(n,text);b.addEventListener('click',()=>focusPlace(p.id,true));return b;}
function renderMapList(){mapList.replaceChildren();for(const p of visiblePlaces())mapList.append(mapButton(p));const context=contextPlaces();if(context.length){const details=document.createElement('details');details.className='context-list';details.open=context.some(p=>p.id===selected);const summary=document.createElement('summary');summary.textContent=`Основные для ориентира · ${context.length}`;details.append(summary);context.forEach(p=>details.append(mapButton(p,true)));mapList.append(details);}}
function regionBounds(){return L.geoJSON(KALININGRAD_BOUNDARY).getBounds();}
function fitVisible(){if(!map||activeView!=='map')return;const visible=visiblePlaces();if(!visible.length){map.closePopup();return;}map.invalidateSize();const overview=mapMode!=='route'&&activeFilter==='all'&&activeInterest==='all'&&!search.value&&visitFilter==='all';map.fitBounds(overview?regionBounds():visible.map(p=>[p.lat,p.lng]),{paddingTopLeft:overview?[18,24]:[40,50],paddingBottomRight:overview?[18,48]:[45,75],maxZoom:overview?10:visible.length===1?13:12,animate:false});}
function update(){searchClear.hidden=!search.value;const main=matching(core),extra=matching(extras),visible=visiblePlaces();const ids=new Set([...main,...extra].map(p=>p.id));cards.forEach(c=>c.hidden=c!==modalCard&&!ids.has(Number(c.dataset.id)));cardPanel.hidden=activeView!=='cards'||!main.length;extraSection.hidden=activeView!=='cards'||!extra.length;mapPanel.hidden=activeView!=='map';document.getElementById('extra-count').textContent=`${extra.length} из ${extras.length} дополнительных мест`;if(activeView==='map'){count.textContent=mapMode==='route'?`Мой маршрут: ${visible.length} из ${saved.length} мест`:mapMode==='main'?`Показано ${visible.length} из ${core.length} основных мест`:`Показано ${visible.length} из ${extras.length} дополнительных · ${contextPlaces().length} основных для ориентира`;empty.hidden=visible.length>0;}else{count.textContent=`Основные: ${main.length} из ${core.length} · дополнительные: ${extra.length} из ${extras.length}`;empty.hidden=main.length+extra.length>0;}document.getElementById('clear-filters').hidden=activeFilter==='all'&&activeInterest==='all'&&!search.value&&visitFilter==='all';interests.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.interest===activeInterest)));filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===activeFilter)));modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapMode===mapMode)));document.getElementById('map-help').textContent=mapMode==='route'?'Номера меток — порядок мест в вашем списке. Это выбранные остановки, а не рассчитанный дорожный маршрут.':mapMode==='main'?'На карте — только 10 основных мест. Синие метки обозначают город, зелёные — область. Нажмите на номер, чтобы открыть описание.':'Золотистые метки Д1–Д6 — дополнительные места. Основные отмечены небольшими серыми метками для ориентира; их тоже можно открыть.';document.getElementById('legend-main').hidden=mapMode!=='main';document.getElementById('legend-extra').hidden=mapMode!=='extra';document.getElementById('legend-route').hidden=mapMode!=='route';syncMarkers();renderMapList();fitVisible();renderFilterSummary();syncQuickNav();}
async function initMap(){
 if(map)return;
 showMessage('Загружаем карту…');
 try{await window.BaltikaRussianMap.loadLeaflet();}catch{
  status.replaceChildren(document.createTextNode('Не удалось загрузить карту. Список мест остаётся доступен. '));status.hidden=false;
  const retry=document.createElement('button');retry.type='button';retry.className='btn btn-outline';retry.textContent='Повторить загрузку';retry.addEventListener('click',initMap);status.append(retry);return;
 }
 if(map||activeView!=='map')return;

map=L.map('map',{scrollWheelZoom:false,zoomControl:false,minZoom:6,maxBounds:regionBounds().pad(1),maxBoundsViscosity:.85}).setView([54.8,21.2],8);
// Replace Leaflet's default flag-bearing prefix, retaining library attribution.
map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
L.control.zoom({position:'bottomleft'}).addTo(map);
map.createPane('regionFocus');map.getPane('regionFocus').style.zIndex=350;map.getPane('regionFocus').style.pointerEvents='none';
// Even-odd fill leaves both mainland and the Baltic Spit unshaded.
const outer=[[-85,-180],[-85,180],[85,180],[85,-180]];
const rings=KALININGRAD_BOUNDARY.geometry.coordinates.flatMap(polygon=>polygon.map(ring=>ring.map(([lng,lat])=>[lat,lng])));
L.polygon([outer,...rings],{pane:'regionFocus',stroke:false,fillColor:'#081c28',fillOpacity:.72,fillRule:'evenodd',interactive:false,className:'region-surround-mask'}).addTo(map);
L.geoJSON(KALININGRAD_BOUNDARY,{pane:'regionFocus',interactive:false,style:{color:'#f3cd86',weight:3,opacity:1,fill:false,className:'region-boundary'}}).addTo(map);
map.attributionControl.addAttribution('Границы: <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener noreferrer">geoBoundaries</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OSM</a> (ODbL)');
const regionKey=document.createElement('div');regionKey.className='region-map-key';regionKey.innerHTML='<span aria-hidden="true"></span>Калининградская область';document.querySelector('.map-area').append(regionKey);
function loadRussianBasemap(){
 showMessage('Загружаем карту с русскими названиями…');
 window.BaltikaRussianMap.addTo(map).then(gl=>{
  status.hidden=true;
  gl.on('error',()=>showMessage('Не удалось загрузить часть карты. Проверьте подключение к интернету.'));
  gl.on('idle',()=>{status.hidden=true;});
 }).catch(()=>{
  status.replaceChildren(document.createTextNode('Не удалось загрузить подложку. Метки и список мест доступны. '));status.hidden=false;
  const retry=document.createElement('button');retry.type='button';retry.className='btn btn-outline';retry.textContent='Повторить загрузку';retry.addEventListener('click',loadRussianBasemap);status.append(retry);
 });
}
loadRussianBasemap();
for(const p of places){const popup=document.createElement('div');const kind=document.createElement('p');kind.className='popup-kind';kind.textContent=(p.group==='extra'?'Дополнительное место · ':'Основное место · ')+badge(p);const heading=document.createElement('h3');heading.className='popup-title';heading.textContent=p.short;const desc=document.createElement('p');desc.className='popup-desc';desc.textContent=p.intro;const link=document.createElement('a');link.className='popup-link';link.href='#place-'+p.id;link.textContent='Открыть карточку →';link.addEventListener('click',e=>{e.preventDefault();showCard(p.id);});popup.append(kind,heading,desc,link);const marker=L.marker([p.lat,p.lng],{icon:iconFor(p),title:p.name,alt:p.name}).bindPopup(popup,{maxWidth:260,autoPanPadding:[20,30]});marker.on('click',()=>{selected=p.id;renderMapList();});markers.set(p.id,marker);}
syncMarkers();fitVisible();if(selected!==null){const p=byId.get(selected);map.setView([p.lat,p.lng],13,{animate:false});markers.get(selected)?.openPopup();}if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(activeView==='map'){map.invalidateSize();if(selected===null)fitVisible();}}).observe(document.getElementById('map'));
}
function switchView(view){if(location.hash==='#my-route')history.replaceState(null,'',location.pathname+location.search+'#explore');activeView=view;switches.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));if(view==='map'){initMap();requestAnimationFrame(()=>{map?.invalidateSize();fitVisible();});}update();}
function focusPlace(id,keepMode=false){const p=byId.get(id);if(!p)return;selected=id;if(!keepMode){mapMode=p.group==='extra'?'extra':'main';}if(activeView!=='map')switchView('map');else update();requestAnimationFrame(()=>{if(!map)return;map.invalidateSize();map.setView([p.lat,p.lng],13,{animate:false});markers.get(id)?.openPopup();});}
function showCard(id){openPlace(id);}
filters.forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;selected=null;map?.closePopup();update();}));search.addEventListener('input',()=>{selected=null;map?.closePopup();update();});switches.forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));modes.forEach(b=>b.addEventListener('click',()=>{mapMode=b.dataset.mapMode;if(mapMode==='route'){visitFilter='all';document.getElementById('visited-filter').value='all';activeInterest='all';activeFilter='all';search.value='';}selected=null;map?.closePopup();update();}));
function reset(){visitFilter='all';document.getElementById('visited-filter').value='all';activeInterest='all';activeFilter='all';search.value='';selected=null;map?.closePopup();update();}
document.getElementById('clear-filters').addEventListener('click',reset);document.getElementById('empty-reset').addEventListener('click',reset);document.getElementById('map-reset').addEventListener('click',reset);
document.querySelectorAll('[data-map-id]').forEach(b=>b.addEventListener('click',()=>{if(modalCard)closePlace();activeInterest='all';activeFilter='all';search.value='';focusPlace(Number(b.dataset.mapId));document.getElementById('explore').scrollIntoView({behavior:reduceMotion?'auto':'smooth'});}));
document.querySelectorAll('[data-open-map]').forEach(a=>a.addEventListener('click',()=>{selected=null;switchView('map');}));document.querySelectorAll('[data-open-card]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showCard(Number(a.dataset.openCard));}));document.getElementById('start-trip').addEventListener('click',()=>{mapMode='main';switchView('cards');});
function announce(text,canUndo=false){showToast(text,canUndo);}
function persist(){try{localStorage.setItem(routeKey,JSON.stringify(saved));storageOK=true;}catch(e){storageOK=false;}}
function routeButton(label,action,id,text){const b=document.createElement('button');b.type='button';b.className='route-control';b.dataset.routeAction=action;b.dataset.routeId=id;b.setAttribute('aria-label',label);b.textContent=text;return b;}
function renderRoute(){
 const list=document.getElementById('route-list');list.replaceChildren();
 saved.forEach((id,index)=>{const p=byId.get(id),li=document.createElement('li');li.className='route-stop';li.dataset.stopId=id;
 const order=document.createElement('span');order.className='route-order';order.textContent=index+1;order.setAttribute('aria-hidden','true');
 const info=document.createElement('div');info.className='route-info';const name=document.createElement('button');name.type='button';name.className='route-name';name.dataset.routeAction='open';name.dataset.routeId=id;name.textContent=p.short;const meta=document.createElement('span');meta.className='route-meta';meta.textContent=p.duration+' · '+p.visitNote;info.append(name,meta);
 const controls=document.createElement('div');controls.className='route-controls';const up=routeButton('Поднять выше: '+p.short,'up',id,'↑'),down=routeButton('Опустить ниже: '+p.short,'down',id,'↓');up.disabled=index===0;down.disabled=index===saved.length-1;const remove=routeButton('Удалить из маршрута: '+p.short,'remove',id,'Убрать');controls.append(up,down,remove);li.append(order,info,controls);list.append(li);});
 document.querySelectorAll('[data-route-count]').forEach(n=>n.textContent=saved.length);
 document.querySelectorAll('[data-save-id]').forEach(b=>{const yes=saved.includes(Number(b.dataset.saveId));b.textContent=yes?'✓ В маршруте':'＋ В маршрут';b.setAttribute('aria-pressed',String(yes));b.setAttribute('aria-label',(yes?'Убрать из маршрута: ':'Добавить в маршрут: ')+byId.get(Number(b.dataset.saveId)).short);});
 document.getElementById('route-empty').hidden=!!saved.length;document.getElementById('route-actions').hidden=!saved.length;
 const mode=document.querySelector('[data-map-mode=route]');mode.disabled=!saved.length;mode.textContent='Мой маршрут · '+saved.length;
 document.getElementById('route-storage').textContent=storageOK?'Список сохраняется в этом браузере на этом устройстве.':'Браузер не разрешил сохранение. Список доступен до закрытия страницы.';
 if(!saved.length&&mapMode==='route')mapMode='main';
 syncRouteActions();
}
function changedRoute(message){persist();renderRoute();if(activeView==='map')update();announce(storageOK?message:message+' Браузер не разрешил сохранение: список доступен до закрытия страницы.',!!undoRouteSnapshot);}
function toggleSaved(id){if(!byId.has(id))return;rememberRoute();const at=saved.indexOf(id);if(at<0)saved.push(id);else saved.splice(at,1);changedRoute(byId.get(id).short+(at<0?' — добавлено в маршрут.':' — удалено из маршрута.'));}
interests.forEach(b=>b.addEventListener('click',()=>{activeInterest=b.dataset.interest;selected=null;map?.closePopup();update();}));
document.querySelectorAll('[data-save-id]').forEach(b=>b.addEventListener('click',()=>toggleSaved(Number(b.dataset.saveId))));
document.getElementById('route-list').addEventListener('click',e=>{const b=e.target.closest('[data-route-action]');if(!b)return;const id=Number(b.dataset.routeId),action=b.dataset.routeAction,index=saved.indexOf(id);if(index<0)return;
 if(action==='open'){showCard(id);return;}
 if(action==='remove'){rememberRoute();saved.splice(index,1);changedRoute(byId.get(id).short+' — удалено из маршрута.');const next=document.querySelectorAll('#route-list .route-name')[Math.min(index,saved.length-1)];(next||document.getElementById('route-summary')).focus();return;}
 const next=index+(action==='up'?-1:1);if(next<0||next>=saved.length)return;rememberRoute();[saved[index],saved[next]]=[saved[next],saved[index]];changedRoute('Порядок остановок изменён.');const focus=document.querySelector(`[data-route-action="${action}"][data-route-id="${id}"]`);if(focus&&!focus.disabled)focus.focus();else document.querySelector(`[data-route-action="open"][data-route-id="${id}"]`).focus();
});
document.getElementById('route-map').addEventListener('click',()=>{visitFilter='all';document.getElementById('visited-filter').value='all';activeFilter='all';activeInterest='all';search.value='';mapMode='route';selected=null;switchView('map');document.getElementById('explore').scrollIntoView({behavior:reduceMotion?'auto':'smooth'});});
document.querySelectorAll('a[href="#my-route"]').forEach(a=>a.addEventListener('click',()=>{document.getElementById('route-panel').open=true;}));
window.addEventListener('storage',e=>{if(e.key!==routeKey&&e.key!==null)return;undoRouteSnapshot=null;hideToast();try{const data=JSON.parse(localStorage.getItem(routeKey)||'[]');saved=Array.isArray(data)?[...new Set(data.filter(id=>Number.isInteger(id)&&byId.has(id)))]:[];renderRoute();if(activeView==='map')update();}catch(error){/* Ignore malformed external state. */}});
async function sharePlace(button){
 const id=Number(button.dataset.shareId),p=byId.get(id);if(!p)return;
 const url=placeURL(id);
 const fallback=document.getElementById('share-fallback-'+id);fallback.hidden=true;
 if(navigator.share){try{await navigator.share({title:p.short+' — Балтика',text:'Посмотрите это место в нашем путеводителе',url});return;}catch(e){if(e.name==='AbortError')return;}}
 if(navigator.clipboard&&navigator.clipboard.writeText){try{await navigator.clipboard.writeText(url);button.textContent='✓ Ссылка скопирована';announce('Ссылка на '+p.short+' скопирована.');setTimeout(()=>{button.textContent='Поделиться ↗';},2500);return;}catch(e){/* A selectable link remains available without clipboard permission. */}}
 fallback.hidden=false;const input=fallback.querySelector('input');input.value=url;input.focus();input.select();announce('Скопируйте ссылку из поля под карточкой.');
}
document.querySelectorAll('[data-share-id]').forEach(b=>b.addEventListener('click',()=>sharePlace(b)));
function followHash(){if(modalCard&&!location.hash.match(/^#place-\d+$/))closePlace(false);const match=location.hash.match(/^#place-(\d+)$/);if(match&&byId.has(Number(match[1])))showCard(Number(match[1]));if(location.hash==='#my-route')document.getElementById('route-panel').open=true;}
window.addEventListener('hashchange',followHash);

document.documentElement.classList.add('js');
const placeDialog=document.getElementById('place-dialog'),dialogContent=document.getElementById('place-dialog-content'),expandButton=document.getElementById('place-expand');
let modalCard=null,modalSlot=null,returnFocus=null,previousURL=null,lockedScroll=0;
function openPlace(id){
 const card=document.getElementById('place-'+id);if(!card)return;
 if(modalCard===card)return;
 if(modalCard)closePlace(false);
 returnFocus=document.activeElement;previousURL=location.pathname+location.search+(location.hash.match(/^#place-\d+$/)?'':location.hash);
 modalCard=card;modalSlot=document.createComment('place position');card.before(modalSlot);dialogContent.append(card);card.hidden=false;
 card.querySelectorAll('details:not(.feedback-box)').forEach(d=>d.open=true);
 document.getElementById('place-dialog-label').textContent=card.querySelector('h3').textContent;
 lockedScroll=window.scrollY;document.body.style.position='fixed';document.body.style.top=-lockedScroll+'px';document.body.style.width='100%';
 placeDialog.classList.remove('expanded','reading');document.getElementById('reading-mode').setAttribute('aria-pressed','false');document.getElementById('reading-mode').textContent='Режим чтения';expandButton.setAttribute('aria-pressed','false');expandButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';expandButton.setAttribute('aria-label','Развернуть карточку');expandButton.title='Развернуть карточку';
 syncPlaceActions();hideToast();placeDialog.showModal();dialogContent.scrollTop=0;history.replaceState(null,'','#place-'+id);document.getElementById('place-close').focus();
}
function closePlace(restore=true){
 if(!modalCard)return;hideToast();document.body.append(toast);placeDialog.close();modalCard.querySelectorAll('details').forEach(d=>d.open=false);modalSlot.replaceWith(modalCard);modalCard=null;modalSlot=null;
 document.body.style.position='';document.body.style.top='';document.body.style.width='';window.scrollTo(0,lockedScroll);
 if(restore){history.replaceState(null,'',previousURL||location.pathname+location.search);update();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
}
expandButton.addEventListener('click',()=>{const expanded=placeDialog.classList.toggle('expanded');expandButton.setAttribute('aria-pressed',String(expanded));expandButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';expandButton.setAttribute('aria-label',expanded?'Уменьшить карточку':'Развернуть карточку');expandButton.title=expanded?'Уменьшить карточку':'Развернуть карточку';});
document.getElementById('place-close').addEventListener('click',()=>closePlace());
placeDialog.addEventListener('cancel',e=>{e.preventDefault();closePlace();});
placeDialog.addEventListener('click',e=>{if(e.target===placeDialog){const r=placeDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePlace();}});
document.querySelectorAll('.place-card,.extra-card').forEach(card=>{
 const id=Number(card.dataset.id);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='btn btn-outline open-place js-only';trigger.textContent='Подробнее о месте';trigger.setAttribute('aria-label','Открыть карточку: '+card.querySelector('h3').textContent);trigger.addEventListener('click',()=>openPlace(id));card.querySelector('.card-intro,.extra-intro').after(trigger);
 card.addEventListener('click',e=>{if(card===modalCard||e.target.closest('a,button,input,label,details'))return;if(window.getSelection()?.toString())return;openPlace(id);});
 card.querySelector('summary')?.addEventListener('click',e=>{if(card!==modalCard){e.preventDefault();openPlace(id);}});
});
document.querySelectorAll('.tour-box').forEach(box=>{
 let step=0;const stops=[...box.querySelectorAll('.tour-stop')],player=box.querySelector('[data-tour-player]'),start=box.querySelector('[data-tour-start]'),back=box.querySelector('[data-tour-back]'),next=box.querySelector('[data-tour-next]'),end=box.querySelector('[data-tour-end]'),progress=box.querySelector('[data-tour-progress]');
 if(!player||!stops.length)return;
 function render(){stops.forEach((s,i)=>s.hidden=i!==step);progress.textContent='Остановка '+(step+1)+' из '+stops.length;back.disabled=step===0;next.textContent=step===stops.length-1?'Завершить прогулку':'Далее →';}
 function focusStep(){player.focus({preventScroll:true});player.scrollIntoView({block:'nearest',behavior:'auto'});}
 function finish(){player.hidden=true;start.setAttribute('aria-expanded','false');start.focus({preventScroll:true});start.scrollIntoView({block:'nearest',behavior:'auto'});}
 start.addEventListener('click',()=>{step=0;render();player.hidden=false;start.setAttribute('aria-expanded','true');focusStep();});
 back.addEventListener('click',()=>{step=Math.max(0,step-1);render();focusStep();});
 next.addEventListener('click',()=>{if(step===stops.length-1)finish();else{step++;render();focusStep();}});
 end.addEventListener('click',finish);
});

// Travel tools: all personal choices stay in the current browser.
const storeRead=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}};
const storeWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}};
const visitedKey='baltika-visited-v1';
let visited=new Set((Array.isArray(storeRead(visitedKey,[]))?storeRead(visitedKey,[]):[]).filter(id=>byId.has(id))),visitFilter='all';
let readingSize=Number(storeRead('baltika-font-v1',18));if(![18,21,24].includes(readingSize))readingSize=18;
const presets=[
 {title:'Первый день в центре',ids:[11,1,2],time:'4–6 часов',travel:'Пешком',note:'Рыбная деревня, остров Канта и музейная набережная. В Музее Мирового океана выберите одну экспозицию: подробный осмотр всего комплекса потребует больше времени.'},
 {title:'Янтарь и прогулка у воды',ids:[4,14],time:'2,5–4 часа',travel:'Пешком',note:'Сначала музей, затем прогулка по южному берегу Верхнего озера. Обходить весь водоём необязательно.'},
 {title:'Море и дюны',ids:[7,6],time:'Полный день',travel:'Транспорт между остановками',note:'Зеленоградск и высота Эфа. Проверьте транспорт до косы, обратный рейс, доступность экотроп и правила въезда. Время зависит от дороги и ожидания.'},
 {title:'Курорты Балтики',ids:[8,9],time:'Полный день',travel:'Автомобиль или такси между городами',note:'Светлогорск и Янтарный. Для поездки только общественным транспортом лучше выбрать один город и заранее проверить расписание.'}
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function featureButton(label,action){const b=document.createElement('button');b.type='button';b.className='btn btn-outline';b.textContent=label;b.addEventListener('click',action);return b;}
const presetGrid=document.getElementById('preset-grid');
presets.forEach((r,i)=>{const a=document.createElement('article');a.className='day';a.innerHTML=`<p class="day-label">${esc(r.travel)} · ${esc(r.time)}</p><h3>${esc(r.title)}</h3><ol class="preset-stops">${r.ids.map(id=>`<li><button type="button" data-preset-place="${id}">${esc(byId.get(id).short)}</button></li>`).join('')}</ol><p>${esc(r.note)}</p>`;const b=featureButton('Добавить остановки',()=>{const added=r.ids.filter(id=>!saved.includes(id));if(added.length)rememberRoute();else undoRouteSnapshot=null;saved.push(...added);changedRoute(added.length?'Добавлено остановок: '+added.length+'. Ваш прежний список сохранён.':'Все остановки уже в вашем маршруте.');document.getElementById('preset-status').textContent=added.length?'Добавлено: '+added.length+'. Остановки добавлены в конец вашего маршрута.':'Эти места уже есть в вашем маршруте.';document.getElementById('route-panel').open=true;});b.dataset.preset=i;a.append(b);a.querySelectorAll('[data-preset-place]').forEach(x=>x.addEventListener('click',()=>openPlace(Number(x.dataset.presetPlace))));presetGrid.append(a);});
document.querySelectorAll('[data-day-choice]').forEach(b=>b.addEventListener('click',()=>{reset();const v=b.dataset.dayChoice;if(v==='city')activeFilter='city';else activeInterest=v;switchView('cards');document.getElementById('explore').scrollIntoView({behavior:reduceMotion?'auto':'smooth'});document.getElementById('search').focus({preventScroll:true});}));
function renderVisited(){document.getElementById('visited-progress').textContent='Вы посетили '+visited.size+' из '+places.length+' мест';document.querySelectorAll('[data-visited-id]').forEach(b=>{const yes=visited.has(Number(b.dataset.visitedId));b.textContent=yes?'✓ Здесь были':'Я здесь был(а)';b.setAttribute('aria-pressed',String(yes));});cards.forEach(c=>c.classList.toggle('was-visited',visited.has(Number(c.dataset.id))));}
function setVisited(id){if(visited.has(id))visited.delete(id);else visited.add(id);const ok=storeWrite(visitedKey,[...visited]);renderVisited();update();announce(ok?'Отметка посещения сохранена.':'Отметка действует до закрытия страницы: браузер не разрешил сохранение.');}
document.getElementById('visited-filter').addEventListener('change',e=>{visitFilter=e.target.value;update();});
window.addEventListener('storage',e=>{if(e.key!==visitedKey&&e.key!==null)return;const value=storeRead(visitedKey,[]);visited=new Set((Array.isArray(value)?value:[]).filter(id=>byId.has(id)));renderVisited();update();});
function distanceKm(a,b,c,d){const rad=Math.PI/180,x=Math.sin((c-a)*rad/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
const nearBtn=document.getElementById('near-me'),nearStatus=document.getElementById('near-status'),nearList=document.getElementById('near-list');let geoRequest=0;
nearBtn.addEventListener('click',()=>{if(!navigator.geolocation){nearStatus.textContent='Геолокация недоступна. Выберите место в списке или на карте.';return;}const request=++geoRequest;nearBtn.disabled=true;nearStatus.textContent='Определяем ваше положение…';nearList.replaceChildren();navigator.geolocation.getCurrentPosition(pos=>{if(request!==geoRequest)return;nearBtn.disabled=false;const {latitude,longitude,accuracy}=pos.coords;if(!Number.isFinite(latitude)||!Number.isFinite(longitude)){nearStatus.textContent='Не удалось определить координаты.';return;}const list=places.map(p=>({p,d:distanceKm(latitude,longitude,p.lat,p.lng)})).sort((a,b)=>a.d-b.d).slice(0,5);nearStatus.textContent='Ближайшие 5 мест из всего путеводителя. Расстояние по прямой, не длина пути.'+(Number.isFinite(accuracy)?' Точность геопозиции около '+Math.round(accuracy)+' м.':'')+(list[0].d>100?' Вы находитесь далеко от мест путеводителя.':'');for(const {p,d} of list){const li=document.createElement('li');const b=featureButton(p.short+' · '+(d<1?Math.round(d*1000)+' м':d.toFixed(1)+' км'),()=>openPlace(p.id));li.append(b);nearList.append(li);}},error=>{if(request!==geoRequest)return;nearBtn.disabled=false;nearStatus.textContent=error.code===1?'Доступ к геопозиции не разрешён. Вы можете выбрать место на карте.':error.code===3?'Не удалось определить положение вовремя. Попробуйте ещё раз.':'Геопозиция недоступна. Попробуйте на улице или выберите место вручную.';},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});});
document.getElementById('near-clear').addEventListener('click',()=>{geoRequest++;nearBtn.disabled=false;nearList.replaceChildren();nearStatus.textContent='Положение не сохраняется. Поиск запускается только по нажатию кнопки.';});
const readButton=document.getElementById('reading-mode');
readButton.addEventListener('click',()=>{const yes=placeDialog.classList.toggle('reading');readButton.setAttribute('aria-pressed',String(yes));readButton.textContent=yes?'Обычный вид':'Режим чтения';});
function applySize(){placeDialog.style.setProperty('--reading-size',(readingSize/16)+'rem');document.getElementById('font-size').textContent=Math.round(readingSize/16*parseFloat(getComputedStyle(document.documentElement).fontSize))+' px';document.getElementById('font-down').disabled=readingSize===18;document.getElementById('font-up').disabled=readingSize===24;}
for(const [id,delta]of [['font-down',-3],['font-up',3]])document.getElementById(id).addEventListener('click',()=>{readingSize=Math.min(24,Math.max(18,readingSize+delta));storeWrite('baltika-font-v1',readingSize);applySize();});
function download(name,content,type='text/html;charset=utf-8'){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportPlace(id){const p=byId.get(id),card=document.getElementById('place-'+id),clone=card.querySelector('.place-story').cloneNode(true);clone.querySelectorAll('button,[data-tour-progress]').forEach(e=>e.remove());clone.querySelectorAll('[hidden]').forEach(e=>e.removeAttribute('hidden'));clone.querySelectorAll('[tabindex]').forEach(e=>e.removeAttribute('tabindex'));return `<article><h2>${esc(p.name)}</h2><p>${esc(p.address)} · ${esc(p.duration)}</p><p>${esc(p.intro)}</p>${card.querySelector('.visit-guide')?.outerHTML||''}${clone.innerHTML}<p><a href="${esc(placeURL(id))}">Карточка на сайте</a></p></article>`;}
function offlineDocument(title,body){return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>body{max-width:48.75rem;margin:2rem auto;padding:0 1.25rem;font:1.125rem/1.75 system-ui;color:#173b43;background:#f6f4ed}h1,h2,h3,h4{line-height:1.25}article{border-top:0.0625rem solid #abbcb6;margin-top:2.25rem;padding-top:1.25rem}a{color:#215c68;overflow-wrap:anywhere}dt{font-weight:bold}dd{margin:0 0 0.875rem}button{display:none}@media print{body{background:white}article{break-before:page}}</style><h1>'+esc(title)+'</h1><p>Сохранено из путеводителя «Калининград и Балтика». Текст доступен без интернета. Внешние ссылки требуют подключения. Маршрут не рассчитывает дорогу. Сведения о посещении проверьте перед поездкой.</p>'+body+'</html>';}
document.getElementById('download-route').addEventListener('click',()=>{if(!saved.length)return;download('baltika-my-route.html',offlineDocument('Мой маршрут',saved.map(exportPlace).join('')));announce('Файл маршрута подготовлен для скачивания.');});
// Feedback prepares a message; it never claims a server received it.
function feedbackFor(id){const form=document.getElementById('feedback-'+id),input=form.querySelector('textarea'),status=form.querySelector('[role=status]');const message=()=>{if(!input.value.trim()){status.textContent='Опишите, пожалуйста, неточность.';input.focus();return null;}return 'Неточность в путеводителе: '+byId.get(id).name+'\n'+placeURL(id)+'\n\n'+input.value.trim();};form.querySelector('[data-feedback-share]').addEventListener('click',async()=>{const text=message();if(!text)return;if(navigator.share){try{await navigator.share({title:'Неточность в путеводителе',text});status.textContent='Диалог отправки закрыт. Доставку проверяйте в выбранном приложении.';return;}catch(e){if(e.name==='AbortError'){status.textContent='Отправка отменена.';return;}}}try{await navigator.clipboard.writeText(text);status.textContent='Сообщение скопировано. Отправьте его команде проекта удобным способом.';}catch{const out=form.querySelector('[data-feedback-output]');out.hidden=false;out.value=text;out.focus();out.select();status.textContent='Скопируйте сообщение из поля и передайте команде проекта.';}});form.querySelector('[data-feedback-save]').addEventListener('click',()=>{const text=message();if(text){download('baltika-feedback-'+id+'.txt',text,'text/plain;charset=utf-8');status.textContent='Файл подготовлен. Его можно передать команде проекта.';}});}
cards.forEach(card=>{const id=Number(card.dataset.id),open=card.querySelector('.open-place');const b=featureButton('',()=>setVisited(id));b.dataset.visitedId=id;b.setAttribute('aria-label','Отметить посещение: '+byId.get(id).short);open.after(b);const actions=document.createElement('div');actions.className='offline-actions';actions.append(featureButton('Скачать экскурсию',()=>{download('baltika-place-'+id+'.html',offlineDocument(byId.get(id).name,exportPlace(id)));announce('Экскурсия подготовлена для скачивания.');}));card.querySelector('.place-story').before(actions);feedbackFor(id);});
// UX: keep the next action within reach, with recoverable route changes.
const toast=document.getElementById('ux-toast'),toastMessage=document.getElementById('ux-toast-message'),undoButton=document.getElementById('undo-route');
let undoRouteSnapshot=null,toastTimer=null,toastReturnFocus=null;
function rememberRoute(){undoRouteSnapshot=[...saved];}
function hideToast(){clearTimeout(toastTimer);toast.hidden=true;}
function showToast(text,canUndo=false){
 clearTimeout(toastTimer);
 if(!toast.contains(document.activeElement))toastReturnFocus=document.activeElement;
 const host=placeDialog.open?placeDialog:document.body;if(toast.parentElement!==host)host.append(toast);
 toast.hidden=false;toastMessage.textContent=text;undoButton.hidden=!canUndo;
 // Actionable notices remain available until dismissed or superseded.
 if(!canUndo)toastTimer=setTimeout(()=>{if(!toast.contains(document.activeElement)&&!toast.matches(':hover'))hideToast();},7000);
}
function restoreToastFocus(){const target=toastReturnFocus?.isConnected&&toastReturnFocus.getClientRects().length?toastReturnFocus:placeDialog.open?document.getElementById('place-save-action'):document.getElementById('route-summary');target.focus({preventScroll:true});}
document.getElementById('dismiss-toast').addEventListener('click',()=>{hideToast();restoreToastFocus();});
undoButton.addEventListener('click',()=>{
 if(!undoRouteSnapshot)return;
 saved=[...undoRouteSnapshot];undoRouteSnapshot=null;persist();renderRoute();update();
 announce(storageOK?'Последнее изменение маршрута отменено.':'Изменение отменено. Список доступен до закрытия страницы.');
 restoreToastFocus();
});
function syncPlaceActions(){
 if(!modalCard)return;const id=Number(modalCard.dataset.id),p=byId.get(id),yes=saved.includes(id);
 document.getElementById('place-action-duration').textContent=p.duration+' · '+(p.category==='city'?'Калининград':'Область');
 document.getElementById('place-action-state').textContent=yes?'Место в вашем маршруте':'Сохраните место для поездки';
 const button=document.getElementById('place-save-action');button.textContent=yes?'✓ В маршруте':'＋ В маршрут';button.setAttribute('aria-pressed',String(yes));button.setAttribute('aria-label',(yes?'Убрать из маршрута: ':'Добавить в маршрут: ')+p.short);
}
function syncRouteActions(){
 document.getElementById('route-start').hidden=!!saved.length;
 document.querySelector('[data-quick-nav="route"]').setAttribute('aria-label','Мой маршрут: '+saved.length+' мест');
 syncPlaceActions();tripTools.renderRoute(saved);
}
document.getElementById('place-save-action').addEventListener('click',()=>{if(modalCard)toggleSaved(Number(modalCard.dataset.id));});
document.getElementById('place-map-action').addEventListener('click',()=>{
 if(!modalCard)return;const id=Number(modalCard.dataset.id);closePlace();reset();focusPlace(id);
 document.getElementById('explore').scrollIntoView({behavior:reduceMotion?'auto':'smooth'});
 document.querySelector('[data-view="map"]').focus({preventScroll:true});
});
function syncQuickNav(){
 const inRoute=location.hash==='#my-route'&&document.getElementById('route-panel').open;
 document.querySelectorAll('[data-quick-nav]').forEach(b=>{const yes=inRoute?b.dataset.quickNav==='route':b.dataset.quickNav===(activeView==='map'?'map':'places');if(yes)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
}
document.querySelectorAll('[data-quick-nav]').forEach(b=>b.addEventListener('click',()=>{
 if(modalCard)closePlace();hideToast();
 if(b.dataset.quickNav==='route'){
  document.getElementById('route-panel').open=true;history.replaceState(null,'','#my-route');document.getElementById('my-route').scrollIntoView({behavior:reduceMotion?'auto':'smooth'});document.getElementById('route-summary').focus({preventScroll:true});syncQuickNav();return;
 }
 if(location.hash==='#my-route')history.replaceState(null,'',location.pathname+location.search+'#explore');
 switchView(b.dataset.quickNav==='map'?'map':'cards');document.getElementById('explore').scrollIntoView({behavior:reduceMotion?'auto':'smooth'});document.querySelector('[data-view="'+(activeView==='map'?'map':'cards')+'"]').focus({preventScroll:true});
}));
document.getElementById('route-panel').addEventListener('toggle',syncQuickNav);
document.getElementById('route-start').addEventListener('click',()=>{switchView('cards');search.focus({preventScroll:true});});
window.addEventListener('hashchange',syncQuickNav);
const refinements=document.getElementById('catalog-refinements'),compactFilters=matchMedia('(max-width:43.75rem)');
function adaptRefinements(){if(!compactFilters.matches||!refinements.contains(document.activeElement))refinements.open=!compactFilters.matches;}
adaptRefinements();compactFilters.addEventListener('change',adaptRefinements);
const filterSummary=document.getElementById('active-filters');
function renderFilterSummary(){
 const previousKey=filterSummary.contains(document.activeElement)?document.activeElement.dataset.filterKey:null;
 filterSummary.replaceChildren();
 const add=(key,label,clear)=>{const b=document.createElement('button');b.type='button';b.className='filter-chip';b.dataset.filterKey=key;b.textContent=label+' ×';b.setAttribute('aria-label','Снять фильтр: '+label);b.addEventListener('click',()=>{clear();selected=null;map?.closePopup();update();});filterSummary.append(b);};
 if(search.value)add('search','Поиск: '+search.value,()=>search.value='');
 if(activeFilter!=='all')add('area',activeFilter==='city'?'Калининград':'Область',()=>activeFilter='all');
 if(activeInterest!=='all')add('interest',interests.find(b=>b.dataset.interest===activeInterest).textContent,()=>activeInterest='all');
 if(visitFilter!=='all')add('visited',visitFilter==='visited'?'Уже посещённые':'Ещё не посещённые',()=>{visitFilter='all';document.getElementById('visited-filter').value='all';});
 filterSummary.hidden=!filterSummary.childElementCount;
 const refinementCount=Number(activeInterest!=='all')+Number(visitFilter!=='all');document.getElementById('refinement-count').textContent=refinementCount?'Выбрано: '+refinementCount:'';
 if(previousKey){const next=[...filterSummary.children].find(b=>b.dataset.filterKey===previousKey)||filterSummary.firstElementChild||search;next.focus({preventScroll:true});}
}

const tripTools=window.BaltikaTrips.create({places,getSaved:()=>saved,onMessage:announce,onAdd(ids){
 const added=ids.filter(id=>byId.has(id)&&!saved.includes(id));
 if(!added.length){announce('Все эти места уже есть в вашем маршруте.');return;}
 rememberRoute();saved.push(...added);changedRoute('Добавлено мест: '+added.length+'. Прежние остановки сохранены.');document.getElementById('route-panel').open=true;
}});
renderVisited();applySize();

renderRoute();update();followHash();
})();
