(() => {
  'use strict';
  const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>';
  const isSubmission=!!document.querySelector('#app');
  function insert(container,href,label,caption){
    if(!container||container.querySelector(':scope > .page-backbar'))return;
    const bar=document.createElement('nav');bar.className='page-backbar';bar.setAttribute('aria-label','页面返回');
    const link=document.createElement('a');link.className='page-back';link.href=href;link.innerHTML=arrow;const text=document.createElement('span');text.textContent=label;link.append(text);bar.append(link);
    const context=document.createElement('span');context.className='page-back-context';context.textContent=caption||'';bar.append(context);
    const breadcrumb=container.querySelector(':scope > .breadcrumb');if(breadcrumb)breadcrumb.remove();
    container.prepend(bar);
  }
  if(isSubmission){
    if(new URLSearchParams(location.search).get('embed')==='1')return;
    function decorate(){
      const app=document.querySelector('#app'),route=location.hash||'#new',params=new URLSearchParams(location.search),cid=params.get('competition');
      const list=route==='#list',href=list?(cid?'index.html#workbench/'+encodeURIComponent(cid):'index.html#mine'):'#list';
      const label=list?(cid?'返回比赛工作台':'返回我的比赛'):'返回任务与提交';
      app.querySelector('.submission-context > a')?.remove();
      insert(app,href,label,list?'任务与提交':route.startsWith('#detail/')?'任务详情':'任务填写');
    }
    new MutationObserver(decorate).observe(document.querySelector('#app'),{childList:true});decorate();
    return;
  }
  let lastRoute='';const origins={};
  try{Object.assign(origins,JSON.parse(sessionStorage.getItem('benchsquare-back-origins')||'{}'));}catch{}
  function decorate(){
    const route=location.hash||'#discover',[root,cid]=route.slice(1).split('/');
    if(route!==lastRoute){if(root==='competition'&&lastRoute&&!lastRoute.startsWith('#competition/')){origins[route]=lastRoute;try{sessionStorage.setItem('benchsquare-back-origins',JSON.stringify(origins));}catch{}}lastRoute=route;}
    let href='#discover',label='返回首页',caption='';
    if(root==='discover'||root==='data-dashboard')return;
    if(root==='competition'){
      const from=origins[route]||'#explore';
      if(from==='#mine'){href='#mine';label='返回我的比赛';}
      else if(from.startsWith('#workbench/')){href=from;label='返回比赛工作台';}
      else if(from==='#organizer'){href='#organizer';label='返回主办方中心';}
      else{href='#explore';label='返回赛事广场';}
      caption='比赛详情';
    }else if(root==='workbench'){href='#mine';label='返回我的比赛';caption='比赛工作台';}
    else if(root==='create'){href='#organizer';label='返回主办方中心';caption='创建比赛';}
    else if(root==='admin'){href='#organizer';label='返回用户端';caption='管理后台';}
    else caption=({'data-dashboard':'个人数据看板',explore:'赛事广场',mine:'我的比赛',organizer:'主办方中心',community:'社区'})[root]||'';
    insert(document.querySelector('#main'),href,label,caption);
  }
  const previous=render;render=function(){previous();decorate();};decorate();
})();
