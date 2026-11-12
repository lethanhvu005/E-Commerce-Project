const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, '../docs/screenshots');
fs.mkdirSync(out, {recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const report=[];
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:width<700?844:1000});
  await page.goto('http://127.0.0.1:8767/home.html');
  await page.locator('.gear-slide:not([hidden]) .hero-product-image').waitFor();
  await page.evaluate(()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');return Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,5000))]);});
  await page.waitForTimeout(600);
  await page.screenshot({path:path.join(out,`home-${width}.png`),fullPage:true});
  report.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),badImages:await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src))});
 }
 console.log(JSON.stringify({report,errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
