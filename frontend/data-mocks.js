(function(root){
  'use strict';
  const specs=[
    ['api_error_recovery_draft_01','','草稿',''],['csv_timezone_ready_02','code','草稿',''],['material_strength_revision_03','reasoning','草稿','需补正'],
    ['api_retry_review_01','code','待初审',''],['chart_units_review_02','multimodal','待初审',''],['thermal_boundary_resubmit_03','reasoning','待初审','历史需补正'],
    ['dependency_conflict_01','code','已审核','需补正'],['chart_units_rejected_02','multimodal','已审核','审核不通过'],['material_strength_qualified_03','reasoning','已审核','审核通过 · 待录用'],
    ['csv_timezone_accepted_01','code','已通过','已录用'],['form_extraction_accepted_02','multimodal','已通过','已录用'],['thermal_boundary_accepted_03','reasoning','已通过','已录用']
  ];
  const mockVersion=4;
  const notes={
    2:'环境缺少材料参数表中的温度单位约定。请在 instruction.md 中明确 K 与 ℃ 的换算方式，并补充边界值测试。',
    5:'tests/test.sh 只覆盖常温样例，未验证绝热与固定温度边界。请补齐两类边界的断言，并将数值容差统一为 1e-6。',
    6:'环境依赖未锁定，pandas 版本差异导致复现结果不一致。请固定版本并补充最小复现命令和依赖冲突回归用例。',
    7:'图表单位换算错误，缺失值处理没有说明。',
    8:'已核对材料参数来源、单位换算和误差阈值，参考解答通过全部验证用例。审核通过，等待赛事确认录用。',
    9:'已复核 UTC 与本地日期跨日场景，参考解答及夏令时回归用例通过，确认录用。',
    10:'已复核跨页字段归并、缺失值与重复表头场景，结构化输出符合约定，确认录用。',
    11:'初版未说明绝热边界的符号约定，且 verifier 缺少能量守恒断言。请补充说明与边界测试后重新提交。'
  };
  function packageForm(f,key,revision=1){const name=f.name||'harbor-example',filename=name+'_v'+revision+'.zip';return {submissionFormat:'harbor',name,domain:'',software:'',os:[],license:'',description:'',verification:'',cloudLink:'',consent:f.consent===true,terms:f.terms===true,attachments:[{id:'mock-harbor-v4-'+key,category:'harbor',name:filename,source:'mock',type:'application/zip',archive:true,archivePath:'assets/harbor-examples/'+filename}]};}
  function harborExamples(user){return specs.map(([name,cid,status,outcome],i)=>{
    const stamp=(day,hour=10,minute=30)=>new Date(Date.UTC(2026,9,15+i+day,hour-8,minute)).toISOString();
    const revision=[5,7,11].includes(i)?2:i===2?1:status==='草稿'?0:1;
    const form=packageForm({name,consent:i!==0,terms:i!==0},user+'-'+i+'-v'+Math.max(1,revision),Math.max(1,revision));
    const number=v=>'BS-DEMO-'+String(i+1).padStart(3,'0')+'-V'+v;
    const history=Array.from({length:revision},(_,n)=>({revision:n+1,number:number(n+1),at:stamp(n*3,n?9:10,n?20:30),by:user,name,form:packageForm(form,user+'-'+i+'-v'+(n+1),n+1)}));
    const review=(v,note,to,day,hour=14)=>({revision:v,from:'待初审',to,note,at:stamp(day,hour,15),by:cid==='code'?'代码与环境评审组':cid==='multimodal'?'多模态数据评审组':'科学推理评审组',simulated:true});
    const reviews=[];
    if([2,5,11].includes(i))reviews.push(review(1,notes[i],'需修改',1));
    if(i>=6&&i!==7&&i!==11)reviews.push(review(revision,notes[i],i===6?'需修改':i===8?'已审核':'已通过',1));
    if(i===7){reviews.push(review(1,notes[i],'未通过',1));reviews.push(review(2,'单位换算已修正，但缺失值处理仍未补充，且参考结果与输入数据不一致。','未通过',4));}
    if(i===11){reviews.push(review(2,'已确认 instruction.md 补充了绝热边界符号约定，新增能量守恒与固定温度用例；初审通过，进入复现验证。','终检中',4,11));reviews.push({...review(2,'复现验证通过：参考解答覆盖全部边界用例，能量守恒误差小于 1e-6，环境可独立构建。确认录用 v2。','已通过',5,16),from:'终检中'});}
    if(i>=8)reviews.at(-1).score=({8:87.5,9:91.25,10:89,11:94.75})[i];
    const r={id:'personal-demo-'+user+'-'+i,ownerId:user,updatedBy:user,competitionId:cid||undefined,teamId:cid?'mock-team-'+cid+'-'+user:undefined,form,status,reviewOutcome:outcome,mock:true,mockVersion,createdAt:stamp(0),updatedAt:reviews.at(-1)?.at||history.at(-1)?.at||stamp(0),revision,number:revision?number(revision):undefined,history,reviews,reviewNote:reviews.filter(h=>h.revision===revision).at(-1)?.note||''};
    if(i===5)r.updatedAt=history.at(-1).at;
    if(i===2){r.status='需修改';r.draftForm=packageForm(form,user+'-'+i+'-draft-v2',2);r.updatedAt=stamp(2,17,40);}
    return r;
  });}

  // Each format has the same lifecycle coverage; attachments and instructions are format-specific.
  const catalogVersion=1;
  const scenarios=['未关联比赛草稿','完整草稿','补正中的修改草稿','首次提交待初审','首次提交待初审','补正后重提待初审','审核需补正','连续两轮审核不通过','审核通过待录用','首次提交录用','首次提交录用','补正后录用','初审通过终检中','未完成填写的比赛草稿','多轮补正待处理','零分审核通过'];
  function extraHarbor(user,base){
    const copy=(index,name,status,revision)=>{
      const r=JSON.parse(JSON.stringify(base[index]));
      r.id='personal-demo-'+user+'-extra-'+name;r.form=packageForm({...r.form,name},user+'-'+name,revision||1);
      r.status=status;r.revision=revision;r.reviewOutcome='';r.history=[];r.reviews=[];delete r.draftForm;
      const stamp=day=>new Date(Date.UTC(2026,10,1+day,2)).toISOString();r.createdAt=stamp(0);
      for(let v=1;v<=revision;v++)r.history.push({revision:v,number:'BS-DEMO-EXTRA-'+name+'-V'+v,at:stamp(v*2),by:user,name,form:packageForm(r.form,user+'-'+name+'-v'+v,v)});
      r.number=r.history.at(-1)?.number;r.updatedAt=r.history.at(-1)?.at||r.createdAt;r.reviewNote='';
      return {r,stamp};
    };
    const final=copy(3,'api_final_review_04','终检中',1);
    final.r.reviews=[{revision:1,from:'待初审',to:'终检中',note:'初审通过，任务包结构完整，正在独立环境中执行测试与复现。',at:final.stamp(3),by:'代码与环境评审组',simulated:true}];final.r.updatedAt=final.stamp(3);
    const incomplete=copy(1,'csv_incomplete_draft_05','草稿',0);incomplete.r.form.attachments=[];incomplete.r.form.terms=false;
    const repeated=copy(6,'dependency_correction_rounds_06','需修改',3);
    repeated.r.reviewOutcome='需补正';repeated.r.reviews=[1,2,3].map(v=>({revision:v,from:'待初审',to:'需修改',note:['请锁定环境依赖版本，并提供启动命令。','依赖已锁定，请补充失败输入与回归测试。','回归用例已补充，但离线环境仍依赖外部下载，请将所需资源随任务包提供。'][v-1],at:repeated.stamp(v*2+1),by:'代码与环境评审组',simulated:true}));repeated.r.updatedAt=repeated.stamp(7);repeated.r.reviewNote=repeated.r.reviews.at(-1).note;
    const zero=copy(8,'material_zero_score_07','已审核',1);zero.r.reviewOutcome='审核通过 · 待录用';zero.r.reviews=[{revision:1,from:'待初审',to:'已审核',note:'任务格式审核通过，本轮评测最终得分为 0 分，待赛事确认录用。',score:0,at:zero.stamp(3),by:'科学推理评审组',simulated:true}];zero.r.reviewNote=zero.r.reviews[0].note;zero.r.updatedAt=zero.stamp(3);
    return [final.r,incomplete.r,repeated.r,zero.r];
  }
  function aleForm(source,key,revision,index){
    const kind=['code','multimodal','reasoning'].includes(source.kind)?source.kind:'code';
    let topic=kind==='reasoning'?{domain:'材料科学 / 热传导',software:'Python 3.12, NumPy 2.2.6',goal:'计算两层材料的稳态热流密度，并核查温度单位和能量守恒。',input:'layer,thickness_m,conductivity_w_mk\nA,0.02,0.8\nB,0.03,1.2\n',result:'{"heat_flux_w_m2":1000,"total_resistance_m2_k_w":0.05}',rules:'左右边界温度分别为 350 K 和 300 K；面积为 1 m²。各层热阻相加，禁止混用 K 与 ℃。',check:'热流密度为 1000 W/m²；总热阻为 0.05 m²·K/W；热流绝对误差不超过 1e-6，必须检验边界条件和能量守恒。'}:kind==='multimodal'?{domain:'文档处理 / 表格抽取',software:'Python 3.12, pandas 2.2.3',goal:'从带重复表头的两页合成表格中抽取并合并订单，输出统一结构的 JSON。',input:'page,order_id,amount,currency\n1,A001,120,CNY\n1,A002,,CNY\n2,order_id,amount,currency\n2,A001,120,CNY\n2,A003,75,CNY\n',result:'[{"order_id":"A001","amount":120,"currency":"CNY"},{"order_id":"A002","amount":null,"currency":"CNY"},{"order_id":"A003","amount":75,"currency":"CNY"}]',rules:'删除重复表头；按订单号去重；缺失金额输出 null；保留输入中的货币单位。',check:'恰好输出 3 个订单，字段和类型与参考结果一致；A002 的 amount 必须为 null；重复订单不得重复累计。'}:{domain:'软件工程 / 数据清洗',software:'Python 3.12, pandas 2.2.3',goal:'把带时区的订单时间归一为 UTC，按 UTC 日期汇总金额。',input:'order_id,timestamp,amount\nA001,2026-10-01T00:30:00+08:00,100\nA002,2026-09-30T18:00:00+00:00,50\nA003,2026-10-01T01:00:00+00:00,25\n',result:'[{"date":"2026-09-30","amount":150},{"date":"2026-10-01","amount":25}]',rules:'使用 ISO 8601 时区偏移；先转换为 UTC 再分组；金额不得截断或重复累计。',check:'输出日期恰为 2026-09-30 和 2026-10-01；金额分别为 150 和 25；日期按升序，金额绝对误差不超过 1e-8。'};

    if(source.name.includes('api_'))topic={domain:'软件工程 / API 容错',software:'Python 3.12',goal:'实现确定性的 API 重试策略，处理临时错误并避免重复创建订单。',input:'attempt,status,retry_after_seconds\n1,429,2\n2,503,0\n3,200,0\n',result:'{"attempts":3,"wait_seconds":[2,2],"result":"success","created_orders":1}',rules:'仅根据给定响应序列模拟；最多重试 3 次；429 优先使用 Retry-After；503 按 2 秒退避；使用相同幂等键，不得真实联网。',check:'尝试次数为 3；等待序列为 [2,2]；结果 success；订单只创建一次。验证超出重试上限时返回失败，4xx 非 429 不重试。'};
    if(source.name.includes('dependency_'))topic={domain:'软件工程 / 环境复现',software:'Python 3.12, pandas 2.2.3, NumPy 2.2.6',goal:'诊断依赖冲突并生成可离线复核的依赖锁定清单。',input:'package,requested,available\npandas,2.2.3,2.2.3\nnumpy,2.2.6,2.2.6\n',result:'{"python":"3.12","packages":{"numpy":"2.2.6","pandas":"2.2.3"},"network_required":false}',rules:'只能使用给定可用版本；不得访问包仓库；输出版本精确匹配，并提供离线重建命令。',check:'JSON 的 Python 与两个包版本精确一致；network_required 必须为 false；回归验证包含缺失依赖时的明确错误输出。'};
    if(source.name.includes('chart_'))topic={domain:'数据分析 / 图表单位校验',software:'Python 3.12, pandas 2.2.3',goal:'将图表中的长度数据由 mm 统一换算为 m，保留缺失值并输出结构化结果。',input:'sample,length_mm\nA,1200\nB,\nC,250\n',result:'[{"sample":"A","length_m":1.2},{"sample":"B","length_m":null},{"sample":"C","length_m":0.25}]',rules:'mm 除以 1000 转为 m；缺失值保留 null，禁止用 0 填补；维持原始行顺序。',check:'A 为 1.2 m，B 为 null，C 为 0.25 m；绝对误差不超过 1e-9；字段与行数精确匹配，须明确单位与缺失值策略。'};
    const name='ale_'+source.name;
    const textOnly=index===1||index===3;
    const attachment=(category,filename,content,type)=>({id:'mock-ale-'+key+'-'+category+'-v'+revision,category,name:filename,content,size:new TextEncoder().encode(content).length,source:'mock',type});
    const f={submissionFormat:'question',name,domain:topic.domain,software:topic.software,os:[['Linux','Windows','MacOS'][index%3]],license:['免费或开源','商业软件','内部或专有软件'][index%3],description:'目标：'+topic.goal+'\n\n起始状态：'+(textOnly?'输入数据直接提供在下方，无需额外附件。\n'+topic.input:'输入材料见 input_v'+revision+'.csv，参考输出见 reference_v'+revision+'.json。')+'\n\n指令与规则：'+topic.rules+'\n\n输出：生成 result.json，不得修改原始输入。'+(revision>1?'\n\n本轮补正：明确单位、缺失值和边界处理；对照历次审核意见补充回归验证。':''),verification:'# 成功验证标准\n- '+topic.check+'\n- 运行两次输出一致；不允许修改输入或借助网络补取数据。\n- 输出 JSON 可解析，字段齐全，不产生额外记录。\n\n## 参考输出\n`'+topic.result+'`\n\n提交版本：v'+revision,cloudLink:'',consent:false,terms:source.terms===true,attachments:textOnly?[]:[attachment('input','input_v'+revision+'.csv',topic.input,'text/csv'),attachment('reference','reference_v'+revision+'.json',topic.result,'application/json')]};
    if(index===0){f.description='准备一个订单时区归一任务，尚待补充详细规则。';f.verification='';f.terms=false;}
    if(index===13){f.software='';f.verification='';f.attachments=[];f.terms=false;}
    return f;
  }
  function generate(user){
    const base=harborExamples(user),harbor=[...base,...extraHarbor(user,base)];
    harbor.forEach((r,i)=>r.mockScenario=scenarios[i]);
    const ale=harbor.map((original,index)=>{
      const r=JSON.parse(JSON.stringify(original));r.id='personal-demo-'+user+'-ale-'+index;
      const transform=(f,revision)=>aleForm({...f,kind:r.competitionId},user+'-'+index,revision,index);
      r.form=transform(original.form,Math.max(1,r.revision));
      r.history=r.history.map(h=>({...h,name:'ale_'+h.name,number:h.number.replace('BS-DEMO-','BS-DEMO-ALE-'),form:transform(h.form,h.revision)}));
      if(original.draftForm)r.draftForm=transform(original.draftForm,r.revision+1);
      r.number=r.history.at(-1)?.number;
      r.reviews=r.reviews.map(review=>({...review,note:review.note.replaceAll('instruction.md','任务说明').replaceAll('tests/test.sh','验证标准').replaceAll('verifier','验证标准').replaceAll('任务包结构','任务字段与附件').replaceAll('任务包','任务材料')}));
      r.reviewNote=r.reviews.filter(h=>h.revision===r.revision).at(-1)?.note||'';
      return r;
    });return [...harbor,...ale];
  }
  function ensureExamples(store,user){
    const existing=new Set(store.records.map(r=>r.id)),missing=generate(user).filter(r=>!existing.has(r.id));
    store.records.push(...missing);store.exampleCatalogs={...store.exampleCatalogs,[user]:catalogVersion};return missing.length;
  }
  function upgrade(store){return {...store,records:store.records.map(r=>{
    if(!r.mock)return r;
    // Refresh only untouched bundled examples. Participant edits keep their own files and snapshots.
    const bundled=[r.form,r.draftForm,...(r.history||[]).map(h=>h.form)].filter(Boolean).every(f=>(f.attachments||[]).every(a=>a.source==='mock'||a.source==='placeholder'));
    if(r.mockVersion!==mockVersion&&bundled){const sample=generate(r.ownerId||r.updatedBy||'rong').find(x=>x.id===r.id);if(sample)return sample;}
    if(['harbor','question'].includes(r.form?.submissionFormat))return r;
    return {...r,form:packageForm(r.form,r.id,r.revision||1),...(r.draftForm?{draftForm:packageForm(r.draftForm,r.id+'-draft',(r.revision||0)+1)}:{}),history:(r.history||[]).map(h=>({...h,...(h.form?{form:packageForm(h.form,r.id+'-v'+h.revision,h.revision)}:{})}))};
  })};}
  function upgradeScores(store,user){const seeds=new Map(generate(user).map(r=>[r.id,r]));let changed=false;for(const r of store.records){const seed=r.mock&&seeds.get(r.id);if(!seed)continue;for(const h of r.reviews||[]){const original=seed.reviews.find(v=>v.revision===h.revision&&v.to===h.to&&v.at===h.at&&v.note===h.note);if(h.score===undefined&&original?.score!==undefined){h.score=original.score;changed=true;}}}return changed;}
  function upgradeReviewExample(store,user){const seed=generate(user).find(r=>r.form.name==='chart_units_rejected_02'),r=store.records.find(r=>r.id===seed.id),old=r?.reviews?.[0];if(!r?.mock||(r.form.attachments||[]).some(a=>a.source==='file')||r.revision!==1||r.status!=='已审核'||r.reviewOutcome!=='审核不通过'||r.draftForm||r.reviews.length!==1||r.history?.length!==1||old.to!=='未通过'||old.note!==seed.reviews[0].note||old.at!==seed.reviews[0].at||r.updatedAt!==old.at||!['name','domain','software','os','license','description','verification','cloudLink','consent','terms'].every(key=>JSON.stringify(r.form[key])===JSON.stringify(seed.form[key])))return false;r.revision=2;r.updatedAt=seed.updatedAt;r.reviewNote=seed.reviewNote;r.reviews.push(seed.reviews[1]);r.history.push(seed.history[1]);return true;}
  const api={generate,ensureExamples,catalogVersion,upgrade,upgradeScores,upgradeReviewExample,version:mockVersion};if(typeof module!=='undefined')module.exports=api;else root.DataMocks=api;
})(typeof window==='undefined'?globalThis:window);
