(function(root,factory){
  'use strict';
  const api=factory(typeof module!=='undefined'&&module.exports?require('./data-items.js'):root.DataItems);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TaskDetailView=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(DataItems){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reviewLabels={'需修改':'需补正','未通过':'审核不通过','已通过':'已录用','已审核':'审核通过','终检中':'初审通过 · 终检中'};
  function date(value){
    const time=new Date(value);
    return Number.isFinite(time.getTime())?time.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'时间未记录';
  }
  function versionHeader(version,selected,collapsible,E,formatDate){
    const title=`<strong>v${E(version.revision)} · 第 ${E(version.revision)} 次提交</strong>${version.current?'<span class="version-current">当前提交版本</span>':''}${selected?'<span class="version-selected">已定位版本</span>':''}`;
    const metadata=`<p>${version.at?E(formatDate(version.at)):'提交时间未记录'}${version.by?' · '+E(version.by):''}</p>${version.number?'<small>'+E(version.number)+'</small>':''}`;
    if(!collapsible)return `<header class="version-header"><div>${title}</div>${metadata}</header>`;
    return `<summary class="version-header"><div class="version-summary-main"><div class="version-title">${title}</div>${metadata}</div><svg class="version-chevron" aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></summary>`;
  }
  function renderHistory(record,options={}){
    const E=options.escape||escape,formatDate=options.date||date;
    const versions=options.timeline?options.timeline(record):DataItems.timeline(record);
    if(!versions.length)return '';
    const renderForm=options.renderForm||(()=>'<p class="hint">此版本暂无内容预览。</p>');
    const recordStatus=options.status?options.status(record):record.status;
    const currentInfo=options.reviewInfo?options.reviewInfo(record):DataItems.reviewInfo(record);
    const previewButton=options.previewButton||((r,version)=>`<button class="btn version-preview" data-do="history:${E(r.id)}:${E(version.revision)}">查看此版本</button>`);
    const renderScore=options.renderScore||(review=>review.score!==undefined?'<p>得分：'+E(review.score)+'</p>':'');
    const tag=options.collapsible?'details':'article';
    const versionCards=versions.map(version=>{
      const selected=Number(options.highlightRevision)===version.revision;
      const reviews=Array.isArray(version.reviews)?version.reviews:[];
      const pending=version.current?(['待初审','终检中','审核中'].includes(recordStatus)?'本版本审核中，结果出具后将在这里展示。':currentInfo.note||'本版本暂无审核记录。'):'此版本未记录审核意见。';
      const reviewCards=reviews.length?reviews.map(review=>`<div class="version-review ${review.to==='需修改'?'version-correction':''}"><div class="version-review-heading"><strong>${E(reviewLabels[review.to]||review.to||'审核记录')}</strong><span>${review.at?E(formatDate(review.at)):''}${review.by?' · '+E(review.by):''}</span></div><p class="review-message-content">${E(review.note||'暂无具体审核意见。')}</p>${renderScore(review)}</div>`).join(''):`<p class="version-pending">${E(pending)}</p>`;
      return `<${tag} class="submission-version${selected?' is-selected':''}" data-revision="${E(version.revision)}"${selected?' aria-current="true"':''}${options.collapsible&&(version.current||selected)?' open':''}>
        ${versionHeader(version,selected,options.collapsible,E,formatDate)}
        <div class="version-package detail-content">${version.form?renderForm(version.form,version):'<p class="hint">此版本暂无文件快照。</p>'}</div>
        <div class="version-reviews">${reviewCards}</div>
        ${version.form?previewButton(record,version):''}
      </${tag}>`;
    }).join('');
    return `<section class="submission-history" aria-label="提交与审核记录"><h3>提交与审核记录</h3><p class="hint">${E(options.hint||'每次提交的内容与该版本的审核记录一一对应。')}</p>${versionCards}</section>`;
  }
  return {renderHistory,escape,date};
});
