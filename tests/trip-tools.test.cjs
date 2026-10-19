const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/trip-tools.js'),'utf8'),context);
const {visitRange,estimate,recommend}=context.window.BaltikaTrips;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const places=JSON.parse(html.match(/<script id="places-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const byId=new Map(places.map(p=>[p.id,p]));
test('visit ranges handle hours, decimal commas and minutes without inventing a half-day duration',()=>{
 const hours=visitRange(byId.get(4));assert.equal(hours[0],1);assert.equal(hours[1],1.5);
 const minutes=visitRange(byId.get(11));assert.equal(minutes[0],.75);assert.equal(minutes[1],1.5);
 assert.equal(visitRange(byId.get(6)),null);
 assert.equal(visitRange({duration:'уточните у площадки'}),null);
});
test('route estimates distinguish a known subtotal from unquantified visits',()=>{
 const mixed=estimate([1,6],byId);assert.equal(mixed.min,1);assert.equal(mixed.max,2);assert.equal(mixed.unknown.length,1);assert.equal(mixed.unknown[0].id,6);
 const known=estimate([1,11],byId);assert.equal(known.min,1.75);assert.equal(known.max,3.5);assert.equal(known.unknown.length,0);
 const empty=estimate([],byId);assert.equal(empty.min,0);assert.equal(empty.max,0);
});
test('recommendations respect time, transport and interest instead of silently relaxing constraints',()=>{
 for(const time of [3,6,10])for(const transport of ['walk','transfer'])for(const interest of ['any','city','museums','sea','nature']){
  const programmes=recommend({time,transport,interest},byId);assert.ok(programmes.length<=3);
  for(const programme of programmes){
   assert.ok(programme.ids.every(id=>byId.has(id)));
   assert.equal(new Set(programme.ids).size,programme.ids.length);
   assert.ok(transport==='transfer'||programme.transport==='walk');
   assert.ok(interest==='any'||programme.tags.includes(interest));
   if(programme.fullDay)assert.equal(time,10);else assert.ok(estimate(programme.ids,byId).max<=time);
  }
 }
 assert.equal(recommend({time:6,transport:'walk',interest:'sea'},byId).length,0);
 assert.ok(recommend({time:6,transport:'transfer',interest:'sea'},byId).length>0);
 assert.ok(recommend({time:3,transport:'walk',interest:'city'},byId).length>0);
});
