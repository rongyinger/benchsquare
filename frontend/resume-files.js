(() => {
  'use strict';

  const resumeId = 'profile-resume';
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };

  function validate(file) {
    if (!(file instanceof File) || !file.size) {
      throw new Error('请选择非空的简历文件。');
    }
    const extension = file.name.toLowerCase().split('.').at(-1);
    const type = file.type;
    if (!file.name.includes('.') || !Object.hasOwn(allowedTypes, extension) ||
        (type && type !== 'application/octet-stream' && type !== allowedTypes[extension])) {
      throw new Error('请上传 PDF、DOC 或 DOCX 格式的简历。');
    }
    if (file.size > maxSize) {
      throw new Error('简历文件大小不能超过 10 MB。');
    }
  }

  async function get(actor) {
    const record = await window.DataFiles.get(actor, resumeId);
    return record?.file instanceof File && record.file.size ? record : null;
  }

  async function save(actor, file) {
    validate(file);
    const record = { file, uploadedAt: new Date().toISOString() };
    try {
      await window.DataFiles.put(actor, [[resumeId, record]]);
    } catch {
      throw new Error('简历保存失败，请检查浏览器存储后重试。');
    }
    return record;
  }

  window.ResumeFiles = { get, save };
})();
