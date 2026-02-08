# Scheduler Management Guide

## Overview

Aplikasi WhatsApp Gateway memiliki fitur **Message Retry Scheduler** yang secara otomatis mencoba mengirim ulang pesan yang gagal. Fitur ini dapat dikontrol melalui:

1. **Environment Variable** (`.env`) - untuk mengatur auto-start saat aplikasi dimulai
2. **Database Settings** - untuk konfigurasi detail scheduler
3. **API Endpoints** - untuk kontrol manual start/stop scheduler

---

## 1. Konfigurasi Environment Variable

### File: `.env`

Tambahkan konfigurasi berikut di file `.env`:

```env
# Scheduler Configuration
SCHEDULER_ENABLED=true
```

### Opsi

- **`SCHEDULER_ENABLED=true`** → Scheduler akan **otomatis dijalankan** saat aplikasi start
- **`SCHEDULER_ENABLED=false`** → Scheduler **TIDAK otomatis dijalankan**, tetapi bisa diaktifkan manual via API

### Kapan Menggunakan?

| Skenario | Setting | Alasan |
|----------|---------|--------|
| **Production (Normal)** | `true` | Scheduler berjalan otomatis untuk retry pesan gagal |
| **Development/Testing** | `false` | Kontrol manual untuk testing, hindari spam retry |
| **Maintenance Mode** | `false` | Matikan scheduler sementara saat maintenance |
| **Low Traffic** | `false` | Aktifkan hanya saat dibutuhkan untuk hemat resource |

---

## 2. Konfigurasi Database Settings

Scheduler menggunakan tabel `scheduler_settings` untuk menyimpan konfigurasi detail.

### Tabel: `scheduler_settings`

| Field | Default | Deskripsi |
|-------|---------|-----------|
| `enabled` | `true` | Apakah scheduler aktif (di level database) |
| `batch_size` | `5` | Maksimal pesan yang diproses per cycle |
| `interval_minutes` | `30` | Interval waktu antar cycle (menit) |
| `min_delay_seconds` | `30` | Delay minimal antar pesan (detik) |
| `max_delay_seconds` | `60` | Delay maksimal antar pesan (detik) |
| `max_retries` | `3` | Maksimal percobaan retry per pesan |
| `cooldown_minutes` | `5` | Hanya retry pesan yang lebih lama dari ini (menit) |

### Update Settings via API

```bash
curl --location 'http://localhost:3000/api/scheduler/settings' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "enabled": true,
    "batch_size": 10,
    "interval_minutes": 15,
    "max_retries": 5
}'
```

**Note:** Mengubah `enabled` di database settings berbeda dengan `SCHEDULER_ENABLED` di `.env`:

- `.env SCHEDULER_ENABLED` → Kontrol **auto-start** saat aplikasi launch
- Database `enabled` → Kontrol apakah scheduler **memproses pesan** saat cycle berjalan

---

## 3. Kontrol Manual via API

### 3.1 Cek Status Scheduler

**Endpoint:** `GET /api/scheduler/status`

```bash
curl --location 'http://localhost:3000/api/scheduler/status' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

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

**Field Explanation:**

- `running`: Apakah scheduler sedang berjalan (interval aktif)
- `isProcessing`: Apakah sedang memproses batch pesan
- `config`: Konfigurasi saat ini dari database

---

### 3.2 Start Scheduler

**Endpoint:** `POST /api/scheduler/start`

```bash
curl --location --request POST 'http://localhost:3000/api/scheduler/start' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
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

### 3.3 Stop Scheduler

**Endpoint:** `POST /api/scheduler/stop`

```bash
curl --location --request POST 'http://localhost:3000/api/scheduler/stop' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
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

### 3.4 Trigger Manual Retry

**Endpoint:** `POST /api/scheduler/trigger`

Memicu retry cycle secara manual tanpa menunggu interval.

```bash
curl --location --request POST 'http://localhost:3000/api/scheduler/trigger' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Response:**

```json
{
    "status": true,
    "message": "Retry cycle triggered"
}
```

**Note:** Ini akan memproses pesan gagal **segera**, berguna untuk testing atau urgent retry.

---

## 4. Use Cases & Best Practices

### Use Case 1: Development/Testing

**Scenario:** Anda sedang develop fitur baru dan tidak ingin scheduler mengganggu.

**Solution:**

1. Set `.env`: `SCHEDULER_ENABLED=false`
2. Restart aplikasi
3. Scheduler tidak akan auto-start
4. Gunakan `/api/scheduler/trigger` untuk manual testing saat dibutuhkan

---

### Use Case 2: Maintenance Mode

**Scenario:** Anda perlu maintenance database atau WhatsApp session.

**Solution:**

1. Stop scheduler via API:

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/stop \
   -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. Lakukan maintenance
3. Start scheduler kembali:

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/start \
   -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Alternative:** Update database settings `enabled=false` untuk pause processing tanpa stop scheduler.

---

### Use Case 3: High Traffic Control

**Scenario:** Traffic tinggi, ingin kontrol lebih ketat kapan retry berjalan.

**Solution:**

1. Set `.env`: `SCHEDULER_ENABLED=false`
2. Buat cron job atau scheduled task untuk start/stop scheduler di jam tertentu:

   ```bash
   # Start scheduler jam 2 pagi (low traffic)
   0 2 * * * curl -X POST http://localhost:3000/api/scheduler/start -H "Authorization: Bearer TOKEN"
   
   # Stop scheduler jam 8 pagi (high traffic mulai)
   0 8 * * * curl -X POST http://localhost:3000/api/scheduler/stop -H "Authorization: Bearer TOKEN"
   ```

---

### Use Case 4: Emergency Stop

**Scenario:** Scheduler menyebabkan masalah (misalnya spam atau bug).

**Solution:**

1. **Quick Stop via API:**

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/stop \
   -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Disable Processing (tanpa stop interval):**

   ```bash
   curl -X POST http://localhost:3000/api/scheduler/settings \
   -H "Authorization: Bearer YOUR_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{"enabled": false}'
   ```

3. **Permanent Disable:**
   - Edit `.env`: `SCHEDULER_ENABLED=false`
   - Restart aplikasi

---

## 5. Monitoring & Logs

Scheduler menulis log ke console dengan prefix `[Scheduler]`. Contoh:

```
[Scheduler] Started. Will retry up to 5 failed messages every 30 minutes.
[Scheduler] Starting retry cycle...
[Scheduler] Scanning 12 potential failed messages...
[Scheduler] Retrying message 45 (attempt 2/3)...
[Scheduler] Message 45 sent successfully!
[Scheduler] Waiting 42s before next message...
[Scheduler] Retry cycle complete.
```

### Log Levels

- **Info:** Normal operation (start, stop, cycle complete)
- **Warning:** Device offline, skip message
- **Error:** Retry failed, database error

---

## 6. Troubleshooting

### Problem: Scheduler tidak jalan meskipun `SCHEDULER_ENABLED=true`

**Possible Causes:**

1. Database settings `enabled=false`
2. Error saat load settings dari database
3. WhatsApp belum initialized

**Solution:**

1. Cek status: `GET /api/scheduler/status`
2. Cek database: `SELECT * FROM scheduler_settings WHERE id=1`
3. Cek logs aplikasi untuk error messages
4. Manual start: `POST /api/scheduler/start`

---

### Problem: Scheduler running tapi tidak proses pesan

**Possible Causes:**

1. Database settings `enabled=false`
2. Tidak ada pesan gagal yang memenuhi kriteria
3. Device tidak connected

**Solution:**

1. Update settings: `{"enabled": true}`
2. Cek message_logs: `SELECT * FROM message_logs WHERE status='failed'`
3. Cek device status: `GET /api/devices`
4. Manual trigger: `POST /api/scheduler/trigger`

---

### Problem: Ingin stop scheduler tapi API tidak response

**Solution:**

1. Edit `.env`: `SCHEDULER_ENABLED=false`
2. Restart aplikasi
3. Atau update database langsung:

   ```sql
   UPDATE scheduler_settings SET enabled = 0 WHERE id = 1;
   ```

---

## 7. Summary

| Action | Method | When to Use |
|--------|--------|-------------|
| **Auto-start on launch** | `.env` → `SCHEDULER_ENABLED=true` | Production, normal operation |
| **No auto-start** | `.env` → `SCHEDULER_ENABLED=false` | Development, testing, manual control |
| **Start manually** | `POST /api/scheduler/start` | After maintenance, testing |
| **Stop manually** | `POST /api/scheduler/stop` | Maintenance, emergency |
| **Pause processing** | `POST /api/scheduler/settings` → `{"enabled": false}` | Temporary pause without stopping interval |
| **Trigger immediate retry** | `POST /api/scheduler/trigger` | Testing, urgent retry |
| **Check status** | `GET /api/scheduler/status` | Monitoring, debugging |

---

## 8. Quick Reference

```bash
# Check status
curl http://localhost:3000/api/scheduler/status -H "Authorization: Bearer TOKEN"

# Start scheduler
curl -X POST http://localhost:3000/api/scheduler/start -H "Authorization: Bearer TOKEN"

# Stop scheduler
curl -X POST http://localhost:3000/api/scheduler/stop -H "Authorization: Bearer TOKEN"

# Trigger manual retry
curl -X POST http://localhost:3000/api/scheduler/trigger -H "Authorization: Bearer TOKEN"

# Update settings
curl -X POST http://localhost:3000/api/scheduler/settings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "batch_size": 10, "interval_minutes": 15}'
```

---

**Happy Scheduling! 🚀**
