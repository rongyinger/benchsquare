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
  function generate(user){return specs.map(([name,cid,status,outcome],i)=>{
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
  function upgrade(store){return {...store,records:store.records.map(r=>{
    if(!r.mock)return r;
    // Refresh only untouched bundled examples. Participant edits keep their own files and snapshots.
    const bundled=[r.form,r.draftForm,...(r.history||[]).map(h=>h.form)].filter(Boolean).every(f=>(f.attachments||[]).every(a=>a.source==='mock'||a.source==='placeholder'));
    if(r.mockVersion!==mockVersion&&bundled){const sample=generate(r.ownerId||r.updatedBy||'rong').find(x=>x.id===r.id);if(sample)return sample;}
    if(r.form?.submissionFormat==='harbor')return r;
    return {...r,form:packageForm(r.form,r.id,r.revision||1),...(r.draftForm?{draftForm:packageForm(r.draftForm,r.id+'-draft',(r.revision||0)+1)}:{}),history:(r.history||[]).map(h=>({...h,...(h.form?{form:packageForm(h.form,r.id+'-v'+h.revision,h.revision)}:{})}))};
  })};}
  function upgradeScores(store,user){const seeds=new Map(generate(user).map(r=>[r.id,r]));let changed=false;for(const r of store.records){const seed=r.mock&&seeds.get(r.id);if(!seed)continue;for(const h of r.reviews||[]){const original=seed.reviews.find(v=>v.revision===h.revision&&v.to===h.to&&v.at===h.at&&v.note===h.note);if(h.score===undefined&&original?.score!==undefined){h.score=original.score;changed=true;}}}return changed;}
  function upgradeReviewExample(store,user){const seed=generate(user).find(r=>r.form.name==='chart_units_rejected_02'),r=store.records.find(r=>r.id===seed.id),old=r?.reviews?.[0];if(!r?.mock||(r.form.attachments||[]).some(a=>a.source==='file')||r.revision!==1||r.status!=='已审核'||r.reviewOutcome!=='审核不通过'||r.draftForm||r.reviews.length!==1||r.history?.length!==1||old.to!=='未通过'||old.note!==seed.reviews[0].note||old.at!==seed.reviews[0].at||r.updatedAt!==old.at||!['name','domain','software','os','license','description','verification','cloudLink','consent','terms'].every(key=>JSON.stringify(r.form[key])===JSON.stringify(seed.form[key])))return false;r.revision=2;r.updatedAt=seed.updatedAt;r.reviewNote=seed.reviewNote;r.reviews.push(seed.reviews[1]);r.history.push(seed.history[1]);return true;}
  const api={generate,upgrade,upgradeScores,upgradeReviewExample,version:mockVersion};if(typeof module!=='undefined')module.exports=api;else root.DataMocks=api;
})(typeof window==='undefined'?globalThis:window);
