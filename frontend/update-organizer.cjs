const fs=require('fs');const p=__dirname+'/app.js';let s=fs.readFileSync(p,'utf8');
const next=`let organizerTab='manage';
function organizer(){
 const rows=state.competitions;
 const counts=c=>{const local=state.participation;return {registered:local?Object.keys(local.regs[c.id]||{}).length:(state.registrations[c.id]?1:0),teams:local?local.teams.filter(t=>t.cid===c.id).length:(state.registrations[c.id]?.team?1:0)};};
 const totals=rows.reduce((sum,c)=>{const n=counts(c);sum.registered+=n.registered;sum.teams+=n.teams;return sum;},{registered:0,teams:0});
 const stats=[['创建的比赛',rows.length],['已发布比赛',rows.filter(c=>c.stage==='已发布').length],['累计报名人次',totals.registered],['参赛团队',totals.teams]];
 let html=heading('主办方中心','管理你创建的比赛，跟踪发布进度与参赛数据。','<button class="button dark" data-action="create">＋ 创建比赛</button>');
 html+='<div class="organizer-stats">'+stats.map(([label,value])=>'<div class="panel"><span>'+label+'</span><strong>'+value+'</strong></div>').join('')+'</div>';
 html+='<div class="tabs" role="tablist"><button class="tab '+(organizerTab==='manage'?'active':'')+'" role="tab" aria-selected="'+(organizerTab==='manage')+'" data-organizer-tab="manage">赛事管理</button><button class="tab '+(organizerTab==='data'?'active':'')+'" role="tab" aria-selected="'+(organizerTab==='data')+'" data-organizer-tab="data">数据概览</button></div>';
 if(organizerTab==='data')return html+'<p class="organizer-data-note">按你创建的比赛统计当前浏览器中的报名记录和有效团队。累计报名人次按比赛分别计数；浏览量、Task 提交和评审数据尚未接入。</p>'+(rows.length?'<div class="panel table-wrap"><table class="data-table"><thead><tr><th>比赛</th><th>发布状态</th><th>报名人数</th><th>有效团队</th><th>Task 提交</th></tr></thead><tbody>'+rows.map(c=>{const n=counts(c);return '<tr><td><b>'+esc(c.values.name)+'</b></td><td>'+esc(c.stage)+'</td><td>'+n.registered+'</td><td>'+n.teams+'</td><td>尚未接入</td></tr>';}).join('')+'</tbody></table></div>':'<div class="empty"><h3>暂无赛事数据</h3><p>创建比赛后，在这里查看对应的报名与团队数据。</p><button class="button dark" data-action="create">创建比赛</button></div>');
 if(Object.keys(state.draft).length)html+='<div class="team-card"><div class="team-avatar">D</div><div><h3>'+esc(state.draft.name||'未命名比赛')+'</h3><p>本地草稿 · 尚未提交</p></div><button class="button" data-action="create">继续编辑</button></div>';
 html+='<div class="notice">在这里创建、编辑、查看比赛方案与发布状态。方案提交后由平台处理审核，主办方可查看补正要求并跟进后续事项。</div>';
 return html+(rows.length?'<div class="panel table-wrap" style="padding:0"><table class="data-table"><thead><tr><th>比赛 / 主办方</th><th>奖金池</th><th>状态</th><th>操作</th></tr></thead><tbody>'+rows.map(c=>'<tr><td><b>'+esc(c.values.name)+'</b><small>'+esc(c.values.organizer)+' · v'+(c.version||1)+'</small>'+(c.reason?'<small>补正要求：'+esc(c.reason)+'</small>':'')+(c.paymentDeadline&&c.stage==='待付款'?'<small>付款期限：'+new Date(c.paymentDeadline).toLocaleString('zh-CN')+'</small>':'')+'</td><td>'+money(c.values.pool)+'</td><td><span class="badge">'+esc(c.stage)+'</span></td><td>'+rowActions(c)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><h3>创建你的第一场比赛</h3><p>明确任务、规则、赛程与奖励，开始准备比赛方案。</p><button class="button dark" data-action="create">开始创建</button></div>');
}
function rowActions(c){const b=(label,action)=>'<button class="button small" data-action="'+action+'" data-id="'+c.id+'">'+label+'</button>';if(c.stage==='审核中')return b('查看方案','view-plan')+' '+b('撤回修改','withdraw');if(c.stage==='待付款')return b('奖金托管','pay');if(['已驳回','审核已过期','草稿'].includes(c.stage))return b('修改并重新提交','edit');if(c.stage==='已发布')return '<a class="button small" href="#competition/'+c.id+'">查看比赛</a>';return b('查看方案','view-plan');}
document.addEventListener('click',e=>{const tab=e.target.closest('[data-organizer-tab]');if(tab){organizerTab=tab.dataset.organizerTab;render();}});
`;
s=s.replace(/function organizer\(admin=false\)[\s\S]*?(?=function plan\(c\))/,next);
s=s.replace("$('#review-count').textContent=state.competitions.filter(c=>['审核中','奖金已托管'].includes(c.stage)).length;",'');
s=s.replace("root==='admin'?organizer(true):",'');
s=s.replace(",admin:'审核工作台'",'');
// Remove obsolete operator actions and review form; submission status remains an organizer concern.
s=s.split('\n').filter(line=>!/^\s*if\(action==='(?:review|publish|confirm-publish)'/.test(line)&&!/^\s*if\(form.id==='review-form'/.test(line)).join('\n');
fs.writeFileSync(p,s);
