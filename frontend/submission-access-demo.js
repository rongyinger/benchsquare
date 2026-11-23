(() => {
  'use strict';
  const id='blocked-team-demo',teamId='blocked-demo-team',previous=render,oldMine=mine;
  const demoHref='#competition/'+id;
  const description='体验参赛个人被拉黑后的提交拦截，以及解除拉黑后的提交流程。';
  function seed(){
    const p=state.participation,actor=p.active||'rong',day=86400000,now=Date.now();
    let changed=false;
    const date=offset=>new Date(now+offset*day).toISOString();
    if(!state.competitions.some(c=>c.id===id)){
      const values=demoCompetitionFields({id,title:'专业评测任务挑战赛 · 拉黑申诉 Demo',domain:'科学推理',org:'Benchsquare 演示工作组',desc:description,prize:30000,registrationStart:date(-14),deadline:date(-7),start:date(-6),end:date(7)});
      Object.assign(values,{correctionEnd:date(10),publicationAt:date(14),teamMode:'团队',teamMax:5});
      state.competitions.push({id,stage:'已发布',ownerId:'demo-organizer',submissionAccessDemo:true,values});
      changed=true;
    }
    const users=[...new Set(['rong','chen','zhou','xu',actor])];
    p.regs[id]||={};
    for(const user of users)if(!p.regs[id][user]){p.regs[id][user]={at:now-10*day,rulesVersion:1};changed=true;}
    let team=p.teams.find(t=>t.id===teamId&&t.cid===id);
    if(!team){team={id:teamId,cid:id,name:'证据共创队',description:'拉黑申诉流程演示团队',leader:'rong',members:users,allow:false,};p.teams.push(team);changed=true;}
    else if(!team.members.includes(actor)){team.members.push(actor);changed=true;}
    const competition=state.competitions.find(c=>c.id===id);
    if(competition.values.description==='体验参赛个人被拉黑后的提交拦截、微信联系，以及解除拉黑后的提交流程。'){
      competition.values.description=description;
      changed=true;
    }
    if(!competition.personalBlockVersion){
      p.regs[id][actor].submissionBlocked=true;
      p.regs[id][actor].submissionBlockedReason='提交材料来源说明待核查。';
      competition.personalBlockVersion=1;changed=true;
    }
    if(team.blacklisted){delete team.blacklisted;delete team.blacklistReason;delete team.blockedAt;changed=true;}
    if(changed)persist();
  }
  mine=function(){return oldMine()+'<section class="sad-demo-entry"><div><span class="sad-kicker">参赛流程演示</span><h2>体验个人拉黑</h2><p>进入一场进行中的比赛，点击提交，查看拦截提示。</p></div><a class="button" href="'+demoHref+'">打开拉黑申诉 Demo ↗</a></section>';};
  render=function(){
    const [root,cid]=location.hash.slice(1).split('/');
    if(root==='competition'&&cid===id)seed();
    previous();
    if(root!=='competition'||cid!==id)return;
    const team=state.participation.teams.find(t=>t.id===teamId&&t.cid===id);
    const heading=document.querySelector('#main .detail-heading');
    if(!heading||!team)return;
    const blocked=state.participation.regs[id]?.[state.participation.active||'rong']?.submissionBlocked===true;
    heading.insertAdjacentHTML('afterend',`<section class="sad-demo-status ${blocked?'is-blocked':'is-open'}" aria-label="拉黑申诉演示"><div><span class="sad-kicker">演示场景 · 仅当前赛事</span><h2>${blocked?'当前个人已被本赛事拉黑':'已模拟解除拉黑'}</h2><p>${blocked?'点击右上方“提交数据”，查看拦截提示。':'可以重新打开提交通道。正式提交仍需满足赛事时间和任务要求。'}</p><small>团队：${esc(team.name)} · 仅当前个人受限，同队其他成员不受影响 · 草稿与历史记录保留</small></div><button type="button" class="button" data-sad="toggle">${blocked?'模拟解除拉黑':'恢复拉黑状态'}</button></section>`);
  };
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-sad="toggle"]');if(!button||location.hash.split('/')[1]!==id)return;
    const team=state.participation.teams.find(t=>t.id===teamId&&t.cid===id);if(!team)return;
    const registration=state.participation.regs[id]?.[state.participation.active||'rong'];if(!registration)return;
    const before=registration.submissionBlocked;registration.submissionBlocked=!before;
    if(!persist()){registration.submissionBlocked=before;toast('状态未保存，请重试。');return;}
    render();toast(registration.submissionBlocked?'已恢复本赛事的个人拉黑状态。':'已模拟解除拉黑，可以重新测试提交。');
  });
  render();
})();
