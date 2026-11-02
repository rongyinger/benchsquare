(() => {
  'use strict';
  let pending;
  window.UnsavedChanges = {
    confirm(save) {
      if (pending) return pending;
      pending = new Promise(resolve => {
        const previous = document.activeElement;
        const dialog = document.createElement('dialog');
        dialog.className = 'unsaved-dialog';
        dialog.setAttribute('aria-labelledby', 'unsaved-title');
        dialog.setAttribute('aria-describedby', 'unsaved-description');
        dialog.innerHTML = '<h2 id="unsaved-title">是否保存修改？</h2><p id="unsaved-description">你有尚未保存的修改，是否保存为草稿？</p><p class="unsaved-error" role="alert" hidden></p><div class="unsaved-actions"><button type="button" data-unsaved="continue" autofocus>继续编辑</button><button type="button" data-unsaved="discard">不保存并离开</button><button type="button" data-unsaved="save">保存并离开</button></div>';
        document.body.append(dialog);
        let saving = false;
        const finish = result => { dialog.close(); dialog.remove(); pending = null; previous?.focus(); resolve(result); };
        dialog.addEventListener('cancel', e => { e.preventDefault(); if (!saving) finish('continue'); });
        dialog.addEventListener('click', async e => {
          const action = e.target.closest('[data-unsaved]')?.dataset.unsaved;
          if (!action || saving) return;
          if (action !== 'save') return finish(action);
          saving = true;
          const buttons = [...dialog.querySelectorAll('button')];
          buttons.forEach(b => b.disabled = true);
          e.target.textContent = '正在保存…';
          let message = '保存失败，请稍后重试。';
          try { if (await save()) return finish('saved'); } catch (error) { message = error.message || message; }
          saving = false;
          buttons.forEach(b => b.disabled = false);
          e.target.textContent = '保存并离开';
          const error = dialog.querySelector('.unsaved-error');
          error.textContent = message; error.hidden = false;
        });
        dialog.showModal();
      });
      return pending;
    }
  };
})();
