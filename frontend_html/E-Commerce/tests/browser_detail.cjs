const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/';
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[],checks=[];
  const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(base+'prd_detail.html?id=1');
  await page.locator('.pd-product-art img').evaluate(img=>img.decode());
  check((await page.locator('#pd-title').innerText()).includes('NEXA X75'),'Product name matches URL');
  await page.screenshot({path:path.join(__dirname,'../docs/screenshots/detail-desktop.png')});
  await page.evaluate(()=>{window.detailNode=document.querySelector('.pd-experience')});
  let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  const initialTransform=await page.locator('.pd-product-art').evaluate(el=>getComputedStyle(el).transform);
  await page.locator('.pd-thumbnail[data-detail-view="close"]').click();
  check(await page.locator('.pd-artwork').getAttribute('data-view')==='close','Thumbnail changes viewing mode');
  check(await page.locator('.pd-product-art').evaluate(el=>getComputedStyle(el).transform)!==initialTransform,'Close-up enlarges the actual image');
  check(await page.locator('[data-detail-view="close"][aria-pressed="true"]').count()===2,'Gallery dots and thumbnails stay synchronized');
  await page.locator('[data-detail-tone="rose"]').click();
  check(await page.locator('.pd-artwork').getAttribute('data-tone')==='rose','Illustration color changes in place');
  await page.locator('[data-detail-variant]').selectOption('Silent');
  check(await page.evaluate(()=>ui.variant)==='Silent','Demo switch selection retained');
  await page.locator('[data-detail-action="increase"]').click();
  check(await page.locator('.pd-quantity output').innerText()==='2','Quantity increments');
  await page.locator('[data-detail-action="add"]').click();
  check(await page.locator('.gear-count').innerText()==='2','Add uses selected quantity and updates header');
  check(await page.evaluate(()=>state.cart.find(item=>item.id===1)?.qty)===2,'Cart state stores the correct product and quantity');
  await page.locator('[data-detail-action="favorite"]').click();
  check(await page.locator('.pd-save').getAttribute('aria-pressed')==='true','Wishlist button updates');
  check(navigations===0&&await page.evaluate(()=>window.detailNode===document.querySelector('.pd-experience')),'Detail interactions preserve the page and DOM');
  await page.reload();
  check(await page.locator('.gear-count').innerText()==='2'&&await page.locator('.pd-save').getAttribute('aria-pressed')==='true','Cart and wishlist survive reload');
  await page.evaluate(()=>{state.stock[1]=0;render()});
  check(await page.locator('[data-detail-action="add"]').isDisabled()&&await page.locator('[data-detail-action="buy"]').isDisabled(),'Out-of-stock product cannot be purchased');
  await page.reload();
  await page.locator('[data-detail-action="buy"]').click();await page.waitForURL('**/checkout.html');
  check(await page.locator('#checkout-form').count()===1,'Buy now reaches checkout with cart');
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:1100});
   for(const id of [1,2,3,4,11,12]){
    await page.goto(base+`prd_detail.html?id=${id}`);
    await page.locator('.pd-product-art img').evaluate(img=>img.decode());
    check(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),`Product ${id} fits ${width}px`);
    if(id!==1)check(await page.locator('[data-detail-variant]').count()===0,`No keyboard switches on product ${id} at ${width}px`);
    if(id===1&&width===390)await page.screenshot({path:path.join(__dirname,'../docs/screenshots/detail-mobile.png')});
   }
  }
  await page.setViewportSize({width:1440,height:1100});await page.goto(base+'prd_detail.html?id=1');
  await page.locator('.gear-theme').click();
  check(await page.locator('html').getAttribute('data-theme')==='light','Light theme remains available');
  check(await page.locator('.ux-detail-reviews').count()===1,'Reviews and discussion still render');
  check(errors.length===0,`No browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({base,passed:checks.length,checks},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
