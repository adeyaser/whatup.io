# ⚠️ QR Auto-Delete - IMPORTANT UPDATE

## 🎯 Perubahan Penting

### **Auto-Delete HANYA untuk Device Baru!**

Fitur auto-delete telah diupdate untuk **HANYA menghapus device baru** yang belum pernah scan QR code sebelumnya.

---

## 📋 Aturan Auto-Delete

### ✅ **Device yang AKAN di-delete:**

- Device **BARU** yang baru saja dibuat
- Belum pernah scan QR code sebelumnya
- Tidak memiliki session data di database
- QR code tidak di-scan dalam waktu timeout (default: 60 detik)

### ❌ **Device yang TIDAK AKAN di-delete:**

- Device **LAMA** yang sudah pernah connected sebelumnya
- Device yang sudah pernah scan QR code (meskipun sekarang disconnect)
- Device yang sedang reconnecting setelah restart server
- Device yang memiliki session data di database

---

## 🔍 Cara Kerja Deteksi

### **System mengecek 2 hal:**

1. **Status Device** - Apakah masih dalam status 'scanning'?
2. **Session Data** - Apakah device pernah connected sebelumnya?

```javascript
// Pseudocode
if (timeout_reached) {
    // Cek session data
    hasSessionData = check_wa_sessions_table(deviceId);
    
    if (hasSessionData) {
        // Device pernah connected sebelumnya
        console.log("Device lama, SKIP auto-delete");
        return; // TIDAK delete
    }
    
    // Device baru, cek status
    if (device.status === 'scanning') {
        console.log("Device baru, QR tidak di-scan, DELETE");
        deleteDevice(deviceId); // DELETE
    }
}
```

---

## 📊 Use Cases

### **Scenario 1: Device Baru - Auto-Delete** ✅

```
00:00 - User membuat device baru "dev_abc123"
00:01 - QR code ditampilkan
00:01 - Timer dimulai (60 detik)
01:01 - Timeout! Cek session data...
01:01 - Session data: TIDAK ADA (device baru)
01:01 - Status: scanning
01:01 - ✅ Device AUTO-DELETED
```

**Result:** Device dihapus otomatis

---

### **Scenario 2: Device Lama Reconnecting - TIDAK Auto-Delete** ❌

```
00:00 - Device "dev_old456" sudah pernah connected kemarin
00:01 - Server restart, device reconnecting
00:02 - QR code ditampilkan
00:02 - Timer dimulai (60 detik)
01:02 - Timeout! Cek session data...
01:02 - Session data: ADA (device pernah connected)
01:02 - ❌ SKIP auto-delete (device lama)
```

**Result:** Device TIDAK dihapus

---

### **Scenario 3: Device Logout Manual - TIDAK Auto-Delete** ❌

```
Kemarin:
- Device "dev_work789" sudah pernah scan QR
- Device connected dan digunakan

Hari ini:
00:00 - User logout dari WhatsApp
00:01 - Device status: disconnected
00:02 - User coba connect lagi
00:03 - QR code ditampilkan
00:03 - Timer dimulai (60 detik)
01:03 - Timeout! Cek session data...
01:03 - Session data: ADA (device pernah connected kemarin)
01:03 - ❌ SKIP auto-delete (device lama)
```

**Result:** Device TIDAK dihapus

---

## 🔧 Technical Implementation

### **Database Check:**

```sql
-- Cek apakah device pernah connected
SELECT COUNT(*) as count 
FROM wa_sessions 
WHERE id LIKE 'deviceId_%';

-- Jika count > 0 → Device pernah connected
-- Jika count = 0 → Device baru
```

### **Logic Flow:**

```javascript
const setQRTimeout = (deviceId) => {
    const timer = setTimeout(async () => {
        // 1. Cek device status
        const device = await getDevice(deviceId);
        
        // 2. Cek session data
        const hasSessionData = await checkSessionData(deviceId);
        
        // 3. Decision
        if (hasSessionData) {
            console.log("Device lama, SKIP auto-delete");
            return; // TIDAK delete
        }
        
        if (device.status === 'scanning') {
            console.log("Device baru, DELETE");
            await deleteDevice(deviceId); // DELETE
        }
    }, timeout);
};
```

---

## 📝 Console Logs

### **Device Baru (Auto-Delete):**

```
[dev_abc123] ⏰ QR timeout set: 60 seconds
[dev_abc123] QR Code emitted
[dev_abc123] ⏰ QR scan timeout reached! Checking if device should be deleted...
[dev_abc123] ❌ Device is NEW and QR not scanned, proceeding with auto-delete...
[dev_abc123] 🗑️ Device and all session states deleted.
[dev_abc123] ✅ Device auto-deleted due to QR timeout
```

### **Device Lama (SKIP Auto-Delete):**

```
[dev_old456] ⏰ QR timeout set: 60 seconds
[dev_old456] QR Code emitted
[dev_old456] ⏰ QR scan timeout reached! Checking if device should be deleted...
[dev_old456] ⚠️ Device has previous session data, skipping auto-delete (device was connected before)
```

---

## ✅ Benefits

### **1. Mencegah Kehilangan Device Penting**

- Device yang sudah digunakan tidak akan hilang
- Session data tetap tersimpan

### **2. Cleanup Device Baru yang Tidak Terpakai**

- Device yang dibuat tapi tidak jadi digunakan akan dihapus
- Database tetap bersih

### **3. User Experience Lebih Baik**

- User tidak perlu khawatir device lama terhapus
- Hanya device baru yang benar-benar tidak terpakai yang dihapus

---

## 🚨 Important Notes

1. **Session Data = Indikator Device Pernah Connected**
   - Jika ada data di `wa_sessions` → Device pernah connected
   - Jika tidak ada → Device baru

2. **Auto-Delete Hanya untuk Device Baru**
   - Device yang sudah pernah scan QR **AMAN**
   - Device yang baru dibuat dan tidak di-scan **AKAN DIHAPUS**

3. **Timeout Tetap Berlaku**
   - Default: 60 detik
   - Configurable via `.env` (`QR_SCAN_TIMEOUT`)

---

## 🎯 Summary

| Kondisi | Session Data | Status | Auto-Delete? |
|---------|--------------|--------|--------------|
| Device baru, QR tidak di-scan | ❌ Tidak ada | scanning | ✅ **YA** |
| Device lama, reconnecting | ✅ Ada | scanning | ❌ **TIDAK** |
| Device lama, logout manual | ✅ Ada | scanning | ❌ **TIDAK** |
| Device baru, QR di-scan | ❌ Tidak ada | connected | ❌ **TIDAK** (timer cleared) |

---

**Kesimpulan:** Auto-delete **HANYA** menghapus device baru yang benar-benar tidak terpakai. Device yang sudah pernah digunakan **AMAN** dari auto-delete.
