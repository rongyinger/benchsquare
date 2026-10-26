// Drafts and submission snapshots share the creator identity used by the prototype.
function creationActor(){return state.participation?.active||'rong';}
function creationDraftKey(draft){return draft.editId||'new';}
function hasCreationDraft(draft=state.draft){
  if(draft.editId)return true;
  const oldEligibility='参赛资格由平台统一规定。参赛者须在报名期内完成报名，并同意平台参赛规则与数据许可条款。';
  return Object.entries(draft).some(([key,value])=>key!=='distribution'&&!key.startsWith('_')&&String(value??'').trim()!==''&&!(key==='eligibility'&&value===oldEligibility)&&(!(key in participationRuleDefaults)||String(value)!==String(participationRuleDefaults[key])));
}
function parkedCreationDrafts(){state.parkedCreationDrafts ||= {};return state.parkedCreationDrafts[creationActor()] ||= {};}
function parkCreationDraft(){if(hasCreationDraft())parkedCreationDrafts()[creationDraftKey(state.draft)]=JSON.parse(JSON.stringify({...state.draft,_step:step}));}
function creationDraftList(){
  const drafts={...parkedCreationDrafts()};if(hasCreationDraft())drafts[creationDraftKey(state.draft)]=state.draft;
  return Object.entries(drafts).filter(([,draft])=>hasCreationDraft(draft));
}
function openCreationDraft(key='new',fresh=false){
  const same=hasCreationDraft()&&creationDraftKey(state.draft)===key;
  if(!same&&key!=='new'&&!parkedCreationDrafts()[key])return toast('此草稿已不存在，请刷新后重试。');
  if(!same){parkCreationDraft();state.draft=JSON.parse(JSON.stringify(parkedCreationDrafts()[key]||{}));delete parkedCreationDrafts()[key];}
  step=fresh?0:Number(state.draft._step)||0;
  persist();go('#create');
}
function retainSubmission(c){
  c.submissions ||= [];
  let snapshot=c.submissions.find(s=>s.version===(c.version||1));
  if(!snapshot){snapshot={version:c.version||1,values:JSON.parse(JSON.stringify(c.values)),submittedAt:c.submittedAt};c.submissions.push(snapshot);}
  return snapshot;
}
function beginCompetitionEdit(c,withdraw=false){
  if((c.ownerId||'rong')!==creationActor())return toast('只能管理自己创建的比赛。');
  if(!['审核中','已驳回','审核已过期','草稿'].includes(c.stage)||(!withdraw&&c.stage==='审核中'))return toast('比赛状态已变化，请刷新后重试。');
  const backup=JSON.parse(JSON.stringify(state));
  const snapshot=retainSubmission(c),saved=creationDraftList().find(([key])=>key===c.id)?.[1];
  parkCreationDraft();
  state.draft=saved&&saved._baseVersion===snapshot.version?JSON.parse(JSON.stringify(saved)):{...JSON.parse(JSON.stringify(snapshot.values)),editId:c.id,_baseVersion:snapshot.version};
  delete parkedCreationDrafts()[c.id];
  if(withdraw)c.stage='草稿';
  window.competitionAdmin?.recordEdit?.(c,withdraw?'撤回修改':'开始修改');
  if(persist()===false){Object.assign(state,backup);return toast('草稿保存失败，请重试；原方案和草稿已保留。');}
  step=Number(state.draft._step)||0;close();go('#create');
}
function rejectionInfo(c){return (c.history||[]).filter(h=>['退回修改','不通过','已驳回','内容不通过','内容未通过','上线未通过'].includes(h.action)&&(h.version||1)===(c.version||1)).at(-1)||{note:c.reason||'',version:c.version||1};}
function showRejectionReason(c){
  if((c.ownerId||'rong')!==creationActor())return toast('只能查看自己比赛的处理原因。');
  const result=rejectionInfo(c);
  modal(`<h2>驳回原因</h2><p>${esc(c.values.name)} · v${esc(result.version||c.version||1)}</p><div class="notice warn" style="white-space:pre-wrap">${esc(result.note||c.reason||'暂无原因记录，请联系赛事运营核实。')}</div>${result.time?`<p>处理时间：${esc(result.time)}</p>`:''}<div class="form-actions"><button type="button" class="button" data-action="close">关闭</button><button type="button" class="button dark" data-action="edit" data-id="${esc(c.id)}">修改并重新提交</button></div>`);
}
let pendingDraftDeletion=null;
function requestDraftDeletion(key){
  const draft=creationDraftList().find(([id])=>id===key)?.[1];if(!draft)return;
  pendingDraftDeletion={key,actor:creationActor(),values:JSON.stringify(draft)};
  modal(`<h2>删除草稿？</h2><p>${esc(draft.name||'未命名比赛')}</p><p>删除后无法恢复未提交的修改。已提交方案、审核结果和驳回原因仍会保留。</p><div class="form-actions"><button type="button" class="button" data-action="cancel-draft-delete">取消</button><button type="button" class="button dark" data-action="confirm-draft-delete">确认删除</button></div>`);
}
function confirmDraftDeletion(){
  const request=pendingDraftDeletion;pendingDraftDeletion=null;
  if(!request||request.actor!==creationActor())return toast('身份已变化，请重新操作。');
  const draft=creationDraftList().find(([key])=>key===request.key)?.[1];
  if(!draft||JSON.stringify(draft)!==request.values)return toast('草稿内容已变化，请重新确认删除。');
  const backup=JSON.parse(JSON.stringify(state));delete parkedCreationDrafts()[request.key];
  if(creationDraftKey(state.draft)===request.key)state.draft={};
  // Replace the identity-switch cache as well, so a deleted draft cannot reappear.
  if(state.creationDrafts?.[creationActor()]&&creationDraftKey(state.creationDrafts[creationActor()])===request.key)state.creationDrafts[creationActor()]={};
  if(persist()===false){Object.assign(state,backup);return toast('删除失败，草稿已保留，请重试。');}
  close();render();toast('草稿已删除。');
}
document.addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(!['resume-draft','delete-draft','confirm-draft-delete','cancel-draft-delete','rejection-reason'].includes(action))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(action==='resume-draft')return openCreationDraft(button.dataset.key);
  if(action==='delete-draft')return requestDraftDeletion(button.dataset.key);
  if(action==='confirm-draft-delete')return confirmDraftDeletion();
  if(action==='cancel-draft-delete'){pendingDraftDeletion=null;return close();}
  const c=state.competitions.find(c=>c.id===button.dataset.id);if(c)showRejectionReason(c);
},true);
