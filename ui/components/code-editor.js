/**
 * Code editor component for write_code exercises.
 * Provides a simple textarea with basic editing features.
 */

export function createCodeEditor(container, options = {}) {
  const {
    starterCode = '',
    onRun,
    onChange,
    readOnly = false,
    placeholder = '# Write your code here...',
    language = 'python'
  } = options;

  const editorId = `code-editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  container.innerHTML = `
    <div class="code-editor" data-editor-id="${editorId}">
      <div class="code-editor-toolbar">
        <span class="code-editor-language">${language}</span>
        <button type="button" class="btn btn-primary btn-sm code-run-btn" ${readOnly ? 'disabled' : ''} aria-label="Run code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Run
        </button>
        <button type="button" class="btn btn-secondary btn-sm code-reset-btn" ${readOnly ? 'disabled' : ''} aria-label="Reset to starter code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          Reset
        </button>
      </div>
      <textarea
        class="code-editor-textarea"
        id="${editorId}"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        ${readOnly ? 'readonly' : ''}
        placeholder="${placeholder}"
        aria-label="Code editor"
      >${escapeHtml(starterCode)}</textarea>
      <div class="code-editor-output" hidden>
        <div class="code-editor-output-header">
          <span class="code-editor-output-title">Output</span>
          <span class="code-editor-output-status"></span>
        </div>
        <pre class="code-editor-output-content"><code></code></pre>
      </div>
      <div class="code-editor-error" hidden>
        <div class="code-editor-error-header">
          <span class="code-editor-error-title">Error</span>
        </div>
        <pre class="code-editor-error-content"><code></code></pre>
      </div>
    </div>
  `;

  const textarea = container.querySelector(`#${editorId}`);
  const runBtn = container.querySelector('.code-run-btn');
  const resetBtn = container.querySelector('.code-reset-btn');
  const outputEl = container.querySelector('.code-editor-output');
  const outputContent = container.querySelector('.code-editor-output-content code');
  const outputStatus = container.querySelector('.code-editor-output-status');
  const errorEl = container.querySelector('.code-editor-error');
  const errorContent = container.querySelector('.code-editor-error-content code');

  let currentCode = starterCode;

  function updateOutput(content, isError = false) {
    if (isError) {
      outputEl.hidden = true;
      errorEl.hidden = false;
      errorContent.textContent = content;
    } else {
      errorEl.hidden = true;
      outputEl.hidden = false;
      outputContent.textContent = content || '(no output)';
    }
  }

  function setRunning(isRunning) {
    runBtn.disabled = isRunning || readOnly;
    runBtn.innerHTML = isRunning
      ? `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"></path></svg> Running...`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon> Run`;
    outputStatus.textContent = isRunning ? 'Running...' : '';
    outputStatus.className = 'code-editor-output-status' + (isRunning ? ' running' : '');
  }

  function showOutput() {
    outputEl.hidden = false;
    errorEl.hidden = true;
  }

  function showError() {
    outputEl.hidden = true;
    errorEl.hidden = false;
  }

  runBtn.addEventListener('click', async () => {
    const code = textarea.value;
    currentCode = code;
    setRunning(true);
    showOutput();
    updateOutput('');

    try {
      if (onRun) {
        await onRun(code, (output, error) => {
          setRunning(false);
          if (error) {
            updateOutput(error, true);
            outputStatus.textContent = 'Error';
            outputStatus.className = 'code-editor-output-status error';
          } else {
            updateOutput(output);
            outputStatus.textContent = 'Done';
            outputStatus.className = 'code-editor-output-status success';
          }
        });
      }
    } catch (err) {
      setRunning(false);
      updateOutput(err.message || String(err), true);
      outputStatus.textContent = 'Error';
      outputStatus.className = 'code-editor-output-status error';
    }
  });

  resetBtn.addEventListener('click', () => {
    textarea.value = starterCode;
    currentCode = starterCode;
    outputEl.hidden = true;
    errorEl.hidden = true;
    outputContent.textContent = '';
    errorContent.textContent = '';
    outputStatus.textContent = '';
    if (onChange) onChange(starterCode);
  });

  textarea.addEventListener('input', () => {
    currentCode = textarea.value;
    if (onChange) onChange(currentCode);
  });

  // Tab key support
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = currentCode.substring(0, start) + '  ' + currentCode.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      currentCode = textarea.value;
      if (onChange) onChange(currentCode);
    }
  });

  return {
    getCode: () => currentCode,
    setCode: (code) => {
      currentCode = code;
      textarea.value = code;
    },
    run: () => runBtn.click(),
    reset: () => resetBtn.click(),
    element: container.querySelector('.code-editor')
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}