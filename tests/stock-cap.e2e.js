const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright'); const A=require('assert');
const D='docs/screenshots/stock-cap/', B='http://localhost:8836/';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for (const w of [360,390]){
const ctx=await b.newContext({viewport:{width:w,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const pg=await ctx.newPage();
await pg.route(/script\.google\.com/,r=>r.request().method()==='POST'?r.abort():r.continue());
await pg.goto(B+'index.html');await pg.waitForTimeout(9000);
const m=await pg.$$eval('.card',cs=>cs.map(c=>{const f=c.querySelector('.pane-front')||c;const ph=c.querySelector('.ph');return{n:c.dataset.id,h:Math.round(c.getBoundingClientRect().height),of:f.scrollHeight>f.clientHeight+1,ov:ph?[...ph.children].filter(x=>x.tagName==='SPAN'&&!x.classList.contains('leaf')).length:0,low:(c.querySelector('.incart.low-tag')||{}).textContent||''}}));
if(w===390){const c0=pg.locator('.card[data-id=black-sage]');}console.log(w,JSON.stringify(m.filter(x=>x.h!==436||x.of||x.ov>3)), 'low:',m.filter(x=>x.low).map(x=>x.n).join(','));
if(w===360){await ctx.close();continue;}
// black sage 1 gal qty 2: add up to cap
const c=pg.locator('.card[data-id="black-sage"]');await c.scrollIntoViewIfNeeded();
const plus=c.locator('.stepper button').nth(1);
for(let i=0;i<5;i++){if(await plus.isDisabled())break;await plus.tap();}
console.log('stepper val',await c.locator('.stepper input').inputValue(),'plus disabled',await plus.isDisabled());
await c.locator('.add').tap();await pg.waitForTimeout(300);
console.log('after add msg:',await c.locator('.incart').textContent(),'| add:',await c.locator('.add').textContent(),await c.locator('.add').isDisabled());
await pg.waitForTimeout(2800);console.log('settled msg:',await c.locator('.incart').textContent());
await c.screenshot({path:D+'card-at-cap-390.png'});
const lowc=pg.locator('.card:has(.incart.low-tag)').first();if(await lowc.count()){await lowc.scrollIntoViewIfNeeded();await lowc.screenshot({path:D+'low-stock-tag-390.png'});}
const cart=await pg.evaluate(()=>localStorage.getItem('ienn-cart-v2'));console.log('cart',cart);
// stale cart
await pg.evaluate(()=>localStorage.setItem('ienn-cart-v2',JSON.stringify({'white-sage|1 gal':25,'black-sage|1 gal':9,'desert-marigold|1 gal':3})));
await pg.goto(B+'order.html');await pg.waitForTimeout(9000);await pg.evaluate(()=>window.iennOpenCheckout&&window.iennOpenCheckout());await pg.waitForTimeout(800);
console.log('tray:',(await pg.locator('#summary-body').innerText()).replace(/\n/g,' / '));
const ws=pg.locator('#summary-body li',{hasText:'White sage'});const dp=ws.locator('.tq button').nth(1);console.log('tray + disabled',await dp.isDisabled());
console.log('stored',await pg.evaluate(()=>localStorage.getItem('ienn-cart-v2')));
await pg.locator('#summary-body').scrollIntoViewIfNeeded();await pg.locator('#summary-body').screenshot({path:D+'tray-clamped-390.png'});
await ws.locator('.tq button').nth(0).tap();await pg.waitForTimeout(200);console.log('after minus + disabled',await ws.locator('.tq button').nth(1).isDisabled());
await ws.locator('.tq button').nth(1).tap();console.log('after plus',await ws.locator('.tq span').first().textContent(), await ws.locator('.tq button').nth(1).isDisabled());
await ctx.close();}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
