'use strict';
const assert=require('node:assert/strict');
const View=require('./task-detail-view.js');
const record={id:'task-<unsafe>',competitionId:'event',revision:2,status:'待初审',form:{name:'current'},history:[
  {revision:1,at:'2026-11-18T01:00:00Z',by:'提交人甲',form:{name:'first'}},
  {revision:2,at:'2026-11-19T01:00:00Z',by:'提交人乙',form:{name:'second'}}
],reviews:[
  {revision:1,to:'终检中',at:'2026-11-18T03:00:00Z',by:'初审员',note:'初审通过，进入终检'},
  {revision:1,to:'需修改',at:'2026-11-18T04:00:00Z',by:'终检员',note:'<script>请补边界测试</script>'}
]};
const before=JSON.stringify(record);
const html=View.renderHistory(record,{renderForm:f=>'<p>'+View.escape(f.name)+'</p>',highlightRevision:1});
assert.ok(html.indexOf('data-revision="2"')<html.indexOf('data-revision="1"'),'newest formal submission comes first');
const current=html.slice(html.indexOf('data-revision="2"'),html.indexOf('data-revision="1"'));
assert.match(current,/second/);
assert.match(current,/本版本审核中/);
assert.ok(!current.includes('进入终检')&&!current.includes('补边界测试'),'older review feedback must not leak into a new pending version');
const prior=html.slice(html.indexOf('data-revision="1"'));
assert.match(prior,/first/);
assert.match(prior,/初审通过 · 终检中[\s\S]*需补正/,'each recorded reviewer decision remains attached to its version');
assert.equal((html.match(/class="version-review /g)||[]).length,2);
assert.match(prior,/已定位版本/);
assert.match(html,/&lt;script&gt;请补边界测试&lt;\/script&gt;/);
assert.ok(!html.includes('<script>'));
assert.match(html,/data-do="history:task-&lt;unsafe&gt;:1"/);
const customized=View.renderHistory(record,{renderForm:(f,v)=>'<p>v'+v.revision+' '+View.escape(f.name)+'</p>',previewButton:(r,v)=>'<button data-read-version="'+v.revision+'">查看内容</button>'});
assert.match(customized,/data-read-version="1"/);
assert.ok(!customized.includes('data-do='),'organizer history buttons can use their own event namespace');
assert.equal(View.renderHistory({id:'draft',revision:0,history:[],reviews:[]}), '');
assert.equal(JSON.stringify(record),before,'rendering must not mutate snapshots or audit records');
console.log('Task detail view passed: version content, pending feedback isolation, complete review process, safe text and caller-specific preview actions.');
