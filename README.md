# Proton Explorer ⚛️📁

A modern, fast, and highly customizable dual-pane file explorer built with Electron. Designed with productivity and media management in mind, Proton Explorer makes organizing your images, videos, and folders a seamless experience across Windows and Linux.

---

## ✨ Features

*   **🪟 Dual-Pane Interface:** Easily move and copy files between directories with a side-by-side view.
*   **👀 Media Hover Previews:** Instantly preview images and auto-play videos (muted) just by hovering over them.
*   **🎨 Custom Themes:** Personalize your workspace with a built-in color picker that updates the UI and folder icons instantly.
*   **⭐ Favorites Sidebar:** Pin your most used folders (like Desktop, Downloads, or custom paths) for quick access.
*   **⌨️ Keyboard Shortcuts:** Full support for productivity shortcuts (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`).
*   **📦 Batch Operations:** Select multiple files to rename, delete, move, or copy in bulk.
*   **🔀 Smart Sorting:** Sort your files by Newest, Oldest, Name (A-Z/Z-A), or Size (Large/Small).
*   **▶️ Native Media Player:** Built-in modal for viewing full-size images and streaming video, with a fallback to open unsupported codecs in your OS default player.

## 🚀 Installation

You can download the pre-compiled versions from the [Releases](#) tab:
*   **Windows:** Download the `.exe` installer or the portable executable.
*   **Linux:** Download the `.AppImage` (make sure to allow it to execute as a program).

## 🛠️ Development & Building

Want to tweak the code or build it yourself? Proton Explorer is built with standard web technologies (HTML, CSS, JavaScript) running on an Electron Node.js backend.

### Prerequisites
*   [Node.js](https://nodejs.org/) installed on your system.

### Running Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/proton-explorer.git
   cd proton-explorer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the app in development mode:
   ```bash
   npm start
   ```

### 📦 Compiling for Production

Proton Explorer uses `electron-builder` to package the application. 

**To build for Windows (Run this in Windows CMD or PowerShell):**
```bash
npm run build:win
```

**To build for Linux (Run this in a Linux environment or WSL):**
```bash
npm run build:linux
```

The compiled executables will be generated inside the `dist/` folder.

## 🏗️ Tech Stack
*   **Frontend:** Vanilla JavaScript, HTML5, CSS3
*   **Backend:** Node.js, Electron
*   **Packaging:** electron-builder

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
