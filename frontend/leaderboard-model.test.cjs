'use strict';
const assert=require('node:assert/strict'),M=require('./leaderboard-model.js');
const teams=[{id:'c',name:'丙',score:9520,valid:3,achievedAt:3},{id:'a',name:'甲',score:9685,valid:3,achievedAt:2},{id:'d',name:'丁',score:9400,valid:4,achievedAt:4},{id:'b',name:'乙',score:9520,valid:6,achievedAt:1},{id:'pending',name:'待评分',score:null,valid:4},{id:'zero',name:'零道',score:9900,valid:0}];
const before=JSON.stringify(teams),ranked=M.rank(teams);
assert.deepEqual(ranked.map(t=>[t.id,t.rank]),[['a',1],['b',2],['c',2],['d',4]]);
assert.equal(JSON.stringify(teams),before);
assert.deepEqual(M.select(teams,{query:' 丙 '}).rows.map(t=>t.rank),[2]);
assert.deepEqual(M.select(teams,{mine:true,teamId:'d'}).rows.map(t=>t.rank),[4]);
assert.equal(M.select(teams,{mine:true,teamId:'missing'}).total,0);
const sample=M.fixtures('test',{id:'mine',name:'我的队',members:['我']});
assert.equal(M.select(sample).pages,2);assert.equal(M.select(sample,{page:99}).page,2);
assert.equal(M.select(sample,{mine:true,teamId:'mine'}).rows[0].rank,6);
assert.equal(M.select([],{page:2}).page,1);
console.log('Leaderboard passed: eligibility, precision, competition ranking, stable tie order, immutable input, global ranks under filters, pagination and own team.');

assert.deepEqual(M.rank([{id:'one',score:9300,valid:1,achievedAt:1},{id:'two',score:9400,valid:2,achievedAt:1},{id:'zero',score:9900,valid:0},{id:'pending',score:null,valid:1}]).map(t=>t.id),['two','one']);
assert.equal(M.fixtures('test')[0].valid,1);assert.equal(M.fixtures('test')[1].valid,2);
