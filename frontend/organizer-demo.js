(() => {
  'use strict';
  const M=OrganizerMocks,H=OrganizerHistory, oldRender=render, defaultEvent='organizer-mock-event';
  const views=new Map();
  const owner=()=>window.expertCenter?.uid()||state.participation?.active||'rong';
  const actor=()=>owner();
  function route(){const [,candidate,teamId]=location.hash.split('/');return candidate?.startsWith('T-')?{eventId:defaultEvent,teamId:candidate}:{eventId:candidate||defaultEvent,teamId:teamId||''};}
  const eventId=()=>route().eventId;
  const key=(id=eventId())=>M.storageKey+':'+owner()+(id===defaultEvent?'':':'+id);
  const viewKey=(id=eventId())=>owner()+':'+id;
  const view=()=>{const id=viewKey();if(!views.has(id))views.set(id,{query:'',status:'',anomalies:false,submitted:false,tab:'tasks'});return views.get(id);};
  const listHref=(id=eventId())=>'#organizer-teams/'+encodeURIComponent(id);
  const teamHref=id=>listHref()+'/'+encodeURIComponent(id);
  const simulation=team=>{const v=view();v.simulations||={};return v.simulations[team.id]||=( {member:team.members[0].id,phase:'open'} );};
  const stamp=value=>value?new Date(value).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'尚未提交';
  const button=(label,action,extra='',classes='')=>`<button type="button" class="button ${classes}" data-od="${action}" data-od-event="${esc(eventId())}" ${extra}>${label}</button>`;
  function save(data){if(data.readonly)throw Error('当前赛事数据仅支持查看。');if(data.ownerId!==owner())throw Error('演示身份已变化，请重新操作。');localStorage.setItem(key(data.event.id),JSON.stringify(data));return data;}
  function readActual(id){
    const source=state.competitions.find(c=>c.id===id&&(c.ownerId||'rong')===owner());
    if(!source)throw Error('当前赛事不存在或无权管理，请返回赛事管理。');
    const name=user=>window.expertCenter?.names(user)||user;
    const teams=(state.participation?.teams||[]).filter(t=>t.cid===id).map(t=>({...t,leader:name(t.leader),members:t.members.map(user=>({id:user,name:name(user)})),registeredAt:state.participation?.regs?.[id]?.[t.leader]?.at,blacklisted:false}));
    return {version:M.version,ownerId:owner(),readonly:true,event:{...source,title:source.values?.name||source.title,demo:false},teams,tasks:[],anomalies:[],logs:[]};
  }
  function read(id=eventId()){
    if(!M.listEvents(owner()).some(e=>e.id===id))return readActual(id);
    const raw=localStorage.getItem(key(id));
    if(!raw)return save(M.generate(owner(),Date.now(),id));
    const data=JSON.parse(raw);
    if(data.ownerId!==owner()||data.event?.id!==id||data.version!==M.version||!['teams','tasks','anomalies','logs'].every(k=>Array.isArray(data[k])))throw Error('演示数据格式已变化，请恢复示例数据后重试。');
    // Preserve the original single-event fixtures and their test operations.
    if(!data.event.stage){
      const old=data.event,anchor=Date.parse(old.submissionEnd)-30*86400000;
      const definition=M.listEvents(owner(),Number.isFinite(anchor)?anchor:Date.now()).find(e=>e.id===id);
      data.event={...definition,values:{...definition.values,...old.values}};
      for(const field of ['registrationEnd','submissionStart','submissionEnd'])if(old[field]){data.event[field]=old[field];data.event.values[field]=old[field];}
      save(data);
    }
    if(M.upgradeProcess){const upgraded=M.upgradeProcess(data);if(upgraded!==data)return save(upgraded);}
    return data;
  }
  function status(label){const tone=label==='已拉黑'||label==='审核不通过'?'danger':label==='待处理'||label==='需补正'?'warning':['正常','已处理','审核通过','已录用'].includes(label)?'success':'neutral';return `<span class="od-badge od-${tone}">${esc(label)}</span>`;}
  const demoNote='<div class="od-demo-note"><span class="od-demo-label">MOCK 数据</span><span>虚构团队与审核结果，仅保存在当前浏览器；可自由测试并恢复。</span></div>';
  function header(data,team){
    const actions=team?'<a class="button" href="'+listHref(data.event.id)+'">返回团队列表</a>'+(data.readonly?'':button(team.blacklisted?'解除拉黑':'拉黑团队',team.blacklisted?'unblock':'block',`data-team="${esc(team.id)}"`,team.blacklisted?'':'od-danger')):'<a class="button" href="#organizer">返回赛事管理</a>'+(data.readonly?'':button('恢复本赛事示例','reset'));
    return `<div class="od-breadcrumb"><a href="#organizer">主办方中心</a><span>/</span><a href="${listHref(data.event.id)}">${esc(data.event.title)}</a><span>/</span><span>${team?esc(team.name):'赛事管理'}</span></div><header class="od-heading"><div><span class="od-kicker">ORGANIZER WORKSPACE</span><h1>${esc(team?.name||'赛事管理')} ${team?status(data.readonly?'已成队':team.blacklisted?'已拉黑':'正常'):status(M.lifecycle(data.event))}</h1><p>${esc(data.event.title)}${team?' · '+esc(team.id):''}</p></div><div class="od-actions">${actions}</div></header>${data.readonly?'':demoNote}`;
  }
  function actualTeams(data){return `${header(data)}<section class="od-list"><div class="od-list-heading"><h2>报名团队 · ${data.teams.length} 支</h2></div>${data.teams.length?'<div class="od-table-wrap"><table class="od-table"><thead><tr><th>团队</th><th>队长</th><th>成员人数</th><th>报名时间</th></tr></thead><tbody>'+data.teams.map(t=>'<tr><td><a class="od-team-name" href="'+teamHref(t.id)+'">'+esc(t.name)+'</a><small>'+esc(t.id)+'</small></td><td>'+esc(t.leader)+'</td><td>'+t.members.length+'</td><td>'+esc(stamp(t.registeredAt))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="od-empty"><h3>暂无报名团队</h3><p>报名并完成组队的团队将在这里展示。</p></div>'}</section>`;}
  function metrics(data){const s=M.stats(data),v=view();return `<section class="od-metrics" aria-label="当前示例赛事团队统计">${[
    ['all','已成队',s.teams,'全部报名团队',!v.status&&!v.anomalies&&!v.submitted],
    ['submitted','已提交',s.submittedTeams,'至少 1 条正式任务',v.submitted],
    ['anomalies','待处理异常',s.anomalyTeams,'按团队去重',v.anomalies],
    ['blocked','已拉黑',s.blacklistedTeams,'本赛事暂停提交',v.status==='blocked']
  ].map(([id,label,n,hint,selected])=>`<button type="button" class="od-metric ${selected?'is-selected':''}" data-od="metric" data-od-filter="${id}" aria-pressed="${!!selected}"><span>${label}</span><strong>${n}<small>支团队</small></strong><small>${hint}</small></button>`).join('')}</section>`;}
  function list(data){if(data.readonly)return actualTeams(data);const v=view();return `${header(data)}${metrics(data)}<section class="od-list"><div class="od-list-heading"><h2>报名团队</h2><p>查看团队的提交进展，优先跟进需要核查的问题。</p></div><div class="od-filters"><label class="od-search"><span aria-hidden="true">⌕</span><input type="search" id="od-search" value="${esc(v.query)}" placeholder="搜索团队、ID 或队长" aria-label="搜索团队、ID或队长"></label><select id="od-status" aria-label="筛选团队状态"><option value="">全部团队状态</option><option value="normal" ${v.status==='normal'?'selected':''}>正常</option><option value="blocked" ${v.status==='blocked'?'selected':''}>已拉黑</option></select><label class="od-check"><input type="checkbox" id="od-anomalies" ${v.anomalies?'checked':''}>仅看待处理异常</label><button type="button" class="od-link" data-od="clear">清除筛选</button></div><div id="od-results" aria-live="polite"></div></section>`;}
  function riskLink(data,team){
    const alert=data.anomalies.find(a=>a.status==='待处理'&&a.teamIds.includes(team.id));
    const target=alert?.taskRefs.find(ref=>data.tasks.some(t=>t.id===ref.taskId&&t.teamId===team.id));
    return target?`<button type="button" class="od-badge od-warning od-risk-button" data-od="task" data-od-event="${esc(eventId())}" data-task="${esc(target.taskId)}" data-version="${target.revision}">${team.summary.anomalyCount} 条待核查 →</button>`:`<span class="od-badge od-warning">${team.summary.anomalyCount} 条待核查</span>`;
  }
  function updateList(){
    const target=document.querySelector('#od-results');if(!target)return;
    const data=read(),v=view(),q=v.query.trim().toLowerCase();
    const rows=data.teams.map(t=>({...t,summary:M.teamSummary(data,t.id)})).filter(t=>(!q||[t.name,t.id,t.leader].some(x=>x.toLowerCase().includes(q)))&&(!v.status||(v.status==='blocked')===t.blacklisted)&&(!v.anomalies||t.summary.anomalyCount>0)&&(!v.submitted||t.summary.taskCount>0)).sort((a,b)=>(Date.parse(b.summary.lastSubmittedAt)||Number(b.summary.lastSubmittedAt)||0)-(Date.parse(a.summary.lastSubmittedAt)||Number(a.summary.lastSubmittedAt)||0));
    target.innerHTML=`<div class="od-list-count">显示 ${rows.length} / ${data.teams.length} 支团队${v.submitted?' · 已提交任务':''}</div>`+(rows.length?`<div class="od-table-wrap" role="region" aria-label="团队列表，可横向滚动" tabindex="0"><table class="od-table"><thead><tr><th>团队</th><th>队长 / 人数</th><th class="od-number">提交任务</th><th class="od-number">审核通过</th><th>待处理异常</th><th>最近提交</th><th>团队状态</th><th>操作</th></tr></thead><tbody>${rows.map(t=>`<tr><td><a class="od-team-name" href="${listHref()}/${esc(t.id)}">${esc(t.name)}</a><small>${esc(t.id)}</small></td><td>${esc(t.leader)}<small>${t.members.length} 名成员</small></td><td class="od-number">${t.summary.taskCount}</td><td class="od-number">${t.summary.passedCount}</td><td>${t.summary.anomalyCount?riskLink(data,t):'<span class="od-muted">—</span>'}</td><td>${esc(stamp(t.summary.lastSubmittedAt))}</td><td>${status(t.blacklisted?'已拉黑':'正常')}</td><td><a class="od-link" href="${listHref()}/${esc(t.id)}">查看详情 →</a></td></tr>`).join('')}</tbody></table></div>`:'<div class="od-empty"><h3>没有符合条件的团队</h3><p>试试其他关键词，或清除筛选条件。</p>'+button('清除筛选','clear')+'</div>');
  }
  function taskTable(tasks){return tasks.length?`<div class="od-table-wrap" role="region" aria-label="团队正式提交" tabindex="0"><table class="od-table"><thead><tr><th>任务 ID / 名称</th><th>提交方式</th><th>提交人</th><th>当前版本</th><th>审核状态</th><th>最近提交</th><th>操作</th></tr></thead><tbody>${tasks.map(t=>`<tr><td><strong>${esc(t.title)}</strong><small>${esc(t.id)}</small></td><td>${t.type==='harbor'?'Harbor 包':'ALE 任务说明'}</td><td>${esc(t.submitter)}</td><td>v${t.revision}</td><td>${status(t.status)}</td><td>${esc(stamp(t.submittedAt))}</td><td>${button('查看详情','task',`data-task="${esc(t.id)}"`,'small')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="od-empty"><h3>团队尚未提交数据</h3><p>正式提交后，任务、版本和审核结果会显示在这里。</p></div>';}
  function operationRecords(data,team){
    const events=H.teamEvents(data,team.id);
    return `<section class="od-log od-operation-records" aria-label="团队操作记录"><div class="od-section-heading"><div><h2>操作记录</h2><p>按时间查看每条数据的提交、补正、审核和录用过程。</p></div><span class="od-muted">${events.length} 条记录</span></div>${events.length?'<ol class="od-record-list">'+events.map(entry=>`<li class="od-log-row od-record-row" data-od-record-id="${esc(entry.id)}" data-record-type="${esc(entry.type)}" ${entry.taskId?'data-record-task="'+esc(entry.taskId)+'" data-record-version="'+(entry.revision||'')+'"':''}><span class="od-log-dot ${entry.type==='review'?'od-review-dot':''}" aria-hidden="true"></span><div class="od-record-body"><div class="od-record-heading"><strong>${esc(entry.title)}</strong><time>${entry.at?esc(stamp(entry.at)):'时间未记录'}</time></div>${entry.taskId?'<div class="od-record-subject">'+button(esc(entry.taskTitle||entry.taskId)+(entry.revision?' · v'+entry.revision:''),'task',`data-task="${esc(entry.taskId)}" data-version="${entry.revision||''}"`,'od-record-task')+'<small>'+esc(entry.taskId)+'</small></div>':''}<p class="od-record-actor">${esc(window.expertCenter?.names(entry.actor)||entry.actor||'操作人未记录')}</p>${entry.note?'<p class="od-record-note">'+esc(entry.note)+'</p>':''}</div></li>`).join('')+'</ol>':'<div class="od-empty"><h3>暂无操作记录</h3><p>数据正式提交、产生审核结果或进行团队管理操作后，记录会显示在这里。</p></div>'}</section>`;
  }
  function participant(team,event){const sim=simulation(team);return `<section class="od-participant"><div class="od-section-heading"><div><h2>模拟参赛端</h2><p>切换成员和赛程，测试拉黑是否对全队生效。</p></div><span class="od-demo-label">资格校验演示</span></div>${team.blacklisted?'<div class="od-restriction"><strong>当前团队已被限制提交</strong><p>原因：'+esc(team.blacklistReason)+'</p><small>生效时间：'+esc(stamp(team.blockedAt))+' · 仅当前赛事</small></div>':'<div class="od-available">团队当前未被拉黑，正式提交仍需满足原资格和赛程。</div>'}<div class="od-simulation-controls"><label>模拟成员<select id="od-member">${team.members.map((m,i)=>'<option value="'+esc(m.id)+'" '+(sim.member===m.id?'selected':'')+'>'+esc(m.name)+(i===0?' · 队长':' · 成员')+'</option>').join('')}</select></label><label>赛程<select id="od-phase"><option value="open" ${sim.phase==='open'?'selected':''}>按当前赛事 · ${esc(M.lifecycle(event))}</option><option value="closed" ${sim.phase==='closed'?'selected':''}>模拟全部截止</option></select></label>${button('测试新提交','simulate',`data-team="${esc(team.id)}" data-kind="new"`)}${button('测试补正重提','simulate',`data-team="${esc(team.id)}" data-kind="correction"`)}</div><div id="od-simulation-result" class="od-simulation-result" role="status" aria-live="polite">测试只校验提交资格，不新增任务或提交版本；草稿和历史仍可查看。</div></section>`;}
  function detail(data,id){
    const team=data.teams.find(t=>t.id===id);if(!team)return `${header(data)}<div class="od-empty"><h2>未找到示例团队</h2><p>该团队可能已随示例重置，请返回团队列表。</p><a class="button" href="${listHref()}">返回团队列表</a></div>`;
    if(data.readonly)return header(data,team)+'<section class="od-team-summary"><div><small>团队成员</small><strong>'+esc(team.name)+'</strong><div class="od-members">'+team.members.map(m=>'<span>'+esc(m.name)+'</span>').join('')+'</div></div><div><small>队长</small><strong>'+esc(team.leader)+'</strong></div></section><section class="od-list"><h2>正式提交</h2><div class="od-empty"><p>当前暂无可查看的提交数据。</p></div></section>';
    const s=M.teamSummary(data,id),v=view(),tasks=data.tasks.filter(t=>t.teamId===id);
    return `${header(data,team)}<section class="od-team-summary"><div><small>队长与成员</small><strong>${esc(team.leader)} · ${team.members.length} 人</strong><div class="od-members">${team.members.map(m=>'<span>'+esc(m.name)+'</span>').join('')}</div></div><div><small>报名信息</small><strong>已完成组队</strong><p>报名时间：${esc(stamp(team.registeredAt))}</p></div><div><small>提交情况</small><strong>${s.taskCount} 条任务 · ${s.passedCount} 条审核通过</strong></div></section><div class="od-tabs" role="tablist" aria-label="团队详情"><button type="button" role="tab" aria-selected="${v.tab==='tasks'}" class="${v.tab==='tasks'?'active':''}" data-od="tab" data-od-tab="tasks">提交数据</button><button type="button" role="tab" aria-selected="${v.tab==='records'}" class="${v.tab==='records'?'active':''}" data-od="tab" data-od-tab="records">操作记录</button></div>${v.tab==='tasks'?'<section class="od-tasks"><div class="od-section-heading"><h2>正式提交</h2><p>不包含私人草稿与未正式提交的修改副本</p></div>'+taskTable(tasks)+'</section>':operationRecords(data,team)}${participant(team,data.event)}`;
  }
  function failure(error){return `<section class="od-empty"><h1>暂时无法读取演示数据</h1><p>${esc(error.message||'请稍后重试。')}</p>${button('重试','retry')}${button('恢复示例数据','reset')}<a class="button" href="#organizer">返回赛事管理</a></section>`;}
  render=function(){
    oldRender();
    if(location.hash.split('/')[0]!=='#organizer-teams')return;
    document.body.classList.remove('portal-page','has-competition-search');
    document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav==='organizer'));
    currentId='';
    try{const data=read(),id=route().teamId;const content=data.event.stage!=='已发布'?header(data)+'<div class="od-empty"><h2>赛事尚未上线</h2><p>上线后才开放报名与团队管理，请返回赛事管理查看发布进度。</p><a class="button" href="#organizer">返回赛事管理</a></div>':id?detail(data,id):list(data);$('#main').innerHTML='<div class="od-page">'+content+'</div>';if(!id&&data.event.stage==='已发布')updateList();}catch(error){$('#main').innerHTML='<div class="od-page">'+failure(error)+'</div>';}
    document.title='赛事团队管理演示 · benchsquare';
  };
  function showDialog(html,wide=false){$('#dialog').classList.add('od-dialog');$('#dialog').classList.toggle('od-dialog-wide',wide);modal(html);}
  function formalPreview(data,task,form,version){
    const attachments=SubmissionModel.harborAttachments(form),fields=[['任务说明',form.description],['输入材料',form.input],['预期结果',form.expected],['验收标准',form.verification]];
    let html=SubmissionModel.format(form)==='harbor'?'<section class="preview-section harbor-downloads">'+(attachments.length?attachments.map(file=>{const path=file.archivePath||'',safe=/^assets\/harbor-examples\/[a-zA-Z0-9_.-]+\.zip$/.test(path);return '<p>'+(safe?'<a class="dd-file-download harbor-download-link" href="'+esc(path)+'" download>下载压缩包：'+esc(file.name)+'</a>':'<span>'+esc(file.name)+' · 暂无可下载文件</span>')+'</p>';}).join(''):'<p class="hint">暂无可下载的 Harbor 压缩包。</p>')+'</section>':'<section class="od-task-content">'+fields.map(([label,value])=>'<div><h3>'+label+'</h3><p>'+esc(value||'暂无内容')+'</p></div>').join('')+'</section>';
    const checks=data.anomalies.filter(a=>a.taskRefs.some(ref=>ref.taskId===task.id&&ref.revision===version.revision));
    if(checks.length)html+='<aside class="od-data-check"><strong>核查提示</strong>'+checks.map(a=>'<p>'+esc(a.evidence)+'</p>').join('')+'</aside>';
    return html;
  }
  function taskDialog(id,revision){
    const data=read(),task=data.tasks.find(t=>t.id===id);if(!task)return toast('未找到当前赛事中的数据任务。');
    const record=H.toRecord(task,data);
    const history=TaskDetailView.renderHistory(record,{renderForm:(form,version)=>formalPreview(data,task,form,version),previewButton:(r,version)=>`<button type="button" class="btn version-preview" data-od="version-preview" data-od-event="${esc(eventId())}" data-task="${esc(id)}" data-version="${version.revision}">查看此版本</button>`,highlightRevision:Number(revision)||undefined});
    showDialog(`<span class="od-kicker">TASK DETAILS</span><h2>${esc(task.title)}</h2><p>${esc(task.id)} · ${esc(data.teams.find(t=>t.id===task.teamId)?.name)} · ${SubmissionModel.format(record.form)==='harbor'?'Harbor 压缩包':'ALE 任务说明'}</p><div class="od-task-meta">${status(task.status)}<span>第 ${task.revision} 次提交</span><span>正式内容只读</span></div>${history}<div class="od-actions">${button('关闭','close-dialog')}</div>`,true);
    if(revision)requestAnimationFrame(()=>$('#dialog .submission-version.is-selected')?.scrollIntoView({block:'start'}));
  }
  function versionDialog(id,revision){
    const data=read(),task=data.tasks.find(t=>t.id===id);if(!task)return;
    const record=H.toRecord(task,data),version=DataItems.timeline(record).find(v=>v.revision===Number(revision));if(!version?.form)return toast('此版本没有可查看的正式快照。');
    showDialog(`<span class="od-kicker">正式提交快照</span><h2>${esc(task.title)} · v${version.revision}</h2><p>${esc(id)} · ${esc(version.by||task.submitter)} · ${esc(stamp(version.at))}</p>${formalPreview(data,task,version.form,version)}<div class="od-actions">${button('返回完整任务','task',`data-task="${esc(id)}" data-version="${version.revision}"`)}${button('关闭','close-dialog')}</div>`,true);
  }
  function blockDialog(id,blocked){const d=read(),t=d.teams.find(t=>t.id===id);if(!t)return;showDialog(`<h2>${blocked?'确认拉黑该团队？':'解除团队拉黑'}</h2><p>${esc(d.event.title)}</p><div class="od-dialog-team"><strong>${esc(t.name)} · ${esc(t.id)}</strong><p>${t.members.length} 名成员 · 仅当前赛事</p></div><div class="${blocked?'od-restriction':'od-available'}">${blocked?'生效后全队无法新提交或补正重提。已有提交、审核记录和成绩保留。':'解除后恢复原有提交资格，仍须遵守赛程和任务状态；异常记录继续保留。'}</div><form id="od-block-form" data-team="${esc(id)}" data-blocked="${blocked}" data-owner="${esc(owner())}" data-event="${esc(eventId())}"><label class="od-field">${blocked?'拉黑':'解除'}原因 <span>必填，1～200 字</span><textarea name="reason" required maxlength="200" rows="4" placeholder="${blocked?'例如：疑似重复提交，核查期间暂停提交':'例如：核查完成，恢复本赛事提交资格'}"></textarea></label><p class="od-muted">拉黑原因会在模拟参赛端展示，内部异常证据仅在主办方视图展示。</p><p id="od-form-error" class="od-error" role="alert"></p><div class="od-actions">${button('取消','close-dialog')}<button class="button ${blocked?'od-danger-solid':'dark'}" type="submit">${blocked?'确认拉黑':'确认解除'}</button></div></form>`);}
  function resetDialog(){const initial=M.generate(owner(),Date.now(),eventId());showDialog('<h2>恢复本赛事示例？</h2><p>'+esc(initial.event.title)+'</p><p>将恢复本赛事的 '+initial.teams.length+' 支团队、'+initial.tasks.length+' 条任务及初始状态，清除本赛事中的模拟操作。</p><p>其他示例赛事、你创建的比赛和个人草稿继续保留。</p><div class="od-actions">'+button('取消','close-dialog')+button('确认恢复','confirm-reset',`data-owner="${esc(owner())}"`,'dark')+'</div>');}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-od]');if(!b)return;
    try{if(b.dataset.odEvent&&b.dataset.odEvent!==eventId())throw Error('当前赛事已变化，请重新操作。');switch(b.dataset.od){
      case 'clear':Object.assign(view(),{query:'',status:'',anomalies:false,submitted:false});render();break;
      case 'metric':Object.assign(view(),{query:'',status:b.dataset.odFilter==='blocked'?'blocked':'',anomalies:b.dataset.odFilter==='anomalies',submitted:b.dataset.odFilter==='submitted'});render();break;
      case 'tab':view().tab=b.dataset.odTab;render();break;
      case 'task':taskDialog(b.dataset.task,b.dataset.version);break;
      case 'block':blockDialog(b.dataset.team,true);break;
      case 'unblock':blockDialog(b.dataset.team,false);break;
      case 'version-preview':versionDialog(b.dataset.task,b.dataset.version);break;
      case 'reset':resetDialog();break;
      case 'confirm-reset':if(b.dataset.owner!==owner())throw Error('演示身份已变化，请重新操作。');save(M.generate(owner(),Date.now(),eventId()));views.delete(owner()+':'+eventId());close();render();toast('已恢复初始示例数据。');break;
      case 'close-dialog':close();break;
      case 'retry':render();break;
      case 'simulate':{
        const d=read(),tid=b.dataset.team,phase=$('#od-phase').value==='closed'?'closed':M.submissionPhase(d.event),t=d.teams.find(t=>t.id===tid),member=t.members.find(m=>m.id===$('#od-member').value);
        let reason=M.submissionPermission(d,tid,phase);
        if(!reason&&phase==='correction'&&b.dataset.kind==='new')reason='新增提交已截止，当前仅接受符合条件的补正重提。';
        if(!reason&&b.dataset.kind==='correction'&&!d.tasks.some(t=>t.teamId===tid&&t.submitter===member.name&&t.status==='需补正'))reason='当前成员没有需补正任务，不能代替其他成员重提。';
        const target=$('#od-simulation-result');target.classList.toggle('is-denied',!!reason);target.textContent=(reason?'已拒绝':'校验通过')+' · '+member.name+' · '+(b.dataset.kind==='correction'?'补正重提':'新提交')+'：'+(reason||'当前符合提交条件；本次仅测试资格，未新增任务或版本。');if(t.blacklisted)window.EventContact.openAppeal({eventTitle:d.event.title,teamName:t.name,reason:t.blacklistReason});break;
      }
    }}catch(error){toast(error.message||'操作失败，请重试。');}
  });
  document.addEventListener('input',e=>{if(e.target.id==='od-search'){view().query=e.target.value;try{updateList();}catch(error){toast(error.message);}}});
  document.addEventListener('change',e=>{if(e.target.id==='od-status'){view().status=e.target.value;updateList();}if(e.target.id==='od-anomalies'){view().anomalies=e.target.checked;updateList();}if(['od-member','od-phase'].includes(e.target.id)){const tid=route().teamId,team=read().teams.find(t=>t.id===tid);if(team){simulation(team)[e.target.id==='od-member'?'member':'phase']=e.target.value;$('#od-simulation-result').classList.remove('is-denied');$('#od-simulation-result').textContent='条件已更新，请点击测试按钮重新校验。';}}});
  document.addEventListener('submit',e=>{
    const f=e.target;if(f.id!=='od-block-form')return;e.preventDefault();e.stopImmediatePropagation();
    try{
      if(f.dataset.owner!==owner()||f.dataset.event!==eventId())throw Error('演示身份或赛事已变化，请重新操作。');
      const values=new FormData(f),data=read();
      const next=M.setBlocked(data,f.dataset.team,f.dataset.blocked==='true',values.get('reason'),actor(),Date.now());
      save(next);close();render();toast('团队状态已更新，模拟参赛端同步生效。');
    }catch(error){$('#od-form-error').textContent=error.message||'保存失败，请重试。';}
  },true);
  $('#dialog').addEventListener('close',()=>$('#dialog').classList.remove('od-dialog','od-dialog-wide'));
  window.addEventListener('storage',e=>{if(e.key===key()&&location.hash.startsWith('#organizer-teams'))render();});
  window.OrganizerDemoStore={owner,read,save,key,view,route};
  render();
})();
