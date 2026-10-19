const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('local assets and in-page links resolve, without duplicate IDs',()=>{
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'duplicate HTML ID');
 for(const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)(?:[?#][^"]*)?"/g))assert.ok(fs.existsSync(path.join(root,match[1])),match[1]);
 for(const match of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(match[1]),'missing anchor '+match[1]);
});
test('map libraries stay deferred and images reserve their layout size',()=>{
 assert.ok(!/<script[^>]+src="assets\/(?:js\/leaflet|vendor\/)/.test(html),'map library eagerly loaded');
 for(const match of html.matchAll(/<img\b[^>]*>/g)){
  assert.match(match[0],/\bwidth="\d+"/);assert.match(match[0],/\bheight="\d+"/);assert.match(match[0],/\balt="[^"]+"/);
  if(!match[0].includes('id="evening-photo"'))assert.match(match[0],/loading="lazy"/);
 }
});
test('the static guest site has no account dependency, cookie setter or API calls',()=>{
 assert.ok(!/account-dialog|account-open|account\.js|account\.css/.test(html));
 for(const file of fs.readdirSync(path.join(root,'assets/js')).filter(f=>f.endsWith('.js'))){
  const source=fs.readFileSync(path.join(root,'assets/js',file),'utf8');
  assert.ok(!/document\.cookie\s*=/.test(source),'cookie setter in '+file);
  assert.ok(!/fetch\(['"]\/api\//.test(source),'backend dependency in '+file);
 }
});
