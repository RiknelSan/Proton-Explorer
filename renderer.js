document.addEventListener('DOMContentLoaded', async () => {

    const api = window.api;
    const IS_WIN = api.platform === 'win32';
    const SEP = IS_WIN ? '\\' : '/';
    const TRASH_NAME = IS_WIN ? 'Recycle Bin' : 'Trash';
    const FILE_MANAGER_NAME = IS_WIN ? 'Explorer' : (api.platform === 'darwin' ? 'Finder' : 'Files');
    const INVALID_NAME_RE = IS_WIN ? /[<>:"/\\|?*]/ : /[/\0]/;
    const INVALID_NAME_MSG = IS_WIN ? 'Name cannot contain any of: < > : " / \\ | ? *' : 'Name cannot contain "/".';

    // ---------- Icons (Material paths, filled with currentColor) ----------
    const ICONS = {
        menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
        more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
        view: 'M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z',
        newfolder: 'M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z',
        external: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
        split: 'M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM11 19H4V5h7v14zm9 0h-7V5h7v14z',
        back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
        forward: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
        up: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
        caret: 'M7 10l5 5 5-5z',
        plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
        close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
        warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
        film: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
        folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
        home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
        desktop: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z',
        documents: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
        downloads: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
        music: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
        pictures: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
        videos: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
        drive: 'M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z',
        usb: 'M15 7v4h1v2h-3V5h2l-3-4-3 4h2v8H8v-2.07c.7-.37 1.2-1.08 1.2-1.93 0-1.21-.99-2.2-2.2-2.2-1.21 0-2.2.99-2.2 2.2 0 .85.5 1.56 1.2 1.93V13c0 1.11.89 2 2 2h3v3.05c-.71.37-1.2 1.1-1.2 1.95 0 1.22.99 2.2 2.2 2.2 1.21 0 2.2-.98 2.2-2.2 0-.85-.49-1.58-1.2-1.95V15h3c1.11 0 2-.89 2-2v-2h1V7h-4z',
        network: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
        optical: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z',
        bookmark: 'M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z'
    };
    // Static, trusted strings only (never user data)
    function iconHTML(name) { return `<svg class="icon" viewBox="0 0 24 24"><path d="${ICONS[name] || ICONS.folder}"/></svg>`; }
    document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = iconHTML(el.dataset.icon); });

    // ---------- Helpers ----------
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Cross-platform path helpers (Windows "C:\a\b", UNC "\\srv\share\a", POSIX "/a/b")
    function joinPath(base, name) {
        if (!base) return name;
        return base.endsWith(SEP) ? base + name : base + SEP + name;
    }

    function pathSegments(p) {
        let root = '', rest = p || '';
        if (IS_WIN) {
            const s = rest.replace(/\//g, '\\');
            const m = /^(\\\\[^\\]+\\[^\\]+|[A-Za-z]:)\\*(.*)$/.exec(s);
            if (m) { root = m[1] + '\\'; rest = m[2]; } else { rest = s; }
        } else {
            root = '/'; rest = rest.replace(/^\/+/, '');
        }
        const segs = [];
        if (root) segs.push({ label: IS_WIN ? root.replace(/\\$/, '') : '/', path: root });
        let cur = root;
        rest.split(SEP).filter(Boolean).forEach(part => {
            cur = joinPath(cur, part);
            segs.push({ label: part, path: cur });
        });
        return segs;
    }

    function parentPath(p) {
        const segs = pathSegments(p);
        return segs.length > 1 ? segs[segs.length - 2].path : null;
    }

    // Comparison key: ignores trailing separators (and case on Windows)
    function normKey(p) {
        let s = p || '';
        if (IS_WIN) s = s.replace(/\//g, '\\');
        while (s.length > 1 && s.endsWith(SEP) && !/^[A-Za-z]:\\$/.test(s)) s = s.slice(0, -1);
        return IS_WIN ? s.toLowerCase() : s;
    }

    function toLocalUrl(p) {
        return `local://${encodeURIComponent(IS_WIN ? p.replace(/\\/g, '/') : p)}`;
    }

    function validName(name) {
        if (INVALID_NAME_RE.test(name) || name === '.' || name === '..') { alert(INVALID_NAME_MSG); return false; }
        return true;
    }

    // FIX: window.prompt() is NOT supported in Electron (throws) -> in-app dialog replacement
    function askText(title, defaultValue = '') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'dialog-modal';
            overlay.style.display = 'flex';
            overlay.style.zIndex = '3000';
            const box = document.createElement('div');
            box.className = 'dialog-content';
            const h = document.createElement('h3'); h.style.margin = '0'; h.style.fontSize = '16px'; h.textContent = title;
            const input = document.createElement('input');
            input.type = 'text'; input.value = defaultValue; input.className = 'text-input';
            const actions = document.createElement('div'); actions.className = 'dialog-actions';
            actions.style.justifyContent = 'flex-end'; actions.style.gap = '10px';
            const cancel = document.createElement('button'); cancel.className = 'btn'; cancel.textContent = 'Cancel';
            const ok = document.createElement('button'); ok.className = 'btn btn-primary'; ok.textContent = 'OK';
            actions.appendChild(cancel); actions.appendChild(ok);
            box.appendChild(h); box.appendChild(input); box.appendChild(actions);
            overlay.appendChild(box); document.body.appendChild(overlay);
            const done = (val) => { overlay.remove(); resolve(val); };
            ok.onclick = () => done(input.value.trim() || null);
            cancel.onclick = () => done(null);
            input.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') ok.click();
                else if (e.key === 'Escape') cancel.click();
            });
            input.focus(); input.select();
        });
    }

    // ---------- DOM refs ----------
    const appContainer = document.getElementById('appContainer');
    const limitSelect = document.getElementById('limitSelect');
    const sortSelect = document.getElementById('sortSelect');
    const zoomSlider = document.getElementById('zoomSlider');
    const showHiddenToggle = document.getElementById('showHiddenToggle');
    const toggleSplitViewBtn = document.getElementById('toggleSplitViewBtn');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const splitContainer = document.getElementById('splitContainer');
    const actionBar = document.getElementById('actionBar');
    const contextMenu = document.getElementById('contextMenu');
    const selectionBox = document.getElementById('selectionBox');
    const moveModal = document.getElementById('moveModal');
    const imgModal = document.getElementById('modal');
    const modalImg = document.getElementById('modalImg');
    const modalVid = document.getElementById('modalVid');
    const modalUnsupported = document.getElementById('modalUnsupported');
    const hoverBox = document.getElementById('hoverPreviewBox');
    const hoverImg = document.getElementById('hoverImg');
    const hoverVid = document.getElementById('hoverVid');

    // Platform-specific labels
    document.getElementById('ctxDeleteBtn').textContent = `Move to ${TRASH_NAME}`;
    document.getElementById('ctxShowBtn').textContent = `Show in ${FILE_MANAGER_NAME}`;
    document.getElementById('openExplorerBtn').title = `Open current folder in ${FILE_MANAGER_NAME}`;

    // ---------- Popover menus (View options / Settings) ----------
    const popoverWraps = Array.from(document.querySelectorAll('.popover-wrap'));
    popoverWraps.forEach(wrap => {
        wrap.querySelector('.popover-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = wrap.classList.contains('open');
            popoverWraps.forEach(w => w.classList.remove('open'));
            if (!wasOpen) wrap.classList.add('open');
        });
    });
    // Capture phase: cards call stopPropagation() on click, which would otherwise keep menus open
    document.addEventListener('click', (e) => {
        popoverWraps.forEach(w => { if (!w.contains(e.target)) w.classList.remove('open'); });
    }, true);

    const themePicker = document.getElementById('themeColorPicker');
    const savedColor = localStorage.getItem('comfy-theme-color') || '#3584e4';
    document.documentElement.style.setProperty('--accent-blue', savedColor);
    themePicker.value = savedColor;
    themePicker.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--accent-blue', e.target.value);
        localStorage.setItem('comfy-theme-color', e.target.value);
    });

    const hoverToggle = document.getElementById('hoverToggle');
    let hoverEnabled = localStorage.getItem('comfy-hover-preview') === 'true';
    hoverToggle.checked = hoverEnabled;
    hoverToggle.addEventListener('change', (e) => {
        hoverEnabled = e.target.checked;
        localStorage.setItem('comfy-hover-preview', hoverEnabled);
    });

    let localClipboard = { files: [], action: '' };
    let isDragging = false, startX = 0, startY = 0, dragPaneId = null;
    let hoverTimeout = null;

    // ---------- Places, devices, state ----------
    const [drives, places] = await Promise.all([
        api.getDrives(),
        api.getPlaces().catch(() => [])
    ]);
    const homePath = (places.find(p => p.id === 'home') || {}).path || '';
    const startPath = homePath || drives[0] || (IS_WIN ? 'C:\\' : '/');
    let deviceInfos = drives.map(d => ({ path: d, name: d, type: 'fixed', total: 0, free: 0 }));

    let globalState = { limit: 50, sort: 'date-desc', showHidden: false, isSplit: false, sidebarVisible: true };
    const newPane = () => ({ path: startPath, page: 1, total: 0, items: [], mediaOnly: [], selected: new Set(), lastIndex: -1, history: [startPath], historyIndex: 0 });
    let panes = { pane1: newPane(), pane2: newPane() };
    let activePane = 'pane1'; 
    let moveModalCurrentPath = '';

    // Bookmarks are user pins only; system folders now live in the "Places" section
    let favorites = [];
    try { favorites = (JSON.parse(localStorage.getItem('comfy-favorites')) || []).filter(f => f && !f.isSystem); } catch (e) { favorites = []; }

    function saveFavorites() { localStorage.setItem('comfy-favorites', JSON.stringify(favorites)); renderSidebar(); }

    function buildSidebarItem({ icon, name, path, sub, usage, tooltip, onRemove }) {
        const li = document.createElement('li');
        li.className = 'sidebar-item'; li.dataset.path = path;
        li.title = tooltip || path;

        const ico = document.createElement('span'); ico.className = 'sidebar-icon'; ico.innerHTML = iconHTML(icon);
        const label = document.createElement('div'); label.className = 'sidebar-item-label';
        // FIX: build with textContent so names can't inject HTML
        const nm = document.createElement('span'); nm.className = 'sidebar-item-name'; nm.textContent = name;
        label.appendChild(nm);
        if (sub) { const s = document.createElement('span'); s.className = 'sidebar-item-sub'; s.textContent = sub; label.appendChild(s); }
        if (usage != null) {
            const bar = document.createElement('div'); bar.className = 'usage-bar' + (usage > 0.9 ? ' warn' : '');
            const fill = document.createElement('div'); fill.style.width = `${Math.round(usage * 100)}%`;
            bar.appendChild(fill); label.appendChild(bar);
        }
        li.appendChild(ico); li.appendChild(label);
        li.onclick = () => navigateTo(activePane, path);
        makeDropTarget(li, path);

        if (onRemove) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn'; removeBtn.title = 'Remove bookmark'; removeBtn.innerHTML = iconHTML('close');
            removeBtn.onclick = (e) => { e.stopPropagation(); onRemove(); };
            li.appendChild(removeBtn);
        }
        return li;
    }

    function renderPlaces() {
        const list = document.getElementById('placesList'); list.innerHTML = '';
        places.forEach(p => list.appendChild(buildSidebarItem({ icon: p.icon, name: p.name, path: p.path })));
    }

    function renderFavorites() {
        const list = document.getElementById('favoritesList'); list.innerHTML = '';
        document.getElementById('bookmarksSection').style.display = favorites.length ? '' : 'none';
        favorites.forEach((fav, index) => {
            list.appendChild(buildSidebarItem({ icon: 'bookmark', name: fav.name, path: fav.path, onRemove: () => { favorites.splice(index, 1); saveFavorites(); } }));
        });
    }

    function renderDevices() {
        const list = document.getElementById('devicesList'); list.innerHTML = '';
        deviceInfos.forEach(d => {
            const icon = d.type === 'removable' ? 'usb' : d.type === 'network' ? 'network' : d.type === 'optical' ? 'optical' : 'drive';
            const hasSize = d.total > 0;
            list.appendChild(buildSidebarItem({
                icon, name: d.name || d.path, path: d.path,
                sub: hasSize ? `${formatBytes(d.free)} free of ${formatBytes(d.total)}` : null,
                usage: hasSize ? Math.min(1, Math.max(0, (d.total - d.free) / d.total)) : null,
                tooltip: d.path
            }));
        });
    }

    function renderSidebar() { renderPlaces(); renderFavorites(); renderDevices(); highlightSidebar(); }

    function highlightSidebar() {
        const cur = normKey(panes[activePane].path);
        document.querySelectorAll('.sidebar-item').forEach(li => li.classList.toggle('active', normKey(li.dataset.path) === cur));
    }

    // Detailed device info (labels + free space) can be slow (PowerShell on Windows): load without blocking the UI
    async function refreshDevices() {
        try {
            const infos = await api.getDrivesInfo();
            if (Array.isArray(infos) && infos.length) { deviceInfos = infos; renderDevices(); highlightSidebar(); }
        } catch (e) { console.error('Device refresh failed', e); }
    }
    let lastDeviceRefresh = Date.now();
    window.addEventListener('focus', () => {
        if (Date.now() - lastDeviceRefresh > 3000) { lastDeviceRefresh = Date.now(); refreshDevices(); }
    });

    document.getElementById('addFavoriteBtn').onclick = async () => {
        const currentPath = panes[activePane].path;
        const segs = pathSegments(currentPath);
        const folderName = segs.length ? segs[segs.length - 1].label : currentPath;
        const name = await askText('Name this bookmark:', folderName);
        if (name) {
            if (!favorites.some(f => normKey(f.path) === normKey(currentPath))) { favorites.push({ name, path: currentPath, isSystem: false }); saveFavorites(); } 
            else { alert('This folder is already in your bookmarks!'); }
        }
    };

    toggleSidebarBtn.addEventListener('click', () => {
        globalState.sidebarVisible = !globalState.sidebarVisible;
        appContainer.classList.toggle('sidebar-hidden', !globalState.sidebarVisible);
    });

    // Move dialog: drive/mount selector
    const moveDriveSelect = document.getElementById('drive-moveModal');
    moveDriveSelect.addEventListener('change', (e) => { moveModalCurrentPath = e.target.value; fetchMoveFolders(e.target.value); });
    function populateMoveDriveSelect() {
        moveDriveSelect.innerHTML = '';
        deviceInfos.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.path; opt.textContent = d.name || d.path; moveDriveSelect.appendChild(opt);
        });
    }
    function findMountFor(p) {
        const key = normKey(p); let best = null;
        deviceInfos.forEach(d => {
            const dk = normKey(d.path);
            const prefix = dk.endsWith(SEP) ? dk : dk + SEP;
            if (key === dk || (key + SEP).startsWith(prefix)) {
                if (!best || dk.length > normKey(best.path).length) best = d;
            }
        });
        return best;
    }

    limitSelect.addEventListener('change', (e) => updateGlobalState({ limit: parseInt(e.target.value, 10) }));
    sortSelect.addEventListener('change', (e) => updateGlobalState({ sort: e.target.value }));
    showHiddenToggle.addEventListener('change', (e) => updateGlobalState({ showHidden: e.target.checked }));
    zoomSlider.addEventListener('input', (e) => document.documentElement.style.setProperty('--grid-size', `${e.target.value}px`));
    
    function toggleSplitView() {
        globalState.isSplit = !globalState.isSplit;
        toggleSplitViewBtn.classList.toggle('active', globalState.isSplit);
        splitContainer.classList.toggle('split-on', globalState.isSplit);
        if (globalState.isSplit) {
            document.getElementById('pane2').classList.remove('hidden');
            navigateTo('pane2', panes.pane1.path);
        } else {
            document.getElementById('pane2').classList.add('hidden');
            if (activePane === 'pane2') setActivePane('pane1');
        }
    }
    toggleSplitViewBtn.addEventListener('click', toggleSplitView);

    splitContainer.addEventListener('mousedown', (e) => {
        const clickedPane = e.target.closest('.pane');
        if (clickedPane && clickedPane.id !== activePane) setActivePane(clickedPane.id);
    }, true);

    function setActivePane(paneId) {
        panes[activePane].selected.clear(); panes[activePane].lastIndex = -1;
        document.querySelectorAll(`#imageGrid-${activePane} .item-card`).forEach(c => c.classList.remove('selected'));
        updatePaneStatus(activePane);
        activePane = paneId;
        document.getElementById('pane1').classList.remove('active');
        document.getElementById('pane2').classList.remove('active');
        document.getElementById(paneId).classList.add('active');
        updateActionBar();
        highlightSidebar();
    }

    // ---------- Navigation ----------
    function navigateTo(paneId, newPath) {
        if (newPath !== panes[paneId].path) {
            let hist = panes[paneId].history;
            hist = hist.slice(0, panes[paneId].historyIndex + 1);
            hist.push(newPath);
            panes[paneId].history = hist;
            panes[paneId].historyIndex = hist.length - 1;
        }
        updatePaneState(paneId, { path: newPath, page: 1 });
    }

    function goBack(paneId) {
        if (panes[paneId].historyIndex > 0) {
            panes[paneId].historyIndex--;
            updatePaneState(paneId, { path: panes[paneId].history[panes[paneId].historyIndex], page: 1 });
        }
    }

    function goForward(paneId) {
        if (panes[paneId].historyIndex < panes[paneId].history.length - 1) {
            panes[paneId].historyIndex++;
            updatePaneState(paneId, { path: panes[paneId].history[panes[paneId].historyIndex], page: 1 });
        }
    }

    function goUp(paneId) {
        const up = parentPath(panes[paneId].path);
        if (up) navigateTo(paneId, up);
    }

    document.querySelectorAll('[data-nav]').forEach(btn => {
        btn.addEventListener('click', () => {
            const paneId = btn.dataset.pane;
            if (btn.dataset.nav === 'back') goBack(paneId);
            else if (btn.dataset.nav === 'forward') goForward(paneId);
            else goUp(paneId);
        });
    });

    function updateNavButtons(paneId) {
        const p = panes[paneId];
        const set = (nav, enabled) => document.querySelector(`[data-pane="${paneId}"][data-nav="${nav}"]`).classList.toggle('disabled', !enabled);
        set('back', p.historyIndex > 0);
        set('forward', p.historyIndex < p.history.length - 1);
        set('up', !!parentPath(p.path));
    }

    window.addEventListener('mouseup', (e) => {
        if (e.button === 3) goBack(activePane);
        else if (e.button === 4) goForward(activePane);
    });

    // Editable location bar (Ctrl+L or click on the empty part of the path bar)
    const pathbarEditors = {};
    function normalizeTyped(v) {
        v = (v || '').trim().replace(/^["']|["']$/g, '');
        if (!v) return null;
        if (homePath && (v === '~' || v.startsWith('~/') || v.startsWith('~\\'))) v = homePath + v.slice(1);
        const segs = pathSegments(v);
        return segs.length ? segs[segs.length - 1].path : v;
    }
    ['pane1', 'pane2'].forEach(pId => {
        const pathbar = document.getElementById(`pathbar-${pId}`);
        const input = document.getElementById(`pathInput-${pId}`);
        const startEdit = () => { input.value = panes[pId].path; pathbar.classList.add('editing'); input.focus(); input.select(); };
        const stopEdit = () => pathbar.classList.remove('editing');
        pathbar.addEventListener('click', (e) => { if (e.target === pathbar || e.target.id === `breadcrumb-${pId}`) startEdit(); });
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { const v = normalizeTyped(input.value); stopEdit(); if (v) navigateTo(pId, v); }
            else if (e.key === 'Escape') stopEdit();
        });
        input.addEventListener('blur', stopEdit);
        pathbarEditors[pId] = startEdit;
    });

    // ---------- Clipboard (system clipboard, with in-app fallback) ----------
    function showClipboardToast(msg) {
        const toast = document.getElementById('clipboardStatus');
        toast.textContent = msg; toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function refreshAll() { fetchFiles('pane1'); if (globalState.isSplit) fetchFiles('pane2'); }

    // Copy/cut write to the REAL system clipboard so the OS file manager can paste them (and vice-versa)
    async function clipboardCopyCut(action) {
        const files = Array.from(panes[activePane].selected);
        if (files.length === 0) return;
        localClipboard = { files, action };
        showClipboardToast(`${action === 'cut' ? 'Cut' : 'Copied'} ${files.length} item(s)`);
        const r = await api.clipboardWriteFiles(files, action);
        if (!r.success) console.error('Clipboard write failed:', r.error);
    }

    async function clipboardPaste() {
        // System clipboard is the source of truth; fall back to the in-app one if it fails/empty
        let clip = await api.clipboardReadFiles();
        let files = (clip.success && clip.files.length > 0) ? clip.files : localClipboard.files;
        let action = (clip.success && clip.files.length > 0) ? clip.action : localClipboard.action;
        if (!files || files.length === 0) return;

        const targetPath = panes[activePane].path;
        showClipboardToast(`Pasting ${files.length} item(s)...`);
        let res;
        if (action === 'cut') {
            res = await api.move(files, targetPath);
            if (res.success) { localClipboard.files = []; api.clipboardWriteFiles([], 'copy'); }
        } else {
            res = await api.copy(files, targetPath);
        }
        if (res.success) refreshAll(); else alert(`Paste failed: ${res.error}`);
    }

    function openSelected() {
        const sel = Array.from(panes[activePane].selected);
        if (sel.length !== 1) return;
        const item = panes[activePane].items.find(i => i.path === sel[0]);
        if (!item) return;
        if (item.type === 'folder') navigateTo(activePane, item.path);
        else {
            const idx = panes[activePane].mediaOnly.findIndex(i => i.path === item.path);
            openFullMediaModal(activePane, idx);
        }
    }

    document.addEventListener('keydown', async (e) => {
        if (e.target.tagName === 'INPUT' || imgModal.style.display === 'flex' || moveModal.style.display === 'flex') return;
        const ctrl = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();

        if (ctrl && key === 'c') { clipboardCopyCut('copy'); }
        else if (ctrl && key === 'x') { clipboardCopyCut('cut'); }
        else if (ctrl && key === 'v') { e.preventDefault(); await clipboardPaste(); }
        else if (ctrl && key === 'a') {
            e.preventDefault();
            const ps = panes[activePane];
            document.querySelectorAll(`#imageGrid-${activePane} .item-card`).forEach(card => { ps.selected.add(card.dataset.path); card.classList.add('selected'); });
            updateActionBar();
        }
        else if (ctrl && key === 'l') { e.preventDefault(); pathbarEditors[activePane](); }
        else if (ctrl && key === 'h') {
            e.preventDefault();
            showHiddenToggle.checked = !showHiddenToggle.checked;
            updateGlobalState({ showHidden: showHiddenToggle.checked });
        }
        else if (ctrl && e.shiftKey && key === 'n') { e.preventDefault(); document.getElementById('newFolderBtn').click(); }
        else if (e.key === 'Delete') {
            if (panes[activePane].selected.size > 0) { e.preventDefault(); executeBatchDelete(e.shiftKey); }
        }
        else if (e.key === 'F2') { if (panes[activePane].selected.size > 0) { e.preventDefault(); executeBatchRename(); } }
        else if (e.key === 'F3') { e.preventDefault(); toggleSplitView(); }
        else if (e.key === 'F5') { e.preventDefault(); refreshAll(); }
        else if (e.key === 'F9') { e.preventDefault(); toggleSidebarBtn.click(); }
        else if (e.key === 'Enter') { openSelected(); }
        else if (e.key === 'Escape') { popoverWraps.forEach(w => w.classList.remove('open')); contextMenu.style.display = 'none'; }
        else if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) { e.preventDefault(); goUp(activePane); }
        else if (e.altKey && e.key === 'ArrowLeft') { goBack(activePane); }
        else if (e.altKey && e.key === 'ArrowRight') { goForward(activePane); }
    });

    function updateGlobalState(newState) {
        globalState = { ...globalState, ...newState };
        panes.pane1.page = 1; panes.pane2.page = 1;
        fetchFiles('pane1'); if (globalState.isSplit) fetchFiles('pane2');
    }

    function updatePaneState(paneId, newState) {
        panes[paneId] = { ...panes[paneId], ...newState };
        panes[paneId].selected.clear(); panes[paneId].lastIndex = -1;
        updateActionBar(); fetchFiles(paneId);
    }

    async function fetchFiles(paneId) {
        const pState = panes[paneId];
        renderBreadcrumb(paneId);
        updateNavButtons(paneId);
        if (paneId === activePane) highlightSidebar();

        // FIX: ignore out-of-order responses when navigating quickly
        const token = (pState.fetchToken = (pState.fetchToken || 0) + 1);
        const data = await api.getFiles(pState.path, pState.page, globalState.limit, globalState.sort, globalState.showHidden);
        if (token !== pState.fetchToken) return;
        if (!data.success) {
            console.error(data.error);
            // FIX: inaccessible folder -> tell the user and go back instead of showing a stale grid
            alert(`Cannot open folder:\n${data.error}`);
            if (pState.historyIndex > 0) {
                pState.history.splice(pState.historyIndex, 1);
                pState.historyIndex--;
                pState.path = pState.history[pState.historyIndex];
                fetchFiles(paneId);
            }
            return;
        }
        
        pState.items = data.items;
        pState.total = data.total;
        pState.mediaOnly = data.items.filter(item => item.type === 'image' || item.type === 'video');
        // drop selections that no longer exist in this page (deleted/moved items)
        const present = new Set(data.items.map(i => i.path));
        pState.selected.forEach(p => { if (!present.has(p)) pState.selected.delete(p); });
        
        renderGrid(paneId);
        renderPagination(paneId, data.page, data.totalPages);
        updatePaneStatus(paneId);
        if (paneId === activePane) updateActionBar();
    }

    function updatePaneStatus(paneId) {
        const p = panes[paneId];
        const el = document.getElementById(`status-${paneId}`);
        let txt = `${p.total} item${p.total === 1 ? '' : 's'}`;
        if (p.selected.size > 0) txt += ` \u2022 ${p.selected.size} selected`;
        el.textContent = txt;
    }

    function makeDropTarget(element, targetPath, targetPaneId) {
        element.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; element.classList.add('drag-over'); });
        element.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); element.classList.remove('drag-over'); });
        element.addEventListener('drop', async (e) => {
            e.preventDefault(); e.stopPropagation(); element.classList.remove('drag-over');
            const payload = e.dataTransfer.getData('application/json');
            if (payload) {
                let paths; try { paths = JSON.parse(payload); } catch (err) { return; }
                const res = await api.move(paths, targetPath);
                if (res.success) refreshAll(); else alert(`Move failed: ${res.error}`);
            }
        });
    }

    function renderBreadcrumbInto(container, fullPath, onNavigate, droppable) {
        container.innerHTML = '';
        const segs = pathSegments(fullPath);
        segs.forEach((seg, index) => {
            if (index > 0) { const sep = document.createElement('span'); sep.className = 'separator'; sep.textContent = '\u203A'; container.appendChild(sep); }
            const span = document.createElement('span');
            span.className = 'crumb' + (index === segs.length - 1 ? ' current' : '');
            span.textContent = seg.label; span.title = seg.path;
            span.onclick = (e) => { e.stopPropagation(); onNavigate(seg.path); };
            if (droppable) makeDropTarget(span, seg.path);
            container.appendChild(span);
        });
        container.scrollLeft = container.scrollWidth; // keep the current folder visible on long paths
    }

    function renderBreadcrumb(paneId) {
        renderBreadcrumbInto(document.getElementById(`breadcrumb-${paneId}`), panes[paneId].path, (p) => navigateTo(paneId, p), true);
    }

    ['pane1', 'pane2'].forEach(pId => {
        const pContent = document.getElementById(`paneContent-${pId}`);
        pContent.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; pContent.classList.add('drag-over'); });
        pContent.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); pContent.classList.remove('drag-over'); });
        pContent.addEventListener('drop', async (e) => {
            e.preventDefault(); e.stopPropagation(); pContent.classList.remove('drag-over');
            const payload = e.dataTransfer.getData('application/json');
            if (payload) {
                let paths; try { paths = JSON.parse(payload); } catch (err) { return; }
                const res = await api.move(paths, panes[pId].path);
                if (res.success) refreshAll(); else alert(`Move failed: ${res.error}`);
            }
        });
    });

    // ---------- Video thumbnails (first frames) + codec support detection ----------
    // The app can only decode what Chromium supports. Thumbnails are grabbed from a frame near the start
    // of each video; if that fails, the codec/container is flagged as unsupported.
    const MEDIA_CACHE_MAX = 800;
    const mediaInfoCache = new Map(); // key -> { status: 'ok' | 'unsupported', thumb? }
    const mediaKey = (item) => `${item.path}|${item.mtime}|${item.size}`;
    function cacheMediaInfo(key, info) {
        mediaInfoCache.set(key, info);
        if (mediaInfoCache.size > MEDIA_CACHE_MAX) mediaInfoCache.delete(mediaInfoCache.keys().next().value);
    }
    function getVideoStatus(item) { const i = mediaInfoCache.get(mediaKey(item)); return i ? i.status : 'unknown'; }
    function markUnsupported(item) { cacheMediaInfo(mediaKey(item), { status: 'unsupported' }); }

    function generateVideoThumb(item) {
        return new Promise((resolve) => {
            const v = document.createElement('video');
            v.muted = true; v.preload = 'auto'; v.playsInline = true;
            let settled = false;
            const finish = (result) => {
                if (settled) return; settled = true; clearTimeout(timer);
                v.removeAttribute('src'); v.load();
                resolve(result);
            };
            const timer = setTimeout(() => finish({ status: 'timeout' }), 20000);
            v.addEventListener('error', () => finish({ status: 'unsupported' }));
            v.addEventListener('loadedmetadata', () => {
                // width 0 => no decodable video track (unsupported video codec, or audio-only file)
                if (!v.videoWidth || !v.videoHeight) return finish({ status: 'unsupported' });
                const d = v.duration;
                let t = (isFinite(d) && d > 0) ? Math.min(1, Math.max(0.05, d * 0.1)) : 0.1;
                if (isFinite(d) && d > 0) t = Math.min(t, d * 0.5);
                v.currentTime = t;
            });
            v.addEventListener('seeked', () => {
                try {
                    const maxDim = 480;
                    const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
                    canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
                    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
                    finish({ status: 'ok', thumb: canvas.toDataURL('image/jpeg', 0.8) });
                } catch (err) { finish({ status: 'unsupported' }); }
            });
            v.src = toLocalUrl(item.path);
        });
    }

    // Limit how many videos are decoded at once, and skip jobs whose card has been re-rendered away
    const THUMB_CONCURRENCY = 3;
    const thumbQueue = []; let thumbActive = 0;
    function enqueueThumb(job) { thumbQueue.push(job); pumpThumbs(); }
    function pumpThumbs() {
        while (thumbActive < THUMB_CONCURRENCY && thumbQueue.length) {
            const job = thumbQueue.shift();
            if (!job.card.isConnected) continue;
            thumbActive++;
            job.run().catch(() => {}).finally(() => { thumbActive--; pumpThumbs(); });
        }
    }
    // Only generate thumbnails for cards that are (almost) visible
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (!en.isIntersecting) return;
            videoObserver.unobserve(en.target);
            if (en.target._thumbJob) enqueueThumb(en.target._thumbJob);
        });
    }, { rootMargin: '300px' });

    function applyVideoInfo(preview, info) {
        preview.classList.remove('loading');
        if (info.status === 'ok') {
            const ph = preview.querySelector('.video-placeholder'); if (ph) ph.remove();
            const img = document.createElement('img');
            img.className = 'video-thumb'; img.src = info.thumb; img.decoding = 'async';
            preview.insertBefore(img, preview.firstChild);
        } else if (info.status === 'unsupported') {
            preview.classList.add('unsupported');
            const badge = document.createElement('div');
            badge.className = 'codec-badge';
            badge.title = 'Codec/format not supported by the app. Double-click to open with the default player.';
            badge.innerHTML = iconHTML('warning');
            preview.appendChild(badge);
        }
    }

    function setupVideoPreview(card, preview, item) {
        const key = mediaKey(item);
        preview.innerHTML = `<div class="video-placeholder">${iconHTML('film')}</div>`;
        const cached = mediaInfoCache.get(key);
        if (cached) { applyVideoInfo(preview, cached); return; }
        preview.classList.add('loading');
        card._thumbJob = {
            card,
            run: async () => {
                const info = await generateVideoThumb(item);
                if (info.status !== 'timeout') cacheMediaInfo(key, info);
                if (preview.isConnected) applyVideoInfo(preview, info);
            }
        };
        videoObserver.observe(card);
    }

    // Hover-play inside the card (only when the floating hover preview is disabled) using ONE temporary <video>
    function startInlinePlay(preview, item) {
        if (preview.querySelector('.inline-vid')) return;
        const v = document.createElement('video');
        v.className = 'inline-vid'; v.muted = true; v.loop = true;
        v.addEventListener('error', () => { markUnsupported(item); v.remove(); });
        v.src = toLocalUrl(item.path);
        preview.appendChild(v);
        v.play().catch(() => {});
    }
    function stopInlinePlay(preview) {
        const v = preview.querySelector('.inline-vid');
        if (!v) return;
        v.pause(); v.removeAttribute('src'); v.load(); v.remove();
    }

    // ---------- Grid ----------
    const FOLDER_SVG = `<svg class="folder-svg" viewBox="0 0 24 24"><path d="${ICONS.folder}"/></svg>`;

    function renderGrid(paneId) {
        const pState = panes[paneId];
        const grid = document.getElementById(`imageGrid-${paneId}`);
        grid.innerHTML = '';
        document.getElementById(`emptyState-${paneId}`).style.display = pState.items.length ? 'none' : 'flex';
        const frag = document.createDocumentFragment();
        
        pState.items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'item-card' + (item.type === 'folder' ? ' is-folder' : '');
            card.dataset.path = item.path; card.draggable = true; 
            if (pState.selected.has(item.path)) card.classList.add('selected');
            
            const preview = document.createElement('div');
            preview.className = 'item-preview';
            
            if (item.type === 'folder') {
                preview.innerHTML = FOLDER_SVG;
                makeDropTarget(card, item.path, paneId);
            } else if (item.type === 'video') {
                setupVideoPreview(card, preview, item);
            } else {
                const img = document.createElement('img');
                img.src = toLocalUrl(item.path);
                img.loading = 'lazy'; img.decoding = 'async';
                preview.appendChild(img);
            }
            
            if (item.type !== 'folder') {
                const typeBadge = document.createElement('div');
                typeBadge.className = 'file-badge';
                typeBadge.textContent = item.name.split('.').pop();
                preview.appendChild(typeBadge);
                
                const sizeBadge = document.createElement('div');
                sizeBadge.className = 'file-size-badge';
                sizeBadge.textContent = formatBytes(item.size);
                preview.appendChild(sizeBadge);

                card.addEventListener('mouseenter', (e) => {
                    if (isDragging) return;
                    if (item.type === 'video' && getVideoStatus(item) === 'unsupported') return;
                    if (!hoverEnabled) { if (item.type === 'video') startInlinePlay(preview, item); return; }
                    hoverTimeout = setTimeout(() => {
                        const srcPath = toLocalUrl(item.path);
                        if (item.type === 'video') {
                            hoverImg.style.display = 'none';
                            hoverVid.style.display = 'block';
                            hoverVid.src = srcPath; hoverVid.play().catch(()=>{});
                        } else {
                            hoverVid.style.display = 'none'; hoverVid.pause();
                            hoverImg.style.display = 'block'; hoverImg.src = srcPath;
                        }
                        hoverBox.style.display = 'block';
                        updateHoverPos(e);
                    }, 400); 
                });

                card.addEventListener('mousemove', (e) => {
                    if (hoverBox.style.display === 'block') updateHoverPos(e);
                });

                card.addEventListener('mouseleave', () => {
                    clearTimeout(hoverTimeout);
                    hoverBox.style.display = 'none';
                    hoverVid.pause(); hoverVid.removeAttribute('src'); hoverVid.load(); hoverImg.removeAttribute('src');
                    stopInlinePlay(preview);
                });
            }

            const label = document.createElement('div'); label.className = 'item-label'; label.textContent = item.name; label.title = item.name;
            card.appendChild(preview); card.appendChild(label);
            
            card.addEventListener('dragstart', (e) => {
                if (!pState.selected.has(item.path)) { clearSelection(paneId); addSelection(paneId, card, item.path); pState.lastIndex = index; }
                e.dataTransfer.setData('application/json', JSON.stringify(Array.from(pState.selected)));
                e.dataTransfer.effectAllowed = 'move';
                clearTimeout(hoverTimeout); hoverBox.style.display = 'none'; stopInlinePlay(preview);
            });

            card.addEventListener('click', (e) => {
                e.stopPropagation(); contextMenu.style.display = 'none';
                if (e.shiftKey && pState.lastIndex !== -1) {
                    clearSelection(paneId);
                    const start = Math.min(pState.lastIndex, index), end = Math.max(pState.lastIndex, index);
                    const allCards = Array.from(grid.children);
                    for (let i = start; i <= end; i++) addSelection(paneId, allCards[i], pState.items[i].path);
                } else if (e.ctrlKey || e.metaKey) {
                    toggleSelection(paneId, card, item.path); pState.lastIndex = index;
                } else { clearSelection(paneId); addSelection(paneId, card, item.path); pState.lastIndex = index; }
            });

            card.addEventListener('dblclick', (e) => {
                e.stopPropagation(); contextMenu.style.display = 'none';
                clearTimeout(hoverTimeout); hoverBox.style.display = 'none'; hoverVid.pause(); stopInlinePlay(preview);
                
                if (item.type === 'folder') navigateTo(paneId, item.path);
                else {
                    const mediaIndex = pState.mediaOnly.findIndex(i => i.path === item.path);
                    openFullMediaModal(paneId, mediaIndex);
                }
            });

            card.addEventListener('contextmenu', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (!pState.selected.has(item.path)) { clearSelection(paneId); addSelection(paneId, card, item.path); pState.lastIndex = index; }
                showContextMenu(e.clientX, e.clientY);
            });

            frag.appendChild(card);
        });
        grid.appendChild(frag);
    }

    // If the hover video can't be decoded, hide the floating box instead of showing a black rectangle
    hoverVid.addEventListener('error', () => { if (hoverVid.getAttribute('src')) hoverBox.style.display = 'none'; });

    let lastHoverEvent = null;
    function updateHoverPos(e) {
        if (e) lastHoverEvent = { clientX: e.clientX, clientY: e.clientY };
        if (!lastHoverEvent) return;
        const margin = 10;
        const width = hoverBox.offsetWidth || 300;
        const height = hoverBox.offsetHeight || 300;
        let left = lastHoverEvent.clientX + 15;
        let top = lastHoverEvent.clientY + 15;
        
        if (left + width > window.innerWidth - margin) left = lastHoverEvent.clientX - width - 15;
        // Always keep the whole box visible, even when the card is at the bottom edge
        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
        
        hoverBox.style.left = `${left}px`;
        hoverBox.style.top = `${top}px`;
    }
    // The box grows once the real media size is known -> re-clamp at that moment
    hoverImg.addEventListener('load', () => updateHoverPos());
    hoverVid.addEventListener('loadedmetadata', () => updateHoverPos());
    hoverVid.addEventListener('resize', () => updateHoverPos());

    function renderPagination(paneId, page, totalPages) {
        const container = document.getElementById(`pagination-${paneId}`); container.innerHTML = '';
        if (totalPages <= 1) return;
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button'); btn.textContent = i;
            if (i === page) { btn.classList.add('active'); btn.disabled = true; }
            else { btn.onclick = () => updatePaneState(paneId, { page: i }); }
            container.appendChild(btn);
        }
    }

    // ---------- Actions ----------
    document.getElementById('newFolderBtn').onclick = async () => {
        const folderName = await askText('Enter new folder name:'); if (!folderName) return;
        if (!validName(folderName)) return;
        const res = await api.mkdir(joinPath(panes[activePane].path, folderName));
        if (res.success) fetchFiles(activePane); else alert(res.error);
    };

    document.getElementById('topMoveToBtn').onclick = () => openMoveModal();
    document.getElementById('ctxMoveToBtn').onclick = () => { contextMenu.style.display = 'none'; openMoveModal(); };
    document.getElementById('ctxOpenBtn').onclick = () => { contextMenu.style.display = 'none'; openSelected(); };
    document.getElementById('ctxOpenDefaultBtn').onclick = () => { contextMenu.style.display = 'none'; Array.from(panes[activePane].selected).forEach(p => api.openPath(p)); };
    document.getElementById('ctxShowBtn').onclick = () => { contextMenu.style.display = 'none'; const s = Array.from(panes[activePane].selected); if (s.length) api.showInFolder(s[0]); };
    document.getElementById('ctxCopyBtn').onclick = () => { contextMenu.style.display = 'none'; clipboardCopyCut('copy'); };
    document.getElementById('ctxCutBtn').onclick = () => { contextMenu.style.display = 'none'; clipboardCopyCut('cut'); };
    document.getElementById('ctxPasteBtn').onclick = () => { contextMenu.style.display = 'none'; clipboardPaste(); };
    document.getElementById('openExplorerBtn').onclick = () => api.openPath(panes[activePane].path);
    document.getElementById('ctxRenameBtn').onclick = () => { contextMenu.style.display = 'none'; executeBatchRename(); };
    document.getElementById('ctxDeleteBtn').onclick = () => { contextMenu.style.display = 'none'; executeBatchDelete(false); };

    document.getElementById('clearSelectionBtn').onclick = () => clearSelection(activePane);
    document.getElementById('batchDeleteBtn').onclick = () => executeBatchDelete(false);
    document.getElementById('batchRenameBtn').onclick = executeBatchRename;

    function toggleSelection(paneId, card, path) {
        if (panes[paneId].selected.has(path)) removeSelection(paneId, card, path); else addSelection(paneId, card, path);
    }
    function addSelection(paneId, card, path) { panes[paneId].selected.add(path); card.classList.add('selected'); updateActionBar(); }
    function removeSelection(paneId, card, path) { panes[paneId].selected.delete(path); card.classList.remove('selected'); updateActionBar(); }
    function clearSelection(paneId) {
        panes[paneId].selected.clear(); panes[paneId].lastIndex = -1;
        document.querySelectorAll(`#imageGrid-${paneId} .item-card`).forEach(c => c.classList.remove('selected')); updateActionBar();
    }
    
    function updateActionBar() {
        const count = panes[activePane].selected.size;
        document.getElementById('topMoveToBtn').style.display = count > 0 ? 'inline-block' : 'none';
        if (count > 0) { document.getElementById('selectionCount').textContent = `${count} item${count > 1 ? 's' : ''} selected`; actionBar.classList.add('visible'); } 
        else { actionBar.classList.remove('visible'); }
        updatePaneStatus('pane1'); updatePaneStatus('pane2');
    }

    async function executeBatchDelete(permanent = false) {
        const selected = Array.from(panes[activePane].selected);
        if (selected.length === 0) return;
        const msg = permanent ? `PERMANENTLY delete ${selected.length} item(s)? This cannot be undone.` : `Move ${selected.length} item(s) to the ${TRASH_NAME}?`;
        if (!confirm(msg)) return;
        let errors = 0;
        for (const target of selected) {
            const res = await api.delete(target, permanent);
            if (!res.success) errors++;
        }
        if (errors > 0) alert(`${errors} file(s) failed to delete.`);
        clearSelection(activePane); refreshAll();
    }

    async function executeBatchRename() {
        const selected = Array.from(panes[activePane].selected);
        const pPath = panes[activePane].path;
        
        if (selected.length === 1) {
            const oldPath = selected[0];
            const item = panes[activePane].items.find(i => i.path === oldPath);
            if (!item) return;
            const isMedia = item.type === 'image' || item.type === 'video';
            const extIndex = item.name.lastIndexOf('.');
            const baseName = (isMedia && extIndex > 0) ? item.name.substring(0, extIndex) : item.name;
            const ext = (isMedia && extIndex > 0) ? item.name.substring(extIndex) : '';
            
            const newBaseName = await askText('Enter new name:', baseName);
            if (!newBaseName || newBaseName === baseName) return;
            if (!validName(newBaseName)) return;
            const rres = await api.rename(oldPath, joinPath(pPath, newBaseName + ext));
            if (!rres.success) { alert(`Rename failed: ${rres.error}`); }
        } else {
            const baseName = await askText(`Enter base name for ${selected.length} items:`);
            if (!baseName) return;
            if (!validName(baseName)) return;
            for (let i = 0; i < selected.length; i++) {
                const oldPath = selected[i];
                const item = panes[activePane].items.find(it => it.path === oldPath);
                if (!item) continue;
                const extIndex = item.name.lastIndexOf('.');
                const ext = ((item.type === 'image' || item.type === 'video') && extIndex > 0) ? item.name.substring(extIndex) : '';
                await api.rename(oldPath, joinPath(pPath, `${baseName} (${i + 1})${ext}`));
            }
        }
        clearSelection(activePane); refreshAll();
    }

    // ---------- Move dialog ----------
    function openMoveModal() {
        if (panes[activePane].selected.size === 0) return;
        moveModalCurrentPath = panes[activePane].path;
        populateMoveDriveSelect();
        const mount = findMountFor(moveModalCurrentPath);
        if (mount) moveDriveSelect.value = mount.path; else moveDriveSelect.selectedIndex = -1;
        moveModal.style.display = 'flex';
        fetchMoveFolders(moveModalCurrentPath);
    }

    async function fetchMoveFolders(targetPath) {
        const data = await api.getFiles(targetPath, 1, 9999, 'name-asc', globalState.showHidden);
        if (data.success) renderMoveFolderList(data.items.filter(i => i.type === 'folder'), targetPath);
    }

    function renderMoveFolderList(folders, currentPath) {
        const list = document.getElementById('moveFolderList'); list.innerHTML = '';
        renderBreadcrumbInto(document.getElementById('moveBreadcrumb'), currentPath, (p) => { moveModalCurrentPath = p; fetchMoveFolders(p); }, false);
        document.getElementById('moveBreadcrumb').style.overflow = 'visible';

        const up = parentPath(currentPath);
        if (up) {
            const upItem = document.createElement('div'); upItem.className = 'folder-list-item';
            upItem.innerHTML = `${iconHTML('folder')}<span>.. (Up)</span>`;
            upItem.onclick = () => { moveModalCurrentPath = up; fetchMoveFolders(up); };
            list.appendChild(upItem);
        }

        folders.forEach(f => {
            const item = document.createElement('div'); item.className = 'folder-list-item';
            const ico = document.createElement('span'); ico.style.display = 'inline-flex'; ico.innerHTML = iconHTML('folder');
            const nm = document.createElement('span'); nm.textContent = f.name;
            item.appendChild(ico); item.appendChild(nm);
            item.onclick = () => { moveModalCurrentPath = f.path; fetchMoveFolders(f.path); };
            list.appendChild(item);
        });
    }

    document.getElementById('cancelMoveBtn').onclick = () => { moveModal.style.display = 'none'; };
    document.getElementById('confirmMoveBtn').onclick = async () => {
        const res = await api.move(Array.from(panes[activePane].selected), moveModalCurrentPath);
        if (res.success) {
            panes.pane1.selected.clear(); panes.pane2.selected.clear(); updateActionBar();
            refreshAll();
        } else { alert(`Move failed: ${res.error}`); }
        moveModal.style.display = 'none';
    };
    document.getElementById('moveNewFolderBtn').onclick = async () => {
        const folderName = await askText('Enter new folder name:'); if (!folderName) return;
        if (!validName(folderName)) return;
        const res = await api.mkdir(joinPath(moveModalCurrentPath, folderName));
        if (res.success) fetchMoveFolders(moveModalCurrentPath); else alert("Failed to create folder.");
    };

    // ---------- Fullscreen media viewer ----------
    let modalIndexTracker = 0;
    let modalItem = null;

    function showModalUnsupported(item) {
        modalVid.pause(); modalVid.removeAttribute('src'); modalVid.load();
        modalVid.style.display = 'none';
        modalUnsupported.style.display = 'flex';
        modalItem = item;
    }
    // Chromium cannot decode every container/codec (e.g. some mkv/avi/wmv/HEVC): offer the default system player
    modalVid.addEventListener('error', () => {
        if (!modalVid.getAttribute('src') || !modalItem) return;
        markUnsupported(modalItem);
        showModalUnsupported(modalItem);
    });
    document.getElementById('modalOpenExternalBtn').onclick = () => { if (modalItem) api.openPath(modalItem.path); };
    
    function openFullMediaModal(paneId, index) {
        const pState = panes[paneId];
        if (index < 0 || index >= pState.mediaOnly.length) return;
        modalIndexTracker = index;
        const item = pState.mediaOnly[index];
        modalItem = item;
        const srcPath = toLocalUrl(item.path);
        modalUnsupported.style.display = 'none';

        if (item.type === 'video') {
            modalImg.style.display = 'none'; modalImg.removeAttribute('src');
            if (getVideoStatus(item) === 'unsupported') {
                showModalUnsupported(item);
            } else {
                modalVid.style.display = 'block'; modalVid.src = srcPath; modalVid.play().catch(()=>{});
            }
        } else {
            modalVid.pause(); modalVid.style.display = 'none'; modalVid.removeAttribute('src'); modalVid.load();
            modalImg.style.display = 'block'; modalImg.src = srcPath;
        }

        document.getElementById('prevBtn').disabled = modalIndexTracker === 0;
        document.getElementById('nextBtn').disabled = modalIndexTracker === pState.mediaOnly.length - 1;
        document.getElementById('prevBtn').onclick = () => openFullMediaModal(paneId, modalIndexTracker - 1);
        document.getElementById('nextBtn').onclick = () => openFullMediaModal(paneId, modalIndexTracker + 1);
        imgModal.style.display = 'flex';
    }

    document.getElementById('closeBtn').onclick = () => { 
        imgModal.style.display = 'none'; 
        modalImg.removeAttribute('src'); 
        modalVid.pause(); modalVid.removeAttribute('src'); modalVid.load();
        modalUnsupported.style.display = 'none';
        modalItem = null;
    };

    // ---------- Rubber-band selection ----------
    splitContainer.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; 
        if (e.target.closest('.item-card') || e.target.closest('.action-bar') || e.target.closest('.pagination') || e.target.closest('.pane-header') || e.target.closest('.pane-status')) return;
        contextMenu.style.display = 'none';
        isDragging = true; startX = e.clientX; startY = e.clientY; dragPaneId = activePane;
        selectionBox.style.left = startX + 'px'; selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px'; selectionBox.style.height = '0px'; selectionBox.style.display = 'block';
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) clearSelection(activePane);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const left = Math.min(startX, e.clientX), top = Math.min(startY, e.clientY);
        const width = Math.abs(e.clientX - startX), height = Math.abs(e.clientY - startY);
        selectionBox.style.left = left + 'px'; selectionBox.style.top = top + 'px';
        selectionBox.style.width = width + 'px'; selectionBox.style.height = height + 'px';
        
        const boxRect = selectionBox.getBoundingClientRect();
        const sel = panes[dragPaneId].selected;
        let changed = false;
        document.querySelectorAll(`#imageGrid-${dragPaneId} .item-card`).forEach((card, i) => {
            const cardRect = card.getBoundingClientRect();
            const isIntersecting = !(boxRect.right < cardRect.left || boxRect.left > cardRect.right || boxRect.bottom < cardRect.top || boxRect.top > cardRect.bottom);
            const p = card.dataset.path;
            if (isIntersecting) {
                if (!sel.has(p)) { sel.add(p); card.classList.add('selected'); changed = true; }
                panes[dragPaneId].lastIndex = i;
            } else if (!e.ctrlKey && !e.shiftKey && sel.has(p)) {
                sel.delete(p); card.classList.remove('selected'); changed = true;
            }
        });
        if (changed) updateActionBar(); // once per move event instead of once per card
    });
    
    document.addEventListener('mouseup', () => { if (isDragging) { isDragging = false; selectionBox.style.display = 'none'; } });
    document.addEventListener('click', (e) => { if (!e.target.closest('#contextMenu')) contextMenu.style.display = 'none'; });

    function showContextMenu(mouseX, mouseY) {
        contextMenu.style.display = 'flex'; let x = mouseX, y = mouseY;
        if (x + contextMenu.offsetWidth > window.innerWidth) x = window.innerWidth - contextMenu.offsetWidth;
        if (y + contextMenu.offsetHeight > window.innerHeight) y = window.innerHeight - contextMenu.offsetHeight;
        contextMenu.style.left = `${x}px`; contextMenu.style.top = `${y}px`;
    }

    document.addEventListener('keydown', (e) => {
        if (imgModal.style.display === 'flex') {
            if (e.key === 'Escape') document.getElementById('closeBtn').click();
            if (e.key === 'ArrowLeft') document.getElementById('prevBtn').click();
            if (e.key === 'ArrowRight') document.getElementById('nextBtn').click();
        } else if (moveModal.style.display === 'flex') {
            if (e.key === 'Escape') document.getElementById('cancelMoveBtn').click();
        }
    });

    // ---------- Start ----------
    renderSidebar();
    fetchFiles('pane1');
    refreshDevices();
});