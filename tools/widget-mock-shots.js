// Renders docs/screenshots/widget/*.png (EXAMPLE numbers) from tools/widget-mock.html. Usage: PW=<playwright path> node tools/widget-mock-shots.js (run from repo root)
const pw=require(process.env.PW);(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome'});
const p=await b.newPage({deviceScaleFactor:3,viewport:{width:460,height:300}});
for(const [name,size,state,per] of [['small-30d','small','ok','d30'],['medium-ytd','medium','ok','ytd'],['medium-all','medium','ok','all'],
  ['small-ok','small','ok','d7'],['medium-ok','medium','ok','d7'],['medium-thresholds','medium','thresholds','d30'],['small-offline','small','offline','d7'],['medium-fallback','medium','nobg','d7']]){
 await p.goto(`file://${require('path').resolve(__dirname,'widget-mock.html')}?size=${size}&state=${state}&p=${per}`);
 await p.locator('#p').screenshot({path:`docs/screenshots/widget/${name}.png`});}
await b.close();})();
