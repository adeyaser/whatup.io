// Global Variables
window.copyToClipboard = function (btn, targetId) {
    const el = document.getElementById(targetId);
    const text = el.innerText || el.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.classList.add('copied');

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard');
    });
};

let currentGroupId = null;

// Toast Notification System
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || '🔔'}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Browser Notification System
async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
    }
}

function showBrowserNotification(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    new Notification(title, { body, icon: '/favicon.ico' });
}

// Initial permission request
requestNotificationPermission();

// Global Functions
window.saveGroup = async function () {
    const name = document.getElementById('new-group-name').value;
    const saveBtn = document.getElementById('save-group-btn');
    if (!name) return alert('Name required');
    try {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';
        await axios.post('/api/groups/create', { name });
        document.getElementById('create-group-modal').style.display = 'none';
        document.getElementById('new-group-name').value = '';
        loadGroups();
    } catch (e) {
        alert('Error creating group: ' + (e.response?.data?.message || e.message));
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save';
    }
};

window.addMember = async function () {
    console.log('addMember called, currentGroupId:', currentGroupId);
    const number = document.getElementById('new-member-number').value;
    const name = document.getElementById('new-member-name').value;
    const addBtn = document.getElementById('add-member-btn');

    console.log('Input values:', { number, name });

    if (!number) return alert('Phone number required');
    if (!currentGroupId) return alert('No group selected');

    try {
        addBtn.disabled = true;
        addBtn.innerText = 'Adding...';
        console.log('Sending request...');
        await axios.post('/api/groups/manage/add-member', { groupId: currentGroupId, number, name });
        console.log('Success!');
        document.getElementById('new-member-number').value = '';
        document.getElementById('new-member-name').value = '';
        loadMembers(currentGroupId);
        loadGroups();
    } catch (e) {
        console.error('Error:', e);
        alert('Error adding member: ' + (e.response?.data?.message || e.message));
    } finally {
        addBtn.disabled = false;
        addBtn.innerText = '+ Add Member';
    }
};

// Initialize Socket.io safely
let socket;
if (typeof io !== 'undefined') {
    socket = io();
} else {
    console.warn('Socket.io not loaded. Real-time updates will be unavailable.');
}

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Redirect if not logged in
if (!token) {
    window.location.href = '/login.html';
}

document.getElementById('user-info').textContent = user.username || 'User';

// Axios Config
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
axios.interceptors.response.use(response => response, error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        window.location.href = '/login.html';
    }
    return Promise.reject(error);
});

// State
let allDevices = [];
let currentDeviceId = null;

// UI Elements
const socketStatusDot = document.querySelector('.status-dot');
const socketStatusText = document.getElementById('socket-status');
const waStatusBadge = document.getElementById('wa-status');
const qrContainer = document.getElementById('qr-container');
const qrImage = document.getElementById('qr-image');
const deviceListEl = document.getElementById('device-list');
const currentDeviceNameEl = document.getElementById('current-device-name');
const currentDeviceIdEl = document.getElementById('current-device-id');
const deleteDeviceBtn = document.getElementById('delete-device-btn');
const deviceSelect = document.getElementById('device-select');
const logsContainer = document.getElementById('logs-container');
const logoutBtn = document.getElementById('logout-btn');





// Socket Global Events
if (socket) {
    socket.on('connect', () => {
        socketStatusDot.classList.add('connected');
        socketStatusText.textContent = 'Socket: Connected';
    });

    socket.on('disconnect', () => {
        socketStatusDot.classList.remove('connected');
        socketStatusText.textContent = 'Socket: Disconnected';
    });
}

// Device List Management
async function loadDevices() {
    try {
        const res = await axios.get('/api/devices');
        if (res.data.status) {
            allDevices = res.data.data;
            renderDeviceList(allDevices);
            updateDeviceSelect(allDevices);
        }
    } catch (e) {
        console.error('Failed to load devices', e);
    }
}

function renderDeviceList(devices) {
    deviceListEl.innerHTML = '';
    devices.forEach(d => {
        const div = document.createElement('div');
        div.className = `menu-item device-item ${currentDeviceId === d.device_id ? 'active' : ''}`;
        div.style.cursor = 'pointer';

        // Status icon dari response
        const statusIcon = d.statusIcon || (d.online ? '🟢' : '🔴');
        const statusLabel = d.statusLabel || d.status;
        const statusDisplay = `${statusIcon} ${statusLabel}`;

        div.innerHTML = `
            <span class="icon" style="font-size: 0.9em; font-weight: bold;">${statusIcon}</span> 
            <span style="flex: 1;">${d.name}</span>
            <span style="font-size: 0.7em; opacity: 0.7; display: flex; align-items: center; gap: 0.25rem; margin-left: 0.5rem; white-space: nowrap;">${statusLabel}</span>
        `;
        div.title = statusDisplay;
        div.onclick = () => selectDevice(d);
        deviceListEl.appendChild(div);
    });
}

function updateDeviceSelect(devices) {
    deviceSelect.innerHTML = '<option value="">Select a device...</option>';
    deviceSelect.disabled = !devices.length;
    devices.forEach(d => {
        const option = document.createElement('option');
        option.value = d.device_id;
        option.textContent = d.name;
        deviceSelect.appendChild(option);
    });
    if (currentDeviceId) {
        deviceSelect.value = currentDeviceId;
    } else {
        deviceSelect.value = "";
    }
}

function selectDevice(device) {
    currentDeviceId = device.device_id;
    currentDeviceNameEl.textContent = `(${device.name})`;
    if (currentDeviceIdEl) currentDeviceIdEl.textContent = `ID: ${device.device_id}`;
    deleteDeviceBtn.style.display = 'inline-block';

    // Update UI for this device status
    updateStatusUI(device.status, device);

    // Refresh list highlighting
    loadDevices();

    // Request QR or Status via Socket? 
    // Actually we listen to specific events.
    setupDeviceListeners(device.device_id);

    // Clear QR area
    qrImage.style.display = 'none';
    qrContainer.querySelector('.placeholder').style.display = 'block';
    qrContainer.querySelector('.placeholder').textContent = device.status === 'connected' ? 'Device Connected' : 'Waiting for Updates...';
}

function updateStatusUI(status, device = null) {
    waStatusBadge.textContent = `Status: ${status}`;

    // Refresh elements in case they were lost or re-rendered
    const currentQrContainer = document.getElementById('qr-container');
    const currentQrImage = document.getElementById('qr-image');
    const placeholder = currentQrContainer ? currentQrContainer.querySelector('.placeholder') : null;

    // Status configuration
    const statusConfig = {
        'connected': { icon: '🟢', color: '#22c55e', bgColor: '#f0fdf4', borderColor: '#22c55e' },
        'disconnected': { icon: '🔴', color: '#ef4444', bgColor: '#fef2f2', borderColor: '#ef4444' },
        'scanning': { icon: '🔵', color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#3b82f6' },
        'connecting': { icon: '🟡', color: '#eab308', bgColor: '#fefce8', borderColor: '#eab308' }
    };

    const config = statusConfig[status] || statusConfig['disconnected'];
    waStatusBadge.style.color = config.color;

    // Handle QR Area display without breaking references
    if (currentQrContainer) {
        if (status === 'connected') {
            if (placeholder) {
                placeholder.innerHTML = '<div style="color: green; font-size: 3rem;">✔</div><p>Device Connected</p>';
                placeholder.style.display = 'block';
            }
            if (currentQrImage) currentQrImage.style.display = 'none';
        } else if (status === 'scanning') {
            if (placeholder) placeholder.style.display = 'none';
            if (currentQrImage) currentQrImage.style.display = 'block';
        } else {
            if (placeholder) {
                placeholder.textContent = status === 'connecting' ? 'Connecting...' : 'Device Disconnected';
                placeholder.style.display = 'block';
            }
            if (currentQrImage) currentQrImage.style.display = 'none';
        }
    }

    // Update connection badge
    const badge = document.getElementById('connection-status-badge');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const deviceNameBadge = document.getElementById('device-name-badge');

    if (badge && status !== 'disconnected' && status !== 'connecting' && status !== 'Unknown') {
        statusIcon.textContent = config.icon;
        statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        statusText.style.color = config.color;

        if (device) {
            deviceNameBadge.textContent = device.name;
        }

        badge.style.backgroundColor = config.bgColor;
        badge.style.borderColor = config.borderColor;
        badge.style.display = 'block';
    } else if (badge) {
        badge.style.display = 'none';
    }
}

let deviceStatusCache = {}; // Track last known status per device

function setupDeviceListeners(deviceId) {
    if (!socket) return;

    // Clean up old listeners
    socket.off(`qr_code:${deviceId}`);

    socket.on(`qr_code:${deviceId}`, (url) => {
        if (currentDeviceId !== deviceId) return;
        const currentQrImage = document.getElementById('qr-image');
        const placeholder = document.querySelector('#qr-container .placeholder');

        if (currentQrImage) {
            currentQrImage.src = url;
            currentQrImage.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';

        updateStatusUI('scanning');
    });
}

if (socket) {
    socket.on('device_status', async (data) => {
        // Check if status actually changed for this device
        const lastStatus = deviceStatusCache[data.deviceId];
        const statusChanged = lastStatus !== data.status;

        // Update cache
        deviceStatusCache[data.deviceId] = data.status;

        // Reload list to update status icons and ensure allDevices is current
        await loadDevices();

        if (currentDeviceId === data.deviceId) {
            // Find current device in our local list to get the manual name
            const device = allDevices.find(d => d.device_id === data.deviceId);
            updateStatusUI(data.status, device);

            // Only show toast if status actually changed
            if (statusChanged) {
                showToast('Device Status', `Device is now ${data.status}`, data.status === 'connected' ? 'success' : 'warning');
            }
        }
    });
}

if (socket) {
    socket.on('new_message', (msg) => {
        addLogEntry(msg, 'received');
        const recvCountEl = document.getElementById('recv-count');
        if (recvCountEl) {
            recvCountEl.textContent = parseInt(recvCountEl.textContent) + 1;
        }

        showToast('New Message', `From: ${msg.from}\n${msg.message}`, 'info');
        showBrowserNotification(`New Message from ${msg.from}`, msg.message);
    });

    socket.on('device_deleted', (id) => {
        if (currentDeviceId === id) {
            currentDeviceId = null;
            currentDeviceNameEl.textContent = '(Select a device)';
            if (currentDeviceIdEl) currentDeviceIdEl.textContent = 'ID: -';
            qrContainer.innerHTML = '<div class="placeholder">Select a device</div><img id="qr-image" style="display:none;">';
            deleteDeviceBtn.style.display = 'none';
            updateStatusUI('Unknown');
        }
        loadDevices();
    });
}

async function loadLogs() {
    try {
        const res = await axios.get('/api/logs');
        if (res.data.status) {
            logsContainer.innerHTML = '';
            if (res.data.data.length === 0) {
                logsContainer.innerHTML = '<div class="log-entry placeholder">No logs found...</div>';
                return;
            }
            res.data.data.forEach(log => {
                const direction = log.direction === 'OUT' ? 'sent' : 'received';
                const data = {
                    deviceId: log.device_id,
                    to: log.remote_jid,
                    from: log.remote_jid,
                    message: log.content,
                    timestamp: log.created_at
                };
                // Reuse existing addLogEntry logic but without the prepend loop (we'll just append them)
                const div = document.createElement('div');
                div.classList.add('log-entry', direction);
                const time = new Date(data.timestamp).toLocaleTimeString();
                const deviceTag = data.deviceId ? `<span style="font-size:0.7em; background:#eee; padding:2px 4px; border-radius:4px; margin-right:5px;">${data.deviceId}</span>` : '';

                div.innerHTML = `
                    <div>
                        ${deviceTag}
                        <strong>${direction === 'sent' ? 'To: ' + data.to : 'From: ' + data.from}</strong><br>
                        <span style="font-size: 0.9em;">${data.message}</span>
                    </div>
                    <div style="font-size: 0.8em; color: gray;">
                        ${time}
                    </div>
                `;
                logsContainer.appendChild(div);
            });
        }
    } catch (e) {
        console.error('Failed to load logs', e);
        logsContainer.innerHTML = '<div class="log-entry placeholder">Error loading logs...</div>';
    }
}

// Logs
function addLogEntry(data, direction) {
    const div = document.createElement('div');
    div.classList.add('log-entry', direction);
    const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

    // Show device tag if multi-device
    const deviceTag = data.deviceId ? `<span style="font-size:0.7em; background:#eee; padding:2px 4px; border-radius:4px; margin-right:5px;">${data.deviceId}</span>` : '';

    div.innerHTML = `
        <div>
            ${deviceTag}
            <strong>${direction === 'sent' ? 'To: ' + data.to : 'From: ' + data.from}</strong><br>
            <span style="font-size: 0.9em;">${data.message}</span>
        </div>
        <div style="font-size: 0.8em; color: gray;">
            ${time}
        </div>
    `;
    if (logsContainer.querySelector('.placeholder')) {
        logsContainer.innerHTML = '';
    }
    logsContainer.prepend(div);
}

// Add Device Modal
const modal = document.getElementById('modal-overlay');
const addBtn = document.getElementById('add-device-btn');
const cancelBtn = document.getElementById('cancel-add-btn');
const confirmBtn = document.getElementById('confirm-add-btn');

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
});

addBtn.onclick = () => {
    // show modal with animation class
    modal.classList.add('open');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    // Auto-generate unique ID
    const randomId = 'dev_' + Math.random().toString(16).slice(2, 10);
    document.getElementById('new-device-id').value = randomId;
    document.getElementById('new-device-name').value = '';

    // Focus the name field instead, since ID is already filled
    setTimeout(() => document.getElementById('new-device-name').focus(), 50);
};

cancelBtn.onclick = () => {
    modal.classList.remove('open');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }, 220);
};

// Close button (top-right)
const modalCloseBtn = document.getElementById('modal-close-btn');
if (modalCloseBtn) modalCloseBtn.onclick = () => {
    modal.classList.remove('open');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }, 220);
};

confirmBtn.onclick = async () => {
    const id = document.getElementById('new-device-id').value;
    const name = document.getElementById('new-device-name').value;
    if (!id) return alert('Device ID is required');

    try {
        const res = await axios.post('/api/device/add', { deviceId: id, name });
        if (res.data.status) {
            modal.style.display = 'none';
            loadDevices();
            alert('Device created! Select it to scan QR.');
        }
    } catch (e) {
        alert('Error: ' + (e.response?.data?.message || e.message));
    }
};

deleteDeviceBtn.onclick = async () => {
    if (!currentDeviceId || !confirm('Are you sure you want to delete this device?')) return;
    try {
        await axios.post('/api/device/delete', { deviceId: currentDeviceId });
    } catch (e) {
        alert('Error deleting');
    }
};


// Load Groups
async function loadGroups() {
    try {
        const res = await axios.get('/api/groups');
        if (res.data.status) {
            renderGroupsTable(res.data.data);
            renderGroupSelect(res.data.data);
        }
    } catch (e) {
        alert('Error loading groups: ' + e.message);
        console.error('Error loading groups', e);
    }
}

function renderGroupsTable(groups) {
    const tbody = document.getElementById('groups-table-body');
    if (!tbody) {
        console.error('groups-table-body element not found in DOM');
        return;
    }
    tbody.innerHTML = '';
    groups.forEach(g => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        tr.innerHTML = `
            <td style="padding: 0.75rem;">${g.name}</td>
            <td style="padding: 0.75rem;">${g.member_count} members</td>
            <td style="padding: 0.75rem; text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                <button class="btn-secondary" onclick="openMembersModal(${g.id}, '${g.name}')" style="font-size: 0.8rem; padding: 0.4rem 0.75rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    Manage
                </button>
                <button onclick="deleteGroup(${g.id})" style="background: #fee2e2; color: #dc2626; border: none; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Delete Group">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (groups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:1rem; color:gray;">No groups found (Array Empty)</td></tr>';
    }
}

function renderGroupSelect(groups) {
    const contactGroupSelect = document.getElementById('contact-group-select');
    if (!contactGroupSelect) {
        // Element is optional, silently return if not present
        return;
    }
    contactGroupSelect.innerHTML = '<option value="">Select a Group...</option>';
    groups.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = `${g.name} (${g.member_count} members)`;
        contactGroupSelect.appendChild(option);
    });
}

// Create Group
// Create Group (Removed Legacy Listener)

// --- Event Delegation for Modals ---
// --- Event Delegation for Modals ---
document.addEventListener('click', async (e) => {
    const target = e.target;
    // console.log('Click detected on:', target.tagName, target.id, target.className);

    // Add Member
    const addMemberBtn = target.closest('#add-member-btn');
    if (addMemberBtn) {
        console.log('Add Member button clicked!', { currentGroupId });
        e.preventDefault();
        const number = document.getElementById('new-member-number').value;
        const name = document.getElementById('new-member-name').value;
        console.log('Input values:', { number, name });
        if (!number) return alert('Number required');
        try {
            addMemberBtn.disabled = true;
            console.log('Sending request to add member...');
            await axios.post('/api/groups/manage/add-member', { groupId: currentGroupId, number, name });
            console.log('Member added successfully!');
            document.getElementById('new-member-number').value = '';
            document.getElementById('new-member-name').value = '';
            loadMembers(currentGroupId);
            loadGroups();
        } catch (e) {
            console.error('Error adding member:', e);
            alert('Error adding member: ' + (e.response?.data?.message || e.message));
        } finally {
            addMemberBtn.disabled = false;
        }
    }
});



// Helper Functions
window.deleteGroup = async function (id) {
    if (!confirm('Start deleting group?')) return;
    try {
        await axios.post('/api/groups/delete', { id });
        loadGroups();
    } catch (e) {
        alert('Error deleting group: ' + e.message);
    }
};

// Manage Members
window.openMembersModal = async function (id, name) {
    currentGroupId = id;
    const titleEl = document.getElementById('members-modal-title');
    if (titleEl) titleEl.textContent = `Members of ${name}`;

    const m = document.getElementById('members-modal');
    if (m) {
        m.classList.add('open');
        m.style.display = 'flex';
        m.setAttribute('aria-hidden', 'false');
    }
    loadMembers(id);
};

window.loadMembers = async function (groupId) {
    const tbody = document.getElementById('members-table-body');
    if (!tbody) return;

    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#members-table')) {
        $('#members-table').DataTable().destroy();
    }

    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #94a3b8;">Loading members...</td></tr>';

    try {
        const res = await axios.get(`/api/groups/${groupId}/members`);

        if (res.data.status && Array.isArray(res.data.data)) {
            tbody.innerHTML = '';
            if (res.data.data.length === 0) {
                // tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #94a3b8;">No members yet. Add your first member above! 👆</td></tr>';
                // DataTable handles empty state, just leave empty
            } else {
                res.data.data.forEach(m => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding: 1rem; font-weight: 500; color: #1e293b;">
                            <span style="background: #eff6ff; color: #3b82f6; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.9rem;">
                                ${m.number}
                            </span>
                        </td>
                        <td style="padding: 1rem; color: #64748b;">${m.name || '<em style="color: #cbd5e1;">No name</em>'}</td>
                        <td style="padding: 1rem; text-align: right;">
                            <button onclick="removeMember(${m.id})" 
                                style="background: #fee2e2; color: #dc2626; border: none; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 1.2rem; transition: all 0.2s;"
                                title="Remove member">×</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            // Initialize DataTable
            $('#members-table').DataTable({
                responsive: true,
                autoWidth: false,
                paging: true,
                pageLength: 5,
                lengthMenu: [5, 10, 25, 50],
                language: {
                    emptyTable: "No members yet. Add your first member above! 👆"
                },
                columnDefs: [
                    { orderable: false, targets: 2 } // Disable sorting on Action column
                ]
            });

        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #ef4444;">Invalid response format</td></tr>';
        }
    } catch (e) {
        console.error('loadMembers error:', e);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #ef4444;">Error: ${e.message}</td></tr>`;
    }
};

window.closeMembersModal = function () {
    const m = document.getElementById('members-modal');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => {
        m.style.display = 'none';
    }, 200);
};

window.removeMember = async function (id) {
    if (!confirm('Remove this member?')) return;
    try {
        await axios.post('/api/groups/manage/remove-member', { id });
        loadMembers(currentGroupId);
        loadGroups(); // Update count
    } catch (e) {
        alert('Error removing member: ' + (e.response?.data?.message || e.message));
    }
};

// --- Send Message Features ---
async function populateGroupSelect(selectElement) {
    if (!selectElement) return;
    try {
        const res = await axios.get('/api/groups');
        if (res.data.status) {
            selectElement.innerHTML = '<option value="">Select a group...</option>';
            res.data.data.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = `${g.name} (${g.member_count} members)`;
                selectElement.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Failed to load groups for select', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI Elements
    const socketStatusDot = document.querySelector('.status-dot');
    const socketStatusText = document.getElementById('socket-status');
    const waStatusBadge = document.getElementById('wa-status');
    const qrContainer = document.getElementById('qr-container');
    const qrImage = document.getElementById('qr-image');
    const deviceListEl = document.getElementById('device-list');
    const currentDeviceNameEl = document.getElementById('current-device-name');
    const currentDeviceIdEl = document.getElementById('current-device-id');
    const deleteDeviceBtn = document.getElementById('delete-device-btn');
    const deviceSelect = document.getElementById('device-select');
    const logsContainer = document.getElementById('logs-container');
    const logoutBtn = document.getElementById('logout-btn');

    // Navigation View Elements
    const menuItems = document.querySelectorAll('.menu-item');
    const views = document.querySelectorAll('.view');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const addDeviceBtn = document.getElementById('add-device-btn');

    // Message Form Elements
    const messageForm = document.getElementById('message-form');
    const recTypeSelect = document.getElementById('recipient-type');
    const phInputGroup = document.getElementById('phone-input-group');
    const grInputGroup = document.getElementById('group-input-group');
    const grSelect = document.getElementById('group-select');
    const phInput = document.getElementById('phone');
    const mTypeSelect = document.getElementById('msg-type');
    const uGrp = document.getElementById('url-group');
    const mUrlInput = document.getElementById('media-url');
    const sendBtn = messageForm ? messageForm.querySelector('button[type="submit"]') : null;

    console.log('App Initialization started...');

    // Sidebar Functions
    function toggleSidebar() {
        sidebar?.classList.toggle('show');
        sidebarOverlay?.classList.toggle('show');
    }

    function closeSidebar() {
        sidebar?.classList.remove('show');
        sidebarOverlay?.classList.remove('show');
    }

    // Toggle Listeners
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    if (addDeviceBtn) addDeviceBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
    });

    // Navigation Menu
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (window.innerWidth <= 768) closeSidebar();

            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            views.forEach(v => {
                v.classList.remove('active');
                if (v.id === target) v.classList.add('active');
            });

            if (target === 'groups') loadGroups();
            else if (target === 'logs') loadLogs();
        });
    });

    // Logout
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });

    // Device Select Sync
    if (deviceSelect) {
        deviceSelect.addEventListener('change', () => {
            const deviceId = deviceSelect.value;
            if (!deviceId) {
                // Handle de-selection if needed
                currentDeviceId = null;
                currentDeviceNameEl.textContent = '(Select a device)';
                if (currentDeviceIdEl) currentDeviceIdEl.textContent = 'ID: -';
                deleteDeviceBtn.style.display = 'none';
                updateStatusUI('Unknown');
                qrContainer.innerHTML = '<div class="placeholder">Select a device</div><img id="qr-image" style="display:none;">';
                return;
            }
            const device = allDevices.find(d => d.device_id === deviceId);
            if (device) {
                selectDevice(device);
            }
        });
    }

    function handleRecipientTypeChange() {
        console.log('Recipient type changed to:', recTypeSelect?.value);
        if (!recTypeSelect) return;
        if (recTypeSelect.value === 'group') {
            phInputGroup.style.display = 'none';
            grInputGroup.style.display = 'block';
            phInput.required = false;
            grSelect.required = true;
            populateGroupSelect(grSelect);
        } else {
            phInputGroup.style.display = 'block';
            grInputGroup.style.display = 'none';
            phInput.required = true;
            grSelect.required = false;
        }
    }

    function handleMessageTypeChange() {
        if (!mTypeSelect) return;
        if (mTypeSelect.value === 'text') {
            uGrp.style.display = 'none';
            mUrlInput.required = false;
        } else {
            uGrp.style.display = 'block';
            mUrlInput.required = true;
        }
    }

    if (recTypeSelect) {
        recTypeSelect.addEventListener('change', handleRecipientTypeChange);
        handleRecipientTypeChange(); // Initial state
    }

    if (mTypeSelect) {
        mTypeSelect.addEventListener('change', handleMessageTypeChange);
        handleMessageTypeChange(); // Initial state
    }

    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentDeviceId) return alert('Please select a device first!');

            const isGroup = recTypeSelect.value === 'group';
            const type = mTypeSelect.value;
            const message = document.getElementById('message').value;
            const mediaUrl = mUrlInput.value;

            const payload = {
                deviceId: currentDeviceId,
                message: message
            };

            let endpoint = '/api/send-message';

            if (isGroup) {
                endpoint = '/api/groups/send-bulk';
                payload.groupId = grSelect.value;
                if (!payload.groupId) return alert('Please select a contact group');
            } else {
                payload.number = phInput.value;
                if (!payload.number) return alert('Please enter a phone number');
                if (type !== 'text') endpoint = '/api/send-media';
            }

            if (type !== 'text') {
                payload.type = type;
                payload.url = mediaUrl;
                payload.caption = message;
            }

            try {
                const res = await axios.post(endpoint, payload);
                if (res.data.status) {
                    alert(isGroup ? 'Bulk sending started in background!' : 'Message Sent!');
                    if (!isGroup) {
                        addLogEntry({
                            deviceId: currentDeviceId,
                            to: payload.number,
                            message: type === 'text' ? message : `[${type.toUpperCase()}] ${message}`
                        }, 'sent');

                        const sentCountEl = document.getElementById('sent-count');
                        if (sentCountEl) {
                            sentCountEl.textContent = parseInt(sentCountEl.textContent) + 1;
                        }
                    }
                    messageForm.reset();
                    handleRecipientTypeChange();
                    handleMessageTypeChange();
                }
            } catch (err) {
                alert('Failed to send: ' + (err.response?.data?.message || err.message));
            }
        });
    }










    // Initialize Group View
    const groupsLink = document.querySelector('a[data-target="groups"]');
    if (groupsLink) {
        groupsLink.addEventListener('click', loadGroups);
    }

    // Init
    loadDevices();
});

