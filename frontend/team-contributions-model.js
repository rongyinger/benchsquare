(function(root){
  'use strict';
  // Return counts only: teammates never receive another member's task content.
  function summarize(records,team,user){
    if(!team?.members.includes(user))return null;
    const rows=team.members.map(id=>({id,submitted:0,accepted:0,pending:0}));
    const byId=new Map(rows.map(r=>[r.id,r])),seen=new Set();
    for(const record of records){
      if(record.competitionId!==team.cid||record.teamId!==team.id||record.mock||!record.id||seen.has(record.id))continue;
      seen.add(record.id);
      const owner=record.ownerId||record.history?.[0]?.by;
      const row=byId.get(owner);
      const submitted=record.revision>0||record.history?.length>0||['已提交','待质检','待初审','终检中','已审核','需修改','未通过','已通过','已录用'].includes(record.status);
      if(!row||!submitted)continue;
      row.submitted++;
      if(['已通过','已录用'].includes(record.status))row.accepted++;
      if(['已提交','待质检','待初审','终检中'].includes(record.status))row.pending++;
    }
    return rows;
  }
  const api={summarize};
  if(typeof module!=='undefined')module.exports=api;else root.TeamContributions=api;
})(typeof window==='undefined'?globalThis:window);
