// We add 'execFile' to the list of tools we need
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
// ... rest of imports
const { execFile } = require('child_process');
const path = require('path');
const Store = require('./store.js');

// Initialize the storage
// We name the file 'user-preferences' so it creates user-preferences.json
const store = new Store({
    configName: 'user-preferences'
});

// This function creates the actual application window
function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 700,
        // We hide the standard Windows menu bar to make it look modern/clean
        autoHideMenuBar: true,
        webPreferences: {
            // This allows the frontend to talk to the backend safely
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, 
            contextIsolation: true 
        }
    });

    // TEST: Print the current data to the VS Code terminal
// This proves we can read the database
console.log("Current Data:", store.get('library'));

    // Load the UI file (we will create this next)
   win.loadFile(path.join(__dirname, 'index.html'));
}

// IPC HANDLERS
// This listens for the 'get-data' command from the frontend
ipcMain.handle('get-data', () => {
    // It asks the Store for the library data
    const data = store.get('library');
    return data; 
});

// Listen for the 'add-game' command
ipcMain.handle('add-game', async () => {
    // 1. Open the Windows "Select File" dialog
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Games', extensions: ['exe'] }] 
    });

    if (result.canceled) return null;

    const gamePath = result.filePaths[0];
    const path = require('path');
    const gameName = path.parse(gamePath).name; // NEW (Removes .exe)

    // --- NEW STEP: EXTRACT ICON ---
    // We ask Electron to get the file icon (requesting a large size)
    let iconDataUrl = null;
    try {
        const nativeImage = await app.getFileIcon(gamePath, { size: 'large' });
        // Convert the icon to a "Data URL" (a really long text string representing the image)
        iconDataUrl = nativeImage.toDataURL();
    } catch (err) {
        console.error("Could not extract icon:", err);
    }
    // ------------------------------

    // Create the game object
    const newGame = {
        id: Date.now(), 
        name: gameName,
        path: gamePath,
        image: iconDataUrl, // <--- We save the icon here!
        added: new Date().toISOString()
    };

    // Save to Store
    const currentLibrary = store.get('library');
    currentLibrary.installed.push(newGame);
    store.set('library', currentLibrary);

    return currentLibrary;
});

// Listen for the 'launch-game' command
// 3. Launch a Game & Update "Last Played"
ipcMain.on('launch-game', (event, gamePath) => {
    // A. Launch the file
    const file = gamePath;
    console.log("Launching:", file); // Debug log
    
    // Check if file exists first
    const fs = require('fs');
    if (!fs.existsSync(file)) return; // Stop if missing

    shell.openExternal(file).catch(err => {
        // Fallback if shell fails (usually for raw EXEs)
        const { execFile } = require('child_process');
        execFile(file, (error) => {
            if (error) console.error("Launch failed:", error);
        });
    });

    // B. Update the Database
    const data = store.get('library');
    const game = data.installed.find(g => g.path === gamePath);
    
    if (game) {
        game.lastPlayed = new Date().toISOString(); // Save current time
        store.set('library', data);
    }
});

// 1. Save a new Wishlist Item
// 4. Add Wishlist Item (With Timestamp)
ipcMain.handle('add-wishlist-item', (event, item) => {
    const data = store.get('library');
    
    const newItem = {
        ...item, // Copies name, url, localPath
        id: Date.now(),
        added: new Date().toISOString() // <--- CRITICAL FOR SORTING
    };
    
    data.wishlist.push(newItem);
    store.set('library', data);
    return data;
});

// 5. Update a Wishlist Item (For renaming or Favoriting)
ipcMain.handle('update-wishlist-item', (event, updatedItem) => {
    const data = store.get('library');
    
    // Find item by ID and update it
    const index = data.wishlist.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
        data.wishlist[index] = updatedItem;
        store.set('library', data);
    }
    return data;
});

// 2. Open a URL in the user's default browser
ipcMain.on('open-external-link', (event, url) => {
    console.log("Request to open URL:", url); // <--- DEBUG LOG

    if (!url) return;

    // Auto-fix: If user forgot 'http://' or 'https://', add it.
    let safeUrl = url;
    if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
        safeUrl = 'https://' + safeUrl;
    }

    // Open it
    shell.openExternal(safeUrl).catch(err => {
        console.error("Failed to open URL:", err);
    });
});

// When Electron is ready, create the window
app.whenReady().then(() => {
    createWindow();

    // Mac-specific logic (standard practice, even if we are on Windows)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit the app when all windows are closed (Windows/Linux standard)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// 1. Delete a Game (or Wishlist item)
ipcMain.handle('delete-game', (event, id) => {
    const data = store.get('library');
    
    // Filter out the game with the matching ID from both lists
    // This effectively deletes it
    data.installed = data.installed.filter(g => g.id !== id);
    data.wishlist = data.wishlist.filter(g => g.id !== id);
    
    store.set('library', data);
    return data;
});

// 2. Select an Image File
ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    });

    if (result.canceled) return null;
    return result.filePaths[0]; // Return the path to the image
});

// 3. Update Game Data (to save the new image path)
ipcMain.handle('update-game', (event, updatedGame) => {
    const data = store.get('library');
    
    // Find the game in the installed list and update it
    const index = data.installed.findIndex(g => g.id === updatedGame.id);
    if (index !== -1) {
        data.installed[index] = updatedGame;
        store.set('library', data);
    }
    
    return data;
});

// 1. Select a file for the Wishlist (Installer/ISO/ZIP)
ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        // We allow any file type since it might be an ISO, RAR, EXE, etc.
        filters: [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result.canceled) return null;
    return result.filePaths[0];
});

// 2. Open the file's location in Windows Explorer
// 2. Open the file's location in Windows Explorer
ipcMain.on('show-in-folder', (event, filePath) => {
    const path = require('path');
    // Fix slashes (Windows prefers '\', code often has '/')
    const safePath = path.normalize(filePath);
    
    console.log("Opening folder for:", safePath); // Debug log
    shell.showItemInFolder(safePath);
});

// --- CATEGORY HANDLERS ---

// 1. Add a new Category
ipcMain.handle('add-category', (event, categoryName) => {
    const data = store.get('library');
    
    // Ensure categories array exists
    if (!data.categories) data.categories = [];
    
    // Don't add duplicates
    if (!data.categories.includes(categoryName)) {
        data.categories.push(categoryName);
        store.set('library', data);
    }
    return data;
});

// 2. Delete a Category
ipcMain.handle('delete-category', (event, categoryName) => {
    const data = store.get('library');
    if (!data.categories) return data;
    
    // Remove the category from the list
    data.categories = data.categories.filter(c => c !== categoryName);
    
    // Reset any games that were in this category back to 'Uncategorized' (null)
    data.installed.forEach(game => {
        if (game.category === categoryName) {
            game.category = null;
        }
    });
    
    store.set('library', data);
    return data;
});