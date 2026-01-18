# WA Gateway - Full Service Manual

Welcome to the **WhatsApp Gateway Professional V8** documentation. This guide covers installation, usage, and API integration.

## 🛠️ Installation Guide

### Prerequisites

- **Node.js** (v14 or newer)
- **MySQL** (e.g., via XAMPP)

### Step 1: Database Setup

1. Open **phpMyAdmin** or MySQL CLI.
2. Create a new database named `wa_gateway`.
3. Import the provided SQL file: **`database.sql`**.

### Step 2: Configuration

1. Open the **`.env`** file in the project root.
2. Adjust settings if your database has a password:

    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=wa_gateway
    JWT_SECRET=secure_secret_key
    ```

### Step 3: Start Application

1. Open a terminal in the project folder.
2. Install dependencies (first time only):

    ```bash
    npm install
    ```

3. Start the server:

    ```bash
    npm start
    ```

4. Access the dashboard at **`http://localhost:3000`**.

---

## 🚀 Postman Collection

For easy API testing, we have provided a full Postman Collection.

**[Download wa_gateway.postman_collection.json](wa_gateway.postman_collection.json)**

### How to use

1. Open Postman -> Import.
2. Select the JSON file.
3. Run the **"Login"** request first to automatically set the environment variable `token`.
4. You can now run any other request in the collection.

---

## 🔌 API Documentation

### Base URL

`http://localhost:3000`

### Authentication

**Header:** `Authorization: Bearer <token>`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Get JWT Token. (Body: `username`, `password`) |

### Device Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/devices` | List all devices. |
| `POST` | `/api/device/add` | Create a new session. (Body: `deviceId`, `name`) |
| `POST` | `/api/device/delete` | Remove a session. (Body: `deviceId`) |

### Messaging

#### 1. Send Text Message

**Endpoint:** `POST /api/send-message`
**Body:**

```json
{
    "deviceId": "your-device-id",
    "number": "628123456789",
    "message": "Hello World"
}
```

#### 2. Send Image

**Endpoint:** `POST /api/send-media`
**Body:**

```json
{
    "deviceId": "your-device-id",
    "number": "628123456789",
    "type": "image",
    "url": "https://example.com/image.jpg",
    "caption": "Here is an image"
}
```

#### 3. Send Video

**Endpoint:** `POST /api/send-media`
**Body:**

```json
{
    "deviceId": "your-device-id",
    "number": "628123456789",
    "type": "video",
    "url": "https://example.com/video.mp4",
    "caption": "Here is a video"
}
```

### Scheduler Management (Retry Failed Messages)

The system automatically retries failed messages every 30 minutes (5 messages per batch). You can also manage these settings via API.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/scheduler/status` | Get current scheduler status and settings. |
| `POST` | `/api/scheduler/settings` | Update scheduler settings. (Body see below) |
| `POST` | `/api/scheduler/trigger` | Manually trigger a retry cycle now. |

#### Update Settings Body

```json
{
    "enabled": true,
    "batch_size": 10,
    "interval_minutes": 15,
    "min_delay_seconds": 20,
    "max_delay_seconds": 45,
    "max_retries": 3,
    "cooldown_minutes": 5
}
```

---

## 💻 Code Integration Examples

### 1. Terminal / CMD (cURL)

#### Send Text

```bash
curl --location 'http://localhost:3000/api/send-message' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data-raw '{
    "deviceId": "marketing-01",
    "number": "628123456789",
    "message": "Hello from cURL"
}'
```

#### Send Media (Image/Video)

```bash
curl --location 'http://localhost:3000/api/send-media' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data-raw '{
    "deviceId": "marketing-01",
    "number": "628123456789",
    "type": "image",
    "url": "https://example.com/image.jpg",
    "caption": "Image from cURL"
}'
```

### 2. PHP (cURL) - Send Text

```php
<?php
$token = 'YOUR_JWT_TOKEN';
$url = 'http://localhost:3000/api/send-message';
$data = [
    'deviceId' => 'marketing-01',
    'number' => '628123456789',
    'message' => 'Hello from PHP'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token, 'Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>
```

### 2. PHP (cURL) - Send Image

```php
<?php
$token = 'YOUR_JWT_TOKEN';
$url = 'http://localhost:3000/api/send-media';
$data = [
    'deviceId' => 'marketing-01',
    'number' => '628123456789',
    'type' => 'image',
    'url' => 'https://example.com/promo.jpg',
    'caption' => 'Check out our promo!'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token, 'Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>
```

### 3. PHP (cURL) - Send Video

```php
<?php
$token = 'YOUR_JWT_TOKEN';
$url = 'http://localhost:3000/api/send-media';
$data = [
    'deviceId' => 'marketing-01',
    'number' => '628123456789',
    'type' => 'video',
    'url' => 'https://example.com/video.mp4',
    'caption' => 'Watch this video'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token, 'Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
?>
```

### 4. Node.js (Socket.io Client)

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected!');
});

// Listen for incoming messages
socket.on('new_message', (data) => {
    console.log(`[${data.deviceId}] New Message from ${data.from}: ${data.message}`);
});
```
