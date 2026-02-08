# 📱 QR Code Auto-Delete Feature

## 🎯 Overview

Fitur **QR Code Auto-Delete** secara otomatis menghapus device yang tidak melakukan scan QR code dalam waktu yang ditentukan. Ini membantu menjaga kebersihan database dan mencegah device "zombie" yang tidak pernah digunakan.

---

## ⚙️ Konfigurasi

### Environment Variable

Edit file `.env`:

```env
# QR Code Configuration
QR_SCAN_TIMEOUT=60  # Timeout dalam detik (default: 60)
```

**Nilai yang Disarankan:**

- **Development:** `120` (2 menit) - Lebih santai untuk testing
- **Production:** `60` (1 menit) - Standar, cukup waktu untuk scan
- **Strict:** `30` (30 detik) - Ketat, untuk environment yang terkontrol

---

## 🔄 Cara Kerja

### Flow Diagram

```
User menambah device baru
        │
        ▼
Device dibuat di database
        │
        ▼
WhatsApp session dimulai
        │
        ▼
QR Code ditampilkan
        │
        ├─► Timer dimulai (QR_SCAN_TIMEOUT)
        │
        ├─► Status: "scanning"
        │
        ▼
┌───────────────────────────┐
│   Apakah QR di-scan?      │
└───────┬───────────┬───────┘
        │           │
    YES │           │ NO (Timeout)
        │           │
        ▼           ▼
┌──────────────┐  ┌────────────────────┐
│ QR di-scan   │  │ Timeout tercapai   │
│ Timer di-    │  │ (60 detik)         │
│ cancel       │  └─────────┬──────────┘
│              │            │
│ Device       │            ▼
│ CONNECTED ✅ │  ┌────────────────────┐
└──────────────┘  │ Cek status device  │
                  │ Masih "scanning"?  │
                  └─────────┬──────────┘
                            │
                        YES │
                            ▼
                  ┌────────────────────┐
                  │ AUTO-DELETE        │
                  │ Device dihapus     │
                  │ dari database      │
                  └─────────┬──────────┘
                            │
                            ▼
                  ┌────────────────────┐
                  │ Emit event ke UI   │
                  │ "qr_timeout"       │
                  └────────────────────┘
```

---

## 📊 Detail Implementasi

### 1. Saat QR Code Ditampilkan

```javascript
// File: src/services/whatsappService.js

if (qr) {
    // Emit QR code ke frontend
    io.emit(`qr_code:${deviceId}`, qrCodeDataURL);
    
    // Update status ke "scanning"
    await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', 
        ['scanning', deviceId]);
    
    // Set timer untuk auto-delete
    setQRTimeout(deviceId);  // ⏰ Timer dimulai di sini
}
```

**Log Console:**

```
[device-01] QR Code emitted
[device-01] ⏰ QR timeout set: 60 seconds
```

---

### 2. Saat QR Code Berhasil Di-Scan

```javascript
// File: src/services/whatsappService.js

if (connection === 'open') {
    // Connection berhasil
    reconnectAttempts.delete(deviceId);
    clearQRTimeout(deviceId);  // ✅ Timer dibatalkan
    
    // Update status ke "connected"
    await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', 
        ['connected', deviceId]);
}
```

**Log Console:**

```
[device-01] ✅ Connection opened
[device-01] QR timeout cleared
```

---

### 3. Saat Timeout Tercapai (QR Tidak Di-Scan)

```javascript
// File: src/services/whatsappService.js

setTimeout(async () => {
    // Cek apakah device masih dalam status "scanning"
    const [rows] = await pool.query(
        'SELECT status FROM devices WHERE device_id = ?', 
        [deviceId]
    );
    
    if (rows.length > 0 && rows[0].status === 'scanning') {
        // Device masih scanning, hapus!
        await deleteDevice(deviceId);
        
        // Emit event ke frontend
        io.emit('qr_timeout', { 
            deviceId, 
            message: `Device ${deviceId} deleted: QR code not scanned within 60 seconds` 
        });
    }
}, QR_SCAN_TIMEOUT);
```

**Log Console:**

```
[device-01] ⏰ QR scan timeout! Auto-deleting device...
[device-01] 🗑️ Device and all session states deleted.
[device-01] ✅ Device auto-deleted due to QR timeout
```

---

## 🎨 Frontend Integration

### Socket.io Event Listener

Tambahkan listener di frontend untuk menangkap event `qr_timeout`:

```javascript
// File: public/index.html atau frontend app

socket.on('qr_timeout', (data) => {
    console.log('QR Timeout:', data);
    
    // Tampilkan notifikasi ke user
    alert(`⚠️ ${data.message}`);
    
    // Atau gunakan toast notification
    showToast('warning', data.message);
    
    // Refresh device list
    loadDevices();
});
```

---

## 📝 Use Cases

### Use Case 1: Normal Flow (QR Di-Scan Tepat Waktu)

**Scenario:** User menambah device dan langsung scan QR code.

**Timeline:**

```
00:00 - Device dibuat
00:01 - QR code ditampilkan, timer dimulai (60s)
00:05 - User scan QR code
00:06 - Device connected ✅
00:06 - Timer dibatalkan
```

**Result:** Device berhasil terhubung, tidak ada auto-delete.

---

### Use Case 2: Timeout (QR Tidak Di-Scan)

**Scenario:** User menambah device tapi lupa scan QR code.

**Timeline:**

```
00:00 - Device dibuat
00:01 - QR code ditampilkan, timer dimulai (60s)
01:01 - Timeout tercapai (60 detik)
01:01 - Device masih status "scanning"
01:01 - Auto-delete triggered ❌
01:01 - Device dihapus dari database
01:01 - Event "qr_timeout" dikirim ke frontend
```

**Result:** Device otomatis dihapus, user mendapat notifikasi.

---

### Use Case 3: Manual Delete Sebelum Timeout

**Scenario:** User menambah device, lalu manual delete sebelum timeout.

**Timeline:**

```
00:00 - Device dibuat
00:01 - QR code ditampilkan, timer dimulai (60s)
00:30 - User klik "Delete Device"
00:30 - Timer dibatalkan
00:30 - Device dihapus
```

**Result:** Device dihapus manual, timer otomatis dibatalkan.

---

## 🔧 Konfigurasi Lanjutan

### Menonaktifkan Auto-Delete

Jika Anda ingin menonaktifkan fitur auto-delete, set timeout yang sangat besar:

```env
QR_SCAN_TIMEOUT=999999  # ~11 hari, praktis tidak akan timeout
```

**Note:** Tidak disarankan untuk production karena dapat menyebabkan device "zombie".

---

### Mengubah Timeout Secara Dinamis

Saat ini timeout hanya bisa diubah melalui `.env` dan memerlukan restart aplikasi.

**Untuk mengubah:**

1. Edit `.env`
2. Restart aplikasi: `npm start`

**Future Enhancement:** Bisa ditambahkan API endpoint untuk mengubah timeout secara dinamis tanpa restart.

---

## 🚨 Troubleshooting

### Problem: Device dihapus terlalu cepat

**Cause:** Timeout terlalu pendek.

**Solution:**

```env
QR_SCAN_TIMEOUT=120  # Naikkan menjadi 2 menit
```

---

### Problem: Device tidak pernah dihapus otomatis

**Cause:** Timeout terlalu besar atau fitur tidak aktif.

**Solution:**

1. Cek `.env`: Pastikan `QR_SCAN_TIMEOUT` ada dan nilainya wajar (30-120)
2. Restart aplikasi
3. Cek console log: Harus ada log `⏰ QR timeout set: X seconds`

---

### Problem: Event `qr_timeout` tidak diterima di frontend

**Cause:** Socket.io listener belum ditambahkan.

**Solution:**

```javascript
// Tambahkan listener di frontend
socket.on('qr_timeout', (data) => {
    console.log('Device auto-deleted:', data);
    // Handle UI update
});
```

---

## 📊 Monitoring

### Console Logs

**Saat QR ditampilkan:**

```
[device-01] QR Code emitted
[device-01] ⏰ QR timeout set: 60 seconds
```

**Saat QR di-scan (success):**

```
[device-01] ✅ Connection opened
[device-01] QR timeout cleared
```

**Saat timeout (auto-delete):**

```
[device-01] ⏰ QR scan timeout! Auto-deleting device...
[device-01] 🗑️ Device and all session states deleted.
[device-01] ✅ Device auto-deleted due to QR timeout
```

**Saat device sudah connected sebelum timeout:**

```
[device-01] Device no longer in scanning state, skipping auto-delete
```

---

## 🎯 Best Practices

### 1. Set Timeout yang Wajar

```env
# ❌ Terlalu pendek (user tidak sempat scan)
QR_SCAN_TIMEOUT=10

# ✅ Wajar untuk production
QR_SCAN_TIMEOUT=60

# ✅ Lebih santai untuk development
QR_SCAN_TIMEOUT=120
```

---

### 2. Tampilkan Countdown di Frontend

Beri tahu user berapa waktu tersisa untuk scan QR:

```javascript
let countdown = 60; // Sesuaikan dengan QR_SCAN_TIMEOUT

const timer = setInterval(() => {
    countdown--;
    document.getElementById('countdown').textContent = 
        `Scan QR dalam ${countdown} detik`;
    
    if (countdown <= 0) {
        clearInterval(timer);
        document.getElementById('countdown').textContent = 
            'QR code expired!';
    }
}, 1000);

// Clear timer saat device connected
socket.on('device_status', (data) => {
    if (data.status === 'connected') {
        clearInterval(timer);
    }
});
```

---

### 3. Notifikasi User

Tampilkan notifikasi saat device auto-deleted:

```javascript
socket.on('qr_timeout', (data) => {
    // Toast notification
    Swal.fire({
        icon: 'warning',
        title: 'Device Auto-Deleted',
        text: data.message,
        timer: 5000
    });
    
    // Refresh device list
    loadDevices();
});
```

---

## 📈 Statistics & Metrics

### Tracking Auto-Deletes

Untuk monitoring, Anda bisa menambahkan logging ke database:

```javascript
// Optional: Log auto-delete events
await pool.query(
    'INSERT INTO device_logs (device_id, event, reason, timestamp) VALUES (?, ?, ?, NOW())',
    [deviceId, 'auto_deleted', 'qr_timeout']
);
```

---

## 🔐 Security Benefits

### 1. Prevent Device Spam

Tanpa auto-delete, user bisa membuat banyak device yang tidak pernah digunakan, memenuhi database.

### 2. Clean Database

Auto-delete memastikan hanya device yang benar-benar digunakan yang tersimpan di database.

### 3. Resource Management

Mengurangi beban server dengan menghapus session yang tidak aktif.

---

## 📚 Summary

### Fitur Utama

✅ Auto-delete device jika QR tidak di-scan dalam waktu tertentu  
✅ Konfigurasi timeout via environment variable  
✅ Timer otomatis dibatalkan saat device connected  
✅ Event notification ke frontend  
✅ Console logging untuk monitoring  
✅ Cleanup menyeluruh (database + session)  

### Files Modified

- `.env` - Tambah `QR_SCAN_TIMEOUT`
- `.env.example` - Tambah `QR_SCAN_TIMEOUT`
- `src/services/whatsappService.js` - Implementasi auto-delete logic
- `API_DOCS.md` - Dokumentasi konfigurasi

### Files Created

- `QR_AUTO_DELETE_GUIDE.md` - Panduan lengkap (this file)

---

**Fitur siap digunakan! 🚀**

**Default:** Device akan otomatis dihapus jika QR code tidak di-scan dalam **60 detik**.

Untuk mengubah timeout, edit `.env`:

```env
QR_SCAN_TIMEOUT=120  # 2 menit
```

**Happy Scanning! 📱**
