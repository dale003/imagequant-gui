const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

app.setPath('userData', path.join(os.tmpdir(), 'ImageQuantGui-user-data'));

function createWindow() {
  const window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: 'ImageQuant 图片压缩工具',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, 'index.html'));
}

function getPngquantPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'pngquant', 'pngquant.exe');
  }
  return path.join(__dirname, '..', 'vendor', 'pngquant', 'pngquant.exe');
}

function runPngquant(inputPath, outputPath, options) {
  return new Promise((resolve, reject) => {
    const binary = getPngquantPath();
    const args = [
      '--force',
      '--skip-if-larger',
      '--quality',
      `${options.minQuality}-${options.maxQuality}`,
      '--speed',
      String(options.speed),
      '--output',
      outputPath,
      String(options.colors),
      '--',
      inputPath
    ];
    const child = spawn(binary, args, { windowsHide: true });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ outputPath, skipped: false });
        return;
      }
      if (code === 98 || code === 99) {
        resolve({
          outputPath: inputPath,
          skipped: true,
          skipReason: code === 98 ? 'larger' : 'quality'
        });
        return;
      }
      reject(new Error(stderr.trim() || `pngquant 退出码: ${code}`));
    });
  });
}

function uniqueOutputPath(outputDirectory, filePath) {
  const extension = path.extname(filePath);
  const name = path.basename(filePath, extension);
  let outputPath = path.join(outputDirectory, `${name}-compressed.png`);
  let suffix = 2;

  while (fs.existsSync(outputPath)) {
    outputPath = path.join(outputDirectory, `${name}-compressed-${suffix}.png`);
    suffix += 1;
  }
  return outputPath;
}

ipcMain.handle('select-images', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择需要压缩的 PNG 图片',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'PNG 图片', extensions: ['png'] }]
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('select-output-directory', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择输出目录',
    properties: ['openDirectory', 'createDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('open-path', async (_event, targetPath) => {
  if (!targetPath) return;
  const error = await shell.openPath(targetPath);
  if (error) throw new Error(error);
});

ipcMain.handle('open-output-directory', async (_event, outputDirectory, firstInputPath) => {
  const targetPath = outputDirectory || (firstInputPath ? path.dirname(firstInputPath) : null);
  if (!targetPath) return;
  const error = await shell.openPath(targetPath);
  if (error) throw new Error(error);
});

ipcMain.handle('compress-images', async (event, request) => {
  const { files, outputDirectory, options } = request;
  const results = [];

  for (let index = 0; index < files.length; index += 1) {
    const inputPath = files[index];
    const inputSize = fs.statSync(inputPath).size;
    const targetDirectory = outputDirectory || path.dirname(inputPath);
    fs.mkdirSync(targetDirectory, { recursive: true });
    const outputPath = uniqueOutputPath(targetDirectory, inputPath);
    event.sender.send('compression-progress', {
      index,
      status: 'processing'
    });

    try {
      const result = await runPngquant(inputPath, outputPath, options);
      const outputSize = result.skipped ? inputSize : fs.statSync(outputPath).size;
      const item = {
        inputPath,
        outputPath: result.outputPath,
        inputSize,
        outputSize,
        skipped: result.skipped,
        skipReason: result.skipReason || null,
        error: null
      };
      results.push(item);
      event.sender.send('compression-progress', {
        index,
        status: result.skipped ? 'skipped' : 'done',
        result: item
      });
    } catch (error) {
      const item = {
        inputPath,
        outputPath: null,
        inputSize,
        outputSize: null,
        skipped: false,
        error: error.message
      };
      results.push(item);
      event.sender.send('compression-progress', {
        index,
        status: 'error',
        result: item
      });
    }
  }

  return results;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
