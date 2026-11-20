(() => {
  'use strict';
  const W=WorkbenchModel,previous=render,oldMine=mine,oldJoin=joinButton;
  const ctx=cid=>W.context(state,cid,null,all());
  let drawer=null,opener=null,background=[],previousOverflow='';
  const entry=cid=>'<button class="button dark" data-submit-data="'+esc(cid)+'">提交数据 →</button>';
  joinButton=function(c){const x=ctx(c.id);return x.team&&x.identityVerified?entry(c.id):oldJoin(c);};
  mine=function(){return oldMine()+'<section class="wb-demo"><div><strong>体验数据提交完整流程</strong><p>创建演示比赛和团队，体验保存草稿、提交与版本记录。</p></div><button class="button" data-wb="demo">创建 / 打开提交演示 ↗</button></section><section class="wb-demo"><div><strong>参赛者拉黑示例</strong><p>当前演示身份在独立示例赛中被拉黑，仍可保存草稿，但不能提交。</p></div><button class="button" data-wb="blocked-demo">体验拉黑后无法提交 ↗</button></section>';};
  function destroy(){
    if(!drawer)return;
    drawer.remove();drawer=null;document.body.style.overflow=previousOverflow;
    background.forEach(([el,inert])=>el.inert=inert);background=[];
    if(opener?.isConnected)opener.focus();
  }
  function requestClose(){drawer?.querySelector('iframe').contentWindow.postMessage({type:'submission-close-request'},location.origin);}
  function open(cid){
    const blocked=W.restriction(W.context(W.read(),cid,null,all()));
    if(blocked){window.EventContact.openAppeal(blocked);return;}
    if(window.DataDashboard){window.DataDashboard.openCompetition(cid);return;}
    const x=ctx(cid);if(!x.team||!x.registered){toast('请先报名并完成组队。');return;}
    if(drawer)return;
    opener=document.activeElement;previousOverflow=document.body.style.overflow;
    drawer=document.createElement('div');drawer.className='submission-overlay';
    drawer.innerHTML='<div class="submission-shade" data-drawer-close></div><section class="submission-drawer" role="dialog" aria-modal="true" aria-labelledby="submission-drawer-title"><header class="submission-drawer-header"><div><span>赛事数据提交</span><h2 id="submission-drawer-title">'+esc(x.competition.title||x.competition.values?.name)+'</h2><p>'+esc(x.team.name)+' · 个人提交与草稿</p></div><button type="button" class="submission-drawer-close" aria-label="关闭提交面板" data-drawer-close>×</button></header><iframe title="比赛数据提交表单" src="submission.html?competition='+encodeURIComponent(cid)+'&team='+encodeURIComponent(x.team.id)+'&embed=1#new"></iframe></section>';
    background=[...document.body.children].filter(el=>!['SCRIPT','STYLE'].includes(el.tagName)).map(el=>[el,el.inert]);
    background.forEach(([el])=>el.inert=true);
    document.body.append(drawer);document.body.style.overflow='hidden';
    drawer.querySelector('.submission-drawer-close').focus();
    drawer.addEventListener('click',e=>{if(e.target.closest('[data-drawer-close]'))requestClose();});
  }
  render=function(){
    let [root,cid]=location.hash.slice(1).split('/');
    if(root==='workbench'&&cid){history.replaceState(null,'','#competition/'+encodeURIComponent(cid));setTimeout(()=>open(cid),0);}
    else if(['workbench','submissions'].includes(root))history.replaceState(null,'','#mine');
    previous();
  };
  document.addEventListener('keydown',e=>{
    if(!drawer)return;
    if(e.key==='Escape'){e.preventDefault();requestClose();}
    if(e.key==='Tab'){const close=drawer.querySelector('.submission-drawer-close'),frame=drawer.querySelector('iframe');if(e.shiftKey&&document.activeElement===close){e.preventDefault();frame.focus();}}
  });
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||!drawer||e.source!==drawer.querySelector('iframe').contentWindow)return;
    if(e.data?.type==='submission-close-approved')destroy();
  });
  window.addEventListener('hashchange',()=>{if(drawer)destroy();});
  document.addEventListener('click',e=>{
    const submit=e.target.closest('[data-submit-data]');
    if(submit){const cid=submit.dataset.submitData;if(location.hash!=='#competition/'+cid){go('#competition/'+cid);setTimeout(()=>open(cid),0);}else open(cid);return;}
    const demo=e.target.closest('[data-wb]')?.dataset.wb;
    if(!['demo','blocked-demo'].includes(demo))return;
    const blocked=demo==='blocked-demo',cid=blocked?'workbench-blocked-demo':'workbench-demo',p=state.participation,u=p.active||'rong';
    const now=Date.now(),date=days=>new Date(now+days*86400000).toISOString();
    if(!state.competitions.some(c=>c.id===cid))state.competitions.push({id:cid,stage:'已发布',ownerId:u,values:{name:blocked?'专业评测任务征集 · 拉黑示例':'专业评测任务征集 · 提交演示',organizer:'Benchsquare 演示工作组',domain:'科学推理',description:blocked?'虚构示例：参赛者已完成报名和组队，但因被拉黑而无法提交数据。':'体验从团队协作到任务提交的完整流程。',registrationStart:blocked?date(-20):'2026-10-01T09:00',registrationEnd:blocked?date(-2):'2026-10-20T18:00',submissionStart:blocked?date(-1):'2026-10-21T09:00',submissionEnd:blocked?date(30):'2026-11-30T18:00',teamMode:'团队',teamMax:5,pool:10000,materials:'可提交 Harbor 压缩包，或填写 ALE 任务说明和评分标准。',environment:'在 Harbor 包内提供运行环境和依赖，或在 ALE 任务格式中填写软件及操作系统。',formats:'Harbor 支持单个 .zip、.tar.gz 或 .tgz 压缩包；ALE 支持任务文本及选填附件。本地单文件保存上限为 1 GB。',fields:'ALE 任务填写短名、领域、运行环境、任务说明与验证标准；两种格式均须勾选诚信承诺。',scale:'本演示不限制任务数量；不执行附件或真实评测。',acceptance:'目标明确、输入完整、结果可复现，验证标准可核查。'}});
    p.regs[cid]||={};p.regs[cid][u]||={at:blocked?Date.parse(find(cid).deadline)-86400000:now,rulesVersion:1};
    if(blocked)p.regs[cid][u].submissionBlocked=true;
    if(!p.teams.some(t=>t.cid===cid&&t.members.includes(u)))p.teams.push({id:(blocked?'wb-blocked-team-':'wb-team-')+u,cid,name:'专业任务共创队 · '+u,leader:u,members:[u],description:'任务提交体验团队',allow:false});p.workbenchClock||={};p.workbenchClock[cid]='open';if(persist()){go('#competition/'+cid);setTimeout(()=>open(cid),0);}
  });
  render();
})();
