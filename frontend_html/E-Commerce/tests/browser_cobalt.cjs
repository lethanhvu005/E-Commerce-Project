const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/';
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  const check=(value,label)=>{assert.ok(value,label);checks.push(label)};
  for(const [width,height] of [[1366,620],[1440,900],[768,900],[390,844],[320,740]]){
   await page.setViewportSize({width,height});
   await page.goto(base+'home.html');
   await page.evaluate(()=>document.fonts.ready);
   await page.locator('[data-slider-toggle]').click();
   check(await page.evaluate(()=>document.fonts.check('400 40px "Cormorant Garamond"')&&document.fonts.check('italic 40px "Cormorant Garamond"')&&document.fonts.check('400 12px Manrope')),`Local fonts loaded at ${width}`);
   for(let slide=0;slide<3;slide++){
    await page.evaluate(n=>nexaApplySlide(n),slide);
    const panel=page.locator(`.gear-slide[data-slide-panel="${slide}"]`);
    await panel.locator('img').evaluate(i=>i.decode());
    const cta=await panel.locator('.hero-buy .btn').boundingBox();
    check(cta.y>=0&&cta.y+cta.height<=height,`Campaign ${slide+1} CTA visible at ${width}x${height}`);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Campaign ${slide+1} fits width ${width}`);
    if(slide===0&&[1366,390].includes(width))await page.screenshot({path:path.join(__dirname,`../docs/screenshots/cobalt-${width}.png`)});
   }
   if(width>=1000){
    await page.goto(base+'prd_detail.html?id=1');
    await page.locator('.pd-product-art img').evaluate(i=>i.decode());
    const buy=await page.locator('.pd-buy-row').boundingBox();
    check(buy.y+buy.height<=height,`Detail purchase controls visible at ${width}x${height}`);
    if(width===1366)await page.screenshot({path:path.join(__dirname,'../docs/screenshots/cobalt-detail.png')});
   }
  }
  check(errors.length===0,'No browser errors or missing assets: '+errors.join('; '));
  console.log(JSON.stringify({base,passed:checks.length,checks},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
