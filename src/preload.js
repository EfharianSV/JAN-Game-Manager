const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // ... keep existing ...
    getGames: () => ipcRenderer.invoke('get-data'),
    addGame: () => ipcRenderer.invoke('add-game'),
    launchGame: (path) => ipcRenderer.send('launch-game', path),
    addWishlist: (item) => ipcRenderer.invoke('add-wishlist-item', item),
    openLink: (url) => ipcRenderer.send('open-external-link', url),
    deleteGame: (id) => ipcRenderer.invoke('delete-game', id),
    selectImage: () => ipcRenderer.invoke('select-image'),
    updateGame: (game) => ipcRenderer.invoke('update-game', game),
    selectFile: () => ipcRenderer.invoke('select-file'),
    showInFolder: (path) => ipcRenderer.send('show-in-folder', path),
    // NEW CATEGORY TOOLS
    addCategory: (name) => ipcRenderer.invoke('add-category', name),
    deleteCategory: (name) => ipcRenderer.invoke('delete-category', name),
    updateWishlist: (item) => ipcRenderer.invoke('update-wishlist-item', item),
});