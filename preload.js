const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    platform: process.platform,
    getSystemPath: (name) => ipcRenderer.invoke('get-system-path', name),
    getDrives: () => ipcRenderer.invoke('get-drives'),
    getDrivesInfo: () => ipcRenderer.invoke('get-drives-info'),
    getPlaces: () => ipcRenderer.invoke('get-places'),
    getFiles: (folderPath, page, limit, sort, showHidden) => ipcRenderer.invoke('get-files', folderPath, page, limit, sort, showHidden),
    mkdir: (folderPath) => ipcRenderer.invoke('mkdir', folderPath),
    move: (items, targetDir) => ipcRenderer.invoke('move', items, targetDir),
    copy: (items, targetDir) => ipcRenderer.invoke('copy', items, targetDir),
    rename: (oldPath, newPath) => ipcRenderer.invoke('rename', oldPath, newPath),
    delete: (targetPath, permanent) => ipcRenderer.invoke('delete', targetPath, !!permanent),
    openPath: (p) => ipcRenderer.invoke('open-path', p),
    showInFolder: (p) => ipcRenderer.invoke('show-in-folder', p),
    clipboardWriteFiles: (files, action) => ipcRenderer.invoke('clipboard-write-files', files, action),
    clipboardReadFiles: () => ipcRenderer.invoke('clipboard-read-files')
});