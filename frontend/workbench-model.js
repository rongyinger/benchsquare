(function(root){
  'use strict';
  const stateKey='ale-frontend-v1';
  function read(){try{return JSON.parse(localStorage.getItem(stateKey))||{};}catch{return {};}}
  function context(state,cid,tid,fixtures=[]){
    const p=state.participation||{},user=p.active||'rong';
    const competition=[...(state.competitions||[]).filter(c=>c.stage==='已发布'),...fixtures].find(c=>c.id===cid);
    const team=(p.teams||[]).find(t=>t.cid===cid&&(!tid||t.id===tid)&&t.members.includes(user));
    return {competition,team,user,leader:team?.leader===user,registered:!!p.regs?.[cid]?.[user]};
  }
  const time=value=>{if(!value)return NaN;let v=String(value).replace(' ','T');if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(v))v+='+08:00';return Date.parse(v);};
  function phase(c,override,now=Date.now()){
    if(['before','open','closed'].includes(override))return override;
    const v=c?.values||{},start=time(v.submissionStart||c?.start),end=time(v.submissionEnd||c?.end);
    if(!Number.isFinite(start)||!Number.isFinite(end))return 'unknown';
    return now<start?'before':now>=end?'closed':'open';
  }
  function permission(ctx,override,submit=false,record=null){
    if(!ctx.competition)return '比赛不存在或尚未发布。';
    if(!ctx.registered||!ctx.team)return '请先报名并创建或加入团队，再进入参赛工作台。';
    if(typeof sessionStorage!=='undefined'&&sessionStorage.getItem('expert-demo-out')==='yes')return '请先在个人中心登录演示身份。';
    const stage=phase(ctx.competition,override);
    if(stage==='closed'&&override!=='closed'&&taskStatus(record?.status)==='需修改'){
      const raw=ctx.competition.values?.correctionEnd;
      const end=time(raw);
      if(Number.isFinite(end)&&Date.now()<end)return '';
      return '新增提交已截止；补正截止时间未公布或已到期，当前仅可查看。';
    }
    if(stage!=='open')return {before:'任务提交尚未开始，当前仅可查看。',closed:'任务提交已截止，当前仅可查看。',unknown:'提交时间尚未配置，当前仅可查看。'}[stage];
    return '';
  }
  const belongs=(r,cid,tid)=>r.competitionId===cid&&r.teamId===tid;
  const ownerOf=(r,team)=>r.ownerId||r.history?.[0]?.by||r.updatedBy||team?.leader;
  const taskStatus=s=>({'已提交':'待初审','待质检':'待初审'})[s]||s;
  const api={stateKey,read,context,phase,permission,belongs,ownerOf,taskStatus};
  if(typeof module!=='undefined')module.exports=api;else root.WorkbenchModel=api;
})(typeof window==='undefined'?globalThis:window);
