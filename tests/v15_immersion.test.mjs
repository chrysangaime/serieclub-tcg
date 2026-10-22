import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {svodHome} from '../v12/home.js';
test('V15 replaces V14 styling with distinct night/day palettes',()=>{
 const h=fs.readFileSync('index.html','utf8'),s=fs.readFileSync('v15/cinema.css','utf8');
 assert.match(h,/v15\/cinema\.css\?v=15\.0\.0/);
 assert.doesNotMatch(h,/v14\/rebuild\.css/);
 assert.match(s,/:root\[data-theme="night"\]/);
 assert.match(s,/:root\[data-theme="day"\]/);
 assert.match(s,/@container sc15packs/);
});
test('The cinematic homepage has two real packs and a premium preview',()=>{
 const html=svodHome({isOctober:true,pack:'classic',user:{id:1},cards:[],wallet:{credits:120},
  homeShows:[{id:4,name:'From',genres:['Horror'],image_url:'https://example.com/poster.jpg'}],
  seasonShows:[],stock:{stock:7,maximum:10,recharge_seconds:25}
 },{foil:()=>'<span>OLD</span>',timecode:()=>''});
 for(const x of ['sc15-hero-posters','sc15-strip','sc15-pack-options','sc15-progress','sc15-foil--original','sc15-foil--halloween','sc15-foil--premium','id="openPack"'])assert.ok(html.includes(x),x);
 assert.match(html,/data-pack="classic"/);assert.match(html,/data-pack="halloween"/);
 assert.doesNotMatch(html,/data-pack="premium"|>OLD</);
});
test('Artwork URLs remain safe and empty artwork shows fallback',()=>{
 const h=svodHome({isOctober:false,user:null,pack:'classic',cards:[],homeShows:[{id:2,image_url:'javascript:alert(1)'}]}, {foil:()=>'',timecode:()=>''});
 assert.doesNotMatch(h,/src="javascript:/);assert.match(h,/sc15-tv-fallback/);
});
