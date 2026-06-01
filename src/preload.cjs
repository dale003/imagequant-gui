const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imageQuant', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  openOutputDirectory: (outputDirectory, firstInputPath) => ipcRenderer.invoke('open-output-directory', outputDirectory, firstInputPath),
  compressImages: (request) => ipcRenderer.invoke('compress-images', request),
  onProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('compression-progress', listener);
    return () => ipcRenderer.removeListener('compression-progress', listener);
  }
});
