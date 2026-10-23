// Test réel du rendu mobile/desktop — navigation NON connectée, aucune écriture en base.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const url=process.env.SITE_URL||"http://127.0.0.1:4173/";
await mkdir("browser-artifacts",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
 for(const device of [{name:"android-mobile",width:390,height:844,isMobile:true,hasTouch:true},{name:"desktop",width:1366,height:900,isMobile:false,hasTouch:false}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.isMobile,hasTouch:device.hasTouch,deviceScaleFactor:1,locale:"fr-FR"});
  const page=await context.newPage();
  page.setDefaultTimeout(35000);
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:50000});
  await page.locator("#topbar [data-theme-toggle]").waitFor();
  await page.locator("#page h1").waitFor();
  const initial=await page.evaluate(()=>document.documentElement.dataset.theme);
  assert.ok(["day","night"].includes(initial));
  await page.locator("#topbar [data-theme-toggle]").click();
  assert.notEqual(await page.evaluate(()=>document.documentElement.dataset.theme),initial);
  await page.locator("footer [data-route=privacy]").click();
  await page.getByRole("heading",{name:/Comprendre et contrôler tes données/i}).waitFor();
  await page.locator("footer [data-route=legal]").click();
  await page.getByRole("heading",{name:/Mentions légales en préparation/i}).waitFor();
  await page.locator("footer [data-route=support]").click();
  await page.getByRole("heading",{name:/Signaler un problème/i}).waitFor();
  await page.locator("[data-auth]").first().click();
  await page.locator("#authForgotPassword").waitFor();
  await page.locator("#authPassword").waitFor();
  await page.locator("#overlay [data-close]").click();
  const size=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.inner+8,device.name+": horizontal overflow "+JSON.stringify(size));
  await page.screenshot({path:"browser-artifacts/"+device.name+".png",fullPage:true});
  assert.deepEqual(errors.filter(x=>/SyntaxError|TypeError|ReferenceError/.test(x)),[],
   device.name+": runtime exceptions: "+errors.join(" | "));
  await context.close();
 }
 console.log("PASS: responsive Chrome, routes données/assistance, thème, connexion, aucun débordement majeur");
} finally { await browser.close(); }
