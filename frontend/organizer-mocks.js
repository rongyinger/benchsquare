(function(root){
  'use strict';
  const storageKey='benchsquare-organizer-demo-v1',version=1;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const iso=value=>new Date(value).toISOString();
  const passed=new Set(['审核通过','已录用']);
  const packages={
    dependency:['dependency_conflict_01_v1.zip',2026],
    recovery:['api_error_recovery_draft_01_v1.zip',2112],
    material:['material_strength_revision_03_v1.zip',2767],
    thermal:['thermal_boundary_accepted_03_v2.zip',3190],
    rejected:['chart_units_rejected_02_v1.zip',2044],
    timezone:['csv_timezone_ready_02_v1.zip',2009],
    qualified:['material_strength_qualified_03_v1.zip',2794],
    boundary1:['thermal_boundary_resubmit_03_v1.zip',2752],
    boundary2:['thermal_boundary_resubmit_03_v2.zip',3189]
  };
  const notes={
    '审核中':'本版本已进入初审，暂未产生正式审核结论。',
    '审核通过':'任务说明、输入与预期结果一致，验证方法可复现。审核通过，等待赛事确认录用。',
    '需补正':'缺少边界条件与单位换算说明，请补充异常输入的验证步骤后重新提交。',
    '审核不通过':'验证结果未达到任务规定的准确性要求，本版本审核不通过。',
    '已录用':'已完成初审与复现验证，任务和验收材料满足要求，确认录用。'
  };
  function checkContext(ownerId,now){
    if(typeof ownerId!=='string'||!ownerId.trim())throw new Error('请选择演示身份。');
    if(!Number.isFinite(now))throw new Error('演示时间无效。');
  }
  function listEvents(ownerId='rong',now=Date.now()){
    checkContext(ownerId,now);
    const at=hours=>iso(now+hours*3600000);
    const specs=[
      ['organizer-mock-event','专业评测任务挑战赛','已发布','科学推理',50000,[-336,-192,-168,720,840,960],-480],
      ['od-chart','多模态图表理解挑战赛','已发布','多模态',36000,[-72,168,192,672,744,840],-144],
      ['od-code','代码仓库缺陷修复赛','已发布','代码工程',60000,[-240,-24,48,528,600,696],-360],
      ['od-science','科学推理与材料验证赛','已发布','科学推理',48000,[-720,-552,-528,-24,72,168],-840],
      ['od-finance','金融报表分析挑战赛','已发布','金融分析',80000,[-960,-792,-768,-192,-96,-48],-1080],
      ['od-law','法律条款抽取挑战赛','审核中','法律实务',30000,[240,408,432,912,984,1080],-24],
      ['od-medical','医疗文献证据核查赛','待付款','医疗健康',56000,[120,288,312,792,864,960],-72],
      ['od-draft','智能体工具调用评测赛','草稿','代码工程',40000,[336,504,528,1008,1080,1176],-4]
    ];
    const scheduleKeys=['registrationStart','registrationEnd','submissionStart','submissionEnd','correctionEnd','publicationAt'];
    return specs.map(([id,title,stage,domain,pool,hours,created])=>{
      const schedule=Object.fromEntries(scheduleKeys.map((key,i)=>[key,at(hours[i])]));
      const organizer='Benchsquare 示例赛事组';
      return {id,title,organizer,ownerId,demo:true,stage,createdAt:at(created),version:1,
        ...(stage==='待付款'?{paymentDeadline:at(48)}:{}),
        ...schedule,
        values:{name:title,organizer,pool,domain,description:'面向'+domain+'领域，征集可复现的专业评测任务与验证材料。',
          ...schedule,teamMode:'团队',teamMax:5,
          materials:'可提交 Harbor 压缩包或 ALE 任务说明；以下数据与评审结果均为示例。',
          acceptance:'任务目标、输入材料与验收标准完整，参考结果可核对、过程可复现。'}};
    });
  }
  function time(value){
    if(value===null||value===undefined||value==='')return NaN;
    if(typeof value==='number')return value;
    let source=String(value).replace(' ','T');
    if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(source))source+='+08:00';
    return Date.parse(source);
  }
  function scheduleOf(event){return {...event,...event?.values};}
  function lifecycle(event,now=Date.now()){
    if(event?.stage!=='已发布')return '未上线';
    const v=scheduleOf(event),registrationStart=time(v.registrationStart),registrationEnd=time(v.registrationEnd),
      submissionStart=time(v.submissionStart),submissionEnd=time(v.submissionEnd),correctionEnd=time(v.correctionEnd),publicationAt=time(v.publicationAt);
    if(Number.isFinite(registrationStart)&&now<registrationStart)return '未开始';
    if(Number.isFinite(registrationEnd)&&now<registrationEnd)return '报名中';
    if(Number.isFinite(submissionStart)&&now<submissionStart)return '待开赛';
    if(Number.isFinite(submissionEnd)&&now<submissionEnd)return '进行中';
    if(Number.isFinite(correctionEnd)&&now<correctionEnd)return '审核补正中';
    if(Number.isFinite(publicationAt)&&now>=publicationAt)return '已结束';
    return '待公示';
  }
  function submissionPhase(event,now=Date.now()){
    if(event?.stage!=='已发布')return 'before';
    const v=scheduleOf(event),start=time(v.submissionStart),end=time(v.submissionEnd),correction=time(v.correctionEnd);
    if(!Number.isFinite(start)||!Number.isFinite(end)||now<start)return 'before';
    if(now<end)return 'open';
    if(Number.isFinite(correction)&&now<correction)return 'correction';
    return 'closed';
  }
  function baseGenerate(ownerId='rong',now=Date.now()){
    if(typeof ownerId!=='string'||!ownerId.trim())throw new Error('请选择演示身份。');
    if(!Number.isFinite(now))throw new Error('演示时间无效。');
    const ago=hours=>iso(now-hours*3600000);
    const teamSpecs=[
      ['T-001','极光数据队',['林舟','唐语','苏澄']],
      ['T-002','青云实验室',['江岚','陈予','许诺','白榆']],
      ['T-003','星河探索队',['陈宁','林溪']],
      ['T-004','启明数据队',['许一','沈知','周予']],
      ['T-005','凌波小组',['唐禾','江望','苏禾']],
      ['T-006','芥子团队',['方宁','何清']],
      ['T-007','未央研究队',['程悦','叶宁','丁可']],
      ['T-008','桥木数据队',['陆遥','宋安']]
    ];
    const teams=teamSpecs.map(([id,name,names],i)=>({
      id,name,leader:names[0],members:names.map((name,n)=>({id:id+'-member-'+(n+1),name})),
      registeredAt:ago(240-i),blacklisted:id==='T-004',
      blacklistReason:id==='T-004'?'材料来源说明不完整，核查期间暂停该团队继续提交。':'',
      blockedAt:id==='T-004'?ago(4):null
    }));
    const specs=[
      ['Task-021','T-001','依赖环境冲突复现','harbor','审核中',0.5,'dependency',2,'recovery'],
      ['Task-008','T-001','材料强度边界条件验证','harbor','需补正',24,'material'],
      ['Task-013','T-001','跨页字段合并与去重','ale','审核通过',28],
      ['Task-004','T-001','CSV 时区归一化','ale','已录用',48],
      ['Task-030','T-002','依赖环境复现验证','harbor','审核中',1,'dependency'],
      ['Task-031','T-002','图表单位与数值核查','ale','审核通过',25],
      ['Task-032','T-002','热边界守恒校验','harbor','已录用',50,'thermal'],
      ['Task-041','T-004','图表金额单位识别','harbor','审核不通过',26,'rejected'],
      ['Task-042','T-004','结构化信息一致性校验','ale','审核通过',51],
      ['Task-051','T-005','跨时区日期校正','harbor','需补正',2,'timezone'],
      ['Task-052','T-005','单位换算异常检测','ale','审核中',30],
      ['Task-061','T-006','材料参数一致性检查','harbor','审核通过',22,'qualified'],
      ['Task-062','T-006','合同条款提取与定位','ale','审核中',35],
      ['Task-081','T-008','热传导边界验证','harbor','已录用',27,'boundary2',2,'boundary1'],
      ['Task-082','T-008','指标阈值与参考区间比对','ale','审核通过',44],
      ['Task-083','T-008','多页表头归并','ale','审核不通过',60]
    ];
    const tasks=specs.map(([id,teamId,title,type,status,hours,asset,revision=1,priorAsset],i)=>{
      const team=teams.find(t=>t.id===teamId),submitter=team.members[i%team.members.length].name;
      const versions=Array.from({length:revision},(_,n)=>{
        const r=n+1,current=r===revision,at=ago(hours+(revision-r)*24),reviewStatus=current?status:'需补正';
        const value={revision:r,submittedAt:at,submitter,
          review:{status:reviewStatus,note:notes[reviewStatus],reviewer:'赛事评审组（示例）',at:iso(new Date(at).getTime()+3*60000)}};
        if(type==='harbor'){
          const [name,size]=packages[current?asset:priorAsset||asset];
          value.file={name,size,archivePath:'assets/harbor-examples/'+name};
        }else value.content={
          description:'任务：'+title+'。基于给定样例完成提取、校验并输出可核对的结构化结果。',
          input:'示例输入包含 12 条常规记录、2 条缺失值和 2 条边界记录；原始单位及字段说明随任务提供。',
          expected:'输出记录标识、标准化结果与异常原因；保留原始值，禁止将缺失值自动补为 0。',
          verification:'逐条比对参考结果，检查缺失值、重复记录与边界条件。数值比较按任务说明中的单位和容差执行。'
        };
        return value;
      });
      return {id,teamId,title,type,submitter,revision,status,submittedAt:versions.at(-1).submittedAt,versions};
    });
    return {version,ownerId,event:{
      id:'organizer-mock-event',title:'专业评测任务挑战赛 · 团队管理演示',
      registrationEnd:ago(192),submissionStart:ago(168),submissionEnd:iso(now+30*86400000)
    },teams,tasks,anomalies:[{
      id:'A-001',type:'疑似重复',teamIds:['T-001','T-002'],
      taskRefs:[{taskId:'Task-021',revision:2},{taskId:'Task-030',revision:1}],
      evidence:'两个不同 Task 的 Harbor 包文件完全一致；SHA-256：4b6a1a8f8e8e04745b5c8b48aa40adc6ed8ff8efcc48f9a81d14fbcbb327f477。该示例包可下载比对；是否违规需人工核查。',
      status:'待处理',foundAt:ago(0.4)
    },{
      id:'A-002',type:'人工标记',teamIds:['T-004'],taskRefs:[{taskId:'Task-041',revision:1}],
      evidence:'人工核查发现材料来源说明缺失，需团队补充来源证明。',
      status:'已处理',foundAt:ago(5),outcome:'确认存在问题',note:'已确认来源说明缺失，先暂停该团队提交，历史任务继续按审核规则处理。',
      handledBy:ownerId,handledAt:ago(4.5)
    }],logs:[
      {id:'L-001',action:'标记异常',anomalyId:'A-002',teamId:'T-004',actor:ownerId,reason:'材料来源说明缺失。',at:ago(5)},
      {id:'L-002',action:'处理异常',anomalyId:'A-002',teamId:'T-004',actor:ownerId,reason:'确认存在问题：材料来源说明缺失。',at:ago(4.5)},
      {id:'L-003',action:'拉黑团队',teamId:'T-004',actor:ownerId,reason:teams[3].blacklistReason,at:ago(4)}
    ]};
  }
  function generate(ownerId='rong',now=Date.now(),eventId='organizer-mock-event'){
    const event=listEvents(ownerId,now).find(e=>e.id===eventId);
    if(!event)throw new Error('示例赛事不存在，请返回赛事管理列表。');
    const data=baseGenerate(ownerId,now);
    data.event=event;
    if(eventId==='organizer-mock-event')return upgradeProcess(data);
    const teamNames={
      'od-chart':['图谱实验室','视觉边界队','光栅共创组','图表推理队','多模态工坊'],
      'od-code':['回归测试队','补丁工程组','仓库侦探队','依赖修复组'],
      'od-science':['熵增研究队','材料边界组','守恒验证队','量纲实验室','数值探索队','晶格共创组'],
      'od-finance':['现金流研究所','报表侦探队','财务洞察组','勾稽分析队','风险识别队','指标复核组','审计证据队']
    }[eventId]||[];
    const registrationStart=time(event.values.registrationStart),registrationEnd=Math.min(now,time(event.values.registrationEnd));
    data.teams=data.teams.slice(0,teamNames.length).map((team,i)=>({...team,name:teamNames[i],blacklisted:false,blacklistReason:'',blockedAt:null,
      registeredAt:iso(registrationStart+(registrationEnd-registrationStart)*(i+1)/(teamNames.length+1))}));
    data.anomalies=[];
    data.logs=[];
    if(!['od-science','od-finance'].includes(eventId)){data.tasks=[];return data;}
    const titles=eventId==='od-science'?[
      '材料强度边界验证','热传导能量守恒','温度单位转换','实验数据缺失修复','晶体结构参数提取','反应动力学拟合',
      '压力传感器容差核查','应力曲线异常识别','多相材料本构验证','物理量量纲一致性','数值稳定性测试','实验报告证据定位'
    ]:[
      '合并报表勾稽关系','现金流异常识别','财务指标阈值核查','多币种汇率换算','应收账款账龄分析','季度收入对齐',
      '资产负债平衡校验','利润变动归因','附注证据定位','跨期数据一致性','会计科目映射','重复交易识别','金额单位标准化','财报表头归并'
    ];
    const scienceStatus=['审核中','需补正','审核通过','已录用','需补正','审核通过','审核中','审核不通过','已录用','审核通过','审核中','需补正'];
    data.tasks=data.tasks.slice(0,titles.length).map((task,i)=>{
      const team=data.teams[Math.floor(i/2)],status=eventId==='od-science'?scienceStatus[i]:['审核通过','已录用','审核不通过'][i%3];
      const submitter=team.members[i%team.members.length].name;
      const latestAt=eventId==='od-science'&&i===0?now-6*3600000:time(event.values.submissionEnd)-(i+1)*10*3600000;
      const versions=task.versions.map(v=>{
        const at=latestAt-(task.revision-v.revision)*48*3600000,current=v.revision===task.revision;
        const reviewStatus=current?status:eventId==='od-science'?'需补正':'审核通过';
        return {...v,submitter,submittedAt:iso(at),
          review:{status:reviewStatus,note:notes[reviewStatus],reviewer:'赛事评审组（示例）',at:iso(at+3*60000)},
          ...(v.content?{content:{...v.content,description:'任务：'+titles[i]+'。基于给定'+event.values.domain+'样例，输出可核对的结构化结果与验证依据。'}}:{})};
      });
      return {...task,teamId:team.id,title:titles[i],status,submitter,submittedAt:iso(latestAt),versions};
    });
    if(eventId==='od-science')data.anomalies.push({id:'A-001',type:'人工标记',teamIds:['T-001'],
      taskRefs:[{taskId:data.tasks[1].id,revision:data.tasks[1].revision}],
      evidence:'补正核查中：热边界条件与单位换算说明不完整，需补充验证步骤。异常处理不自动改变该任务的审核状态。',
      status:'待处理',foundAt:iso(now-2*3600000)});
    return data;
  }
  function upgradeProcess(data){
    if(data?.event?.id!=='organizer-mock-event'||!data.ownerId||!Array.isArray(data.tasks))return data;
    const task=data.tasks.find(t=>t.id==='Task-081'),current=task?.versions?.find(v=>v.revision===2);
    if(!current||task.versions.some(v=>Object.hasOwn(v,'reviews')))return data;
    const submitted=time(current.submittedAt);
    if(!Number.isFinite(submitted))return data;
    // The original bundled Task-081 was submitted 27 hours before its seed clock.
    // Deriving that clock lets old caches be checked without replacing their dates.
    let expected;
    try{expected=baseGenerate(data.ownerId,submitted+27*3600000).tasks.find(t=>t.id==='Task-081');}catch{return data;}
    const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])])):value;
    if(JSON.stringify(ordered(task))!==JSON.stringify(ordered(expected)))return data;
    const next=clone(data),version=next.tasks.find(t=>t.id==='Task-081').versions.find(v=>v.revision===2);
    version.processMock=true;
    version.reviews=[{
      status:'终检中',note:'初审通过：任务材料与验证步骤完整，进入终检复现验证。',
      reviewer:version.review.reviewer,at:iso(submitted+60000),simulated:true
    },clone(version.review)];
    return next;
  }
  function validData(data){
    if(!data||!data.ownerId||!data.event?.id||!Array.isArray(data.teams)||!Array.isArray(data.tasks)||!Array.isArray(data.anomalies)||!Array.isArray(data.logs))throw new Error('演示数据无效，请重置示例。');
    return data;
  }
  function teamOf(data,id){
    validData(data);
    const team=data.teams.find(t=>t.id===id);
    if(!team)throw new Error('团队不存在，请刷新列表。');
    return team;
  }
  function uniqueTasks(data){
    const unique=new Map();
    for(const task of data.tasks){
      const old=unique.get(task.id);
      if(!old||task.revision>old.revision||(task.revision===old.revision&&new Date(task.submittedAt)>new Date(old.submittedAt)))unique.set(task.id,task);
    }
    return [...unique.values()];
  }
  function teamSummary(data,teamId){
    teamOf(data,teamId);
    const tasks=uniqueTasks(data).filter(t=>t.teamId===teamId);
    return {taskCount:tasks.length,passedCount:tasks.filter(t=>passed.has(t.status)).length,
      anomalyCount:new Set(data.anomalies.filter(a=>a.status==='待处理'&&a.teamIds.includes(teamId)).map(a=>a.id)).size,
      lastSubmittedAt:tasks.reduce((latest,t)=>!latest||new Date(t.submittedAt)>new Date(latest)?t.submittedAt:latest,null)};
  }
  function stats(data){
    validData(data);
    const teams=[...new Map(data.teams.map(t=>[t.id,t])).values()];
    const submitted=new Set(uniqueTasks(data).map(t=>t.teamId));
    const anomaly=new Set(data.anomalies.filter(a=>a.status==='待处理').flatMap(a=>a.teamIds));
    return {teams:teams.length,submittedTeams:teams.filter(t=>submitted.has(t.id)).length,
      anomalyTeams:teams.filter(t=>anomaly.has(t.id)).length,blacklistedTeams:teams.filter(t=>t.blacklisted).length};
  }
  function authorize(data,actor){
    validData(data);
    if(typeof actor!=='string'||actor!==data.ownerId)throw new Error('仅该演示赛事的创建者可以执行管理操作。');
  }
  function reasonText(value){
    const reason=typeof value==='string'?value.trim():'';
    if(!reason||reason.length>200)throw new Error('请填写 1～200 字的原因。');
    return reason;
  }
  function log(data,entry,now){
    data.logs.push({...entry,id:'L-'+(data.logs.length+1)+'-'+now,at:iso(now)});
  }
  function setBlocked(data,teamId,blocked,reason,actor,now=Date.now()){
    authorize(data,actor);
    if(typeof blocked!=='boolean')throw new Error('团队限制状态无效。');
    if(!Number.isFinite(now))throw new Error('操作时间无效。');
    const team=teamOf(data,teamId),text=reasonText(reason);
    if(team.blacklisted===blocked)throw new Error(blocked?'该团队已被拉黑。':'该团队当前没有提交限制。');
    const next=clone(data),changed=teamOf(next,teamId);
    changed.blacklisted=blocked;
    changed.blacklistReason=blocked?text:'';
    changed.blockedAt=blocked?iso(now):null;
    log(next,{action:blocked?'拉黑团队':'解除拉黑',teamId,actor,reason:text},now);
    return next;
  }
  function resolveAnomaly(data,id,outcome,note,actor,now=Date.now()){
    authorize(data,actor);
    if(!['确认存在问题','排除异常'].includes(outcome))throw new Error('请选择异常处理结论。');
    const text=typeof note==='string'?note.trim():'';
    if(!text)throw new Error('请填写异常处理说明。');
    if(!Number.isFinite(now))throw new Error('操作时间无效。');
    const anomaly=data.anomalies.find(a=>a.id===id);
    if(!anomaly)throw new Error('异常记录不存在。');
    if(anomaly.status!=='待处理')throw new Error('该异常已处理，请刷新记录。');
    const next=clone(data),changed=next.anomalies.find(a=>a.id===id);
    Object.assign(changed,{status:'已处理',outcome,note:text,handledBy:actor,handledAt:iso(now)});
    log(next,{action:'处理异常',anomalyId:id,actor,reason:outcome+'：'+text},now);
    return next;
  }
  function submissionPermission(data,teamId,phase='open'){
    const team=teamOf(data,teamId);
    if(team.blacklisted)return '当前团队已被限制提交：'+team.blacklistReason;
    if(!['open','correction'].includes(phase))return phase==='closed'?'当前提交窗口已结束，不能新增提交或补正重提。':'任务提交尚未开始，当前仅可查看。';
    return '';
  }
  const api={storageKey,version,listEvents,lifecycle,submissionPhase,generate,upgradeProcess,stats,teamSummary,setBlocked,resolveAnomaly,submissionPermission};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrganizerMocks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
