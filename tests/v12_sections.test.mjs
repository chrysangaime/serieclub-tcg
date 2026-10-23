import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v12/streaming-sections.css','utf8');
const home=fs.readFileSync('v12/home.js','utf8');
const legacy=fs.readFileSync('v3/views.js','utf8');

test('V12.2 applies latest SVOD identity after home and all legacy styles',()=>{
 const a=html.indexOf('v11/design-system.css');
 const b=html.indexOf('v12/svod.css');
 const c=html.indexOf('v12/streaming-sections.css?v=12.2.0');
 assert.ok(a>=0&&b>a&&c>b);
 assert.match(html,/v12\/cinema-hero\.svg/);
 assert.match(html,/v3\/icon\.svg\?v=(?:12\.1\.0|1\.0\.0)/);
});
test('all major sections receive shared TV tokens in both light and night',()=>{
 const sections=['.sc59-explorer','.sc52-group-card','.sc7-mode','.sc7-quiz',
  '.sc60-quiz','.sc10-season-card','.sc4-album','.sc4-person','.sc10-shop-hero',
  '.sc10-premium-card','.sc10-profile-hero','.sc60-fusion-hero'];
 for(const section of sections)assert.ok(css.includes(section),'missing '+section);
 assert.match(css,/:root\[data-theme="day"\] \.sc7-quiz/);
 assert.match(css,/:root\[data-theme="day"\] \.sc10-premium-card/);
 assert.match(css,/:root\[data-theme="day"\] \.sc7-answer\.is-correct/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('rarity tiers remain untouched by the new sitewide CSS',()=>{
 assert.doesNotMatch(css,/\.sc53-rarity-(?:commune|legendaire|unique|mythique)/i);
 assert.doesNotMatch(css,/rarity_source\s*=/);
 assert.match(legacy,/export function officialRarity\(/);
});
test('illustrations are in the repository, not fabricated third-party streaming links',()=>{
 const hero=fs.readFileSync('v12/cinema-hero.svg','utf8');
 assert.match(hero,/<svg /);
 assert.match(hero,/viewBox="0 0 1600 650"/);
 assert.match(home,/s\.homeShows/);
 assert.match(home,/sc12-pack-backdrop/);
 assert.match(home,/Premium.*?aperçu|une vitrine|en préparation/i);
 assert.doesNotMatch(home,/stripe\.checkout|payment_method|https:\/\/www\.netflix\.com/i);
});
test('toolbar has accessible search, account, balance link and straight logo',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 const cssHome=fs.readFileSync('v12/svod.css','utf8');
 assert.match(app,/id="globalSearchForm"/);
 assert.match(app,/id="globalSearchInput"/);
 assert.match(app,/id="mobileTopSearch"/);
 assert.match(app,/id="topSearch"/);
 assert.match(app,/sc12-account-face/);
 assert.match(app,/sc12-add-credit/);
 assert.match(app,/sc12-logo-word/);
 assert.match(cssHome,/#sidebar \.logo \.logo-mark/);
 assert.match(cssHome,/transform:none!important/);
});
