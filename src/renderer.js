const state = {
  files: [],
  processing: false,
  outputDirectory: ''
};

const elements = {
  addFiles: document.querySelector('#add-files'),
  chooseOutput: document.querySelector('#choose-output'),
  resetOutput: document.querySelector('#reset-output'),
  clearFiles: document.querySelector('#clear-files'),
  compress: document.querySelector('#compress'),
  dropZone: document.querySelector('#drop-zone'),
  fileList: document.querySelector('#file-list'),
  summary: document.querySelector('#summary'),
  resultSummary: document.querySelector('#result-summary'),
  outputDirectory: document.querySelector('#output-directory'),
  autoLowerQuality: document.querySelector('#auto-lower-quality'),
  openOutput: document.querySelector('#open-output')
};

function formatSize(bytes) {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getName(filePath) {
  return filePath.split(/[\\/]/).pop();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function addFiles(filePaths) {
  const known = new Set(state.files.map((item) => item.path.toLowerCase()));
  for (const filePath of filePaths) {
    if (!filePath.toLowerCase().endsWith('.png') || known.has(filePath.toLowerCase())) continue;
    state.files.push({ path: filePath, status: 'pending', result: null });
    known.add(filePath.toLowerCase());
  }
  render();
}

function render() {
  elements.fileList.innerHTML = '';
  for (const [index, item] of state.files.entries()) {
    const row = document.createElement('div');
    row.className = 'file-item';
    const status = item.status === 'processing'
      ? '压缩中...'
        : item.status === 'done'
        ? item.result.autoLoweredQuality
          ? `已节省 ${Math.max(0, 100 - (item.result.outputSize / item.result.inputSize * 100)).toFixed(1)}% · 已自动降低质量`
          : `已节省 ${Math.max(0, 100 - (item.result.outputSize / item.result.inputSize * 100)).toFixed(1)}%`
        : item.status === 'skipped'
          ? item.result.skipReason === 'quality'
            ? '已跳过：无法达到最低质量'
            : '已跳过：压缩后更大'
          : item.status === 'error'
            ? `失败：${item.result.error}`
            : '等待处理';
    const size = item.result
      ? `${formatSize(item.result.inputSize)} → ${formatSize(item.result.outputSize)}`
      : 'PNG 图片';
    row.innerHTML = `
      <div class="file-name" title="${escapeHtml(item.path)}">${escapeHtml(getName(item.path))}</div>
      <div class="file-meta">${size}</div>
      <div class="file-status status-${item.status}">${escapeHtml(status)}</div>
      <button class="remove" title="移除" data-index="${index}" ${state.processing ? 'disabled' : ''}>×</button>
    `;
    elements.fileList.appendChild(row);
  }

  elements.summary.textContent = state.files.length ? `共 ${state.files.length} 张 PNG 图片` : '尚未添加 PNG 图片';
  elements.compress.disabled = !state.files.length || state.processing;
  elements.clearFiles.disabled = !state.files.length || state.processing;
  elements.addFiles.disabled = state.processing;
  elements.chooseOutput.disabled = state.processing;
  elements.resetOutput.disabled = state.processing;
}

function validateOptions() {
  const minQuality = Number(document.querySelector('#min-quality').value);
  const maxQuality = Number(document.querySelector('#max-quality').value);
  const colors = Number(document.querySelector('#colors').value);
  const speed = Number(document.querySelector('#speed').value);
  const autoLowerQuality = elements.autoLowerQuality.checked;
  if (minQuality < 0 || maxQuality > 100 || minQuality > maxQuality) {
    throw new Error('质量范围需要设置为 0 - 100，且左侧数值不能大于右侧。');
  }
  return { minQuality, maxQuality, colors, speed, autoLowerQuality };
}

elements.addFiles.addEventListener('click', async () => addFiles(await window.imageQuant.selectImages()));
elements.chooseOutput.addEventListener('click', async () => {
  const directory = await window.imageQuant.selectOutputDirectory();
  if (directory) {
    state.outputDirectory = directory;
    elements.outputDirectory.value = directory;
  }
});
elements.resetOutput.addEventListener('click', () => {
  state.outputDirectory = '';
  elements.outputDirectory.value = '默认：原目录，压缩成功后覆盖原图';
});
elements.clearFiles.addEventListener('click', () => {
  state.files = [];
  elements.resultSummary.textContent = '等待添加图片';
  render();
});
elements.fileList.addEventListener('click', (event) => {
  const button = event.target.closest('.remove');
  if (!button || state.processing) return;
  state.files.splice(Number(button.dataset.index), 1);
  render();
});
elements.openOutput.addEventListener('click', () => {
  window.imageQuant.openOutputDirectory(state.outputDirectory, state.files[0]?.path);
});

for (const eventName of ['dragenter', 'dragover']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add('dragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove('dragging');
  });
}
elements.dropZone.addEventListener('drop', (event) => {
  addFiles([...event.dataTransfer.files].map((file) => file.path));
});

window.imageQuant.onProgress(({ index, status, result }) => {
  state.files[index].status = status;
  if (result) state.files[index].result = result;
  render();
});

elements.compress.addEventListener('click', async () => {
  try {
    const options = validateOptions();
    state.processing = true;
    state.files = state.files.map((item) => ({ ...item, status: 'pending', result: null }));
    elements.resultSummary.textContent = '正在压缩...';
    render();
    const results = await window.imageQuant.compressImages({
      files: state.files.map((item) => item.path),
      outputDirectory: state.outputDirectory,
      options
    });
    const completed = results.filter((item) => !item.skipped && !item.error);
    const savedBytes = completed.reduce((sum, item) => sum + item.inputSize - item.outputSize, 0);
    elements.resultSummary.textContent = `完成 ${completed.length} 张，跳过 ${results.filter((item) => item.skipped).length} 张，节省 ${formatSize(savedBytes)}`;
  } catch (error) {
    elements.resultSummary.textContent = error.message;
  } finally {
    state.processing = false;
    render();
  }
});
