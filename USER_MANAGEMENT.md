# User Management - WhatsApp Gateway

## Overview

Fitur User Management memungkinkan administrator untuk mengelola users yang memiliki akses ke WhatsApp Gateway API. Setiap user memiliki API key unik untuk autentikasi.

## Features

### 1. **View Users**

- Menampilkan daftar semua users dalam tabel interaktif
- Informasi yang ditampilkan:
  - ID
  - Username
  - API Key (partial, dengan opsi view full key)
  - Created At
  - Actions (Edit, Delete)

### 2. **Create User**

- Tambah user baru dengan username dan password
- API key di-generate otomatis secara unik
- Format API key: `wa-[32 karakter hex]`

### 3. **Edit User**

- Update username user
- Update password (optional - kosongkan jika tidak ingin mengubah)
- Tidak bisa edit API key (gunakan regenerate)

### 4. **Delete User**

- Hapus user dari sistem
- User 'admin' tidak bisa dihapus (protected)
- Konfirmasi sebelum delete

### 5. **Regenerate API Key**

- Generate API key baru untuk user
- API key lama akan tidak valid
- Konfirmasi sebelum regenerate
- API key baru ditampilkan di modal

### 6. **View API Key**

- Lihat full API key
- Copy to clipboard dengan satu klik
- Modal popup untuk keamanan

## API Endpoints

### Get All Users

```
GET /api/users
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "api_key": "wa-abc123...",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Single User

```
GET /api/users/:id
Authorization: Bearer <token>
```

### Create User

```
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123"
}
```

**Response:**

```json
{
  "status": true,
  "message": "User created successfully",
  "data": {
    "id": 2,
    "username": "newuser",
    "api_key": "wa-generated-key-here"
  }
}
```

### Update User

```
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "updateduser",
  "password": "newpassword"  // optional
}
```

### Delete User

```
DELETE /api/users/:id
Authorization: Bearer <token>
```

### Regenerate API Key

```
POST /api/users/:id/regenerate-key
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": true,
  "message": "API key regenerated successfully",
  "data": {
    "api_key": "wa-new-generated-key"
  }
}
```

## Access Control

- Semua endpoint memerlukan JWT token authentication
- Token didapat dari login (`/auth/login`)
- User 'admin' tidak bisa dihapus (system protection)

## Security Notes

⚠️ **PENTING untuk Production:**

1. **Password Hashing**: Saat ini password disimpan plain text. Untuk production, gunakan bcrypt:

   ```javascript
   const bcrypt = require('bcrypt');
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **API Key Storage**: Simpan API key dengan aman
3. **HTTPS**: Gunakan HTTPS di production
4. **Rate Limiting**: Tambahkan rate limiting untuk prevent brute force

## UI Features

- **DataTables Integration**: Sorting, searching, pagination
- **Responsive Design**: Mobile-friendly
- **Toast Notifications**: Success/error feedback
- **Modal Dialogs**: Clean UX untuk forms
- **Copy to Clipboard**: Easy API key copying
- **Admin Badge**: Visual indicator untuk admin user
- **Protected Actions**: Admin user tidak bisa dihapus

## File Structure

```
src/
  routes/
    users.js          # Backend routes untuk user CRUD
public/
  users.html          # Frontend user management page
  js/
    users.js          # Frontend JavaScript logic
```

## Usage Example

1. **Login** ke sistem
2. **Navigate** ke menu "Users" di sidebar
3. **Click "Add User"** untuk create user baru
4. **Fill form** dengan username dan password
5. **Save** - API key akan di-generate otomatis
6. **Copy API key** untuk digunakan di aplikasi client
7. **Use API key** untuk authenticate API requests

## Integration dengan API

Setelah create user dan mendapat API key, gunakan untuk authenticate:

```javascript
// JavaScript Example
const response = await fetch('http://localhost:3000/api/send-message', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY_HERE',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    deviceId: 'device-01',
    number: '628123456789',
    message: 'Hello World'
  })
});
```

```php
// PHP Example
$ch = curl_init('http://localhost:3000/api/send-message');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY_HERE',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'deviceId' => 'device-01',
    'number' => '628123456789',
    'message' => 'Hello World'
]));
$response = curl_exec($ch);
```

## Troubleshooting

### Error: "Username already exists"

- Username harus unik
- Gunakan username yang berbeda

### Error: "Cannot delete admin user"

- User 'admin' adalah system user dan tidak bisa dihapus
- Ini adalah protection untuk mencegah lockout

### Error: "Failed to fetch users"

- Pastikan server running
- Check JWT token masih valid
- Check database connection

### API Key tidak bekerja

- Pastikan menggunakan format: `Bearer <api_key>`
- Check API key belum di-regenerate
- Verify user belum dihapus

## Future Enhancements

- [ ] Role-based access control (Admin, User, Viewer)
- [ ] Password hashing dengan bcrypt
- [ ] User activity logs
- [ ] API key expiration
- [ ] Multi-factor authentication
- [ ] User permissions management
- [ ] Bulk user import/export
