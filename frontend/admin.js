/* Local workflow prototype. Production authorization must be enforced by the API. */
(() => {
  for(const c of state.competitions)completeAdminDemoFields(c);
  const people = {rong:'容莹',chen:'陈思远',zhou:'周宁',xu:'许知夏'};
  const roleNames = {review:'比赛审核',finance:'托管核验',publish:'比赛发布',access:'权限管理'};
  state.eventAccess ||= {chen:['review'],zhou:['finance'],xu:['review','finance','publish','access']};
  const who = () => state.participation?.active || 'rong';
  const rights = () => state.eventAccess[who()] || [];
  const can = permission => rights().includes(permission);
  const owner = c => c.ownerId || 'rong';
  const allowed = () => rights().some(r=>r in roleNames);
  const audit = (c, action, note='') => {
    const entry = {action,note,actor:who(),time:new Date().toLocaleString('zh-CN'),version:c?.version||1};
    state.eventAudit ||= [];state.eventAudit.unshift({...entry,cid:c?.id,title:c?.values.name||'赛事后台权限'});
    if(c){c.history ||= [];c.history.push(entry);}
  };
  const inform = (c,text) => state.notices.unshift({to:owner(c),cid:c.id,message:'「'+c.values.name+'」'+text,time:new Date().toLocaleString('zh-CN'),read:false});
  const button = (action,label,id='',extra='') => `<button class="button small" data-admin="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
  let section='review', search='', stage='审核中', domain='全部领域', order='oldest', pageNumber=1;
  const scopes={review:['审核中','已驳回','待付款','审核已过期','待托管核验','奖金已托管','待发布','已发布'],finance:['待付款','待托管核验','奖金已托管','待发布','已发布'],publish:['待发布','已发布']};
  const titles={review:'比赛发布审核',finance:'奖金托管核验',publish:'比赛上线审核',logs:'操作记录',access:'赛事后台权限'};
  const label=s=>({'审核中':'待审核','已驳回':'未通过','待发布':'待上线','已发布':'已上线','approved':'已批准','全部状态':'全部申请'})[s]||s;
  const stampOf=c=>c.submittedAt||Number(c.id.match(/\d{13}/)?.[0])||0;
  const dateOf=c=>stampOf(c)?new Date(stampOf(c)).toLocaleString('zh-CN'):'未记录提交时间';
  const approved=c=>['待付款','待托管核验','奖金已托管','待发布','已发布'].includes(c.stage);
  const matches=(c,s)=>s==='全部状态'||(s==='approved'?approved(c):c.stage===s);
  const statusChip=c=>`<span class="audit-status ${c.stage==='已驳回'?'negative':c.stage==='已发布'?'positive':''}">${esc(label(c.stage))}</span>`;
  const reasonDrafts={};
  let operationBackup=null;
  function history(c){return (c.history||[]).slice().reverse().map(h=>`<div class="review-summary"><strong>${esc(h.action)}</strong><p>${esc(people[h.actor]||h.actor)} · ${esc(h.time)} · v${h.version||1}</p>${h.note?`<p>${esc(h.note)}</p>`:''}</div>`).join('')||'<p>暂无操作记录。</p>';}
  function detail(c){
    let drawer=document.querySelector('#audit-detail');
    if(!drawer){drawer=document.createElement('dialog');drawer.id='audit-detail';drawer.className='audit-detail';drawer.setAttribute('aria-label','比赛申请详情');document.body.append(drawer);}
    const values=c.values,latest=(c.history||[]).filter(h=>['审核通过','退回修改'].includes(h.action)&&h.version===(c.version||1)).at(-1);
    const snapshot=modules.map((m,index)=>`<section class="audit-snapshot-section"><div class="audit-section-title"><h3>${String(index+1).padStart(2,'0')} ${esc(m.title)}</h3><span>提交快照</span></div><dl class="audit-info-grid">${m.fields.map(f=>`<div class="${f[2]==='textarea'||f[2]==='fixed'?'wide':''}"><dt>${esc(f[1])}</dt><dd>${esc(f[2]==='pending'?'待确定':values[f[0]]??(f[2]==='fixed'?platformCompetitionRules[f[0]]:'未填写'))}</dd></div>`).join('')}</dl></section>`).join('');
    let actions='';
    if(allowed()&&c.stage==='审核中'&&can('review'))actions=owner(c)===who()?'<span class="audit-hint">本人创建，不可审核</span>':button('decision','不通过',c.id,'data-result="reject"')+button('decision','通过',c.id,'data-result="approve"');
    if(allowed()&&['待托管核验','奖金已托管'].includes(c.stage)&&can('finance'))actions=button('funds','核验托管',c.id);
    if(allowed()&&c.stage==='待发布'&&can('publish'))actions=button('publication','上线',c.id);
    drawer.innerHTML=`<div class="audit-detail-shell"><header class="audit-detail-header"><div class="audit-kicker"><span>比赛发布申请 / ${esc(c.id)}</span>${button('close-detail','← 返回列表',c.id,'aria-label="返回申请列表"')}</div><div class="audit-detail-title"><h2>${esc(values.name)}</h2>${statusChip(c)}</div><p>${esc(values.organizer)} · ${esc(people[owner(c)]||owner(c))} · v${c.version||1} · ${esc(dateOf(c))}</p></header><div class="audit-detail-body">${latest?`<div class="audit-result"><strong>${esc(latest.action)}</strong><p>${esc(people[latest.actor]||latest.actor)} · ${esc(latest.time)}${latest.note?' · '+esc(latest.note):''}</p></div>`:''}${['待托管核验','奖金已托管','待发布','已发布'].includes(c.stage)?`<section class="audit-snapshot-section"><div class="audit-section-title"><h3>奖金托管信息</h3><span>独立核验</span></div><dl class="audit-info-grid"><div><dt>总奖金池</dt><dd>${money(values.pool)}</dd></div><div><dt>已核验托管金额</dt><dd>${c.escrow?money(c.escrow):'待核验'}</dd></div><div class="wide"><dt>凭据 / 订单说明</dt><dd>${esc(c.paymentReference||'未记录凭据；请核对历史托管记录')}</dd></div></dl></section>`:''}<p class="audit-hint">以下为创建者提交的 v${c.version||1} 只读方案，按创建比赛的模块逐字段展示。</p>${snapshot}<section class="audit-snapshot-section"><h3>处理记录</h3>${history(c)}</section></div><footer class="audit-detail-footer"><span>${actions?'预览完成后选择处理结果':'当前记录只读'}</span><div>${button('close-detail','关闭',c.id)}${actions}</div></footer></div>`;
    if(!drawer.open)drawer.showModal();
  }
  function row(c){
    return `<tr><td><button class="audit-application-name" data-admin="detail" data-id="${esc(c.id)}">${esc(c.values.name)}</button><small>${esc(c.id)} · v${c.version||1}</small></td><td>${esc(c.values.organizer)}<small>${esc(people[owner(c)]||owner(c))}</small></td><td>${esc(dateOf(c))}<small>${money(c.values.pool)} · ${esc(c.values.domain||'未填写领域')}</small></td><td>${section==='review'&&approved(c)?'<span class="audit-status positive">已批准</span>':statusChip(c)}</td><td>${button('detail','预览',c.id)}</td></tr>`;
  }
  function shell(content){
    if(!allowed())return content;
    const nav=(key,s,text,ico)=>`<button data-admin="tab" data-value="${key}" data-stage="${s}" ${section===key&&stage===s?'aria-current="page"':''}>${icon(ico)}<span>${text}</span>${scopes[key]?`<small>${state.competitions.filter(c=>scopes[key].includes(c.stage)&&matches(c,s)).length}</small>`:''}</button>`;
    return `<div class="audit-shell"><aside class="audit-sidebar" aria-label="审核工作区"><div>${can('review')?`<div class="audit-nav-caption">申请审核</div><nav aria-label="申请状态">${nav('review','审核中','待审核','clock')}${nav('review','approved','已批准','check')}${nav('review','已驳回','未通过','shield')}${nav('review','全部状态','全部申请','grid')}</nav>`:''}${can('finance')?`<div class="audit-nav-caption">资金管理</div><nav>${nav('finance','待托管核验','待托管核验','layers')}${nav('finance','全部状态','全部托管记录','grid')}</nav>`:''}${can('publish')?`<div class="audit-nav-caption">上线审核</div><nav>${nav('publish','待发布','待上线','arrow')}${nav('publish','已发布','已上线','check')}</nav>`:''}<div class="audit-nav-caption">系统管理</div><nav>${nav('logs','全部状态','操作记录','clock')}${can('access')?nav('access','全部状态','后台权限','people'):''}</nav></div><div class="audit-sidebar-bottom">${button('rules','审核说明')}<a href="#organizer">← 返回用户端</a><div class="audit-reviewer"><span>${esc(people[who()].slice(0,1))}</span><div><strong>${esc(people[who()])}</strong><small>${rights().map(r=>roleNames[r]).filter(Boolean).join(' / ')}</small></div></div></div></aside><section class="audit-main">${content}<p class="audit-page-note">本地演示 · 审核通过不会自动上线；实际登录、服务端授权与资金接口尚未接入。</p></section></div>`;
  }
  function page(){
    if(!allowed())return heading('暂无赛事后台权限','当前账号尚未获授赛事后台权限，请联系赛事平台管理员。')+'<a class="button" href="#organizer">返回主办方中心</a><p class="admin-demo-note">本地原型：可通过右上角个人信息切换演示身份。陈思远负责审核，周宁负责托管核验，许知夏负责平台管理。</p>';
    const tabs=[['review','比赛审核','review'],['finance','托管核验','finance'],['publish','发布管理','publish'],['logs','操作记录',null],['access','后台权限','access']].filter(t=>!t[2]||can(t[2]));
    if(!tabs.some(t=>t[0]===section)){section=tabs[0][0];stage=section==='finance'?'待托管核验':section==='publish'?'待发布':'全部状态';}
    let html=`<div class="audit-breadcrumb">运营后台 <span>/</span> ${titles[section]}</div><div class="audit-page-heading"><div><h1>${titles[section]}</h1><p>${section==='review'?'查看发布申请、预览完整方案，完成比赛发布前的审核。':section==='finance'?'核对托管金额与凭据，确认资金状态后交由发布人员处理。':section==='publish'?'预览已完成托管的比赛，确认后正式上线。':'管理赛事后台权限与处理记录。'}</p></div>${button('samples','载入审核示例')}</div>`;
    if(section==='access')return html+`<div class="panel"><h2>赛事后台权限</h2><p>与其他平台的管理员身份独立。未分配权限的账号只能使用用户端。每位工作人员使用自己的账号。</p><form id="event-access-form"><label class="field">选择现有账号<select name="user">${Object.entries(people).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><div class="admin-role-options">${Object.entries(roleNames).map(([key,label])=>`<label class="check"><input type="checkbox" name="permission" value="${key}">${label}</label>`).join('')}</div><p class="admin-demo-note">勾选内容会替换该账号的赛事后台权限；全部取消可撤销权限。至少保留一位权限管理员。</p><button class="button dark">保存权限</button><p id="event-access-result" role="status"></p></form></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>账号</th><th>赛事后台权限</th></tr></thead><tbody>${Object.entries(people).map(([id,name])=>`<tr><td>${name}</td><td>${(state.eventAccess[id]||[]).map(r=>roleNames[r]).filter(Boolean).join('、')||'无后台权限'}</td></tr>`).join('')}</tbody></table></div>`;
    if(section==='logs')return html+`<div class="panel">${(state.eventAudit||[]).map(h=>`<div class="review-summary"><strong>${esc(h.action)} · ${esc(h.title)}</strong><p>${esc(people[h.actor]||h.actor)} · ${esc(h.time)} · v${h.version}</p><p>${esc(h.note)}</p></div>`).join('')||'<p>暂无后台操作记录。</p>'}</div>`;
    const rows=state.competitions.filter(c=>scopes[section].includes(c.stage)&&matches(c,stage)&&(domain==='全部领域'||c.values.domain===domain)&&(!search||(c.values.name+' '+c.values.organizer+' '+c.id).includes(search))).sort((a,b)=>order==='oldest'?stampOf(a)-stampOf(b):stampOf(b)-stampOf(a));
    const totalPages=Math.max(1,Math.ceil(rows.length/8));pageNumber=Math.min(pageNumber,totalPages);
    const domains=[...new Set(state.competitions.map(c=>c.values.domain).filter(Boolean))];
    const listTitle=stage==='全部状态'?(section==='review'?'全部申请':section==='finance'?'全部托管记录':'全部上线记录'):label(stage)+(section==='review'?'申请':section==='publish'?'比赛':'记录');
    return html+`<section class="audit-application-panel" aria-label="比赛发布申请"><div class="audit-panel-heading"><div><h2>${listTitle}</h2><span>${rows.length}</span></div><small>按提交时间依次处理</small></div><div class="audit-toolbar"><label class="audit-search">${icon('search')}<input id="admin-search" type="search" value="${esc(search)}" aria-label="搜索申请" placeholder="搜索比赛名称、发布方或申请编号"></label><div><select id="admin-domain" aria-label="比赛领域">${['全部领域',...domains].map(d=>`<option ${d===domain?'selected':''}>${esc(d)}</option>`).join('')}</select><select id="admin-order" aria-label="排序"><option value="oldest" ${order==='oldest'?'selected':''}>最早提交优先</option><option value="newest" ${order==='newest'?'selected':''}>最近提交优先</option></select>${button('filter','查询')}</div></div><div class="audit-table-scroll"><table class="audit-table"><thead><tr><th>比赛名称</th><th>发布方</th><th>提交时间 / 奖金</th><th>申请状态</th><th>操作</th></tr></thead><tbody>${rows.slice((pageNumber-1)*8,pageNumber*8).map(row).join('')||'<tr><td colspan="5"><div class="audit-empty"><h3>暂无符合条件的申请</h3><p>可切换左侧状态或调整搜索条件。</p></div></td></tr>'}</tbody></table></div><footer class="audit-list-footer"><span>共 ${rows.length} 条${rows.length?' · 显示 '+((pageNumber-1)*8+1)+'–'+Math.min(pageNumber*8,rows.length)+' 条':''}</span><div>${button('prev-page','‹','',pageNumber===1?'disabled aria-label="上一页"':'aria-label="上一页"')}<span>${pageNumber} / ${totalPages}</span>${button('next-page','›','',pageNumber===totalPages?'disabled aria-label="下一页"':'aria-label="下一页"')}</div></footer></section>`;
  }
  const originalRender=render;
  render=function(){
    const nav=document.querySelector('#event-admin-nav');if(nav)nav.hidden=!allowed();
    const admin=location.hash.split('/')[0]==='#admin';document.body.classList.toggle('admin-page',admin);
    if(!admin)return originalRender();
    expire();document.body.classList.remove('portal-page','has-competition-search');setSiteNavigation('explore');currentId='';$('#main').innerHTML=shell(page());document.title='赛事管理后台 · benchsquare';
    document.querySelectorAll('.profile').forEach(e=>{e.firstChild.textContent=people[who()].slice(0,1);e.title=people[who()];});
    if($('#event-access-form'))fillAccess();
  };
  window.competitionAdmin={
    canEnter:allowed,
    recordEdit:(c,action)=>audit(c,action),
    profileLink:()=>allowed()?'<a class="button" href="#admin" onclick="document.querySelector(\'#dialog\').close()">赛事管理后台 ↗</a>':'',
    switchDraft(next){if(next===who())return;state.creationDrafts ||= {};state.creationDrafts[who()]={...state.draft};state.draft={...(state.creationDrafts[next]||{})};}
  };
  function fillAccess(){const f=$('#event-access-form');if(f)f.querySelectorAll('[name=permission]').forEach(e=>e.checked=(state.eventAccess[f.elements.user.value]||[]).includes(e.value));}
  function check(c,permission,expected,version){if(!can(permission)||!c||!expected.includes(c.stage)||c.version!==version){toast('权限或比赛状态已变化，请刷新后重试。');return false;}return true;}
  function commit(c,action,text,note=''){
    audit(c,action,note);inform(c,text);
    if(persist()===false){if(operationBackup)Object.assign(state,operationBackup);const error=document.querySelector('#admin-error');if(error)error.textContent='保存失败，请重试；输入内容已保留。';toast('保存失败，请重试；输入内容已保留。');return;}
    delete reasonDrafts[c.id];close();render();if(document.querySelector('#audit-detail')?.open)detail(c);toast(action+'，已通知创建者。');
  }
  window.addEventListener('hashchange',()=>document.querySelector('#audit-detail')?.close());
  document.addEventListener('input',e=>{if(e.target.closest('#admin-decision')&&e.target.name==='note'){reasonDrafts[e.target.form.dataset.id]=e.target.value;const counter=document.querySelector('#audit-reason-count');if(counter)counter.textContent=[...e.target.value].length+' / 500';}});
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-admin]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();
    const a=b.dataset.admin,c=state.competitions.find(c=>c.id===b.dataset.id),version=c?.version;
    if(a==='close-detail'){document.querySelector('#audit-detail')?.close();return;}
    if(!allowed())return toast('当前账号无后台权限。');
    if(a==='tab'){section=b.dataset.value;stage=b.dataset.stage||'全部状态';search='';domain='全部领域';pageNumber=1;render();return;}
    if(a==='filter'){search=$('#admin-search').value.trim();domain=$('#admin-domain').value;order=$('#admin-order').value;pageNumber=1;render();return;}
    if(a==='prev-page'||a==='next-page'){pageNumber+=a==='next-page'?1:-1;render();return;}
    if(a==='rules'){modal('<h2>审核说明</h2><div class="review-summary"><h3>1. 预览完整申请</h3><p>按创建比赛的模块阅读只读方案，核对比赛与版本。</p><h3>2. 通过或不通过</h3><p>通过只确认比赛与版本；不通过须说明原因，最多500字。创建者修改后以新版本重新提交。</p><h3>3. 独立核验与上线</h3><p>方案批准不代表正式上线。完成托管核验后，由具有发布权限的工作人员确认上线。</p><h3>4. 留存处理记录</h3><p>结论、原因、处理人、时间及版本保存在历史记录中；本人创建的比赛不可自行审核。</p></div><button class="button dark" data-action="close">知道了</button>');return;}
    if(a==='detail'&&c)return detail(c);
    if(a==='samples'){
      modal('<h2>载入审核示例</h2><p>将在当前浏览器中添加3场标注为“演示”的比赛，创建者为容莹，用于验证审核、托管核验和发布流程；不会向外部提交。</p>'+button('confirm-samples','确认载入'));return;
    }
    if(a==='confirm-samples'){
      if(state.competitions.some(c=>c.adminSample))return toast('审核示例已载入。');
      const base={name:'科学推理挑战赛',organizer:'赛事流程演示主办方',pool:'30000',rankBudget:'30000',rankRule:'一等奖15000元、二等奖10000元、三等奖5000元。',description:'用于验证后台流程的本地示例比赛。',domain:'科学推理',registrationStart:'2026-11-01T09:00',registrationEnd:'2026-11-15T18:00',submissionStart:'2026-11-16T09:00',submissionEnd:'2026-12-06T18:00',...participationRuleDefaults,...platformCompetitionRules};
      for(const [i,s]of ['审核中','待托管核验','待发布'].entries()){const c={id:'admin-demo-'+Date.now()+'-'+i,ownerId:'rong',adminSample:true,version:1,stage:s,values:{...base,name:'【演示】'+['科学推理挑战赛','代码工程挑战赛','多模态挑战赛'][i]},history:[]};if(s!=='审核中')c.escrow=30000;completeAdminDemoFields(c);state.competitions.push(c);audit(c,'载入本地演示数据',s);}
      persist();close();render();return;
    }
    if(a==='decision'&&check(c,'review',['审核中'],version)){
      if(owner(c)===who())return toast('不能审核自己创建的比赛。');
      const reject=b.dataset.result==='reject';
      modal(`<div class="audit-confirmation"><h2>${reject?'不通过申请':'确认通过申请'}</h2><div class="audit-confirm-summary"><strong>${esc(c.values.name)}</strong><p>${esc(c.values.organizer)} · v${version}</p></div><form id="admin-decision" data-id="${c.id}" data-version="${version}" data-actor="${who()}"><input type="hidden" name="result" value="${reject?'reject':'approve'}">${reject?`<label class="field">原因说明 <small class="audit-required">必填</small><textarea name="note" rows="5" placeholder="请说明哪里不符合要求、需要怎样修改，最多500字">${esc(reasonDrafts[c.id]||'')}</textarea></label><p id="audit-reason-count" class="audit-hint">${[...(reasonDrafts[c.id]||'')].length} / 500</p>`:''}<p class="audit-hint">${reject?'创建者可查看原因，修改后以新版本重新提交。':'通过后保存审核记录，进入奖金托管环节，比赛不会自动上线。'}</p><div class="audit-modal-actions"><button type="button" class="button" data-action="close">取消</button><button class="button dark" type="submit">${reject?'确认不通过':'确认通过'}</button></div><p class="error" id="admin-error" role="alert"></p></form></div>`);return;
    }
    if(['funds','publication'].includes(a)){
      const funds=a==='funds',perm=funds?'finance':'publish',expected=funds?['待托管核验','奖金已托管']:['待发布'];if(!check(c,perm,expected,version))return;
      modal(`<h2>${funds?'核验奖金托管':'确认发布比赛'}</h2><p>${esc(c.values.name)} · v${version}</p><div class="notice">${funds?'应托管金额：'+money(c.values.pool)+'。核对到账凭据后确认，比赛仍需单独发布。':'确认方案与托管核验完成后，比赛将出现在赛事广场。'}</div><p>${esc(c.paymentReference||'演示托管记录')}</p><form id="admin-transition" data-id="${c.id}" data-version="${version}" data-actor="${who()}" data-kind="${a}">${funds?'<label class="field">核验结论<select name="result"><option value="approve">核验通过</option><option value="reject">退回补充托管凭据</option></select></label>':''}<label class="field">处理说明<textarea name="note" maxlength="2000"></textarea></label><label class="check"><input type="checkbox" name="ack" required>我已核对相关信息，确认执行本操作</label><button class="button dark">${funds?'提交核验结果':'正式发布'}</button><p id="admin-error" class="error"></p></form>`);return;
    }
  },true);
  // Prevent non-owners using creator actions, including stale dialogs.
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,c=state.competitions.find(c=>c.id===b.dataset.id);
    if(!['view-plan','withdraw','edit','pay','confirm-pay'].includes(a)||!c)return;
    if(owner(c)!==who()){e.preventDefault();e.stopImmediatePropagation();return toast('只能管理自己创建的比赛。');}
    if(a==='view-plan'){e.preventDefault();e.stopImmediatePropagation();return detail(c);}
    if(a==='pay'){
      e.preventDefault();e.stopImmediatePropagation();if(c.stage!=='待付款')return toast('比赛状态已变化。');
      modal(`<h2>提交奖金托管凭据</h2><p>${esc(c.values.name)} · 应托管 ${money(c.values.pool)}</p><p>当前为本地演示，不会实际收款。提交后由具有托管核验权限的工作人员核对，再进入待发布。</p><form id="event-payment" data-id="${c.id}" data-actor="${who()}"><label class="field">托管凭据编号或说明<input name="reference" required maxlength="200" placeholder="填写托管订单号或付款凭据说明"></label><button class="button dark">提交核验</button></form>`);return;
    }
    if(a==='confirm-pay'){e.preventDefault();e.stopImmediatePropagation();toast('请通过奖金托管入口提交核验。');}
  },true);
  document.addEventListener('change',e=>{if(e.target.closest('#event-access-form')&&e.target.name==='user')fillAccess();});
  document.addEventListener('submit',e=>{
    const f=e.target;if(!['admin-decision','admin-transition','event-access-form','event-payment'].includes(f.id))return;
    e.preventDefault();e.stopImmediatePropagation();const data=new FormData(f),c=state.competitions.find(c=>c.id===f.dataset.id),note=String(data.get('note')||'').trim();
    if(f.dataset.actor&&f.dataset.actor!==who())return toast('身份已变化，请重新操作。');
    operationBackup=JSON.parse(JSON.stringify({competitions:state.competitions,notices:state.notices,eventAudit:state.eventAudit||[]}));
    if(f.id==='event-access-form'){
      if(!can('access'))return toast('无权限管理后台角色。');const user=data.get('user'),permissions=data.getAll('permission').filter(r=>r in roleNames);
      if(!people[user])return;
      if(!permissions.includes('access')&&!Object.entries(state.eventAccess).some(([id,r])=>id!==user&&r.includes('access'))){$('#event-access-result').textContent='至少保留一位权限管理员，不能撤销最后一位管理员。';return;}
      const previous=state.eventAccess[user];state.eventAccess[user]=permissions;audit(null,'修改赛事后台权限',people[user]+'：'+(permissions.map(r=>roleNames[r]).join('、')||'撤销全部权限'));if(persist()===false){state.eventAccess[user]=previous;state.eventAudit=operationBackup.eventAudit;$('#event-access-result').textContent='保存失败，请重试；勾选内容已保留。';return;}render();toast('赛事后台权限已更新。');return;
    }
    if(f.id==='event-payment'){
      expire();if(!c||owner(c)!==who()||c.stage!=='待付款')return toast('无权操作或托管期限已过。');const ref=String(data.get('reference')||'').trim();if(!ref)return toast('请填写托管凭据。');c.paymentReference=ref;c.stage='待托管核验';commit(c,'提交托管凭据','托管凭据已提交，等待平台核验。',ref);return;
    }
    const version=Number(f.dataset.version);
    if(f.id==='admin-decision'){
      if(!check(c,'review',['审核中'],version)||owner(c)===who())return toast('不能审核自己创建的比赛。');
      const approved=data.get('result')==='approve';if(!approved&&(!note||[...note].length>500)){$('#admin-error').textContent=note?'原因说明不能超过500字。':'退回修改时必须填写审核意见。';return;}
      c.stage=approved?'待付款':'已驳回';if(approved){delete c.reason;c.paymentDeadline=Date.now()+7*86400000;}else{c.reason=note;delete c.paymentDeadline;}
      commit(c,approved?'审核通过':'退回修改',approved?'审核已通过，请在7日内完成奖金托管。':'已退回修改：'+note,note);return;
    }
    const funds=f.dataset.kind==='funds';if(!check(c,funds?'finance':'publish',funds?['待托管核验','奖金已托管']:['待发布'],version)||!data.has('ack'))return;
    if(funds){const approved=data.get('result')==='approve';if(!approved&&!note){$('#admin-error').textContent='退回托管凭据时必须填写原因。';return;}c.stage=approved?'待发布':'待付款';if(approved)c.escrow=Number(c.values.pool);else{c.paymentDeadline=Date.now()+7*86400000;delete c.escrow;}commit(c,approved?'托管核验通过':'退回托管凭据',approved?'奖金托管核验通过，等待平台发布。':'托管核验未通过：'+note,note);}
    else {if(Number(c.escrow)!==Number(c.values.pool))return toast('托管金额与奖金池不一致，不能发布。');c.stage='已发布';c.publishedAt=Date.now();commit(c,'发布比赛','已正式发布，可前往赛事广场查看。',note);}
  },true);
  // Guard submission of another creator's old draft.
  document.addEventListener('submit',e=>{if(e.target.id!=='create-form')return;const c=state.competitions.find(c=>c.id===state.draft.editId);if(c&&owner(c)!==who()){e.preventDefault();e.stopImmediatePropagation();toast('此草稿属于其他创建者，请切回原账号。');}},true);
  render();
})();
