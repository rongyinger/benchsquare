(function(root){
  'use strict';

  const demoId='identity-verification-demo';
  const verifiedDemoUser='zhou';
  const example=Object.freeze({realName:'演示用户',idNumber:'000000200001010010',phone:'13800000000'});
  const smsCooldownMs=60_000;
  const smsLifetimeMs=5*60_000;
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

  function phoneError(phone){
    return /^1[3-9]\d{9}$/.test(phone)?'':'请输入有效的 11 位手机号。';
  }

  function issueSms(phone,now=Date.now()){
    const random=root.crypto.getRandomValues(new Uint32Array(1))[0];
    const code=String(random%1_000_000).padStart(6,'0');
    return {phone,code,expiresAt:now+smsLifetimeMs};
  }

  function verifyDemo(realName,idNumber,phone,smsCode,challenge,now=Date.now()){
    if(!realName)return '请输入姓名。';
    if(!/^\d{17}[\dX]$/.test(idNumber))return '请输入 18 位身份证号码，末位可以是 X。';
    const invalidPhone=phoneError(phone);
    if(invalidPhone)return invalidPhone;
    if(!challenge||challenge.phone!==phone)return '请先为当前手机号发送验证码。';
    if(now>=challenge.expiresAt)return '验证码已过期，请重新发送。';
    if(!/^\d{6}$/.test(smsCode))return '请输入 6 位短信验证码。';
    if(smsCode!==challenge.code)return '短信验证码错误，请核对后重试。';
    if(realName!==example.realName||idNumber!==example.idNumber||phone!==example.phone)return '姓名、身份证号码和手机号未匹配，请使用演示资料。';
    return '';
  }

  function fields(){
    return `<label class="field">姓名<input name="realName" type="text" maxlength="50" autocomplete="off" required placeholder="请输入姓名"></label>
    <label class="field">身份证号码<input name="idNumber" type="text" maxlength="18" autocomplete="off" autocapitalize="characters" spellcheck="false" required placeholder="请输入身份证号码"></label>
    <label class="field">手机号<input name="phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="off" required placeholder="请输入本人实名手机号" aria-describedby="expert-identity-example"></label>
    <div class="field">
     <label for="expert-identity-sms-code">短信验证码</label>
     <div class="expert-identity-sms">
      <input id="expert-identity-sms-code" name="smsCode" type="text" inputmode="numeric" maxlength="6" autocomplete="off" required placeholder="请输入 6 位验证码" aria-describedby="expert-identity-sms-status">
      <button type="button" class="button" data-identity-send>发送验证码</button>
     </div>
    </div>
    <p id="expert-identity-sms-status" class="expert-identity-sms-status" role="status"></p>
    <p id="expert-identity-example" class="expert-card-note">演示资料：${example.realName} / ${example.idNumber} / ${example.phone}。验证码会在此处显示。</p>`;
  }

  function seedDemo(){
    const accounts=state.participation.accounts ||= {};
    const account=accounts[verifiedDemoUser] ||= {};
    account.realNameVerifiedAt ||= Date.now();
    const existing=state.competitions.find(c=>c.id===demoId);
    const description='体验确认参赛规则、提交简历、实名认证与组队。';
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

  const api={demoId,verifiedDemoUser,legacyRequirement,verifiedAt,migrate,enrollmentEligible,phoneError,issueSms,smsCooldownMs,verifyDemo,fields,seedDemo};
  if(typeof module!=='undefined')module.exports=api;
  else root.CompetitionIdentity=api;
})(typeof window==='undefined'?globalThis:window);
