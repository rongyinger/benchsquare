(() => {
  'use strict';
  const previous=teamContent;
  teamContent=function(c){
    const html=previous(c),user=window.expertCenter.uid();
    const p=window.expertCenter.db;
    const team=p.teams.find(t=>t.cid===c.id&&t.members.includes(user));
    if(!team||!p.regs[c.id]?.[user]||sessionStorage.getItem('expert-demo-out')==='yes')return html;
    let rows;
    try{rows=TeamContributions.summarize(DataItems.read().records,team,user);}
    catch{return html+'<section class="participation-card"><h3>成员贡献明细 · 队内可见</h3><p role="status">暂时无法读取任务记录，请保留本地数据后重试。</p></section>';}
    const total=rows.reduce((n,r)=>n+r.submitted,0);
    const panel=`<section class="participation-card team-contributions" aria-labelledby="team-contributions-title"><h3 id="team-contributions-title">成员贡献明细 <span class="participation-status">队内可见</span></h3><p>查看本队成员的提交与录用进度。仅展示数量，个人任务内容和附件仍由本人查看。</p><div class="table-wrap" role="region" aria-label="成员贡献表格，可横向滚动" tabindex="0"><table class="data-table"><thead><tr><th scope="col">成员</th><th scope="col">已提交任务</th><th scope="col">已录用任务</th><th scope="col">审核中任务</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(window.expertCenter.names(r.id))}${r.id===user?'（我）':''} · ${r.id===team.leader?'队长':'成员'}</td><td>${r.submitted}</td><td>${r.accepted}</td><td>${r.pending}</td></tr>`).join('')}</tbody></table></div>${!total?'<p class="participation-hint">本队暂无已提交任务，成员首次提交后会更新对应数量。</p>':''}<p class="participation-hint">按本比赛、本团队当前成员的任务归属统计，每个任务只计一次，补正不重复计数；未提交草稿、个人合成示例及归属不明的记录不计入。已录用和审核中均为已提交任务的子集。</p><p class="participation-hint">数量用于了解提交进度，不代表完整协作贡献，不计算贡献占比、个人排名或奖金分配。演示数据仅保存在当前浏览器，排行榜模拟成绩独立展示。</p></section>`;
    const anchor=html.includes('<h3>入队申请</h3>')?'<h3>入队申请</h3>':'<h3>下一步</h3>';
    return html.replace(anchor,panel+anchor);
  };
  window.addEventListener('storage',e=>{if(e.key===DataItems.key)render();});
  render();
})();
