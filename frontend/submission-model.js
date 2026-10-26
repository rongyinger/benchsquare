(function(root){
  'use strict';
  const config={storageKey:'benchsquare-submissions-v1',maxFileBytes:50*1024*1024*1024,maxFiles:Infinity};
  const categories={input:{label:'输入材料',visibility:'解题 Agent 可见',hint:'启动任务所需的原始文件、数据或上下文。'},reference:{label:'参考结果与评测依赖',visibility:'仅审核与评测可见',hint:'专家完整执行的参考结果，以及评测所依赖的素材。'},evidence:{label:'自测证据',visibility:'仅审核与评测可见',hint:'难度自测的截图、日志或录屏，选填。'}};
  const scores=['<1% (last-exam)','5–10%','10–20%','20–40%','40–60% (near-term)','>60%'];
  const operatingSystems=['Windows','Linux','MacOS'];
  const licenses=['免费或开源','商业软件','内部或专有软件'];
  const empty=()=>({name:'',domain:'',software:'',os:[],license:'',description:'',verification:'',cloudLink:'',model:'',harness:'',estimatedScore:'',consent:false,terms:false,attachments:[]});
  function normalize(raw={}){const f={...empty(),...raw};f.os=(Array.isArray(f.os)?f.os:[f.os]).filter(Boolean).slice(0,1).map(v=>v==='macOS'?'MacOS':v);f.attachments=(f.attachments||[]).map(a=>({...a,category:a.category==='project'?'input':a.category}));return f;}
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Deliberately limited Markdown. Escape all input first; no HTML, images or links execute.
  function markdown(s){return String(s||'').split('\n').map(line=>{let t=escape(line).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');if(/^### /.test(t))return '<h4>'+t.slice(4)+'</h4>';if(/^## /.test(t))return '<h3>'+t.slice(3)+'</h3>';if(/^# /.test(t))return '<h2>'+t.slice(2)+'</h2>';if(/^[-*] /.test(t))return '<p class="md-bullet">• '+t.slice(2)+'</p>';return '<p>'+ (t||'<br>')+'</p>';}).join('');}
  const unavailable=(f,files)=>f.attachments.filter(a=>a.source==='file'&&!files.has(a.id));
  function validate(f,files,others=[]){
    const e={};for(const [k,l]of Object.entries({name:'任务短名',domain:'行业领域',software:'软件及版本',description:'任务说明',verification:'成功验证标准'}))if(!String(f[k]||'').trim())e[k]='请填写'+l;
    if(f.name&&!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(f.name))e.name='请使用小写英文字母、数字和下划线，例如 video_editing_instance_6';
    if(others.some(r=>r.form?.name===f.name))e.name='本比赛中已有相同任务短名，请使用不同短名';
    if(!Array.isArray(f.os)||f.os.length!==1||!operatingSystems.includes(f.os[0]))e.os='请选择一个操作系统';
    if(!licenses.includes(f.license))e.license='请选择软件许可';
    if(f.cloudLink){try{const u=new URL(f.cloudLink);if(u.protocol!=='https:'||!['drive.google.com','docs.google.com','dropbox.com','www.dropbox.com'].includes(u.hostname)||u.username||u.password)throw Error();}catch{e.cloudLink='请填写 https:// 开头的 Google Drive 或 Dropbox 分享链接';}}
    if(f.estimatedScore&&!scores.includes(f.estimatedScore))e.estimatedScore='请选择有效的预估得分区间';
    if(!f.consent)e.consent='请确认工作流可用于 Agents’ Last Exam 评测';
    if(!f.terms)e.terms='请阅读并勾选条款确认';
    if(unavailable(f,files).length)e.attachments='部分附件仅剩元信息，请重新选择对应文件，或删除后提交';
    if(f.attachments.some(a=>a.size>config.maxFileBytes))e.attachments='单文件不能超过 50 GB';
    return e;
  }
  const sample=()=>({...empty(),name:'data_audit_instance_1',domain:'生命科学 / 数据审计',software:'Python ≥ 3.12；NumPy 2.2.6、SciPy 1.15.3、pandas 2.2.3、PyArrow 19.0.1、h5py 3.13.0、Pillow 11.2.1、tifffile 2025.5.10',os:['Linux'],license:'免费或开源',description:'你是肠道组织数据项目的独立审查人。依据公开任务协议和输入合同，完成中文、可复查、可重建的有限范围研究审查。\n\n起始材料包括公开 GEO 资料、完全合成的多模态实验和独立抽象二元表，分别处理三种证据层，不得跨层创建样本或细胞连接。核查来源、样本、文件哈希，复核合成 FASTQ / UMI / TIFF，分析抽象模型的秩、拟合、似然及 do(E←0) 数学反事实，并给出含截距满秩的追加设计。\n\n冻结输入位于 /home/user/input/，不得修改，不需联网补取。Linux 容器提供 2 CPU、8 GiB 内存、无 GPU、无外网。不要求 IGV 操作或原生 IGV 工程。模型推论和模拟对象不得升级为生物学发现。',requirements:'所有成果放在 /home/user/solution/，仅使用普通文件和目录，不使用符号链接。\n1. report_zh.md：按公开协议 E 的八项顺序组织；在 output/report_zh.md 保存同样内容。\n2. output/：按 input/input_contracts/05_output_contract.md 的 Schema 交付全部 CSV/JSON、abstract_design_proposal.md 和报告；保留主键、状态、单位和证据层。\n3. code/：可从冻结输入重建交付的入口及支持代码；run_manifest.json 记录命令、入口哈希和日志位置，没有失败也须明确记录。\n4. 抽象追加设计至少三行，允许重复，[1,C,E] 秩为 3。风险使用 0–1 概率；报告标注相对基线的百分点变化。\n5. 哈希、计数、键与枚举精确匹配；GEO 汇总容差 1e-7，图像均值 1e-5，逐孔 frame-5 摘要 1e-7，模型风险/似然 1e-8，逐行预测/似然 1e-9，零空间残差 1e-8。完整字段与容差以公开输出合同为准。',hidden:'审核提示：区分公开来源事实、合成实验观测、模型推论与未观测量；核查跨层连接边界。此段为基于公开协议整理的演示提示，不含私有参考答案。',verification:'# 演示评分细则（共 100 分）\n以下分配仅用于表单演示，不代表原 task 的真实评分配置。\n- **来源与文件审计：20 分**。登记完整、SHA-256 与冻结输入逐字匹配，来源和缺失资料可追溯。\n- **合成流程复核：30 分**。复核 UMI、条码、图像与孔级结果；计数精确匹配，浮点容差遵守公开合同。\n- **证据分层与连接：20 分**。不跨层连接，标明谱系、接触与因果证据边界。\n- **抽象模型与追加设计：20 分**。秩、零空间、拟合及反事实可重算；追加设计矩阵秩为 3，风险容差 1e-8。\n- **可复现交付：10 分**。中文报告、代码、运行清单、日志及全部输出齐备。\n\n参考值应由后续构建方依据冻结输入和私有参考材料确定，本 Demo 不计算分数。',attachments:[{id:'sample-input',name:'公开协议与冻结输入（演示占位文件）',size:0,type:'',category:'input',source:'placeholder',lastModified:0},{id:'sample-project',name:'project-starter（演示占位文件）',size:0,type:'',category:'input',source:'placeholder',lastModified:0},{id:'sample-reference',name:'专家参考结果（演示占位文件，不含实际内容）',size:0,type:'',category:'reference',source:'placeholder',lastModified:0}]});
  const sampleForm=()=>normalize(sample());
  const api={config,categories,scores,operatingSystems,licenses,empty,normalize,escape,markdown,unavailable,validate,sample:sampleForm};
  if(typeof module!=='undefined')module.exports=api;else root.SubmissionModel=api;
})(typeof window==='undefined'?globalThis:window);
