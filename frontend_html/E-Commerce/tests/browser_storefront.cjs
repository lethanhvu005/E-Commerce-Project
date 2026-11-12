/* Run with a local HTTP server. Set PLAYWRIGHT_MODULE if Playwright is outside this checkout. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8767/';
const checks=[];
function ok(value,label){assert.ok(value,label);checks.push(label);}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base+'home.html');
  await page.locator('.gear-hero').waitFor();
  ok(await page.locator('.desktop-account a[href="login.html"]').isVisible(),'Desktop login visible');
  ok(await page.locator('.desktop-account a[href="register.html"]').isVisible(),'Desktop register visible');
  await page.locator('.desktop-account a[href="register.html"]').click();
  await page.waitForURL('**/register.html');ok(await page.locator('form[data-ux-form="register"]').count(),'Register route works');
  await page.goto(base+'home.html');
  const first=await page.locator('.gear-slide:not([hidden]) h1').innerText();
  await page.locator('.gear-hero').focus();await page.keyboard.press('ArrowRight');
  ok(await page.locator('.gear-slide:not([hidden]) h1').innerText()!==first,'Slider next changes product');
  ok((await page.locator('.gear-slide:not([hidden]) .hero-product-image').getAttribute('src')).includes('cobalt-keys'),'Slider changes image');
  await page.locator('.gear-hero').focus();await page.keyboard.press('ArrowLeft');
  ok(await page.locator('.gear-slide:not([hidden]) h1').innerText()===first,'Keyboard previous slide');
  await page.locator('[data-ux="slide-set"][data-slide="2"]').click();
  ok(await page.locator('[data-ux="slide-set"][data-slide="2"]').getAttribute('aria-pressed')==='true','Slide selection state');
  await page.locator('.gear-slide:not([hidden]) .hero-buy .btn').click();
  await page.waitForURL('**/prd.html?cat=*');ok(true,'Slide CTA opens matching category');
  await page.goto(base+'home.html');
  await page.locator('.gear-mega summary').focus();await page.keyboard.press('Enter');
  ok(await page.locator('.mega-panel').isVisible(),'Mega menu keyboard open');
  await page.keyboard.press('Escape');ok(!await page.locator('.mega-panel').isVisible(),'Mega menu Escape close');
  await page.locator('.gear-search input').fill('75%');await page.locator('.gear-search input').press('Enter');
  await page.waitForURL('**/prd.html');ok(await page.locator('.gear-card').count()===2,'Search includes actual product specifications');
  await page.goto(base+'home.html');await page.locator('.gear-mega summary').click();await page.locator('.mega-category-grid a').filter({hasText:'Chuột'}).first().click();
  await page.waitForURL('**/prd.html');ok(await page.locator('.gear-card').count()===2,'Category resets earlier search');
  await page.goto(base+'home.html');await page.locator('.editorial-links a').first().click();
  await page.waitForURL('**/prd.html?*');ok(await page.locator('.gear-card').count()===2,'Editorial 75% filter link');
  await page.goto(base+'home.html');await page.locator('.gear-card [data-action="add"]').first().click();
  ok(await page.locator('.gear-count').innerText()==='1','Add to cart updates header count');
  await page.reload();ok(await page.locator('.gear-count').innerText()==='1','Cart persists after reload');
  await page.locator('.gear-cart').click();await page.waitForURL('**/cart.html');ok(await page.locator('.cart-line').count()===1,'Cart route displays product');
  await page.goto(base+'home.html');await page.locator('.gear-favorite').first().click();
  ok(await page.locator('.gear-favorite').first().getAttribute('aria-pressed')==='true','Wishlist toggles and reports state');
  await page.locator('.wishlist-link').click();await page.waitForURL('**/wishlist.html');ok(await page.locator('.gear-card').count()===1,'Wishlist route retains selection');
  await page.goto(base+'home.html');await page.locator('.desktop-account .login-link').click();await page.waitForURL('**/login.html');
  await page.locator('[data-ux-form="login"] input[name="email"]').fill('preview@example.test');
  await page.locator('[data-ux-form="login"] input[name="password"]').fill('demo-only-password');
  await page.locator('[data-ux-form="login"] button[type="submit"]').click();await page.waitForURL('**/profile.html');
  ok(await page.locator('.desktop-account .gear-account').count()===1,'Demo auth switches header to account');
  await page.locator('.desktop-account summary').click();ok((await page.locator('.desktop-account .account-panel').innerText()).includes('mô phỏng'),'Account menu declares demo');
  await page.locator('.desktop-account [data-ux="logout"]').click();ok(await page.locator('.desktop-account .login-link').isVisible(),'Logout restores login');
  await page.goto(base+'home.html');
  await page.locator('.gear-actions [data-ux="theme"]').click();
  await page.reload();ok(await page.locator('html').getAttribute('data-theme')==='light','Theme persists');
  await page.waitForTimeout(400);
  await page.screenshot({path:path.join(__dirname,'../docs/screenshots/home-light.png'),fullPage:true});
  await page.locator('.gear-actions [data-ux="theme"]').click();
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:844});await page.goto(base+'home.html');
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow at ${width}`);
   if(width<=900){
    await page.locator('.gear-menu-button').click();
    ok(await page.locator('.mobile-auth .login-link').isVisible()&&await page.locator('.mobile-auth .register-link').isVisible(),`Mobile auth visible at ${width}`);
    ok(await page.locator('#ux-mobile-menu').evaluate(el=>el.scrollWidth<=innerWidth),`Mobile menu fits ${width}`);
    ok(!await page.locator('.ux-chat').isVisible(),`Chat does not cover mobile menu at ${width}`);
    await page.waitForTimeout(400);
    if(width===390)await page.screenshot({path:path.join(__dirname,'../docs/screenshots/mobile-menu.png')});
    await page.keyboard.press('Shift+Tab');
    ok(await page.evaluate(()=>document.activeElement.closest('#ux-mobile-menu')!==null),`Menu focus stays inside at ${width}`);
    await page.keyboard.press('Escape');ok(!await page.locator('#ux-mobile-menu').isVisible(),`Escape closes mobile menu at ${width}`);
    ok(await page.locator('.gear-menu-button').evaluate(el=>el===document.activeElement),`Menu restores focus at ${width}`);
    await page.locator('.gear-menu-button').click();await page.locator('[data-ux="mobile-close"]').click();
    ok(!await page.locator('#ux-mobile-menu').isVisible(),`Close button works at ${width}`);
   }
  }
  const hero=page.locator('.gear-hero');
  const before=await page.locator('#slide-number').innerText();
  await hero.evaluate(el=>{
   const start=new Event('touchstart');start.touches=[{clientX:280,clientY:200}];el.dispatchEvent(start);
   const end=new Event('touchend');end.changedTouches=[{clientX:70,clientY:205}];el.dispatchEvent(end);
  });
  ok(await page.locator('#slide-number').innerText()!==before,'Horizontal touch gesture advances slide');
  ok(await page.locator('.gear-slide:not([hidden])').evaluate(el=>getComputedStyle(el).animationName)==='none','Reduced motion disables slide animation');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.masthead .gear-brand').focus();await page.mouse.move(0,0);
  const auto=await page.locator('#slide-number').innerText();await page.waitForTimeout(5700);
  ok(await page.locator('#slide-number').innerText()!==auto,'Autoplay advances after five seconds');
  await page.setViewportSize({width:1440,height:1000});
  for(const file of fs.readdirSync(path.join(__dirname,'..')).filter(f=>f.endsWith('.html'))){
   await page.goto(base+file);
   ok(await page.locator('#app').innerText().then(t=>t.length>100),`Renders ${file}`);
  }
  ok(errors.length===0,`No console errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({base,passed:checks.length,checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
