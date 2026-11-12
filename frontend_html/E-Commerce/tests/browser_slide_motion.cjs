const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/';
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  await page.goto(base+'home.html');
  await page.locator('[data-slider-toggle]').click();
  let navigations=0,documents=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  page.on('request',request=>{if(request.resourceType()==='document')documents++;});
  await page.evaluate(()=>{window.sliderTestNode=document.querySelector('.slider-viewport');window.sliderTestPanels=[...document.querySelectorAll('[data-slide-panel]')];});
  const checks=[];const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   await page.evaluate(()=>{nexaApplySlide(0);document.querySelectorAll('[data-slide-panel]').forEach(p=>p.getAnimations().forEach(a=>a.finish()));});
   const before=await page.locator('.slider-viewport').boundingBox();
   await page.evaluate(()=>{
    nexaApplySlide(1);
    document.querySelectorAll('[data-slide-panel]').forEach(p=>p.getAnimations().forEach(a=>{a.pause();a.currentTime=125;}));
   });
   const state=await page.evaluate(()=>{
    const panels=[...document.querySelectorAll('[data-slide-panel]')],view=document.querySelector('.slider-viewport').getBoundingClientRect();
    const motion=panels[1].getAnimations()[0],keyframes=motion?.effect.getKeyframes()||[];
    return {left:view.left,right:view.right,height:view.height,outgoingHidden:getComputedStyle(panels[0]).display==='none',inert:panels[0].inert,slidesFromRight:keyframes.some(frame=>frame.transform==='translateX(100%)')&&/^translateX\(0(?:px)?\)$/.test(keyframes.at(-1)?.transform||''),incomingTransform:getComputedStyle(panels[1]).transform,incomingLoading:panels[1].querySelector('.hero-product-image')?.loading,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   check(state.outgoingHidden&&state.inert,`Outgoing slide is hidden and noninteractive at ${width}px`);
   check(state.slidesFromRight&&new DOMMatrix(state.incomingTransform).m41>0,`Incoming slide moves from right to left at ${width}px`);
   check(state.incomingLoading==='eager',`Active slide artwork loads immediately at ${width}px`);
   check(Math.abs(before.height-state.height)<1&&!state.overflow,`Stable height and no overflow at ${width}px`);
   await page.evaluate(()=>document.querySelectorAll('[data-slide-panel]').forEach(p=>p.getAnimations().forEach(a=>a.finish())));
   await page.waitForTimeout(30);
   check(await page.locator('.is-leaving').count()===0,`Transition cleans up at ${width}px`);
  }
  await page.evaluate(()=>{nexaApplySlide(0);nexaApplySlide(2);nexaApplySlide(1);document.querySelectorAll('[data-slide-panel]').forEach(p=>p.getAnimations().forEach(a=>a.finish()));});
  await page.waitForTimeout(30);
  check(await page.locator('.gear-hero').getAttribute('data-slide')==='1'&&await page.locator('.is-leaving').count()===0,'Rapid selections settle on the latest slide');
  check(await page.evaluate(()=>document.querySelector('.slider-viewport')===window.sliderTestNode&&window.sliderTestPanels.every(p=>p.isConnected)),'Original slider DOM is preserved');
  check(navigations===0&&documents===0,'Slide changes never navigate or reload the document');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
