/* Public competition pages read the same fields as the creation form.
   Aliases accept the earlier competition-config field names. */
function competitionValues(c){
  const raw=c.values||c.config||{}, schedule=raw.schedule||{};
  const pick=(...values)=>values.find(v=>v!==undefined&&v!==null&&v!=='');
  const award=raw.customAwards?.[0]||{};
  return {
    ...raw,
    name:pick(raw.name,c.title),topic:pick(raw.topic,raw.theme),
    tags:pick(raw.tags,c.tags),description:pick(raw.description,raw.summary,c.desc),
    organizer:pick(raw.organizer,c.org),contact:raw.contact,
    license:pick(raw.license,raw.dataLicense),domain:pick(raw.domain,raw.compDomain,c.domain),
    boundary:pick(raw.boundary,raw.scope),acceptance:pick(raw.acceptance,raw.benchmarkCriteria),
    registrationStart:pick(raw.registrationStart,schedule.regStart,c.registrationStart),
    registrationEnd:pick(raw.registrationEnd,schedule.regEnd,c.deadline),
    submissionStart:pick(raw.submissionStart,schedule.submitStart,c.start),
    submissionEnd:pick(raw.submissionEnd,schedule.submitEnd,c.end),
    correctionEnd:pick(raw.correctionEnd,schedule.correctionEnd),publicationAt:pick(raw.publicationAt,schedule.publicationAt),
    materials:pick(raw.materials,c.deliverables),environment:raw.environment,
    formats:pick(raw.formats,raw.fileFormats),fields:pick(raw.fields,raw.fieldSpec),scale:raw.scale,
    pool:pick(raw.pool,raw.prizePool,c.prize),rankBudget:pick(raw.rankBudget,raw.rankingBudget),
    rankRule:pick(raw.rankRule,raw.rankingRule),
    customName:pick(raw.customName,award.name),customBudget:pick(raw.customBudget,award.budget),
    customRule:pick(raw.customRule,award.rule,award.criteria),
    eligibility:pick(raw.eligibility,participationRuleDefaults.eligibility),
    teamMode:pick(raw.teamMode,participationRuleDefaults.teamMode),
    teamMax:raw.teamMode==='仅个人参赛'?1:pick(raw.teamMax,participationRuleDefaults.teamMax),
    ...platformCompetitionRules
  };
}
function competitionFieldValue(key,value,type){
  if(type==='pending'){if(!value)return '待确定';type='datetime-local';}
  if(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length))return '未填写';
  if(Array.isArray(value))return value.join('、');
  if(['pool','rankBudget','customBudget'].includes(key)){
    const number=Number(String(value).replaceAll(',',''));return Number.isFinite(number)?number.toLocaleString('zh-CN')+' 元':String(value);
  }
  if(type==='datetime-local'){if(/(?:Z|[+-]\d\d:\d\d)$/.test(String(value))&&Number.isFinite(Date.parse(value)))return new Date(value).toLocaleString('sv-SE',{timeZone:'Asia/Shanghai',hour12:false}).slice(0,16);const match=String(value).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);return match?match[1]+' '+match[2]:String(value);}
  if(key==='teamMax')return '每队最多'+value+'人';
  return String(value);
}
function competitionTimelineState(values,now=Date.now()){
  const timestamp=value=>{
    if(!value)return NaN;
    let text=String(value).replace(' ','T');
    if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(text))text+='+08:00';
    return Date.parse(text);
  };
  const definitions=[['registrationStart','报名开始时间'],['registrationEnd','报名结束时间'],['submissionStart','任务提交开始时间'],['submissionEnd','新增提交截止时间'],['correctionEnd','补正截止时间'],['publicationAt','结果公示时间']];
  const points=definitions.map(([key,label],index)=>({key,label,index,value:values[key],time:timestamp(values[key])}));
  let active=-1;for(const point of points)if(Number.isFinite(point.time)&&point.time<=now)active=point.index;
  for(const point of points){
    point.status=!Number.isFinite(point.time)?'unknown':point.index===active?'current':point.time<=now?'reached':'upcoming';
    const next=points[point.index+1];
    point.progress=Number.isFinite(point.time)&&next&&Number.isFinite(next.time)&&now>=point.time?(next.time<=point.time?100:Math.max(0,Math.min(100,(now-point.time)/(next.time-point.time)*100))):0;
  }
  const phases=['报名尚未开始','报名与组队中','报名已截止，等待任务提交开始','提交与审核中','审核收尾与补正中','补正已截止，等待结果公示','结果公示中'];
  return {points,active,phase:active<0?(Number.isFinite(points[0].time)?phases[0]:'赛程时间待完善'):phases[active+1]};
}
function competitionTimeline(values,now=Date.now()){
  const {points,phase}=competitionTimelineState(values,now);
  const statusNames={reached:'已到达',current:'当前进度',upcoming:'未到达',unknown:'待确定'};
  return `<div class="competition-schedule" aria-label="比赛赛程"><div class="competition-timeline-heading"><h2>关键时间</h2><span class="competition-phase" role="status">${esc(phase)}</span></div><ol class="competition-timepoints">${points.map(point=>`<li class="competition-timepoint ${point.status}" data-timeline-key="${point.key}" ${point.status==='current'?'aria-current="step"':''} style="--segment-progress:${point.progress.toFixed(2)}%"><span class="competition-timepoint-dot" aria-hidden="true">${point.status==='reached'?'✓':String(point.index+1).padStart(2,'0')}</span><div data-competition-field="${point.key}"><h3>${esc(point.label)}</h3><time ${Number.isFinite(point.time)?`datetime="${new Date(point.time).toISOString()}"`:''}>${Number.isFinite(point.time)?esc(competitionFieldValue(point.key,point.value,'datetime-local')):'待确定'}</time></div><span class="competition-timepoint-status">${statusNames[point.status]}</span></li>`).join('')}</ol><p class="competition-timeline-note">任务提交成功后进入人工初审，初审通过后进入终检。新增提交截止后不再接收新任务，已提交任务继续审核；需修改的任务须在补正截止前重新提交。补正截止与结果公示时间未公布时显示待确定，所有时间按北京时间展示。</p></div>`;
}
function refreshCompetitionTimeline(){
  const target=document.querySelector('#main .competition-schedule');
  if(!target||detailTab!=='赛程与奖励')return;
  const c=find(currentId);if(c)target.outerHTML=competitionTimeline(competitionValues(c));
}
function competitionFieldModules(c,indexes){
  const values=competitionValues(c);
  return indexes.map(index=>{
    const module=modules[index];
    const field=(key,kind='')=>{
      const [,label,type]=module.fields.find(f=>f[0]===key);
      const formatted=competitionFieldValue(key,values[key],type),amount=Number(String(values[key]??'').replaceAll(',',''));
      const value=kind==='currency'&&values[key]!==undefined&&values[key]!==''&&Number.isFinite(amount)?'¥'+amount.toLocaleString('zh-CN'):formatted;
      return `<div class="competition-content-field ${kind}" data-competition-field="${key}"><div class="competition-content-label">${esc(label)}</div><div class="competition-content-value">${esc(value)}</div></div>`;
    };
    let content='';
    if(index===0){
      const tags=Array.isArray(values.tags)?values.tags:String(values.tags||'').split(/[,，、]/).filter(Boolean);
      content=`<h2>关于这场挑战</h2>${field('topic','competition-topic')}<div class="competition-description-copy" data-competition-field="description"><span class="competition-sr-only">比赛简介</span><p>${esc(values.description||'未填写')}</p></div><div class="competition-tag-row" data-competition-field="tags"><span class="competition-sr-only">比赛标签</span>${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="competition-muted">暂无标签</span>'}</div><div class="competition-facts">${field('name')}${field('organizer')}${field('contact')}</div><div class="competition-license">${field('license')}</div>`;
    }else if(index===1){
      content=`<div class="competition-section-heading"><h2>任务要求与验收</h2>${field('domain','competition-domain')}</div><div class="competition-task-cards"><article><span class="competition-card-number">01</span>${field('boundary')}</article><article><span class="competition-card-number">02</span>${field('acceptance')}</article></div>`;
    }else if(index===2){
      content=`<h2>参赛规则</h2><p class="competition-field-note">以下为主办方制定并经审核发布的本比赛参赛规则。</p><div class="competition-rule-facts">${field('teamMode')}${field('teamMax')}</div><div class="competition-eligibility">${field('eligibility')}</div>`;
    }else if(index===4){
      content=`<h2>提交规范</h2><div class="competition-materials">${field('materials')}</div><div class="competition-spec-cards">${['environment','formats','fields','scale'].map(key=>`<article>${field(key)}</article>`).join('')}</div>`;
    }else if(index===3){
      content=competitionTimeline(values);
    }else if(index===5){
      const configured=!!(values.customName||values.customBudget||values.customRule);
      content=`<h2>奖励方案</h2><div class="competition-prize-card"><div class="competition-prize-total">${field('pool','currency')}</div><div class="competition-prize-budget">${field('rankBudget')}</div></div><article class="competition-ranking">${field('rankRule')}</article>${configured?`<article class="competition-custom-award"><span class="competition-award-badge">特别奖项</span>${field('customName')}${field('customBudget')}${field('customRule')}</article>`:`<p class="competition-optional-note">本比赛未设置自定义奖项。${['customName','customBudget','customRule'].map(key=>`<span class="competition-sr-only" data-competition-field="${key}">${esc(module.fields.find(f=>f[0]===key)[1])}：未设置</span>`).join('')}</p>`}<div class="competition-payout">${field('distribution')}</div>`;
    }
    return `<section class="competition-field-module competition-designed-module" data-competition-module="${index}">${content}</section>`;
  }).join('');
}
