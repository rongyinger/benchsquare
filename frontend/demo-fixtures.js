/* Complete, explicitly fictional competition fixtures. These are data records,
   not fallback text for competitions submitted by real creators. */
const demoTaskProfiles={
  科学推理:{topic:'真实科研场景的实验分析与多步推理',boundary:'覆盖实验条件分析、假设检验、误差归因和定量推理。每道任务须包含至少三个关联推理步骤，难度参考相关专业本科高年级；不接受仅靠知识记忆或单步计算完成的任务。',environment:'Python 3.11、Jupyter 或通用电子表格；提供依赖版本、运行命令与必要的实验条件说明。',formats:'任务说明使用 Markdown 或 PDF，实验数据使用 CSV / JSON，图表使用 PNG，代码使用 PY / IPYNB，完整任务打包为 ZIP。'},
  代码工程:{topic:'真实代码工程中的缺陷定位、修复与验证',boundary:'覆盖依赖、边界条件、接口兼容与数据处理缺陷。提供最小可复现工程与失败用例；排除仅修改格式、拼写或无法独立验证的任务。',environment:'Python 3.11 或 Node.js 22，提供锁定的依赖文件和测试命令；须能在干净的 Windows 或 Linux 环境复现，不依赖私人账号。',formats:'任务说明使用 Markdown，代码保留原始工程格式，结构化数据使用 JSON / CSV；仓库快照、参考补丁和测试用例打包为 ZIP。'},
  金融分析:{topic:'可追溯财务数据的分析、归因与风险判断',boundary:'覆盖现金流、财务指标、经营归因和敏感性分析，须涉及多项关联指标与明确的计算口径。使用公开、授权或合成数据，不接受无计算依据的主观结论。',environment:'Python 3.11、Jupyter 或 Excel，提供公式、单位、依赖版本与复算步骤；不得依赖付费数据终端。',formats:'财务材料使用 PDF / XLSX / CSV，分析说明使用 Markdown / PDF，代码使用 PY / IPYNB，完整成果打包为 ZIP。'},
  医疗健康:{topic:'公开研究材料的循证检索与证据归纳',boundary:'覆盖公开文献检索、研究设计识别和证据归纳，明确研究对象、结局与证据边界。排除真实患者隐私数据和个人诊疗决策任务。',environment:'通用浏览器、PDF阅读器及 Python 3.11；提供文献索引、公开来源和可复查的检索步骤，不依赖机构内网账号。',formats:'文献与说明使用 PDF / Markdown，证据表使用 CSV / XLSX，结构化答案使用 JSON，完整任务打包为 ZIP。'},
  多模态:{topic:'图表、图像与跨页文档的联合理解',boundary:'覆盖图文关联、字段提取、区域定位、跨页信息整合与不确定信息判断。须保留单位、注释与原始位置；不接受无授权图片或重复的简单识别题。',environment:'通用PDF与图片查看器、Python 3.11；涉及坐标或图像预处理时须提供脚本及依赖版本。',formats:'文档使用 PDF，图像使用 PNG / JPG，标注与答案使用 JSON / CSV，任务说明使用 Markdown，附件打包为 ZIP。'},
  法律实务:{topic:'公开或虚构法律材料的检索、比对与证据整理',boundary:'覆盖条款差异、案例要素、事件时间线和证据映射，要求标注出处并区分事实与推断。使用公开或虚构材料，不涉及真实当事人隐私。',environment:'通用浏览器、PDF阅读器和办公软件；如使用脚本，须提供 Python 3.11 依赖及运行方法，不依赖付费法律数据库。',formats:'材料使用 PDF / DOCX，差异与证据表使用 CSV / XLSX，参考解释使用 Markdown / PDF，完整任务打包为 ZIP。'}
};
const demoSpecificTopics={reasoning:'材料结构、实验条件与性能关系的多步推理',code:'真实仓库缺陷的定位、修复与回归验证',finance:'企业现金流计算、风险识别与可追溯分析',medical:'研究文献的循证检索与证据归纳',multimodal:'图表与跨页文档的信息提取及联合理解',law:'合同条款的差异识别与逐条解释','nov-code':'Python数据清洗与管道依赖的排错验证','nov-law':'公开案例检索、要素提取与来源核验','nov-vision':'工业图像的描述、定位与标注一致性','dec-science':'实验参数复核与误差传播分析','dec-finance':'年报经营指标的提取、口径核对与复算','dec-medical':'医学文献的研究设计与变量识别','jan-code':'接口迁移的兼容性验证与边界测试','jan-vision':'复杂表单与扫描件的结构化理解','feb-law':'争议事实的事件排序与证据关联','feb-science':'跨学科定量估算与量纲核验','mar-finance':'经营情景建模与敏感性分析','mar-medical':'健康科普信息的原始来源与证据核验'};
function demoCompetitionFields(c){
  const profile=demoTaskProfiles[c.domain]||demoTaskProfiles.科学推理;
  const pool=Number(c.prize)||30000,first=pool*0.5,second=pool*0.3,third=pool-first-second;
  return {name:c.title,topic:demoSpecificTopics[c.id]||profile.topic,tags:c.tags||[c.domain,'数据征集'],description:c.desc,organizer:c.org,contact:'容莹；demo@example.test（演示联系邮箱）',
    license:'仅接受原创、公开授权或合成材料。提交时须标明来源与使用许可；不得包含个人隐私、商业秘密或未经授权的数据。本演示赛事材料仅用于任务评审与评测研究。',
    domain:c.domain,boundary:profile.boundary,acceptance:'每道任务须有明确目标、完整输入、参考成果、解题过程与可执行评分细则。按准确性40分、推理与依据30分、材料完整性20分、复现质量10分评审；来源不清、关键材料缺失或参考结果存在实质错误的任务不予验收。',
    eligibility:'同意平台参赛规则与数据许可，并在报名期内完成报名的用户均可参与。',teamMode:'团队',teamMax:5,
    registrationStart:c.registrationStart,registrationEnd:c.deadline,submissionStart:c.start,submissionEnd:c.end,
    materials:c.deliverables||'完整任务说明、输入材料、参考成果、解决过程、评分细则与数据来源说明。',environment:profile.environment,formats:profile.formats,
    fields:'必填栏目包括任务编号、名称、所属领域、难度、背景、目标、输入材料、预期输出、参考成果、解题过程、评分细则及数据来源与授权说明。',scale:'每次提交一道完整任务，每队最多提交10道；单个任务包不超过100MB。截止前可修改，以截止时保存的最终版本为准。',
    pool,rankBudget:pool,rankRule:`一等奖1支团队，奖金${first.toLocaleString('zh-CN')}元；二等奖1支团队，奖金${second.toLocaleString('zh-CN')}元；三等奖1支团队，奖金${third.toLocaleString('zh-CN')}元。团队成绩取验收通过且已评分的得分最高3道任务的平均分，保留两位小数；不足3道不参与排名。同分显示并列名次（如1、2、2、4），同分团队按达到该分数的时间先后展示，时间不用于打破并列。榜单不自动决定获奖资格，并列获奖与奖金分配由评审组确认后另行公示。`,
    distribution:'初审与终检结果确认后公示获奖名单，公示期为7个自然日。异议处理完成并确认获奖资格后，预计于30个工作日内完成奖金发放。奖金为税前金额，依法代扣代缴相关税费；团队须共同确认收款人，团队内部奖金分配由成员自行协商。'};
}
for(const c of DEMO_COMPETITIONS)c.values=demoCompetitionFields(c);
function completeAdminDemoFields(c){
  if(!c.adminSample)return;
  const old=c.values,domain=old.name?.includes('代码工程')?'代码工程':old.name?.includes('多模态')?'多模态':old.domain;
  const base=demoCompetitionFields({id:c.id,title:old.name,domain,desc:old.description,org:old.organizer,prize:old.pool,registrationStart:old.registrationStart,deadline:old.registrationEnd,start:old.submissionStart,end:old.submissionEnd});
  c.values={...base,...old,domain};
}
