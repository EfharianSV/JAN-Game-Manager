const electron = require('electron');
const path = require('path');
const fs = require('fs');

class Store {
  constructor(opts) {
    // 1. Get the path to the "AppData" folder on the user's PC
    // On Windows, this is usually: C:\Users\Jan\AppData\Roaming\J-Project
    const userDataPath = (electron.app || electron.remote.app).getPath('userData');
    
    // 2. Define the file name (e.g., "game-data.json")
    this.path = path.join(userDataPath, opts.configName + '.json');
    
    // 3. Define the "Default" data. 
    // If the app is opened for the very first time, we use this.
    // This matches the structure in your uploaded image.
    this.defaults = {
        library: {
            installed: [], // Array to hold installed games
            wishlist: []   // Array to hold wishlist items
        },
        settings: {
            theme: 'dark'
        }
    };
    
    // 4. Try to parse the data from the file, or use defaults if it fails
    this.data = parseDataFile(this.path, this.defaults);
  }
  
  // This allows us to read a specific key (e.g., just the "wishlist")
  get(key) {
    return this.data[key];
  }
  
  // This allows us to save data (e.g., add a new game)
  set(key, val) {
    this.data[key] = val;
    // WAIT! We must write to the physical file immediately
    fs.writeFileSync(this.path, JSON.stringify(this.data));
  }
}

// Helper function: Tries to read the file. If it doesn't exist, returns defaults.
function parseDataFile(filePath, defaults) {
  try {
    // Try to read the file
    return JSON.parse(fs.readFileSync(filePath));
  } catch(error) {
    // IF THE FILE IS MISSING OR CORRUPT:
    // 1. Create the file immediately using the defaults
    fs.writeFileSync(filePath, JSON.stringify(defaults));
    // 2. Return the defaults so the app can keep running
    return defaults;
  }
}

// Export this class so main.js can use it
module.exports = Store;