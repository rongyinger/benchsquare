(() => {
  'use strict';
  const M=LeaderboardModel,oldContent=detailContent,oldDetails=details;
  const views=new Map();
  function view(c){const key=c.id+':'+window.expertCenter.uid();if(!views.has(key))views.set(key,{query:'',mine:false,page:1,scenario:'scores',updatedAt:null});return views.get(key);}
  const team=c=>window.expertCenter.db.teams.find(t=>t.cid===c.id&&t.members.includes(window.expertCenter.uid()));
  const isDemo=c=>initial.some(x=>x.id===c.id)||c.id.startsWith('mine-example-')||c.id==='workbench-demo';
  // Upgrade only the old, exact fixture wording in cached sample competitions.
  // Creator-authored rules and unrelated saved fields remain their original values.
  let migrated=false;
  for(const c of state.competitions){
    const oldTie='并列时依次比较准确性、推理与依据得分，仍相同则由评审组复核。';
    if(c.mineStatusExample&&c.values?.rankRule?.includes(oldTie)){
      c.values.rankRule=c.values.rankRule.replace(oldTie,'同分显示并列名次（如1、2、2、4），同分团队按达到该分数的时间先后展示，时间不用于打破并列。榜单不自动决定获奖资格，并列获奖与奖金分配由评审组确认后另行公示。');migrated=true;
    }
  }
  if(migrated)persist();
  const date=n=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(n);
  function own(c){const t=team(c);return t?{...t,members:t.members.map(id=>window.expertCenter.names(id))}:null;}
  function data(c){const v=view(c),t=own(c);const rows=isDemo(c)&&v.scenario!=='empty'?M.fixtures(c.id,v.scenario==='scores'?t:null):[];return M.select(rows,{...v,teamId:t?.id});}
  function result(c){
    const v=view(c),t=own(c),d=data(c);v.page=d.page;
    let hint='';
    if(t&&!d.ranked.some(r=>r.id===t.id))hint=`<div class="lb-own-notice"><strong>${esc(t.name)} · 我的团队暂无成绩</strong><span>至少 3 道任务通过验收并完成评分后上榜，待审核及未通过提交不计分。</span></div>`;
    let body;
    if(!d.ranked.length)body='<div class="lb-empty"><span class="lb-empty-icon">'+icon('cup')+'</span><h3>成绩尚未公布</h3><p>任务通过验收并完成评分后，符合条件的团队将在这里上榜。</p><small>榜单成绩不代表最终获奖结果，以赛事公示为准。</small></div>';
    else if(!d.total)body='<div class="lb-empty">'+icon('search')+'<h3>'+(v.mine?'我的团队暂无上榜成绩':'没有找到匹配的团队')+'</h3><p>'+(v.mine?'通过验收并完成评分后，可在此查看团队排名。':'试试其他团队名称，或清除筛选条件。')+'</p><button class="button" data-lb="clear">清除筛选</button></div>';
    else body=`<div class="lb-table-wrap" tabindex="0" role="region" aria-label="排行榜表格，可横向滚动"><table class="lb-table"><caption class="lb-sr">按综合得分从高到低排列的团队排行榜</caption><thead><tr><th scope="col">排名</th><th scope="col">团队</th><th scope="col">成员</th><th scope="col" class="lb-number">综合得分 ↓</th><th scope="col" class="lb-number">有效提交</th><th scope="col">最近提交</th></tr></thead><tbody>${d.rows.map(r=>`<tr class="${r.id===t?.id?'lb-mine':''}"><td><span class="lb-rank ${r.rank<=3?'lb-top lb-top-'+r.rank:''}">${r.rank}</span></td><td><strong>${esc(r.name)}</strong>${r.id===t?.id?'<span class="lb-my-label">我的团队</span>':''}</td><td><div class="lb-members" aria-label="${esc(r.members.join('、'))}">${r.members.slice(0,3).map((n,i)=>`<span class="lb-avatar lb-avatar-${i}" title="${esc(n)}">${esc(n.slice(-2))}</span>`).join('')}${r.members.length>3?'<span class="lb-avatar lb-avatar-more">+'+(r.members.length-3)+'</span>':''}</div></td><td class="lb-number lb-score">${(r.score/100).toFixed(2)}</td><td class="lb-number">${r.valid}</td><td class="lb-date">${esc(date(r.lastAt))}</td></tr>`).join('')}</tbody></table></div>`;
    return `${hint}<div class="lb-meta"><span>上榜 <b>${d.ranked.length}</b> 支团队${v.query||v.mine?' · 找到 '+d.total+' 支':''}</span><span>最近更新：${v.updatedAt?esc(date(v.updatedAt)):'尚未更新'}</span></div>${body}${d.total?`<nav class="lb-pagination" aria-label="排行榜分页"><span>第 ${d.page} / ${d.pages} 页 · 每页 10 支团队</span><div><button class="button" data-lb="prev" ${d.page===1?'disabled':''}>上一页</button><button class="button" data-lb="next" ${d.page===d.pages?'disabled':''}>下一页</button></div></nav>`:''}`;
  }
  function content(c){
    const v=view(c),t=own(c);if(!v.updatedAt)v.updatedAt=Date.now();
    return `<section class="leaderboard" aria-labelledby="lb-title"><header class="lb-heading"><div><div class="lb-kicker">COMPETITION LEADERBOARD</div><h2 id="lb-title">公开排行榜 ${isDemo(c)?'<span class="lb-demo-badge">演示数据</span>':''}</h2><p>让每一份高质量贡献，都有迹可循。</p></div><button class="button lb-refresh" data-lb="refresh" aria-label="更新排行榜"><span aria-hidden="true">↻</span> 更新</button></header><div class="lb-controls"><label class="lb-search">${icon('search')}<input type="search" id="lb-search" placeholder="搜索团队名称" aria-label="搜索排行榜团队" value="${esc(v.query)}"></label><label class="lb-only-mine"><input type="checkbox" id="lb-only-mine" ${v.mine?'checked':''} ${t?'':'disabled'}>仅看我的团队</label></div><p class="lb-rule">按验收通过且已评分的最高 3 道任务平均分排名，分数越高越好；不足 3 道不上榜。同分并列，按达到该分数的时间展示。</p>${isDemo(c)?`<div class="lb-demo-controls"><label for="lb-scenario">演示场景</label><select id="lb-scenario"><option value="scores" ${v.scenario==='scores'?'selected':''}>已有成绩</option><option value="unscored" ${v.scenario==='unscored'?'selected':''}>我的团队暂无成绩</option><option value="empty" ${v.scenario==='empty'?'selected':''}>全场暂无成绩</option></select><span>模拟成绩仅用于展示，不关联真实审核结果。</span></div>`:''}<div id="lb-results" aria-live="polite">${result(c)}</div><p class="lb-footnote">公开榜单供参赛进度参考，最终获奖名单以赛事公示为准。${!t?'报名并完成组队后，可查看我的团队成绩。':''}</p></section>`;
  }
  detailContent=function(c){return detailTab==='排行榜'?content(c):oldContent(c);};
  details=function(c){const html=oldDetails(c);return detailTab==='排行榜'?html.replace('class="detail-grid"','class="detail-grid lb-full-width"'):html;};
  function update(){const c=find(currentId);if(c&&detailTab==='排行榜'&&$('#lb-results'))$('#lb-results').innerHTML=result(c);}
  document.addEventListener('input',e=>{if(e.target.id!=='lb-search')return;const c=find(currentId);if(!c)return;Object.assign(view(c),{query:e.target.value,page:1});update();});
  document.addEventListener('change',e=>{const c=find(currentId);if(!c)return;const v=view(c);if(e.target.id==='lb-only-mine'){v.mine=e.target.checked;v.page=1;update();}if(e.target.id==='lb-scenario'){v.scenario=e.target.value;v.page=1;update();}});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-lb]');if(!b)return;const c=find(currentId);if(!c)return;const v=view(c);switch(b.dataset.lb){case 'refresh':v.updatedAt=Date.now();update();toast(isDemo(c)?'演示榜单已更新，模拟成绩保持不变。':'排行榜已更新。');break;case 'clear':Object.assign(v,{query:'',mine:false,page:1});$('#lb-search').value='';$('#lb-only-mine').checked=false;update();$('#lb-search').focus();break;case 'prev':v.page--;update();break;case 'next':v.page++;update();break;}});
  render();
})();
