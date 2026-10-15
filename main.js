const { app, BrowserWindow, ipcMain, protocol, net, shell, clipboard } = require('electron');
const { pathToFileURL, fileURLToPath } = require('url');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

const MIME_TYPES = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime', '.wmv': 'video/x-ms-wmv'
};

// stream: true enables native video buffering
protocol.registerSchemesAsPrivileged([
    { scheme: 'local', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

function createWindow () {
    const win = new BrowserWindow({
        width: 1400, height: 900,
        title: "Proton Explorer",
        backgroundColor: '#1e1e1e',
        autoHideMenuBar: true,
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    protocol.handle('local', async (request) => {
        try {
            // 1. Remove the custom protocol prefix
            let urlStr = request.url.replace(/^local:\/\//i, '');
            
            // 2. Strip video thumbnail hashes (#t=0.001) BEFORE converting to file path
            urlStr = urlStr.split('#')[0].split('?')[0]; 
            
            // 3. Decode URI components (%20 -> Space) and normalize to Windows slashes
            let absolutePath = path.normalize(decodeURIComponent(urlStr));
            
            // 4. Serve the file ourselves with proper HTTP Range (206) support.
            //    Chromium's <video> needs byte ranges + correct MIME to play and seek.
            const stat = await fs.promises.stat(absolutePath);
            const size = stat.size;
            const mime = MIME_TYPES[path.extname(absolutePath).toLowerCase()] || 'application/octet-stream';
            const baseHeaders = { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };

            if (size === 0) return new Response(null, { status: 200, headers: { ...baseHeaders, 'Content-Length': '0' } });

            let start = 0, end = size - 1, status = 200;
            const range = request.headers.get('range');
            const m = range && /bytes=(\d*)-(\d*)/.exec(range);
            if (m) {
                if (m[1] === '' && m[2] !== '') start = Math.max(0, size - parseInt(m[2], 10));
                else {
                    start = parseInt(m[1] || '0', 10);
                    if (m[2] !== '') end = Math.min(parseInt(m[2], 10), size - 1);
                }
                if (start > end || start >= size) {
                    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
                }
                status = 206;
            }
            const body = Readable.toWeb(fs.createReadStream(absolutePath, { start, end }));
            const headers = { ...baseHeaders, 'Content-Length': String(end - start + 1) };
            if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
            return new Response(body, { status, headers });        } catch (err) {
            return new Response('Not found', { status: 404 });
        }
    });
    
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Keep all your existing ipcMain.handle(...) code below!

// FIX: handler was missing (preload exposed it, renderer awaited it -> app crashed on first run)
ipcMain.handle('get-system-path', (e, name) => {
    try { return app.getPath(name); } catch (err) { return null; }
});

// Faster than spawning PowerShell: probe all letters in parallel
// Cross-platform: returns ROOT PATHS ("C:\" on Windows, mount points like "/" or "/media/u/USB" on Linux)
const SYSTEM_MOUNT_PREFIXES = ['/boot', '/snap', '/var/snap', '/var/lib', '/etc', '/sys', '/proc', '/dev', '/run/user', '/run/snapd', '/usr', '/tmp'];
const NETWORK_FS = ['nfs', 'nfs4', 'cifs', 'smb3', 'smbfs', 'fuse.sshfs', 'fuse.rclone', 'davfs'];

function decodeMountField(s) { return s.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))); }

async function getLinuxLabels() {
    // /dev/disk/by-label/<LABEL> -> ../../sdb1
    const map = {};
    const dir = '/dev/disk/by-label';
    try {
        for (const name of await fs.promises.readdir(dir)) {
            try {
                const real = await fs.promises.realpath(path.join(dir, name));
                map[real] = name.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
            } catch (e) {}
        }
    } catch (e) {}
    return map;
}

async function diskUsage(p) {
    try {
        const s = await fs.promises.statfs(p);
        return { total: Number(s.blocks) * Number(s.bsize), free: Number(s.bavail) * Number(s.bsize) };
    } catch (e) { return { total: 0, free: 0 }; }
}

async function listPosixMounts() {
    if (process.platform === 'darwin') {
        const result = [{ path: '/', label: 'Macintosh HD', type: 'fixed' }];
        try {
            for (const n of await fs.promises.readdir('/Volumes')) {
                const p = path.join('/Volumes', n);
                try { if ((await fs.promises.lstat(p)).isSymbolicLink()) continue; } catch (e) { continue; }
                result.push({ path: p, label: n, type: 'removable' });
            }
        } catch (e) {}
        return result;
    }

    let text = '';
    try { text = await fs.promises.readFile('/proc/mounts', 'utf8'); }
    catch (e) { return [{ path: '/', label: 'Computer', type: 'fixed' }]; }

    const labels = await getLinuxLabels();
    const byDev = new Map();
    for (const line of text.split('\n')) {
        const f = line.split(' ');
        if (f.length < 3) continue;
        const dev = decodeMountField(f[0]), mnt = decodeMountField(f[1]), fstype = f[2];
        const isNet = NETWORK_FS.includes(fstype);
        if (!isNet && !dev.startsWith('/dev/')) continue;
        if (dev.startsWith('/dev/loop') || dev.startsWith('/dev/ram')) continue;
        if (mnt !== '/' && SYSTEM_MOUNT_PREFIXES.some(p => mnt === p || mnt.startsWith(p + '/'))) continue;

        const key = isNet ? mnt : dev;
        const prev = byDev.get(key);
        // same device mounted several times (btrfs subvolumes, bind mounts): keep the shortest mount point
        if (prev && prev.path.length <= mnt.length) continue;

        let real = dev;
        try { real = await fs.promises.realpath(dev); } catch (e) {}
        const removable = mnt.startsWith('/media/') || mnt.startsWith('/run/media/');
        let label;
        if (mnt === '/') label = 'Computer';
        else label = labels[real] || path.basename(mnt) || dev;
        byDev.set(key, { path: mnt, label, type: isNet ? 'network' : (removable ? 'removable' : 'fixed') });
    }
    const list = Array.from(byDev.values());
    if (!list.some(m => m.path === '/')) list.unshift({ path: '/', label: 'Computer', type: 'fixed' });
    list.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)));
    return list;
}

async function listWindowsLetters() {
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i) + ':\\');
    const results = await Promise.all(letters.map(async (d) => {
        try { await fs.promises.access(d); return d; } catch (e) { return null; }
    }));
    const drives = results.filter(Boolean);
    return drives.length > 0 ? drives : ['C:\\'];
}

ipcMain.handle('get-drives', async () => {
    if (process.platform === 'win32') return listWindowsLetters();
    return (await listPosixMounts()).map(m => m.path);
});

// Detailed info for the sidebar "Devices" section: label, type and free/total space
ipcMain.handle('get-drives-info', async () => {
    try {
        if (process.platform === 'win32') {
            try {
                const out = await runPS(`[System.IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady } | ForEach-Object { [pscustomobject]@{ path = $_.Name; label = $_.VolumeLabel; type = [string]$_.DriveType; total = [double]$_.TotalSize; free = [double]$_.AvailableFreeSpace } } | ConvertTo-Json -Compress`, {}, false);
                const parsed = JSON.parse(out.trim() || '[]');
                return (Array.isArray(parsed) ? parsed : [parsed]).map(d => {
                    const type = d.type === 'Removable' ? 'removable' : d.type === 'Network' ? 'network' : d.type === 'CDRom' ? 'optical' : 'fixed';
                    const fallback = type === 'removable' ? 'Removable Disk' : type === 'network' ? 'Network Drive' : type === 'optical' ? 'CD Drive' : 'Local Disk';
                    return { path: d.path, name: `${d.label || fallback} (${d.path.replace(/\\$/, '')})`, type, total: d.total || 0, free: d.free || 0 };
                });
            } catch (e) {
                return (await listWindowsLetters()).map(d => ({ path: d, name: d.replace(/\\$/, ''), type: 'fixed', total: 0, free: 0 }));
            }
        }
        const mounts = await listPosixMounts();
        return await Promise.all(mounts.map(async (m) => {
            const usage = await diskUsage(m.path);
            return { path: m.path, name: m.label, type: m.type, total: usage.total, free: usage.free };
        }));
    } catch (err) { return []; }
});

// Sidebar "Places": only well-known folders that actually exist (works with XDG dirs on Linux)
ipcMain.handle('get-places', async () => {
    const defs = [['home', 'Home'], ['desktop', 'Desktop'], ['documents', 'Documents'], ['downloads', 'Downloads'], ['music', 'Music'], ['pictures', 'Pictures'], ['videos', 'Videos']];
    const out = [];
    for (const [key, name] of defs) {
        try {
            const p = app.getPath(key);
            if ((await fs.promises.stat(p)).isDirectory()) out.push({ id: key, name, icon: key, path: p });
        } catch (e) {}
    }
    return out;
});

const WIN_SYSTEM_NAMES = new Set(['$recycle.bin', 'system volume information', '$winreagent', 'config.msi', 'recovery', 'documents and settings']);

ipcMain.handle('get-files', async (e, folderPath, page, limit, sortParam, showHidden) => {
    try {
        // FIX: limit arrives as a string from <select>; "start + limit" concatenated strings
        limit = Math.max(1, parseInt(limit, 10) || 50);
        page = parseInt(page, 10) || 1;

        const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
        const items = await Promise.all(entries.map(async (dirent) => {
            if (!showHidden && dirent.name.startsWith('.')) return null;
            if (!showHidden && process.platform === 'win32' && WIN_SYSTEM_NAMES.has(dirent.name.toLowerCase())) return null;
            
            let isDir = dirent.isDirectory();
            const ext = path.extname(dirent.name).toLowerCase();
            const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext);
            const isVideo = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv'].includes(ext);
            
            const itemPath = path.join(folderPath, dirent.name);
            // symlinks / junctions to folders are reported as links by readdir: resolve them
            if (!isDir && !isImage && !isVideo && dirent.isSymbolicLink()) {
                try { isDir = (await fs.promises.stat(itemPath)).isDirectory(); } catch (err) { return null; }
            }
            if (!isDir && !isImage && !isVideo) return null;
            
            try {
                const stats = await fs.promises.stat(itemPath);
                if (stats.isDirectory()) isDir = true;
                const type = isDir ? 'folder' : (isVideo ? 'video' : 'image');
                return { name: dirent.name, path: itemPath, type, mtime: stats.mtime.getTime(), size: stats.size };
            } catch (err) { return null; }
        }));

        let validItems = items.filter(Boolean);
        // Natural (Windows-like) name ordering: file2 before file10
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        validItems.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            
            if (sortParam === 'date-desc') return b.mtime - a.mtime;
            if (sortParam === 'date-asc') return a.mtime - b.mtime;
            if (sortParam === 'size-desc') return b.size - a.size;
            if (sortParam === 'size-asc') return a.size - b.size;
            if (sortParam === 'name-asc') return collator.compare(a.name, b.name);
            if (sortParam === 'name-desc') return collator.compare(b.name, a.name);
            return 0;
        });

        const total = validItems.length;
        const totalPages = Math.ceil(total / limit);
        if (page < 1) page = 1;
        if (page > totalPages && totalPages > 0) page = totalPages;

        const start = (page - 1) * limit;
        return { success: true, page, limit, total, totalPages, items: validItems.slice(start, start + limit) };
    } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('mkdir', async (e, folderPath) => {
    try { await fs.promises.mkdir(folderPath, { recursive: true }); return { success: true }; } 
    catch (err) { return { success: false, error: err.message }; }
});

async function pathExists(p) {
    try { await fs.promises.access(p); return true; } catch (e) { return false; }
}

// Returns a non-colliding destination path ("name (1).ext")
async function uniqueDest(targetDir, fileName) {
    let destPath = path.join(targetDir, fileName);
    let counter = 1;
    while (await pathExists(destPath)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        destPath = path.join(targetDir, `${base} (${counter})${ext}`);
        counter++;
    }
    return destPath;
}

// rename() fails across drives (EXDEV); fall back to copy + remove
async function moveEntry(src, dest) {
    try { await fs.promises.rename(src, dest); }
    catch (err) {
        if (err.code !== 'EXDEV') throw err;
        await fs.promises.cp(src, dest, { recursive: true });
        await fs.promises.rm(src, { recursive: true, force: true });
    }
}

ipcMain.handle('move', async (e, items, targetDir) => {
    try {
        for (const item of items) {
            const fileName = path.basename(item);
            let destPath = path.join(targetDir, fileName);
            if (item === targetDir || destPath.startsWith(item + path.sep)) continue; 
            if (path.resolve(item) === path.resolve(destPath)) continue; // already there
            // FIX: avoid silently overwriting an existing file
            if (await pathExists(destPath)) destPath = await uniqueDest(targetDir, fileName);
            await moveEntry(item, destPath);
        }
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
});

// NEW: Backend Copy logic
ipcMain.handle('copy', async (e, items, targetDir) => {
    try {
        for (const item of items) {
            const fileName = path.basename(item);
            const destPath = await uniqueDest(targetDir, fileName);

            const stats = await fs.promises.stat(item);
            if (stats.isDirectory()) {
                // FIX: prevent copying a folder into itself (infinite recursion)
                if (destPath.startsWith(item + path.sep)) continue;
                await fs.promises.cp(item, destPath, { recursive: true });
            }
            else await fs.promises.copyFile(item, destPath);
        }
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('rename', async (e, oldPath, newPath) => {
    try {
        // FIX: rename() silently overwrites on Windows/POSIX; refuse instead
        const sameTarget = process.platform === 'linux' ? oldPath === newPath : oldPath.toLowerCase() === newPath.toLowerCase();
        if (!sameTarget && await pathExists(newPath)) {
            return { success: false, error: 'A file or folder with that name already exists.' };
        }
        await fs.promises.rename(oldPath, newPath); return { success: true };
    } 
    catch (err) { return { success: false, error: err.message }; }
});

// Delete now sends items to the Windows Recycle Bin (like Explorer); `permanent` = Shift+Delete behaviour
ipcMain.handle('delete', async (e, targetPath, permanent) => {
    try {
        const target = path.normalize(targetPath);
        if (permanent) {
            const stats = await fs.promises.stat(target);
            if (stats.isDirectory()) await fs.promises.rm(target, { recursive: true, force: true });
            else await fs.promises.unlink(target);
        } else {
            await shell.trashItem(target);
        }
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
});

// ---- Native Windows integration ----
ipcMain.handle('open-path', async (e, targetPath) => {
    const err = await shell.openPath(path.normalize(targetPath));
    return err ? { success: false, error: err } : { success: true };
});
ipcMain.handle('show-in-folder', (e, targetPath) => {
    shell.showItemInFolder(path.normalize(targetPath));
    return { success: true };
});

// Real Windows clipboard (file drop list + "Preferred DropEffect") via PowerShell in STA mode
function runPS(script, env, withForms = true) {
    return new Promise((resolve, reject) => {
        const wrapped = '[Console]::OutputEncoding=[Text.Encoding]::UTF8; ' + (withForms ? 'Add-Type -AssemblyName System.Windows.Forms; ' : '') + script;
        const encoded = Buffer.from(wrapped, 'utf16le').toString('base64');
        execFile('powershell.exe', ['-NoProfile', '-STA', '-NonInteractive', '-EncodedCommand', encoded],
            { env: { ...process.env, ...env }, windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
            (err, stdout, stderr) => err ? reject(new Error(stderr || err.message)) : resolve(stdout));
    });
}

// Linux file managers (Nautilus, Nemo, Thunar, Caja...) exchange files via "x-special/gnome-copied-files":
//   "<copy|cut>\nfile:///path/a\nfile:///path/b"   (KDE/others fall back to text/uri-list)
function writePosixClipboardFiles(files, action) {
    if (process.platform !== 'linux') return { success: true };
    if (files.length === 0) { clipboard.clear(); return { success: true }; }
    const uris = files.map(f => pathToFileURL(f).toString());
    clipboard.writeBuffer('x-special/gnome-copied-files', Buffer.from(`${action === 'cut' ? 'cut' : 'copy'}\n${uris.join('\n')}`, 'utf8'));
    return { success: true };
}

function readPosixClipboardFiles() {
    if (process.platform !== 'linux') return { success: true, files: [], action: 'copy' };
    let action = 'copy', lines = [];
    const formats = clipboard.availableFormats();
    if (formats.includes('x-special/gnome-copied-files')) {
        lines = clipboard.readBuffer('x-special/gnome-copied-files').toString('utf8').split(/\r?\n/).filter(Boolean);
        if (lines[0] === 'cut' || lines[0] === 'copy') action = lines.shift();
    } else if (formats.includes('text/uri-list')) {
        lines = clipboard.readBuffer('text/uri-list').toString('utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#'));
        if (formats.includes('application/x-kde-cutselection') && clipboard.readBuffer('application/x-kde-cutselection').toString().trim() === '1') action = 'cut';
    }
    const files = lines.filter(l => l.startsWith('file://')).map(l => { try { return fileURLToPath(l); } catch (e) { return null; } }).filter(Boolean);
    return { success: true, files, action };
}

ipcMain.handle('clipboard-write-files', async (e, files, action) => {
    try {
        if (process.platform !== 'win32') return writePosixClipboardFiles(files || [], action);
        const data = Buffer.from(JSON.stringify({ files: files || [], action }), 'utf8').toString('base64');
        await runPS(`
$j = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:PX_DATA)) | ConvertFrom-Json
if (@($j.files).Count -eq 0) { [Windows.Forms.Clipboard]::Clear(); exit 0 }
$sc = New-Object System.Collections.Specialized.StringCollection
foreach ($p in @($j.files)) { [void]$sc.Add([string]$p) }
$d = New-Object Windows.Forms.DataObject
$d.SetFileDropList($sc)
$eff = 1; if ($j.action -eq 'cut') { $eff = 2 }
$ms = New-Object IO.MemoryStream
$b = [BitConverter]::GetBytes([int]$eff)
$ms.Write($b, 0, 4)
$d.SetData('Preferred DropEffect', $ms)
[Windows.Forms.Clipboard]::SetDataObject($d, $true)
`, { PX_DATA: data });
        return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('clipboard-read-files', async () => {
    try {
        if (process.platform !== 'win32') return readPosixClipboardFiles();
        const out = await runPS(`
$d = [Windows.Forms.Clipboard]::GetDataObject()
if ($d -and $d.GetDataPresent([Windows.Forms.DataFormats]::FileDrop)) {
    $files = $d.GetData([Windows.Forms.DataFormats]::FileDrop)
    $eff = 1
    if ($d.GetDataPresent('Preferred DropEffect')) {
        $ms = $d.GetData('Preferred DropEffect')
        $bytes = New-Object byte[] 4
        [void]$ms.Read($bytes, 0, 4)
        $eff = [BitConverter]::ToInt32($bytes, 0)
    }
    $act = 'copy'; if ($eff -band 2) { $act = 'cut' }
    @{ files = @($files); action = $act } | ConvertTo-Json -Compress
} else { '{"files":[],"action":"copy"}' }
`, {});
        const parsed = JSON.parse(out.trim() || '{"files":[],"action":"copy"}');
        return { success: true, files: [].concat(parsed.files || []), action: parsed.action };
    } catch (err) { return { success: false, error: err.message, files: [], action: 'copy' }; }
});