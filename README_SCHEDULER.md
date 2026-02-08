# 📱 WhatsApp Gateway - Scheduler Control Feature

## 🎯 Overview

Fitur **Scheduler Control** memungkinkan Anda untuk mengontrol **Message Retry Scheduler** dengan 3 cara:

1. **Environment Variable** - Auto-start control saat aplikasi launch
2. **API Endpoints** - Manual start/stop via HTTP request
3. **Web UI** - User-friendly control panel

---

## 🚀 Quick Start

### 1. Konfigurasi Environment

Edit file `.env`:

```env
# Scheduler Configuration
SCHEDULER_ENABLED=true   # Auto-start scheduler saat app launch
```

**Opsi:**

- `true` = Scheduler otomatis start (Production mode)
- `false` = Scheduler tidak auto-start (Development mode)

### 2. Restart Aplikasi

```bash
npm start
```

### 3. Akses Control Panel (Optional)

Buka browser:

```
http://localhost:3000/scheduler-control.html
```

---

## 📚 Dokumentasi

| File | Deskripsi |
|------|-----------|
| **SCHEDULER_QUICK_REF.md** | 📖 Quick reference guide |
| **SCHEDULER_GUIDE.md** | 📘 Panduan lengkap penggunaan |
| **SCHEDULER_CONTROL_SUMMARY.md** | 📋 Summary semua perubahan |
| **SCHEDULER_FLOW_DIAGRAM.md** | 📊 Visual flow diagram |
| **API_DOCS.md** | 🔌 API reference lengkap |

---

## 🎛️ Cara Menggunakan

### Option 1: Via Environment Variable

**Untuk Production (Auto-Start):**

```env
SCHEDULER_ENABLED=true
```

**Untuk Development (Manual Control):**

```env
SCHEDULER_ENABLED=false
```

Setelah edit `.env`, restart aplikasi.

---

### Option 2: Via API Endpoints

**Cek Status:**

```bash
curl http://localhost:3000/api/scheduler/status \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Start Scheduler:**

```bash
curl -X POST http://localhost:3000/api/scheduler/start \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Stop Scheduler:**

```bash
curl -X POST http://localhost:3000/api/scheduler/stop \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Update Settings:**

```bash
curl -X POST http://localhost:3000/api/scheduler/settings \
-H "Authorization: Bearer YOUR_JWT_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "enabled": true,
  "batch_size": 10,
  "interval_minutes": 15
}'
```

**Trigger Manual Retry:**

```bash
curl -X POST http://localhost:3000/api/scheduler/trigger \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Option 3: Via Web UI

**URL:** `http://localhost:3000/scheduler-control.html`

**Fitur:**

- ✅ Real-time status display
- ✅ Start/Stop dengan 1 klik
- ✅ Update settings scheduler
- ✅ Trigger manual retry
- ✅ Modern UI dengan animasi

**Screenshot:**

```
┌─────────────────────────────────────────┐
│  🎛️ Scheduler Control Panel            │
├─────────────────────────────────────────┤
│  📊 Status: 🟢 Running                  │
│  Processing: No                         │
│  Interval: 30 min | Batch: 5            │
├─────────────────────────────────────────┤
│  [▶️ Start] [⏹️ Stop] [⚡Trigger] [🔄]  │
├─────────────────────────────────────────┤
│  ⚙️ Konfigurasi Scheduler               │
│  [Form untuk update settings]           │
└─────────────────────────────────────────┘
```

---

## 🔧 API Endpoints

### GET /api/scheduler/status

**Response:**

```json
{
  "status": true,
  "data": {
    "running": true,
    "isProcessing": false,
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

### POST /api/scheduler/start

**Response (Success):**

```json
{
  "status": true,
  "message": "Scheduler started successfully",
  "data": { ... }
}
```

**Response (Already Running):**

```json
{
  "status": false,
  "message": "Scheduler is already running"
}
```

### POST /api/scheduler/stop

**Response (Success):**

```json
{
  "status": true,
  "message": "Scheduler stopped successfully",
  "data": { ... }
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

## 📖 Use Cases

### Use Case 1: Development/Testing

**Scenario:** Anda sedang develop dan tidak ingin scheduler mengganggu.

**Solution:**

1. Set `.env`: `SCHEDULER_ENABLED=false`
2. Restart app
3. Scheduler tidak auto-start
4. Start manual saat dibutuhkan via API/UI

---

### Use Case 2: Production (Normal Operation)

**Scenario:** Scheduler harus selalu berjalan otomatis.

**Solution:**

1. Set `.env`: `SCHEDULER_ENABLED=true`
2. Restart app
3. Scheduler auto-start dan berjalan terus

---

### Use Case 3: Maintenance Mode

**Scenario:** Perlu maintenance database/WhatsApp session.

**Solution:**

1. Stop scheduler via API:

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/stop \
   -H "Authorization: Bearer TOKEN"
   ```

2. Lakukan maintenance
3. Start kembali:

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/start \
   -H "Authorization: Bearer TOKEN"
   ```

---

### Use Case 4: Emergency Stop

**Scenario:** Scheduler menyebabkan masalah (spam/bug).

**Quick Stop:**

```bash
curl -X POST http://localhost:3000/api/scheduler/stop \
-H "Authorization: Bearer TOKEN"
```

**Permanent Disable:**

1. Edit `.env`: `SCHEDULER_ENABLED=false`
2. Restart aplikasi

---

## 🧪 Testing

### Manual Testing via cURL

Lihat file `SCHEDULER_QUICK_REF.md` untuk contoh command.

### Automated Testing

Run testing script:

```bash
node test_scheduler_control.js
```

**Note:** Edit script untuk set JWT token Anda.

---

## 🔍 Monitoring

### Console Logs

Scheduler menulis log dengan prefix `[Scheduler]`:

```
[App] Auto-starting scheduler (SCHEDULER_ENABLED=true)
[Scheduler] Started. Will retry up to 5 failed messages every 30 minutes.
[Scheduler] Starting retry cycle...
[Scheduler] Scanning 12 potential failed messages...
[Scheduler] Retrying message 45 (attempt 2/3)...
[Scheduler] Message 45 sent successfully!
[Scheduler] Retry cycle complete.
```

### Status Check

Via API:

```bash
curl http://localhost:3000/api/scheduler/status \
-H "Authorization: Bearer TOKEN"
```

Via UI:

```
http://localhost:3000/scheduler-control.html
```

---

## ⚙️ Configuration

### Environment Variable (.env)

```env
SCHEDULER_ENABLED=true  # Auto-start control
```

### Database Settings (scheduler_settings table)

| Field | Default | Deskripsi |
|-------|---------|-----------|
| `enabled` | `true` | Processing control |
| `batch_size` | `5` | Max messages per cycle |
| `interval_minutes` | `30` | Interval antar cycle |
| `min_delay_seconds` | `30` | Min delay antar message |
| `max_delay_seconds` | `60` | Max delay antar message |
| `max_retries` | `3` | Max retry attempts |
| `cooldown_minutes` | `5` | Cooldown before retry |

**Update via API:**

```bash
curl -X POST http://localhost:3000/api/scheduler/settings \
-H "Authorization: Bearer TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "enabled": true,
  "batch_size": 10,
  "interval_minutes": 15
}'
```

---

## 🆘 Troubleshooting

### Problem: Scheduler tidak jalan meskipun SCHEDULER_ENABLED=true

**Possible Causes:**

1. Database settings `enabled=false`
2. Error saat load settings
3. WhatsApp belum initialized

**Solution:**

1. Cek status: `GET /api/scheduler/status`
2. Cek database: `SELECT * FROM scheduler_settings WHERE id=1`
3. Cek logs aplikasi
4. Manual start: `POST /api/scheduler/start`

---

### Problem: Scheduler running tapi tidak proses pesan

**Possible Causes:**

1. Database settings `enabled=false`
2. Tidak ada pesan gagal
3. Device tidak connected

**Solution:**

1. Update settings: `{"enabled": true}`
2. Cek message_logs: `SELECT * FROM message_logs WHERE status='failed'`
3. Cek device status: `GET /api/devices`

---

### Problem: Ingin stop scheduler tapi API tidak response

**Solution:**

1. Edit `.env`: `SCHEDULER_ENABLED=false`
2. Restart aplikasi
3. Atau update database:

   ```sql
   UPDATE scheduler_settings SET enabled = 0 WHERE id = 1;
   ```

---

## 📊 Architecture

```
User/Client
    │
    ├─► Web UI (scheduler-control.html)
    ├─► API Client (curl/Postman)
    └─► .env Configuration
            │
            ▼
    Express.js Server
            │
            ├─► src/app.js (Auto-start logic)
            ├─► src/routes/api.js (API endpoints)
            └─► src/services/messageScheduler.js (Core logic)
                    │
                    ▼
            MySQL Database
                    │
                    ├─► scheduler_settings (Configuration)
                    └─► message_logs (Failed messages)
```

---

## 📝 Summary

### Files Modified

- `.env` - Added `SCHEDULER_ENABLED`
- `src/app.js` - Auto-start logic
- `src/routes/api.js` - API endpoints
- `src/services/messageScheduler.js` - Control functions
- `API_DOCS.md` - Documentation

### Files Created

- `SCHEDULER_GUIDE.md` - Complete guide
- `SCHEDULER_QUICK_REF.md` - Quick reference
- `SCHEDULER_CONTROL_SUMMARY.md` - Summary
- `SCHEDULER_FLOW_DIAGRAM.md` - Visual diagrams
- `public/scheduler-control.html` - Web UI
- `test_scheduler_control.js` - Testing script
- `README_SCHEDULER.md` - This file

### Features Added

✅ Environment variable control
✅ API endpoints (start/stop/status)
✅ Web UI control panel
✅ Validation & error handling
✅ Complete documentation
✅ Testing script

---

## 🎉 Conclusion

Fitur **Scheduler Control** telah berhasil diimplementasikan dengan lengkap!

**3 Cara Kontrol:**

1. ⚙️ Environment Variable (`.env`)
2. 🔌 API Endpoints (HTTP requests)
3. 🖥️ Web UI (User-friendly interface)

**Siap untuk Production! 🚀**

---

**Need Help?**

- 📖 Baca `SCHEDULER_GUIDE.md` untuk panduan lengkap
- 📋 Lihat `SCHEDULER_QUICK_REF.md` untuk quick reference
- 🔌 Cek `API_DOCS.md` untuk API reference
- 📊 Lihat `SCHEDULER_FLOW_DIAGRAM.md` untuk visual diagram

**Happy Scheduling! 🎛️**
