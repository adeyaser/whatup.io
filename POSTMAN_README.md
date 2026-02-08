# 📮 Postman Collection - Quick Reference

## 🚀 Quick Start (3 Steps)

### 1️⃣ Import Files

```
Import ke Postman:
- wa_gateway.postman_collection.json
- wa_gateway.postman_environment.json
```

### 2️⃣ Select Environment

```
Pilih: "WA Gateway - Local"
```

### 3️⃣ Login

```
Run: 🔐 1. Authentication → Login
Token otomatis tersimpan! ✅
```

---

## 📋 Environment Variables

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:3002` | Server URL (Dynamic) |
| `username` | `admin` | Login username |
| `password` | `admin123` | Login password |
| `test_number` | `628123456789` | Test phone number |
| `token` | *(auto-saved)* | Auth token |
| `device_id` | *(auto-saved)* | Active device ID |
| `group_id` | *(auto-saved)* | Active group ID |

---

## 🎯 Key Features

✅ **Dynamic Base URL** - Ganti server dengan mudah  
✅ **Auto-Save Token** - Login sekali, token tersimpan  
✅ **Auto-Generate IDs** - Device ID otomatis dibuat  
✅ **Smart Variables** - Data penting tersimpan otomatis  
✅ **Pre-configured Auth** - Bearer token sudah setup  

---

## 📚 API Endpoints

### 🔐 Authentication

- `POST /auth/login` - Login & get token

### 📱 Devices

- `GET /api/devices` - List devices
- `POST /api/device/add` - Add device
- `POST /api/device/delete` - Delete device

### 💬 Messaging

- `POST /api/send-message` - Send text
- `POST /api/send-media` - Send image/video

### 📊 Logs

- `GET /api/logs` - View message logs

### 👥 Groups

- `GET /api/groups` - List groups
- `POST /api/groups/create` - Create group
- `POST /api/groups/manage/add-member` - Add member

### ⏰ Scheduler

- `GET /api/scheduler/status` - Get status
- `POST /api/scheduler/settings` - Update settings
- `POST /api/scheduler/trigger` - Manual retry

---

## 🔄 Switch Environment

### Local → Production

```
1. Select: "WA Gateway - Production"
2. Update base_url: https://your-domain.com
3. Update password
4. Run Login
```

### Production → Local

```
1. Select: "WA Gateway - Local"
2. Run Login
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Token not saved | Check environment selected, run Login |
| 401 Unauthorized | Run Login first |
| Connection refused | Check server running, verify base_url |
| Device ID not found | Run "Get All Devices" first |

---

## 📖 Full Documentation

Lihat **POSTMAN_GUIDE.md** untuk dokumentasi lengkap.

---

**Happy Testing! 🎉**
