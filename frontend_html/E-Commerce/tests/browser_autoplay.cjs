/* Browser clock checks for the five-second carousel lifecycle. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/';
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  await page.clock.install();
  await page.goto(base+'home.html');
  await page.locator('[data-slider-toggle]').waitFor();
  const slide=()=>page.locator('.gear-hero').getAttribute('data-slide');
  const leave=async()=>{await page.mouse.move(0,0);await page.locator('.masthead .gear-brand').focus();};
  const tick=()=>page.clock.fastForward(5100);
  const checks=[];
  const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
  await leave();
  for(let n=1;n<=3;n++){await tick();check(await slide()===String(n%3),`Automatic slide ${n%3+1}, including wraparound`);}
  await page.locator('.gear-hero').hover();const hovered=await slide();await tick();
  check(await slide()!==hovered,'Autoplay continues while the mouse is over the hero');
  check(await page.locator('.gear-slide:not([hidden])').evaluate(el=>el.getAnimations().some(a=>a.effect.getKeyframes().some(frame=>frame.opacity!==undefined))),'Slide change fades in without showing the previous slide');
  await page.locator('.gear-hero').click({position:{x:15,y:15}});const clicked=await slide();await tick();
  check(await slide()!==clicked,'Clicking the hero does not leave autoplay stuck');
  await page.keyboard.press('Tab');await page.locator('.gear-hero').focus();const focused=await slide();await tick();
  check(await slide()===focused,'Keyboard focus pauses autoplay');
  await page.locator('[data-slider-toggle]').click();await leave();const paused=await slide();await tick();
  check(await slide()===paused,'Pause button stops autoplay');
  await page.evaluate(()=>initSlider());await leave();await tick();
  check(await slide()===paused,'Explicit pause survives slider reinitialization');
  await page.locator('[data-slider-toggle]').click();await leave();await tick();
  check(await slide()!==paused,'Play button resumes autoplay');
  await page.locator('[data-ux="slide-set"][data-slide="2"]').click();
  await page.clock.fastForward(4000);check(await slide()==='2','Manual selection gets a fresh five-second interval');
  await page.clock.fastForward(1100);check(await slide()==='0','Manual selection resumes with wraparound');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);
  const reduced=await slide();await tick();check(await slide()===reduced,'Reduced motion stops autoplay');
  check(await page.locator('[data-slider-toggle]').getAttribute('aria-pressed')==='true','Pause state is accessible');
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
