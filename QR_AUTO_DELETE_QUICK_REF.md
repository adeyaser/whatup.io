# 📱 QR Auto-Delete - Quick Reference

## 🎯 Fitur

Device akan **otomatis dihapus** jika QR code tidak di-scan dalam **60 detik** (default).

---

## ⚙️ Konfigurasi

### File: `.env`

```env
QR_SCAN_TIMEOUT=60  # Timeout dalam detik
```

**Nilai yang Disarankan:**

- Development: `120` (2 menit)
- Production: `60` (1 menit)
- Strict: `30` (30 detik)

---

## 🔄 Cara Kerja

```
Add Device → QR Displayed → Timer Started (60s)
                    │
                    ├─► QR Scanned? → YES → Connected ✅
                    │
                    └─► QR Scanned? → NO → Auto-Delete ❌
```

---

## 🧪 Testing

### Demo Page

```
http://localhost:3000/qr-demo.html
```

### Test Scenario

1. Klik "Add New Device"
2. QR code muncul + countdown dimulai
3. **Option A:** Scan QR → Device connected ✅
4. **Option B:** Tunggu 60s → Device auto-deleted ❌

---

## 📊 Console Logs

**Success (QR di-scan):**

```
[device-01] QR Code emitted
[device-01] ⏰ QR timeout set: 60 seconds
[device-01] ✅ Connection opened
[device-01] QR timeout cleared
```

**Timeout (QR tidak di-scan):**

```
[device-01] QR Code emitted
[device-01] ⏰ QR timeout set: 60 seconds
[device-01] ⏰ QR scan timeout! Auto-deleting device...
[device-01] ✅ Device auto-deleted due to QR timeout
```

---

## 🎨 Frontend Integration

### Socket.io Event Listener

```javascript
socket.on('qr_timeout', (data) => {
    alert(`⚠️ ${data.message}`);
    // Refresh device list
    loadDevices();
});
```

### Countdown Timer

```javascript
let countdown = 60; // Match QR_SCAN_TIMEOUT

const timer = setInterval(() => {
    countdown--;
    document.getElementById('countdown').textContent = countdown;
    
    if (countdown <= 0) clearInterval(timer);
}, 1000);

// Clear when connected
socket.on('device_status', (data) => {
    if (data.status === 'connected') {
        clearInterval(timer);
    }
});
```

---

## 🚨 Troubleshooting

### Device dihapus terlalu cepat?

```env
QR_SCAN_TIMEOUT=120  # Naikkan timeout
```

### Device tidak pernah dihapus?

1. Cek `.env`: Pastikan `QR_SCAN_TIMEOUT` ada
2. Restart aplikasi
3. Cek console log

---

## 📚 Dokumentasi Lengkap

- **QR_AUTO_DELETE_GUIDE.md** - Panduan lengkap
- **QR_AUTO_DELETE_SUMMARY.md** - Summary detail
- **qr-demo.html** - Demo page

---

**Default: Device auto-delete dalam 60 detik jika QR tidak di-scan! ⏰**
