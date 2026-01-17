# Panduan Quick Start untuk Deployment

## 🚀 3 Pilihan Deployment

### 1️⃣ **Docker Compose** (Recommended - Easiest)
Semua service dalam satu perintah, perfect untuk VPS/server

```bash
# Setup
cp .env.docker .env
# Edit .env dengan nilai Anda
nano .env

# Deploy
docker-compose up -d

# Monitor
docker-compose logs -f wa-gateway
```

### 2️⃣ **Nginx + PM2** (Traditional - Most Control)
Untuk server yang sudah punya OS terpisah

```bash
# Install dependencies
npm install
pm2 start ecosystem.config.js --env production

# Setup Nginx
sudo cp nginx.conf /etc/nginx/sites-available/yourdomain.com
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# SSL Certificate
sudo certbot certonly --nginx -d yourdomain.com

# Start
sudo systemctl reload nginx
```

### 3️⃣ **Vercel** (Cloud - Low Maintenance)
Jika ingin fully managed cloud hosting

```bash
# Setup sudah ada di vercel.json
# Push ke GitHub
git push origin main

# Connect ke Vercel
# https://vercel.com/import
# Select repository dan deploy
```

---

## 📋 Essential .env Variables

```env
# WAJIB DIISI
APP_URL=https://yourdomain.com
DB_HOST=your-database-host
DB_USER=database-user
DB_PASSWORD=database-password
DB_NAME=database-name
JWT_SECRET=generate-random-string-32chars

# OPTIONAL
NODE_ENV=production
PORT=3001
```

---

## ✅ After Deployment

1. **Test health check:**
   ```bash
   curl https://yourdomain.com/health
   ```

2. **Check logs:**
   ```bash
   # Docker
   docker-compose logs wa-gateway
   
   # PM2
   pm2 logs wa-gateway
   ```

3. **Monitor server:**
   - CPU, RAM, Disk usage
   - Database connection
   - Error logs

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3001 in use | `kill $(lsof -t -i:3001)` |
| Database connection fail | Verify DB credentials in .env |
| CORS error | Check ALLOWED_ORIGINS in .env |
| SSL not working | Verify domain DNS pointing |
| WhatsApp service crash | Check device sessions directory |

---

## 📚 Full Documentation
- See `DEPLOYMENT.md` for detailed setup
- See `DEPLOYMENT_CHECKLIST.md` for verification
- See `API_DOCS.md` for API endpoints

---

## 🔐 Security Reminders
⚠️ JANGAN PERNAH:
- Commit `.env` ke GitHub
- Use weak JWT_SECRET
- Run dengan `NODE_ENV=development` di production
- Allow CORS origin `*` (sudah fixed di config)

✅ HARUS:
- Use HTTPS only
- Regular database backup
- Monitor error logs
- Update dependencies regularly

---

Ready to deploy? Start dengan Docker Compose! 🚀
