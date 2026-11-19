(() => {
  'use strict';
  const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function time(value){
    if(value===null||value===undefined||value==='')return NaN;
    if(typeof value==='number')return value;
    let source=String(value).replace(' ','T');
    if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(source))source+='+08:00';
    return Date.parse(source);
  }
  function schedule(c){const v=c?.values||c?.config||{},s=v.schedule||{},first=(...values)=>values.find(value=>Number.isFinite(time(value)));return {start:first(v.registrationStart,s.regStart,c?.registrationStart),end:first(v.publicationAt,s.publicationAt,c?.publicationAt,v.correctionEnd,s.correctionEnd,c?.correctionEnd,v.submissionEnd,s.submitEnd,c?.submissionEnd,c?.end)};}
  function communityAvailable(c,now=Date.now()){
    if(!c||c.stage&&c.stage!=='已发布')return false;
    const range=schedule(c),start=time(range.start),end=time(range.end);
    return Number.isFinite(start)&&Number.isFinite(end)&&start<end&&now>=start&&now<end;
  }
  const title=c=>c?.values?.name||c?.title||'当前赛事';
  const chatIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></svg>';
  function entry(c){return communityAvailable(c)?'<section class="ec-community" data-event-community="'+E(c.id)+'"><span class="ec-community-icon">'+chatIcon+'</span><div><h2>赛事交流群</h2><p>扫码加入企业微信群，获取赛事通知、规则答疑与参赛交流。</p></div><button type="button" class="button ec-group-button" data-ec-group="'+E(c.id)+'">企业微信入群 <span aria-hidden="true">↗</span></button></section>':'';}
  const api={time,communityAvailable,entry};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof window==='undefined'||typeof document==='undefined')return;
  let dialog=null,opener=null,onContinue=null;
  const qr=()=>'<div class="ec-qr-frame"><img src="assets/wecom-demo.svg" width="216" height="216" alt="企业微信演示二维码，仅为测试占位，不会加入真实群或联系真实人员"></div><span class="ec-demo-tag">演示二维码 · 非真实联系方式</span>';
  function closeContact(){if(dialog?.open)dialog.close();}
  function show(kind,html,options={}){
    if(!dialog){
      dialog=document.createElement('dialog');dialog.id='event-contact-dialog';dialog.className='ec-dialog';dialog.setAttribute('aria-labelledby','ec-dialog-title');
      document.body.append(dialog);
      dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-event-contact-close]'))closeContact();const next=e.target.closest('[data-ec-continue]');if(next){const callback=onContinue;closeContact();if(callback)callback();}});
      dialog.addEventListener('close',()=>{onContinue=null;if(opener?.isConnected)opener.focus();});
    }
    opener=document.activeElement;onContinue=options.onContinue||null;dialog.dataset.kind=kind;
    dialog.innerHTML='<button type="button" class="ec-dialog-close" aria-label="关闭企业微信提示" data-event-contact-close>×</button>'+html;
    if(!dialog.open)dialog.showModal();
    dialog.querySelector('[data-event-contact-close]').focus();
    return true;
  }
  api.openGroup=function(c,options={}){
    if(!communityAvailable(c))return false;
    const registered=!!options.registered;
    return show('group','<div class="ec-dialog-heading"><span class="ec-status '+(registered?'ec-success':'')+'">'+(registered?'报名成功':'赛事交流群')+'</span><h2 id="ec-dialog-title">'+(registered?'加入赛事企业微信群':'扫码加入赛事交流群')+'</h2><p class="ec-event-name">'+E(title(c))+'</p><p class="ec-dialog-description">'+(registered?'请使用企业微信扫码入群，及时获取赛事通知与规则答疑。':'比赛期间可从赛事详情页随时找到本入口，扫码入群查看通知、参与交流。')+'</p></div><div class="ec-qr-block">'+qr()+'<p>使用企业微信扫码</p></div>'+(registered?'<p class="ec-after-register">报名已完成。入群后请按赛事要求继续完成组队；扫码状态不会由本 Demo 自动校验。</p>':'')+'<div class="ec-dialog-actions"><button type="button" class="button dark" '+(options.onContinue?'data-ec-continue':'data-event-contact-close')+'>'+E(options.continueLabel||(registered?'继续组队':'我知道了'))+'</button></div>',options);
  };
  api.openAppeal=function({eventTitle,teamName,reason}={}){
    return show('appeal','<div class="ec-dialog-heading"><span class="ec-status ec-blocked">提交已拦截</span><h2 id="ec-dialog-title">当前团队已被拉黑</h2><p class="ec-event-name">'+E(eventTitle||'当前赛事')+(teamName?' · '+E(teamName):'')+'</p><p class="ec-dialog-description">本赛事的新提交与补正重提均已暂停。请联系企业微信申诉，由主办方核查处理。</p></div>'+(reason?'<div class="ec-block-reason"><strong>拉黑原因</strong><p>'+E(reason)+'</p></div>':'')+'<div class="ec-qr-block">'+qr()+'<p>请使用企业微信扫码联系申诉</p></div><p class="ec-after-register">申诉时请提供赛事名称、团队名称和相关说明。已有提交与草稿保留；申诉后仍需等待主办方解除限制。</p><div class="ec-dialog-actions"><button type="button" class="button dark" data-event-contact-close>我知道了</button></div>');
  };
  window.EventContact=api;
  function resolve(id){
    try{
      if(window.OrganizerDemoStore&&window.OrganizerMocks?.listEvents(window.OrganizerDemoStore.owner()).some(c=>c.id===id))return window.OrganizerDemoStore.read(id).event;
      return typeof find==='function'?find(id):null;
    }catch{return null;}
  }
  function mount(){
    const main=document.querySelector('#main');if(!main)return;
    main.querySelectorAll('[data-event-community]').forEach(el=>el.remove());
    const [root,id]=location.hash.slice(1).split('/');if(root!=='competition'||!id)return;
    const c=resolve(id);if(!communityAvailable(c))return;
    const anchor=main.querySelector('.op-summary')||main.querySelector('.detail-heading');
    if(anchor)anchor.insertAdjacentHTML('afterend',entry(c));
  }
  document.addEventListener('click',e=>{const button=e.target.closest('[data-ec-group]');if(!button)return;e.preventDefault();e.stopImmediatePropagation();const c=resolve(button.dataset.ecGroup);if(!api.openGroup(c)){mount();if(typeof toast==='function')toast('赛事交流群入口当前未开放。');}},true);
  if(typeof render==='function'&&document.querySelector('#main')){const previous=render;render=function(){previous();mount();};render();}
})();
