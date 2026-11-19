(function(root){
  'use strict';

  const demoId='identity-verification-demo';
  const example=Object.freeze({realName:'演示用户',idNumber:'000000200001010010'});
  const legacyRequirement=c=>{
    const method=(c?.values||c?.config)?.identityVerification;
    return Boolean(method&&method!=='无需认证');
  };
  const verifiedAt=(participation,user)=>participation.accounts?.[user]?.realNameVerifiedAt;

  function migrate(participation){
    participation.accounts ||= {};
    for(const registrations of Object.values(participation.regs||{})){
      for(const [user,registration] of Object.entries(registrations)){
        if(!Number.isFinite(registration.realNameVerifiedAt)||verifiedAt(participation,user))continue;
        (participation.accounts[user] ||= {}).realNameVerifiedAt=registration.realNameVerifiedAt;
      }
    }
  }

  function enrollmentEligible(participation,competition,user,registration){
    if(!registration)return false;
    if(verifiedAt(participation,user)||registration.realNameVerifiedAt)return true;
    const attempt=registration.identityAttempts?.at(-1);
    // Existing ordinary signups and completed review fixtures retain their eligibility.
    return attempt?attempt.review?.status==='approved':!legacyRequirement(competition);
  }

  const timestamp=value=>competitionFieldValue('time',new Date(value).toISOString(),'datetime-local');

  function verifyDemo(realName,idNumber){
    if(!realName)return '请输入姓名。';
    if(!/^\d{17}[\dX]$/.test(idNumber))return '请输入 18 位身份证号码，末位可以是 X。';
    if(realName!==example.realName||idNumber!==example.idNumber)return '姓名和身份证号码未匹配，请核对后重试。';
    return '';
  }

  function fields(){
    return `<label class="field">姓名<input name="realName" type="text" maxlength="50" autocomplete="off" required placeholder="请输入姓名"></label>
    <label class="field">身份证号码<input name="idNumber" type="text" maxlength="18" autocomplete="off" autocapitalize="characters" spellcheck="false" required placeholder="请输入身份证号码"></label>`;
  }

  function seedDemo(){
    const existing=state.competitions.find(c=>c.id===demoId);
    const description='体验赛事报名与组队。请先在个人资料完成实名认证并上传简历。';
    if(existing)existing.values.description=description;
    const now=Date.now();
    if(existing&&(Date.parse(existing.values.registrationEnd)>now||Object.keys(state.participation.regs[demoId]||{}).length))return;
    const demoDate=days=>timestamp(now+days*86400000).replace(' ','T')+':00+08:00';
    const schedule={
      registrationStart:demoDate(-1),registrationEnd:demoDate(7),
      submissionStart:demoDate(8),submissionEnd:demoDate(22),
      correctionEnd:demoDate(25),publicationAt:demoDate(28)
    };
    // Reopen an unused example when its local schedule expires.
    if(existing){
      Object.assign(existing.values,schedule);
      return;
    }
    const values=demoCompetitionFields({
      id:demoId,title:'赛事身份认证体验赛',domain:'代码工程',org:'Benchsquare 演示工作组',
      desc:description,
      prize:10000
    });
    Object.assign(values,schedule);
    state.competitions.push({id:demoId,stage:'已发布',ownerId:'chen',version:1,values});
  }

  const api={demoId,legacyRequirement,verifiedAt,migrate,enrollmentEligible,verifyDemo,fields,seedDemo};
  if(typeof module!=='undefined')module.exports=api;
  else root.CompetitionIdentity=api;
})(typeof window==='undefined'?globalThis:window);
