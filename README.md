# JAN Game Manager
![GitHub release (latest by date)](https://img.shields.io/github/v/release/EfharianSV/JAN-Game-Manager?color=4CAF50&label=Latest%20Release)

Local desktop game library manager built with Electron. This application allows users to centralize their local PC game collection, categorize titles, and manage a digital wishlist with local file linking.

---

### 📦 How to Install
1. Go to the [Releases](https://github.com/EfharianSV/JAN-Game-Manager/releases) page.
2. Download the latest `Jan-Game-Manager-Setup.exe`.
3. Run the installer.
   * **Note:** As this is an unsigned community project, Windows may show a "SmartScreen" warning. Click **'More Info'** and **'Run Anyway'** to proceed.

---

## 🚀 Features
* **Automatic Icon Extraction:** Automatically retrieves high-resolution icons from `.exe` files upon import.
* **Dynamic Categorization:** Create, assign, and delete custom categories to keep your library organized.
* **Wishlist System:** Track games you want to play, with support for both web URLs and local file paths (ISOs/Installers).
* **Persistent Storage:** Custom-built JSON database system (`store.js`) that persists user preferences and library data locally.
* **Modern UI:** A fully responsive, dark-themed interface built with CSS Grid and Flexbox.

## 🛠️ Tech Stack
* **Framework:** [Electron](https://www.electronjs.org/) (v39.2.7)
* **Runtime:** Node.js
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Storage:** Asynchronous File-based JSON storage

## 📂 Project Structure
* `src/main.js` - Handles system events, window management, and IPC communication.
* `src/preload.js` - Securely exposes protected backend APIs to the frontend.
* `src/renderer.js` - Manages UI logic, state, and DOM updates.
* `src/store.js` - Custom logic for reading/writing to the local JSON database.
* `src/styles.css` - Custom styling for the gaming-inspired interface.

## 📝 License
This project is MIT licensed.
