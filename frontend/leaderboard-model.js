(function(root){
  'use strict';
  // Scores are integer hundredths, so ties and displayed precision agree.
  function rank(teams){
    const sorted=teams.filter(t=>Number.isInteger(t.score)&&t.valid>=1).map(t=>({...t})).sort((a,b)=>b.score-a.score||a.achievedAt-b.achievedAt||a.id.localeCompare(b.id));
    sorted.forEach((t,i)=>{t.rank=i&&t.score===sorted[i-1].score?sorted[i-1].rank:i+1;});
    return sorted;
  }
  function select(teams,{query='',mine=false,teamId='',expanded=false}={}){
    const ranked=rank(teams),needle=query.trim().toLocaleLowerCase();
    const filtered=ranked.filter(t=>(!needle||t.name.toLocaleLowerCase().includes(needle))&&(!mine||t.id===teamId));
    const filtering=!!needle||mine,remaining=filtered.filter(t=>t.rank>10).length;
    return {rows:filtering||expanded?filtered:filtered.filter(t=>t.rank<=10),total:filtered.length,ranked,remaining:filtering?0:remaining,expanded:!filtering&&expanded&&remaining>0,filtering};
  }
  function fixtures(cid,ownTeam){
    const names=['数据探索者','知行研究队','精确标注组','山海数据社','星河实验室','长尾探索队','向量空间','多维观察组','青禾共创队','逐光研究组','零一数据队','北辰实验室','答案有据队','远山协作组','拾贝数据社','知微工作组','格物共创队','清晰边界队','复现研究社','新知探索队'];
    const scores=[9685,9520,9520,9418,9356,9290,9182,9075,8990,8864,8780,8655,8510,8426,8350,8215,8100,7988,7850,7700];
    const base=Date.UTC(2026,9,26,4);
    const teams=names.map((name,i)=>({id:cid+'-rank-'+i,name,score:scores[i],valid:1+i%9,members:['林知远','陈思齐','周一诺','许星河'].slice(0,1+i%4),achievedAt:base+i*3600000,lastAt:base+(20-i)*3600000}));
    if(ownTeam)teams[5]={...teams[5],id:ownTeam.id,name:ownTeam.name,members:ownTeam.members};
    return teams;
  }
  const api={rank,select,fixtures};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.LeaderboardModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
