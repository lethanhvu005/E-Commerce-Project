const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/';
(async()=>{
 const browser=await chromium.launch();let checks=0;
 try{
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
  const check=(v,msg)=>{assert.ok(v,msg);checks++};
  for(const width of [1366,1440,1024,768,390,320]){
   await page.setViewportSize({width,height:width===1366?620:844});
   await page.goto(base+'home.html');await page.evaluate(()=>document.fonts.ready);
   for(let slide=0;slide<3;slide++){
    await page.evaluate(n=>nexaApplySlide(n),slide);
    await page.locator('.gear-slide:not([hidden]) img').evaluate(i=>i.decode());await page.waitForTimeout(250);
    const baseline=path.join(__dirname,`../docs/screenshots/glass-baseline-dark-${width}-${slide}.png`);
    if(fs.existsSync(baseline)){
     const shot=await page.screenshot();fs.writeFileSync(path.join(__dirname,`../docs/screenshots/glass-current-dark-${width}-${slide}.png`),shot);
     const same=require('node:child_process').execFileSync('py',['-3','-c',
      'import sys,io;from PIL import Image,ImageChops;a=Image.open(sys.argv[1]).convert("RGB");b=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB");print(ImageChops.difference(a,b).getbbox() is None)',baseline],{input:shot}).toString().trim();
     check(same==='True',`Dark pixels unchanged ${width}/${slide}`);
    }
   }
   await page.locator('.gear-actions [data-ux="theme"]').evaluate(el=>el.click());
   await page.locator('.campaign-motion img').evaluate(i=>i.decode());
   const state=await page.locator('.campaign-motion').evaluate(el=>{
    const image=el.querySelector('img'),glass=el.querySelector('.hero-glass'),stage=el.querySelector('.gear-stage');
    const box=e=>e.getBoundingClientRect().toJSON();
    return {image:box(image),stage:box(stage),title:box(el.querySelector('h1')),cta:box(el.querySelector('.hero-buy')),glass:getComputedStyle(glass).backdropFilter,glassZ:+getComputedStyle(glass).zIndex,imageZ:+getComputedStyle(image).zIndex,fit:getComputedStyle(image).objectFit,filter:getComputedStyle(image).filter};
   });
   check(state.glass.includes('14px')&&state.glassZ<state.imageZ,'Glass blur is behind product');
   check(state.fit==='contain'&&!state.filter.startsWith('blur'),'Product stays sharp and uncropped');
   check(state.image.x>=state.stage.x-.5&&state.image.right<=state.stage.right+.5&&state.image.bottom<=state.stage.bottom+.5,'Image fits scene');
   check(state.cta.bottom<=(width===1366?620:844),'CTA visible without scrolling');
   check(width<=600?state.stage.y>=state.cta.bottom:state.stage.x>=state.title.right-1,'Art does not overlap heading or CTA');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
   if([1366,768,390].includes(width))await page.screenshot({path:path.join(__dirname,`../docs/screenshots/premium-light-${width}.png`)});
   // Reset preference for the next baseline comparison.
   await page.locator('.gear-actions [data-ux="theme"]').evaluate(el=>el.click());
  }
  check(errors.length===0,'No browser or asset errors: '+errors.join('; '));
  console.log(JSON.stringify({passed:checks,base,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
