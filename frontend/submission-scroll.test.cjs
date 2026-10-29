'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BENCHSQUARE_BROWSER||'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/frontend/submission.html#new');
  assert.equal(await page.locator('[data-do="sample"],.demo-banner,.context-panel').count(),0);
  const active=n=>page.waitForFunction(n=>document.querySelector('.step-sidebar [aria-current="step"]')?.dataset.section===String(n),n);
  await active(1);
  for(const n of [2,3,4,3,1]){
   await page.locator('#section-'+n).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-40,behavior:'instant'}));
   await active(n);assert.equal(await page.locator('.step-sidebar>a.active').count(),1);
  }
  await page.locator('.step-sidebar [data-section="4"]').click();await active(4);
  assert.equal(await page.locator('.step-sidebar [data-section="1"]').evaluate(el=>el.classList.contains('active')),false);
  await page.screenshot({path:__dirname+'/submission-scroll-preview.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#section-4').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-40,behavior:'instant'}));await active(4);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log('Submission navigation passed: example blocks removed, downward/upward scrolling, click positioning, single active step and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
