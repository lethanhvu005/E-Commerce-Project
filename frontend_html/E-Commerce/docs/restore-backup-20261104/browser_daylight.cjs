const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/';
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
  let checks=0;
  const check=(v,msg)=>{assert.ok(v,msg);checks++};
  for(const width of [1366,768,390,320]){
   await page.setViewportSize({width,height:width===1366?620:844});
   await page.goto(base+'home.html');
   await page.evaluate(()=>document.fonts.ready);
   for(let slide=0;slide<3;slide++){
    await page.evaluate(n=>{document.documentElement.dataset.theme='dark';applyCampaignTheme();nexaApplySlide(n)},slide);
    const measure=()=>page.locator('.gear-slide:not([hidden])').evaluate(el=>{
     return ['h1','.hero-benefit','.hero-buy','.campaign-index'].map(s=>{const e=el.querySelector(s),c=getComputedStyle(e);return {box:e.getBoundingClientRect().toJSON(),font:c.fontFamily,size:c.fontSize,text:e.textContent}});
    });
    const dark=await measure();
    const node=await page.locator('.slider-viewport').elementHandle();
    // Use the actual toggle handler even when the desktop button is hidden.
    await page.locator('.gear-actions [data-ux="theme"]').evaluate(el=>el.click());
    await page.locator('.gear-slide:not([hidden]) img').evaluate(img=>img.decode());
    const after=await measure();
    check(slide===2?after.every((v,i)=>v.text===dark[i].text&&v.font===dark[i].font):JSON.stringify(after)===JSON.stringify(dark),`Content and fonts preserved; other slides retain layout: ${width}, slide ${slide}`);
    check(await node.evaluate(el=>el===document.querySelector('.slider-viewport')), 'Slider DOM preserved');
    check((await page.locator('.gear-slide:not([hidden]) img').getAttribute('src')).endsWith(slide===2?'cutout.png':'-day.png'),'Daylight image selected');
    check(await page.locator('.gear-header').evaluate(el=>getComputedStyle(el).backgroundColor)==='rgb(248, 250, 255)','White header');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
    if(slide===2&&[1366,390].includes(width))await page.screenshot({path:path.join(__dirname,`../docs/screenshots/daylight-${width}.png`)});
   }
  }
  await page.reload();
  check(await page.locator('html').getAttribute('data-theme')==='light','Theme persists after reload');
  check((await page.locator('.campaign-sound img').getAttribute('src')).endsWith('-day.png'),'Saved light theme restores correct image');
  await page.locator('.gear-actions [data-ux="theme"]').evaluate(el=>el.click());
  check((await page.locator('.campaign-sound img').getAttribute('src')).endsWith('sound-wide.png'),'Night image restored');
  check(errors.length===0,'No errors: '+errors.join('; '));
  console.log(JSON.stringify({passed:checks,base,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
