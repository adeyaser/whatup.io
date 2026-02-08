# Summary: Fitur Scheduler Control

## 📋 Ringkasan Perubahan

Telah berhasil menambahkan fitur untuk **menonaktifkan dan mengaktifkan scheduler** secara dinamis dengan 3 cara:

1. **Environment Variable** (`.env`) - Auto-start control
2. **API Endpoints** - Manual start/stop via HTTP request
3. **Database Settings** - Processing control

---

## 🔧 File yang Dimodifikasi

### 1. `.env` dan `.env.example`

**Perubahan:**

- Menambahkan konfigurasi `SCHEDULER_ENABLED=true`

**Fungsi:**

- `true` = Scheduler otomatis start saat aplikasi launch
- `false` = Scheduler tidak auto-start, harus diaktifkan manual via API

---

### 2. `src/services/messageScheduler.js`

**Perubahan:**

- Menambahkan fungsi `startSchedulerManually()`
- Menambahkan fungsi `stopSchedulerManually()`
- Export kedua fungsi tersebut

**Fungsi:**

- Memungkinkan kontrol start/stop scheduler dari API
- Validasi status (cek apakah sudah running atau belum)
- Return response yang informatif

---

### 3. `src/routes/api.js`

**Perubahan:**

- Import `startSchedulerManually` dan `stopSchedulerManually`
- Menambahkan endpoint `POST /api/scheduler/start`
- Menambahkan endpoint `POST /api/scheduler/stop`

**Fungsi:**

- Endpoint untuk start scheduler secara manual
- Endpoint untuk stop scheduler secara manual
- Return status scheduler setelah operasi

---

### 4. `src/app.js`

**Perubahan:**

- Menambahkan pengecekan `process.env.SCHEDULER_ENABLED`
- Conditional start scheduler berdasarkan environment variable

**Fungsi:**

- Jika `SCHEDULER_ENABLED=true`, auto-start scheduler
- Jika `SCHEDULER_ENABLED=false`, skip auto-start
- Log informasi ke console untuk debugging

---

### 5. `API_DOCS.md`

**Perubahan:**

- Menambahkan dokumentasi environment variable `SCHEDULER_ENABLED`
- Menambahkan dokumentasi endpoint `/api/scheduler/start`
- Menambahkan dokumentasi endpoint `/api/scheduler/stop`
- Menambahkan contoh request dan response

**Fungsi:**

- Dokumentasi lengkap untuk developer
- Contoh penggunaan cURL
- Penjelasan response format

---

## 📄 File Baru yang Dibuat

### 1. `SCHEDULER_GUIDE.md`

**Isi:**

- Panduan lengkap penggunaan scheduler
- Penjelasan konfigurasi environment dan database
- Use cases dan best practices
- Troubleshooting guide
- Quick reference commands

**Target Audience:** Developer dan System Administrator

---

### 2. `public/scheduler-control.html`

**Isi:**

- UI Control Panel untuk mengelola scheduler
- Fitur: Start, Stop, Trigger, Refresh Status
- Form untuk update settings scheduler
- Real-time status display
- Modern design dengan gradient dan animasi

**Target Audience:** End User (Admin)

**Cara Akses:**

```
http://localhost:3000/scheduler-control.html
```

---

## 🎯 Fitur yang Ditambahkan

### 1. Environment Variable Control

```env
SCHEDULER_ENABLED=true   # Auto-start on app launch
SCHEDULER_ENABLED=false  # No auto-start, manual only
```

### 2. API Endpoints

#### Start Scheduler

```bash
POST /api/scheduler/start
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
    "status": true,
    "message": "Scheduler started successfully",
    "data": {
        "running": true,
        "isProcessing": false,
        "config": { ... }
    }
}
```

**Response (Already Running):**

```json
{
    "status": false,
    "message": "Scheduler is already running"
}
```

---

#### Stop Scheduler

```bash
POST /api/scheduler/stop
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
    "status": true,
    "message": "Scheduler stopped successfully",
    "data": {
        "running": false,
        "isProcessing": false,
        "config": { ... }
    }
}
```

**Response (Not Running):**

```json
{
    "status": false,
    "message": "Scheduler is not running"
}
```

---

### 3. Web UI Control Panel

**URL:** `http://localhost:3000/scheduler-control.html`

**Fitur:**

- ✅ Real-time status display (Running/Stopped)
- ✅ Start/Stop scheduler dengan 1 klik
- ✅ Trigger manual retry
- ✅ Refresh status
- ✅ Update scheduler settings (batch size, interval, dll)
- ✅ JWT token authentication
- ✅ Modern UI dengan animasi

---

## 📊 Cara Penggunaan

### Skenario 1: Development/Testing

**Goal:** Kontrol penuh kapan scheduler berjalan

**Steps:**

1. Edit `.env`: `SCHEDULER_ENABLED=false`
2. Restart aplikasi
3. Scheduler tidak auto-start
4. Gunakan API atau UI untuk start/stop sesuai kebutuhan

---

### Skenario 2: Production (Normal)

**Goal:** Scheduler selalu berjalan otomatis

**Steps:**

1. Edit `.env`: `SCHEDULER_ENABLED=true`
2. Restart aplikasi
3. Scheduler auto-start dan berjalan terus
4. Bisa di-stop sementara via API jika perlu maintenance

---

### Skenario 3: Maintenance Mode

**Goal:** Stop scheduler sementara untuk maintenance

**Steps:**

1. Stop via API:

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/stop \
   -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. Lakukan maintenance
3. Start kembali:

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/start \
   -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

### Skenario 4: Emergency Stop

**Goal:** Stop scheduler segera karena masalah

**Options:**

**A. Via API (Tercepat):**

```bash
curl -X POST http://localhost:3000/api/scheduler/stop \
-H "Authorization: Bearer YOUR_TOKEN"
```

**B. Via UI:**

1. Buka `http://localhost:3000/scheduler-control.html`
2. Klik tombol "Stop Scheduler"

**C. Via Environment (Permanent):**

1. Edit `.env`: `SCHEDULER_ENABLED=false`
2. Restart aplikasi

---

## 🔍 Monitoring

### Check Status via API

```bash
curl http://localhost:3000/api/scheduler/status \
-H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
    "status": true,
    "data": {
        "running": true,          // Scheduler interval aktif?
        "isProcessing": false,    // Sedang proses batch?
        "config": {
            "enabled": true,
            "batch_size": 5,
            "interval_minutes": 30,
            "min_delay_seconds": 30,
            "max_delay_seconds": 60,
            "max_retries": 3,
            "cooldown_minutes": 5
        }
    }
}
```

### Check via Console Logs

```
[App] Auto-starting scheduler (SCHEDULER_ENABLED=true)
[Scheduler] Started. Will retry up to 5 failed messages every 30 minutes.
[Scheduler] Starting retry cycle...
[Scheduler] Retry cycle complete.
```

---

## 🎨 UI Preview

**Scheduler Control Panel** (`scheduler-control.html`):

```
┌─────────────────────────────────────────┐
│  🎛️ Scheduler Control Panel            │
│  Kontrol Message Retry Scheduler        │
├─────────────────────────────────────────┤
│  JWT Token: [********************]      │
├─────────────────────────────────────────┤
│  📊 Status Scheduler                    │
│  ┌─────────┬──────────┬──────────┬────┐│
│  │🟢Running│ No       │ 30 min   │ 5  ││
│  │ Status  │Processing│ Interval │Batch││
│  └─────────┴──────────┴──────────┴────┘│
├─────────────────────────────────────────┤
│  [▶️ Start] [⏹️ Stop] [⚡Trigger] [🔄]  │
├─────────────────────────────────────────┤
│  ⚙️ Konfigurasi Scheduler               │
│  [Enabled ☑] [Batch: 5] [Interval: 30] │
│  [Min Delay: 30] [Max Delay: 60]       │
│  [Max Retries: 3] [Cooldown: 5]        │
│  [💾 Update Settings]                   │
└─────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Update Environment

```bash
# Edit .env
SCHEDULER_ENABLED=true  # atau false
```

### 2. Restart Aplikasi

```bash
npm start
```

### 3. Test via API

```bash
# Get status
curl http://localhost:3000/api/scheduler/status \
-H "Authorization: Bearer YOUR_TOKEN"

# Start scheduler
curl -X POST http://localhost:3000/api/scheduler/start \
-H "Authorization: Bearer YOUR_TOKEN"

# Stop scheduler
curl -X POST http://localhost:3000/api/scheduler/stop \
-H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test via UI

```
1. Buka browser: http://localhost:3000/scheduler-control.html
2. Masukkan JWT token
3. Klik tombol sesuai kebutuhan
```

---

## 📚 Dokumentasi

1. **API_DOCS.md** - API reference lengkap
2. **SCHEDULER_GUIDE.md** - Panduan lengkap scheduler
3. **scheduler-control.html** - UI control panel

---

## ✅ Testing Checklist

- [x] Environment variable `SCHEDULER_ENABLED` berfungsi
- [x] Endpoint `/api/scheduler/start` berfungsi
- [x] Endpoint `/api/scheduler/stop` berfungsi
- [x] Endpoint `/api/scheduler/status` menampilkan status yang benar
- [x] UI control panel dapat start/stop scheduler
- [x] Scheduler tidak auto-start jika `SCHEDULER_ENABLED=false`
- [x] Scheduler auto-start jika `SCHEDULER_ENABLED=true`
- [x] Validasi: tidak bisa start jika sudah running
- [x] Validasi: tidak bisa stop jika tidak running
- [x] Dokumentasi lengkap tersedia

---

## 🎉 Kesimpulan

Fitur scheduler control telah berhasil diimplementasikan dengan lengkap:

✅ **Environment Control** - Auto-start on/off via `.env`
✅ **API Control** - Start/Stop via HTTP request
✅ **UI Control** - User-friendly web interface
✅ **Dokumentasi Lengkap** - Guide dan API docs
✅ **Validasi** - Cek status sebelum operasi
✅ **Monitoring** - Real-time status display

**Siap digunakan untuk Production! 🚀**
