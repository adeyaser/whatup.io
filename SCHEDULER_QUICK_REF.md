# 🎛️ Scheduler Control - Quick Reference

## Opsi Menonaktifkan & Mengaktifkan Scheduler

### 1️⃣ Via Environment Variable (`.env`)

**Untuk Auto-Start Control saat aplikasi launch:**

```env
# .env file
SCHEDULER_ENABLED=true   # Scheduler otomatis start
SCHEDULER_ENABLED=false  # Scheduler TIDAK otomatis start
```

**Setelah edit `.env`, restart aplikasi:**

```bash
npm start
```

---

### 2️⃣ Via API Endpoints

**Mengaktifkan Scheduler:**

```bash
curl -X POST http://localhost:3000/api/scheduler/start \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Menonaktifkan Scheduler:**

```bash
curl -X POST http://localhost:3000/api/scheduler/stop \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Cek Status Scheduler:**

```bash
curl http://localhost:3000/api/scheduler/status \
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3️⃣ Via Web UI

**Akses Control Panel:**

```
http://localhost:3000/scheduler-control.html
```

**Fitur:**

- ✅ Start/Stop scheduler dengan 1 klik
- ✅ Lihat status real-time
- ✅ Trigger manual retry
- ✅ Update settings scheduler

---

## 📖 Dokumentasi Lengkap

| File | Deskripsi |
|------|-----------|
| `SCHEDULER_GUIDE.md` | Panduan lengkap penggunaan scheduler |
| `SCHEDULER_CONTROL_SUMMARY.md` | Summary semua perubahan |
| `API_DOCS.md` | API reference lengkap |
| `scheduler-control.html` | Web UI control panel |

---

## 🚀 Quick Start

### Scenario: Development (Manual Control)

```bash
# 1. Edit .env
SCHEDULER_ENABLED=false

# 2. Restart app
npm start

# 3. Start scheduler saat dibutuhkan
curl -X POST http://localhost:3000/api/scheduler/start \
-H "Authorization: Bearer TOKEN"
```

### Scenario: Production (Auto-Start)

```bash
# 1. Edit .env
SCHEDULER_ENABLED=true

# 2. Restart app
npm start

# Scheduler akan otomatis berjalan!
```

---

## 🆘 Emergency Stop

**Jika scheduler menyebabkan masalah:**

```bash
# Option 1: Via API (Tercepat)
curl -X POST http://localhost:3000/api/scheduler/stop \
-H "Authorization: Bearer TOKEN"

# Option 2: Via Environment (Permanent)
# Edit .env: SCHEDULER_ENABLED=false
# Restart aplikasi
```

---

**Selamat menggunakan! 🎉**
