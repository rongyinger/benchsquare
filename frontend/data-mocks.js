(function(root){
  'use strict';
  const specs=[
    ['api_error_recovery_draft_01','','草稿',''],['csv_timezone_ready_02','code','草稿',''],['material_strength_revision_03','reasoning','草稿','需补正'],
    ['api_retry_review_01','code','待初审',''],['chart_units_review_02','multimodal','待初审',''],['thermal_boundary_resubmit_03','reasoning','待初审','历史需补正'],
    ['dependency_conflict_01','code','已审核','需补正'],['chart_units_rejected_02','multimodal','已审核','审核不通过'],['material_strength_qualified_03','reasoning','已审核','审核通过 · 待录用'],
    ['csv_timezone_accepted_01','code','已通过','已录用'],['form_extraction_accepted_02','multimodal','已通过','已录用'],['thermal_boundary_accepted_03','reasoning','已通过','已录用']
  ];
  function generate(user){return specs.map(([name,cid,status,outcome],i)=>{
    const domain=cid==='code'?'Software Engineering':cid==='multimodal'?'Multimodal Analysis':'Scientific Reasoning';
    const form={name,domain,software:'Python 3.12, pandas 2.2',os:['Linux'],license:'免费或开源',description:'目标：核对合成数据中的'+(cid==='code'?'异常恢复与依赖条件':cid==='multimodal'?'单位、缺失值与跨页字段':'材料参数与边界条件')+'，输出可复查结果。\n\n起始状态：提供合成 CSV 与字段说明。\n\n规则：不得修改输入，输出 report.md 和 results.csv。',verification:'检查主键、单位与必填字段；数值误差不超过 1e-6。缺少结果文件或错误处理缺失值判为失败。',cloudLink:'',consent:true,terms:true,attachments:['input','reference'].map((category,j)=>({id:'mock-file-'+user+'-'+i+'-'+j,category,name:category==='input'?'input.csv':'reference.csv',source:'mock',size:64,type:'text/plain',content:'# Benchsquare 合成示例\nid,value\n1,0.25\n2,0.75\n'}))};
    if(i===0){form.software='';form.verification='';form.consent=false;form.terms=false;}
    const at=new Date(Date.UTC(2026,9,15+i+(i===7?2:0),2,30)).toISOString(),revision=[2,5,7,11].includes(i)?(i===2?1:2):status==='草稿'?0:1;
    const review=(v,note,to)=>({revision:v,from:'待初审',to,note,at,by:'演示评审员',simulated:true});
    const reviews=[];if(i===2||i===5||i===11)reviews.push(review(1,'请补充边界条件及单位换算依据。','需修改'));if(i>=6&&i!==11)reviews.push(review(revision,i===6?'依赖版本与复现命令缺失，请补充最小复现和回归测试。':i===7?'图表单位换算错误，缺失值处理没有说明。':'任务与验证标准完整，'+(i===8?'审核通过，等待赛事确认录用。':'已确认录用该版本。'),i===6?'需修改':i===7?'未通过':i===8?'已审核':'已通过'));if(i===11)reviews.push(review(2,'补正内容完整，已确认 v2 录用；v1 意见保留。','已通过'));
    if(i===7){reviews.unshift({...reviews[0],revision:1,at:new Date(new Date(at).getTime()-2*86400000).toISOString()});reviews[1].note='单位换算已修正，但缺失值处理仍未补充，且参考结果与输入数据不一致。';}
    if(i>=8){const latest=reviews.at(-1);latest.score=({8:87.5,9:91.25,10:89,11:94.75})[i];}
    const r={id:'personal-demo-'+user+'-'+i,ownerId:user,updatedBy:user,competitionId:cid||undefined,teamId:cid?'mock-team-'+cid+'-'+user:undefined,form,status,reviewOutcome:outcome,mock:true,createdAt:at,updatedAt:at,revision,number:revision?'BS-DEMO-'+String(i+1).padStart(3,'0'):undefined,history:Array.from({length:revision},(_,n)=>({revision:n+1,number:'BS-DEMO-'+String(i+1).padStart(3,'0'),at,by:user,name,form:JSON.parse(JSON.stringify({...form,verification:n===0&&revision===2&&i!==7?'首版验证标准（历史示例）':form.verification}))})),reviews,reviewNote:reviews.at(-1)?.note||''};
    if(i===7){r.createdAt=reviews[0].at;r.history.forEach((h,j)=>h.at=reviews[j].at);}
    if(i===2){r.status='需修改';r.draftForm=JSON.parse(JSON.stringify(form));}return r;
  });}
  function upgradeScores(store,user){const seeds=new Map(generate(user).map(r=>[r.id,r]));let changed=false;for(const r of store.records){const seed=r.mock&&seeds.get(r.id);if(!seed)continue;for(const h of r.reviews||[]){const original=seed.reviews.find(v=>v.revision===h.revision&&v.to===h.to&&v.at===h.at&&v.note===h.note);if(h.score===undefined&&original?.score!==undefined){h.score=original.score;changed=true;}}}return changed;}
  function upgradeReviewExample(store,user){const seed=generate(user).find(r=>r.form.name==='chart_units_rejected_02'),r=store.records.find(r=>r.id===seed.id),old=r?.reviews?.[0];if(!r?.mock||r.revision!==1||r.status!=='已审核'||r.reviewOutcome!=='审核不通过'||r.draftForm||r.reviews.length!==1||r.history?.length!==1||old.to!=='未通过'||old.note!==seed.reviews[0].note||old.at!==seed.reviews[0].at||r.updatedAt!==old.at||!['name','domain','software','os','license','description','verification','cloudLink','consent','terms'].every(key=>JSON.stringify(r.form[key])===JSON.stringify(seed.form[key])))return false;r.revision=2;r.updatedAt=seed.updatedAt;r.reviewNote=seed.reviewNote;r.reviews.push(seed.reviews[1]);r.history.push(seed.history[1]);return true;}
  const api={generate,upgradeScores,upgradeReviewExample};if(typeof module!=='undefined')module.exports=api;else root.DataMocks=api;
})(typeof window==='undefined'?globalThis:window);
