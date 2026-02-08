# 📮 Postman Collection - Dynamic Setup Guide

## 🎯 Overview

Postman Collection yang **dinamis** dan **otomatis** untuk WhatsApp Gateway API. Collection ini akan menyesuaikan dengan konfigurasi server Anda secara otomatis.

---

## 📦 Files

| File | Description |
|------|-------------|
| `wa_gateway.postman_collection.json` | Main API collection (Dynamic) |
| `wa_gateway.postman_environment.json` | Local environment (localhost:3002) |
| `wa_gateway.postman_environment.production.json` | Production environment template |

---

## 🚀 Quick Start

### **Step 1: Import Collection**

1. Buka Postman
2. Click **Import** button
3. Drag & drop file: `wa_gateway.postman_collection.json`
4. Click **Import**

### **Step 2: Import Environment**

1. Click **Import** button lagi
2. Drag & drop file: `wa_gateway.postman_environment.json`
3. Click **Import**

### **Step 3: Select Environment**

1. Di kanan atas Postman, pilih dropdown environment
2. Select: **WA Gateway - Local**

### **Step 4: Login**

1. Buka folder: **🔐 1. Authentication**
2. Click request: **Login**
3. Click **Send**
4. ✅ Token akan otomatis tersimpan!

### **Step 5: Test API**

Sekarang semua request lain sudah bisa digunakan dengan token yang tersimpan otomatis!

---

## 🎨 Features

### **✅ Dynamic Base URL**

Collection ini menggunakan environment variable `{{base_url}}` yang bisa disesuaikan:

- **Local:** `http://localhost:3002`
- **Production:** `https://your-domain.com`

### **✅ Auto-Save Token**

Setelah login, token otomatis tersimpan ke environment variable `{{token}}` dan digunakan untuk semua request berikutnya.

### **✅ Auto-Generate Device ID**

Saat menambah device baru, ID akan otomatis di-generate dengan format: `dev_xxxxxxxx`

### **✅ Smart Variable Management**

Collection ini otomatis menyimpan:

- `token` - Authentication token
- `device_id` - First device ID (dari Get All Devices)
- `group_id` - First group ID (dari Get All Groups)
- `new_device_id` - Auto-generated device ID

### **✅ Pre-configured Authentication**

Semua request (kecuali Login) sudah menggunakan Bearer Token authentication secara otomatis.

### **✅ Test Scripts**

Setiap request memiliki test script untuk:

- Validasi response time
- Validasi JSON format
- Auto-save important data

---

## 📋 Environment Variables

### **Local Environment**

```json
{
  "base_url": "http://localhost:3002",
  "username": "admin",
  "password": "admin123",
  "test_number": "628123456789",
  "token": "",
  "device_id": "",
  "group_id": ""
}
```

### **Production Environment**

```json
{
  "base_url": "https://your-domain.com",
  "username": "admin",
  "password": "your-secure-password",
  "test_number": "628123456789",
  "token": "",
  "device_id": "",
  "group_id": ""
}
```

---

## 🔧 Customization

### **Change Server URL**

#### **Option 1: Via Environment**

1. Click environment dropdown
2. Click **Edit** (icon ⚙️)
3. Update `base_url` value
4. Click **Save**

#### **Option 2: Via Collection Variables**

1. Click collection name
2. Go to **Variables** tab
3. Update `base_url` value
4. Click **Save**

### **Change Credentials**

1. Click environment dropdown
2. Click **Edit**
3. Update `username` and `password`
4. Click **Save**

### **Change Test Number**

1. Click environment dropdown
2. Click **Edit**
3. Update `test_number` value (format: 628123456789)
4. Click **Save**

---

## 📚 API Endpoints

### **🔐 1. Authentication**

| Request | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| Login | POST | `/auth/login` | Get authentication token |

**Auto-saves:** `token`, `username`

---

### **📱 2. Device Management**

| Request | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| Get All Devices | GET | `/api/devices` | List all devices |
| Add New Device | POST | `/api/device/add` | Create new device |
| Delete Device | POST | `/api/device/delete` | Remove device |

**Auto-saves:** `device_id` (first device)

**Auto-generates:** `new_device_id` (when adding device)

---

### **💬 3. Messaging**

| Request | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| Send Text Message | POST | `/api/send-message` | Send text |
| Send Image | POST | `/api/send-media` | Send image with caption |
| Send Video | POST | `/api/send-media` | Send video with caption |

**Uses:** `device_id`, `test_number`

---

### **📊 4. Logs**

| Request | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| Get Message Logs | GET | `/api/logs` | View all message logs |

---

### **👥 5. Contact Groups**

| Request | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| Get All Groups | GET | `/api/groups` | List all groups |
| Create Group | POST | `/api/groups/create` | Create new group |
| Get Group Members | GET | `/api/groups/{id}/members` | List group members |
| Add Member to Group | POST | `/api/groups/manage/add-member` | Add contact to group |
| Delete Group | POST | `/api/groups/delete` | Remove group |

**Auto-saves:** `group_id` (first group)

---

### **⏰ 6. Scheduler**

| Request | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| Get Scheduler Status | GET | `/api/scheduler/status` | View scheduler config |
| Update Scheduler Settings | POST | `/api/scheduler/settings` | Update config |
| Trigger Manual Retry | POST | `/api/scheduler/trigger` | Force retry now |

---

## 🎯 Usage Examples

### **Example 1: Complete Workflow**

```
1. Login
   → Token auto-saved ✅

2. Get All Devices
   → device_id auto-saved ✅

3. Send Text Message
   → Uses saved device_id and test_number ✅
```

### **Example 2: Add Device & Send Message**

```
1. Login
   → Token auto-saved ✅

2. Add New Device
   → new_device_id auto-generated ✅
   → Device created ✅

3. Update device_id manually in environment
   → Set device_id = new_device_id

4. Send Text Message
   → Message sent from new device ✅
```

### **Example 3: Group Messaging**

```
1. Login
   → Token auto-saved ✅

2. Create Group
   → Group created ✅

3. Get All Groups
   → group_id auto-saved ✅

4. Add Member to Group
   → Uses saved group_id ✅
   → Member added ✅

5. Send to Group (via app or custom request)
```

---

## 🔄 Switching Environments

### **Local → Production**

1. Click environment dropdown
2. Select: **WA Gateway - Production**
3. Update `base_url` to your production URL
4. Update `password` to production password
5. Run **Login** again
6. All requests now use production server ✅

### **Production → Local**

1. Click environment dropdown
2. Select: **WA Gateway - Local**
3. Run **Login** again
4. All requests now use local server ✅

---

## 🧪 Testing

### **Test All Endpoints**

1. Select environment
2. Click collection name
3. Click **Run** button
4. Select all requests
5. Click **Run WA Gateway Professional**
6. View results ✅

### **Test Single Folder**

1. Right-click folder (e.g., "📱 2. Device Management")
2. Click **Run folder**
3. View results ✅

---

## 📝 Console Logs

Collection ini memiliki console logging untuk debugging:

```javascript
// Pre-request
🚀 Request to: http://localhost:3002/api/devices

// After login
✅ Login successful!
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
User: admin

// After get devices
✅ Found 3 devices
First device: dev_abc123

// After create device
Generated device ID: dev_xyz789
✅ Device created successfully!
```

---

## 🎨 Collection Structure

```
WA Gateway Professional (Dynamic)
├── 🔐 1. Authentication
│   └── Login
├── 📱 2. Device Management
│   ├── Get All Devices
│   ├── Add New Device
│   └── Delete Device
├── 💬 3. Messaging
│   ├── Send Text Message
│   ├── Send Image
│   └── Send Video
├── 📊 4. Logs
│   └── Get Message Logs
├── 👥 5. Contact Groups
│   ├── Get All Groups
│   ├── Create Group
│   ├── Get Group Members
│   ├── Add Member to Group
│   └── Delete Group
└── ⏰ 6. Scheduler
    ├── Get Scheduler Status
    ├── Update Scheduler Settings
    └── Trigger Manual Retry
```

---

## 🚨 Troubleshooting

### **Problem: Token not saved**

**Solution:**

1. Check if environment is selected
2. Run Login request again
3. Check Console tab for errors

### **Problem: 401 Unauthorized**

**Solution:**

1. Run Login request first
2. Check if token is saved in environment
3. Check if Bearer token is enabled in collection auth

### **Problem: Connection refused**

**Solution:**

1. Check if server is running (`npm start`)
2. Check `base_url` in environment
3. Verify port number (should be 3002)

### **Problem: Device ID not found**

**Solution:**

1. Run "Get All Devices" first
2. Check if `device_id` is saved in environment
3. Manually set `device_id` if needed

---

## 🎯 Best Practices

### **1. Always Select Environment**

Pastikan environment sudah dipilih sebelum menjalankan request.

### **2. Run Login First**

Setiap kali switch environment, run Login request terlebih dahulu.

### **3. Use Console for Debugging**

Buka Console tab (View → Show Postman Console) untuk melihat logs.

### **4. Save Important IDs**

Jika ada device_id atau group_id tertentu yang sering digunakan, simpan di environment.

### **5. Test Before Production**

Selalu test di Local environment sebelum menggunakan Production.

---

## 📦 Export & Share

### **Export Collection**

1. Right-click collection name
2. Click **Export**
3. Select **Collection v2.1**
4. Click **Export**
5. Save file

### **Export Environment**

1. Click environment dropdown
2. Click **⚙️** next to environment name
3. Click **Export**
4. Save file

### **Share with Team**

1. Export collection & environment
2. Share files via email/drive
3. Team members import files
4. Everyone uses same configuration ✅

---

## 🎉 Summary

### **Key Features:**

✅ **Dynamic base URL** - Mudah switch antara local & production  
✅ **Auto-save token** - Tidak perlu copy-paste manual  
✅ **Auto-generate IDs** - Device ID otomatis di-generate  
✅ **Smart variables** - Important data tersimpan otomatis  
✅ **Pre-configured auth** - Bearer token sudah di-setup  
✅ **Test scripts** - Validasi otomatis setiap request  
✅ **Console logging** - Debug dengan mudah  
✅ **Complete coverage** - Semua endpoint tersedia  

### **Environment Variables:**

- `base_url` - Server URL (dynamic)
- `token` - Auth token (auto-saved)
- `username` - Login username
- `password` - Login password
- `device_id` - Active device ID (auto-saved)
- `test_number` - Test phone number
- `group_id` - Active group ID (auto-saved)

---

**Collection siap digunakan! Import dan mulai testing API Anda! 🚀**
