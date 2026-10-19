/* Product workflow: choose a programme, assess it, share the selected places. */
(()=>{
'use strict';
const programmes=[
 {id:'centre',title:'Остров и набережная',ids:[11,1],tags:['city'],transport:'walk',note:'Начните у Рыбной деревни и перейдите на остров Канта. Оставьте время на прогулку вдоль Преголи.'},
 {id:'short-history',title:'Собор и старые ворота',ids:[1,13],tags:['city','museums'],transport:'walk',note:'Два исторических места в городской части путеводителя. Посещение собора и музейных залов проверяйте отдельно.'},
 {id:'gates',title:'Двое ворот — две истории',ids:[12,13],tags:['city','museums'],transport:'walk',note:'Королевские и Бранденбургские ворота. Между ними потребуется отдельная городская прогулка; её время не включено в оценку.'},
 {id:'amber-lake',title:'Янтарь и прогулка у озера',ids:[4,14],tags:['museums','nature'],transport:'walk',note:'Сначала музей, затем южный берег Верхнего озера. Необязательно обходить водоём целиком.'},
 {id:'green-city',title:'Зелёный день в городе',ids:[1,14],tags:['nature','city'],transport:'walk',note:'Остров Канта и Верхнее озеро. Подойдёт для прогулочного дня без поездки к побережью.'},
 {id:'ocean',title:'День в Музее Мирового океана',ids:[2],tags:['museums'],transport:'walk',note:'Выберите экспозиции по интересам. Корабли, корпуса и экскурсии могут требовать отдельных билетов.'},
 {id:'seaside',title:'Зеленоградск без спешки',ids:[7],tags:['sea'],transport:'transfer',note:'Приезжайте в Зеленоградск ради променада и городских улиц. Дорогу из Калининграда планируйте отдельно.'},
 {id:'resorts',title:'Два балтийских курорта',ids:[8,9],tags:['sea'],transport:'transfer',note:'Светлогорск и Янтарный. Нужен переезд между городами; на общественном транспорте сначала проверьте расписание.'},
 {id:'dunes',title:'Море и дюны',ids:[7,6],tags:['sea','nature'],transport:'transfer',fullDay:true,note:'Зеленоградск и Куршская коса — насыщенная программа. Для косы указано только «от половины дня»: точное время и переезды нужно оценить самостоятельно.'}
];
function visitRange(place){
 const text=place.duration||'';
 if(/^От\s/i.test(text))return null;
 const values=(text.match(/\d+(?:[,.]\d+)?/g)||[]).map(n=>Number(n.replace(',','.')));
 if(!values.length)return null;
 const unit=text.includes('минут')?60:1;return [values[0]/unit,(values[1]??values[0])/unit];
}
function estimate(ids,byId){
 let min=0,max=0;const unknown=[];
 for(const id of ids){const p=byId.get(id);if(!p)continue;const range=visitRange(p);if(range){min+=range[0];max+=range[1];}else unknown.push(p);}
 return {min,max,unknown};
}
function recommend(preferences,byId){
 return programmes.filter(p=>p.ids.every(id=>byId.has(id))&&(preferences.transport==='transfer'||p.transport==='walk')&&(preferences.interest==='any'||p.tags.includes(preferences.interest))&&(p.fullDay?preferences.time===10:estimate(p.ids,byId).max<=preferences.time))
 .sort((a,b)=>b.ids.length-a.ids.length||estimate(b.ids,byId).max-estimate(a.ids,byId).max).slice(0,3);
}
const number=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n);
const duration=n=>{const minutes=Math.round(n*60);return minutes<60?minutes+' мин':Math.floor(minutes/60)+' ч'+(minutes%60?' '+minutes%60+' мин':'');};
const hours=range=>duration(range.min)+(range.min===range.max?'':' – '+duration(range.max));
function create({places,getSaved,onAdd,onMessage}){
 const byId=new Map(places.map(p=>[p.id,p]));
 const form=document.getElementById('trip-builder-form'),results=document.getElementById('trip-results'),suggestions=document.getElementById('trip-suggestions');
 function describe(ids){const range=estimate(ids,byId);if(!range.unknown.length)return hours(range)+' на посещение, без дороги';return (range.max?'Известная часть: '+hours(range)+'. ':'')+range.unknown.map(p=>p.short+': '+p.duration.toLocaleLowerCase('ru')).join('; ')+'. Общая длительность требует уточнения.';}
 function showRecommendations(){
  const preferences={time:Number(form.elements.time.value),transport:form.elements.transport.value,interest:form.elements.interest.value};
  const found=recommend(preferences,byId);suggestions.replaceChildren();results.hidden=false;
  document.getElementById('trip-results-status').textContent=found.length?'Подходящих программ: '+found.length+'. Откройте места, чтобы проверить условия посещения.':'Подходящей программы нет. '+(preferences.transport==='walk'&&preferences.interest==='sea'?'Из центра Калининграда до морских курортов потребуется поездка.':'Попробуйте увеличить время или изменить интересы.');
  if(!found.length){const edit=document.createElement('button');edit.type='button';edit.className='btn btn-outline';edit.textContent='Изменить условия';edit.addEventListener('click',()=>{const field=document.getElementById(preferences.transport==='walk'&&preferences.interest==='sea'?'trip-transport':'trip-time');field.focus({preventScroll:true});field.scrollIntoView({block:'center',behavior:'auto'});});suggestions.append(edit);}
  found.forEach(programme=>{
   const card=document.createElement('article');card.className='trip-suggestion';
   const heading=document.createElement('h4');heading.textContent=programme.title;
   const time=document.createElement('p');time.className='trip-programme-time';time.textContent=describe(programme.ids);
   const note=document.createElement('p');note.textContent=programme.note;
   const list=document.createElement('ol');for(const id of programme.ids){const li=document.createElement('li'),link=document.createElement('a');link.href='#place-'+id;link.textContent=byId.get(id).short;li.append(link);list.append(li);}
   const add=document.createElement('button');add.type='button';add.className='btn';add.dataset.programme=programme.id;add.textContent='Добавить программу в маршрут';add.addEventListener('click',()=>onAdd(programme.ids));card.append(heading,time,list,note,add);suggestions.append(card);
  });
  document.getElementById('trip-results-title').focus({preventScroll:true});results.scrollIntoView({block:'start',behavior:'auto'});
 }
 form.addEventListener('submit',event=>{event.preventDefault();showRecommendations();});
 form.addEventListener('change',()=>{results.hidden=true;suggestions.replaceChildren();});
 const overview=document.getElementById('route-overview'),budget=document.getElementById('route-budget');
 const fallback=document.getElementById('route-share-fallback'),shareInput=document.getElementById('route-share-url');
 function renderRoute(ids){
  overview.hidden=!ids.length;fallback.hidden=true;
  if(!ids.length){document.getElementById('route-time-summary').textContent='';document.getElementById('route-budget-status').textContent='';return;}
  document.getElementById('route-time-summary').textContent=ids.length+' '+(ids.length===1?'место':ids.length<5?'места':'мест')+' · '+describe(ids);
  const range=estimate(ids,byId),limit=Number(budget.value);let message='Выберите доступное время, чтобы проверить нагрузку.';
  if(limit){
   if(range.unknown.length)message='Общую длительность пока нельзя проверить: у части мест нет точного диапазона. '+(range.min>limit?'Даже известная часть уже превышает выбранное время.':'Уточните время этих посещений и добавьте дорогу.');
   else if(range.min>limit)message='План перегружен: даже минимальное время посещения больше '+number(limit)+' ч. Уберите часть мест или разделите поездку на несколько дней.';
   else if(range.max>limit)message='Плотная программа: верхняя оценка превышает '+number(limit)+' ч. Выберите приоритетные места и оставьте запас на дорогу.';
   else message='Оценка посещений укладывается в '+number(limit)+' ч. Это не гарантия времени всей поездки: добавьте дорогу, перерывы и ожидание.';
  }
  document.getElementById('route-budget-status').textContent=message;
 }
 budget.addEventListener('change',()=>renderRoute(getSaved()));
 document.getElementById('share-route').addEventListener('click',async()=>{
  const ids=[...getSaved()];if(!ids.length)return;
  const url=new URL(location.href);url.search='';url.searchParams.set('route',ids.join(','));url.hash='shared-trip';
  if(navigator.share){try{await navigator.share({title:'Мой маршрут по Калининградской области',text:'Посмотрите выбранные места и добавьте их в свой маршрут.',url:url.href});onMessage('Диалог отправки маршрута закрыт.');return;}catch(error){if(error.name==='AbortError'){onMessage('Отправка отменена.');return;}}}
  try{await navigator.clipboard.writeText(url.href);onMessage('Ссылка на маршрут скопирована. В ней только номера выбранных мест.');}catch{fallback.hidden=false;shareInput.value=url.href;shareInput.focus();shareInput.select();onMessage('Скопируйте ссылку из поля под маршрутом.');}
 });
 const shared=document.getElementById('shared-trip'),sharedAdd=document.getElementById('shared-trip-add');
 const parameter=new URL(location.href).searchParams.get('route');
 if(parameter!==null){
  shared.hidden=false;const valid=parameter.length<=256&&/^\d+(,\d+)*$/.test(parameter);const raw=valid?[...new Set(parameter.split(',').map(Number))]:[];const ids=raw.filter(id=>Number.isSafeInteger(id)&&byId.has(id));
  const list=document.getElementById('shared-trip-list');for(const id of ids){const li=document.createElement('li'),link=document.createElement('a');link.href='#place-'+id;link.textContent=byId.get(id).short;li.append(link);list.append(li);}
  document.getElementById('shared-trip-status').textContent=ids.length?'В подборке мест: '+ids.length+'. '+describe(ids)+(ids.length<raw.length?' Некоторые места недоступны в этой версии путеводителя.':''):'Ссылка не содержит доступных мест. Ваш маршрут не изменён.';
  sharedAdd.disabled=!ids.length;sharedAdd.addEventListener('click',()=>onAdd(ids));
  document.getElementById('shared-trip-dismiss').addEventListener('click',()=>{
   shared.hidden=true;const url=new URL(location.href);url.searchParams.delete('route');if(url.hash==='#shared-trip')url.hash='trip-builder';history.replaceState(null,'',url);document.getElementById('trip-time').focus();
  });
  if(!location.hash||location.hash==='#shared-trip')requestAnimationFrame(()=>{shared.scrollIntoView({behavior:'auto'});const title=document.getElementById('shared-trip-title');title.tabIndex=-1;title.focus({preventScroll:true});});
 }
 return {renderRoute};
}
window.BaltikaTrips={create,visitRange,estimate,recommend};
})();
