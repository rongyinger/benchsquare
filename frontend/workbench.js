(() => {
  'use strict';
  const W=WorkbenchModel,previous=render,oldMine=mine,oldJoin=joinButton;
  const ctx=cid=>W.context(state,cid,null,all());
  let drawer=null,opener=null,background=[],previousOverflow='';
  const entry=cid=>'<button class="button dark" data-submit-data="'+esc(cid)+'">提交数据 →</button>';
  joinButton=function(c){return ctx(c.id).team?entry(c.id):oldJoin(c);};
  mine=function(){return oldMine()+'<section class="wb-demo"><div><strong>体验数据提交完整流程</strong><p>创建演示比赛和团队，体验保存草稿、提交与版本记录。</p></div><button class="button" data-wb="demo">创建 / 打开提交演示 ↗</button></section>';};
  function destroy(){
    if(!drawer)return;
    drawer.remove();drawer=null;document.body.style.overflow=previousOverflow;
    background.forEach(([el,inert])=>el.inert=inert);background=[];
    if(opener?.isConnected)opener.focus();
  }
  function requestClose(){drawer?.querySelector('iframe').contentWindow.postMessage({type:'submission-close-request'},location.origin);}
  function open(cid){
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
    if(location.hash==='#mine')document.querySelectorAll('.participation-card').forEach(el=>{const a=el.querySelector('a[href^="#competition/"]');const id=a?.hash.split('/')[1];if(id&&ctx(id).team)el.insertAdjacentHTML('beforeend',' '+entry(id));});
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
    if(!e.target.closest('[data-wb="demo"]'))return;
    const cid='workbench-demo',p=state.participation,u=p.active||'rong';
    if(!state.competitions.some(c=>c.id===cid))state.competitions.push({id:cid,stage:'已发布',ownerId:u,values:{name:'专业评测任务征集 · 提交演示',organizer:'Benchsquare 演示工作组',domain:'科学推理',description:'体验从团队协作到任务提交的完整流程。',registrationStart:'2026-10-01T09:00',registrationEnd:'2026-10-20T18:00',submissionStart:'2026-10-21T09:00',submissionEnd:'2026-11-30T18:00',teamMode:'团队',teamMax:5,pool:10000,materials:'每个任务包含公开任务说明、输入材料，以及仅审核可见的参考结果。',environment:'说明操作系统、软件版本与依赖；支持纯文本任务。',formats:'演示支持选择任意格式附件，单文件 20 MiB，合计最多 20 个。',fields:'任务名称、领域、软件及版本、操作系统、许可、任务说明与验证标准为必填。',scale:'本演示不限制任务数量；不执行附件或真实评测。',acceptance:'目标明确、输入完整、结果可复现，验证标准可核查。'}});
    p.regs[cid]||={};p.regs[cid][u]||={at:Date.now(),rulesVersion:1};if(!p.teams.some(t=>t.cid===cid&&t.members.includes(u)))p.teams.push({id:'wb-team-'+u,cid,name:'专业任务共创队 · '+u,leader:u,members:[u],description:'任务提交体验团队',allow:false});p.workbenchClock||={};p.workbenchClock[cid]='open';if(persist()){go('#competition/'+cid);setTimeout(()=>open(cid),0);}
  });
  render();
})();
