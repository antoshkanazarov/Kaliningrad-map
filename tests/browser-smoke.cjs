/* Optional QA runner. Requires playwright-core and a local Chromium installation. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [375,1280]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[],apiCalls=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiCalls.push(r.url());});
   const response=await page.goto(process.env.BASE_URL||'http://127.0.0.1:8000');assert.equal(response.status(),200);
   assert.equal(await page.locator('#account-open,#account-dialog').count(),0);
   assert.equal(await page.evaluate(()=>typeof window.L),'undefined','Leaflet must stay deferred');
   await page.locator('.discovery-card').first().click();await page.locator('#place-close').waitFor({state:'visible'});
   await page.locator('#place-save-action').click();assert.equal(await page.locator('#place-save-action').getAttribute('aria-pressed'),'true');
   await page.locator('#undo-route').click();assert.equal(await page.locator('#place-save-action').getAttribute('aria-pressed'),'false');
   await page.locator('#place-save-action').click();await page.locator('#place-dialog [data-visited-id="1"]').click();
   await page.locator('#reading-mode').click();assert.equal(await page.locator('#reading-mode').getAttribute('aria-pressed'),'true');
   await page.locator('#font-up').click();await page.keyboard.press('Escape');
   assert.ok(await page.locator('.discovery-card').first().evaluate(e=>e===document.activeElement));
   await page.locator('#search').fill('Кант');assert.equal(await page.locator('.place-card:visible').count(),1);
   await page.locator('#search-clear').click();assert.equal(await page.locator('.place-card:visible').count(),10);
   await page.reload();assert.equal(await page.locator('[data-route-count]').first().textContent(),'1');assert.equal(await page.locator('#font-size').textContent(),'21 px');
   assert.match(await page.locator('#visited-progress').textContent(),/1 из/);
   await page.locator('#trip-builder-form button[type=submit]').click();assert.ok(await page.locator('.trip-suggestion').count()>0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(await page.context().cookies(),[]);assert.deepEqual(apiCalls,[]);assert.deepEqual(errors,[]);
   console.log('PASS browser smoke: '+width+'px');await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
