// node tests/promos.test.js  — fake Sheet tests for ?api=promos
const fs=require("fs"),vm=require("vm"),assert=require("assert");
function ctx(rows){
  const sheets={}; if(rows) sheets.Promos=rows;
  const mk=(n)=>({getLastRow:()=>sheets[n].length,getDataRange:()=>({getValues:()=>sheets[n].map(r=>r.slice())}),
    appendRow:r=>sheets[n].push(r),setFrozenRows(){},getRange:(r,c,nr,nc)=>({setValues:v=>v.forEach((x,i)=>sheets[n][r-1+i]=x),setNumberFormat(){}})});
  const ss={getSheetByName:n=>sheets[n]?mk(n):null,insertSheet:n=>{sheets[n]=[];return mk(n)}};
  const c={sheets,Utilities:{formatDate:(d,tz)=>new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(d)},
    Session:{getScriptTimeZone:()=>"America/Los_Angeles"},SpreadsheetApp:{getActiveSpreadsheet:()=>ss},CacheService:{getScriptCache:()=>({get:()=>null,put(){},remove(){}})},
    ContentService:{createTextOutput:t=>({t,setMimeType(){return this}}),MimeType:{JSON:1}},console};
  vm.createContext(c); vm.runInContext(fs.readFileSync(__dirname+"/../apps-script/ienn-api.gs","utf8"),c);
  c.ienn_ss_=()=>ss; return c;
}
const H=["Active","Title","Message","Start date","End date","Discount note","ID"];
let n=0; const t=(name,f)=>{f();n++;console.log("ok -",name)};
const rows=[H,
 ["yes","Fall sale","m","2026-11-01","2026-11-30","",""],
 [true,"Open","m",new Date("2026-10-01T12:00:00Z"),"","10% off","OPEN1"],
 ["No","Off","m","2026-01-01","2027-01-01","",""],
 ["yes","Past","m","2026-01-01","2026-02-01","",""],
 ["Y","Slash","m","10/20/2026","10/20/2026","set before activating",""],
 ["yes","Bad","m","soon","",""," "]];
const ids=(c,iso)=>c.ienn_activePromos_(new Date(iso)).promos.map(p=>p.id).slice();
const A=a=>Array.from(a);
t("inactive, past, unparseable excluded; blank end open-ended; checkbox true",()=>{
  assert.deepStrictEqual(A(ids(ctx(rows),"2026-10-20T19:00:00Z")),["OPEN1","slash-2026-10-20"]);});
t("timezone: 2026-11-01 06:30Z is still Oct 31 in LA -> fall not active",()=>{
  assert.ok(!ids(ctx(rows),"2026-11-01T06:30:00Z").includes("fall-sale-2026-11-01"));});
t("start inclusive (LA midnight Nov 1)",()=>{assert.ok(ids(ctx(rows),"2026-11-01T07:30:00Z").includes("fall-sale-2026-11-01"));});
t("end inclusive (Nov 30 23:30 LA), gone Dec 1 LA",()=>{const c=ctx(rows);
  assert.ok(ids(c,"2026-12-01T07:30:00Z").includes("fall-sale-2026-11-01"));
  assert.ok(!ids(c,"2026-12-01T08:30:00Z").includes("fall-sale-2026-11-01"));});
t("placeholder discount note hidden, real one passed",()=>{const p=ctx(rows).ienn_activePromos_(new Date("2026-10-20T19:00:00Z")).promos;
  assert.strictEqual(p[0].discountNote,"10% off");assert.strictEqual(p[1].discountNote,"");});
t("missing tab -> empty",()=>assert.deepStrictEqual(ctx().ienn_activePromos_().promos.length,0));
t("setup creates headers + 3 inactive examples; idempotent; none active",()=>{const c=ctx();c.ienn_setupPromosTab_();
  assert.deepStrictEqual(A(c.sheets.Promos[0]),H);assert.strictEqual(c.sheets.Promos.length,4);
  assert.ok(c.sheets.Promos.slice(1).every(r=>r[0]==="No"));assert.match(c.ienn_setupPromosTab_(),/already/);
  assert.strictEqual(c.ienn_activePromos_(new Date("2026-11-15T20:00:00Z")).promos.length,0);});
t("route ?api=promos returns JSON",()=>{const c=ctx(rows);assert.ok(JSON.parse(c.ienn_api_doGet_({parameter:{api:"promos"}}).t).promos);});
console.log(n+" passed");
