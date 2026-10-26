const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const listeners={click:[],submit:[],change:[],input:[]};
const nodes={};
const state={participation:{active:'chen'},competitions:[],notices:[],draft:{}};
const context={state,console,Date,Number,String,Object,Array,location:{hash:'#organizer'},window:{addEventListener(){}},
  document:{body:{classList:{toggle(){},remove(){}}},title:'',addEventListener(type,fn){listeners[type].push(fn);},querySelector(){return null;},querySelectorAll(){return[];}},
  $:selector=>nodes[selector] ||= {textContent:'',innerHTML:''},
  esc:String,render(){},expire(){},setSiteNavigation(){},persist(){},close(){},toast(){},modal(){},plan(){return'';},money:String,heading(){return'';},currentId:'',platformCompetitionRules:{},DEMO_COMPETITIONS:[],
  FormData:class{constructor(form){this.data=form.data;}get(key){return this.data[key]??null;}has(key){return key in this.data;}getAll(key){return this.data[key]||[];}}
};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/demo-fixtures.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/admin.js','utf8'),context);
function submit(id,c,data={},more={}){const form={id,dataset:{id:c?.id,version:String(c?.version),actor:state.participation.active,...more},data};const e={target:form,preventDefault(){},stopImmediatePropagation(){}};for(const fn of listeners.submit)fn(e);}
function competition(id,stage='审核中',ownerId='rong'){const c={id,ownerId,stage,version:1,values:{name:id,pool:30000},history:[]};state.competitions.push(c);return c;}
const c=competition('审核与发布');
submit('admin-decision',c,{result:'approve',note:'通过'});
assert.equal(c.stage,'待付款');assert.equal(state.notices[0].to,'rong');
submit('admin-decision',c,{result:'reject',note:'重复提交'});assert.equal(c.stage,'待付款');assert.equal(c.history.length,1);
const own=competition('本人创建','审核中','chen');submit('admin-decision',own,{result:'approve'});assert.equal(own.stage,'审核中');
const rejected=competition('退回');submit('admin-decision',rejected,{result:'reject',note:''});assert.equal(rejected.stage,'审核中');
submit('admin-decision',rejected,{result:'reject',note:'补充材料'});assert.equal(rejected.stage,'已驳回');assert.equal(rejected.reason,'补充材料');
const limit=competition('原因字数边界');submit('admin-decision',limit,{result:'reject',note:'字'.repeat(501)});assert.equal(limit.stage,'审核中');
submit('admin-decision',limit,{result:'reject',note:'😀'.repeat(500)});assert.equal(limit.stage,'已驳回');
state.participation.active='rong';submit('event-payment',c,{reference:'DEMO-TEST'});assert.equal(c.stage,'待托管核验');
state.participation.active='chen';submit('admin-transition',c,{result:'approve',ack:'on'},{kind:'funds'});assert.equal(c.stage,'待托管核验');
state.participation.active='zhou';submit('admin-transition',c,{result:'approve'},{kind:'funds'});assert.equal(c.stage,'待托管核验');
submit('admin-transition',c,{result:'approve',ack:'on'},{kind:'funds'});assert.equal(c.stage,'待发布');
submit('admin-transition',c,{ack:'on'},{kind:'publication'});assert.equal(c.stage,'待发布');
state.participation.active='xu';c.escrow=1;submit('admin-transition',c,{ack:'on'},{kind:'publication'});assert.equal(c.stage,'待发布');
c.escrow=30000;submit('admin-transition',c,{ack:'on'},{kind:'publication'});assert.equal(c.stage,'已发布');
submit('event-access-form',null,{user:'xu',permission:['review']});assert.ok(state.eventAccess.xu.includes('access'));
state.participation.active='chen';const failure=competition('保存失败回滚');const noticeCount=state.notices.length;context.persist=()=>false;
submit('admin-decision',failure,{result:'approve'});assert.equal(state.competitions.find(c=>c.id===failure.id).stage,'审核中');assert.equal(state.notices.length,noticeCount);context.persist=()=>true;
state.draft={name:'容莹草稿'};state.participation.active='rong';context.window.competitionAdmin.switchDraft('chen');assert.equal(state.draft.name,undefined);
state.participation.active='chen';context.window.competitionAdmin.switchDraft('rong');assert.equal(state.draft.name,'容莹草稿');
console.log('Passed: reviewer ownership, rejection reasons, duplicate decisions, owner notifications, escrow submission, role boundaries, confirmation, amount consistency, publication, last administrator protection and draft isolation.');
