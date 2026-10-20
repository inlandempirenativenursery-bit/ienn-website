// node tests/promo-banner.browser.test.js  (needs puppeteer; PUPPETEER_PATH optional)
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const puppeteer=require(process.env.PUPPETEER_PATH||"puppeteer");
let mode="ok";
const page=(cfg)=>`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>Sample</title>
<body style="margin:0;font-family:system-ui"><header style="padding:16px;background:#2f6b2f;color:#fff"><b>SAMPLE PAGE</b> — order page stand-in</header>
${Array.from({length:6},(_, i)=>`<div style="margin:12px;padding:16px;border:1px solid #ccc;border-radius:12px;height:120px">Sample plant card ${i+1}<br><span style="color:#2f6b2f">Available</span></div>`).join("")}
<script>${cfg}</script><script src="/js/promo-banner.js" defer></script>`;
const srv=http.createServer((q,r)=>{const u=new URL(q.url,"http://x");
  if(u.pathname==="/js/promo-banner.js"){r.setHeader("content-type","text/javascript");return r.end(fs.readFileSync(path.join(__dirname,"../js/promo-banner.js")));}
  if(u.pathname==="/exec"){if(mode==="fail"){r.statusCode=500;return r.end("x");}
    r.setHeader("content-type","application/json");return r.end(JSON.stringify({promos:mode==="none"?[]:[{id:mode==="v2"?"fall-2":"fall-1",title:"Fall sale",message:"Planting season is here.",discountNote:""}]}));}
  r.setHeader("content-type","text/html");r.end(page(u.pathname==="/attr"?"":"window.IENN_CONFIG={EXEC_URL:'/exec'}"));});
(async()=>{await new Promise(r=>srv.listen(0,r));const base="http://127.0.0.1:"+srv.address().port;
  const b=await puppeteer.launch({executablePath:"/usr/bin/google-chrome",args:["--no-sandbox"]});const p=await b.newPage();
  await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errs=[];p.on("pageerror",e=>errs.push(e));
  const dlg=()=>p.$('[role=dialog]');let n=0;const ok=s=>{n++;console.log("ok -",s)};
  await p.goto(base+"/");await p.waitForSelector("[role=dialog]");
  assert.strictEqual(await p.$eval("[role=dialog]",e=>e.getAttribute("aria-modal")),"true");
  assert.strictEqual(await p.evaluate(()=>document.activeElement.textContent),"Shop now");ok("shows active promo, focus on Shop now");
  const sz=await p.$eval(".ienn-promo__x",e=>[e.offsetWidth,e.offsetHeight]);assert.ok(sz[0]>=44&&sz[1]>=44);ok("close target >=44px");
  await p.keyboard.press("Tab");await p.keyboard.press("Tab");assert.strictEqual(await p.evaluate(()=>document.activeElement.textContent),"Shop now");ok("focus trapped");
  await p.keyboard.press("Escape");assert.strictEqual(await dlg(),null);ok("Esc dismisses");
  await p.reload();await new Promise(r=>setTimeout(r,600));assert.strictEqual(await dlg(),null);ok("dismissal remembered");
  mode="v2";await p.reload();await p.waitForSelector("[role=dialog]");await p.click(".ienn-promo__cta");assert.strictEqual(await dlg(),null);ok("new promo ID shows again; Shop now dismisses");
  mode="v3";await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForSelector("[role=dialog]");await p.click(".ienn-promo__x");assert.strictEqual(await dlg(),null);ok("close button dismisses");
  mode="fail";await p.evaluate(()=>localStorage.clear());await p.reload();await new Promise(r=>setTimeout(r,600));assert.strictEqual(await dlg(),null);ok("fails silently on 500");
  mode="none";await p.reload();await new Promise(r=>setTimeout(r,600));assert.strictEqual(await dlg(),null);ok("no promos -> nothing");
  await p.goto(base+"/attr");await new Promise(r=>setTimeout(r,600));assert.strictEqual(await dlg(),null);ok("no EXEC_URL -> nothing");
  await p.goto(base+"/?promo=preview");await p.waitForSelector("[role=dialog]");
  await p.screenshot({path:"/workspace/ienn-shots/promo-modal.png"});ok("preview hook -> /workspace/ienn-shots/promo-modal.png");
  assert.strictEqual(errs.length,0,String(errs));ok("no page errors");
  console.log(n+" passed");await b.close();srv.close();})().catch(e=>{console.error(e);process.exit(1)});
