# 🚀 Panduan Deployment ke Production dengan Domain

## Prerequisites
- Node.js v16+ dan npm
- Nginx web server
- SSL Certificate (Let's Encrypt)
- PM2 (process manager)
- Git
- Database (MySQL/MariaDB)

---

## 1. Setup Server

### Install Node.js & npm (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### Install PM2 Globally
```bash
sudo npm install -g pm2
sudo pm2 startup
sudo pm2 save
```

### Install Nginx
```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Install Certbot (SSL)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

---

## 2. Clone & Setup Project

```bash
# Clone repository
cd /home/username
git clone https://github.com/your-username/wa-gateway.git
cd wa-gateway/waweb

# Install dependencies
npm install

# Copy .env.example ke .env
cp .env.example .env

# Edit .env dengan nilai production Anda
nano .env
```

### Konfigurasi .env untuk Production:
```env
PORT=3001
NODE_ENV=production
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

DB_HOST=your-database-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_PORT=3306

JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRE=24h
```

---

## 3. Configure Nginx

### Copy Nginx Configuration
```bash
# Edit path sesuai kebutuhan
sudo cp nginx.conf /etc/nginx/sites-available/yourdomain.com
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Setup SSL Certificate
```bash
# Dapatkan SSL dengan Let's Encrypt
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew SSL
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify renewal
sudo certbot renew --dry-run
```

---

## 4. Setup PM2 untuk Auto-start

```bash
# Start aplikasi dengan PM2
pm2 start ecosystem.config.js --env production

# Monitor aplikasi
pm2 monit

# Lihat logs
pm2 logs wa-gateway

# Save PM2 process list
pm2 save

# Setup auto-restart on reboot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u username --hp /home/username
```

---

## 5. Setup Database

```bash
# Login ke MySQL
mysql -h DB_HOST -u DB_USER -p DB_NAME

# Run schema
source database.sql;
source groups_schema.sql;
```

---

## 6. Setup Firewall

```bash
# Buka port HTTP, HTTPS, dan SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verify rules
sudo ufw status
```

---

## 7. Monitor & Maintenance

### Cek Status Aplikasi
```bash
# PM2 Status
pm2 status
pm2 info wa-gateway

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check logs
pm2 logs wa-gateway --lines 100
tail -f logs/app.log
```

### Backup Database
```bash
# Daily backup script
mysqldump -h DB_HOST -u DB_USER -p DB_NAME > backup_$(date +%Y%m%d).sql
```

### Update Aplikasi
```bash
cd /home/username/wa-gateway/waweb
git pull origin main
npm install
pm2 restart wa-gateway
```

---

## 8. Performance Optimization

### Enable Gzip dalam Nginx
✅ Sudah dikonfigurasi di nginx.conf

### Setup CDN (Optional)
Gunakan Cloudflare atau layanan CDN lainnya untuk:
- SSL termination
- DDoS protection
- Cache static files

### Database Optimization
```sql
-- Buat indexes
CREATE INDEX idx_device_id ON devices(device_id);
CREATE INDEX idx_message_status ON messages(status);

-- Backup rutin
mysqldump -h DB_HOST -u DB_USER -p DB_NAME | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 9. Troubleshooting

### Aplikasi crash
```bash
pm2 logs wa-gateway --err --lines 50
```

### SSL Error
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Database connection error
```bash
# Test koneksi database
mysql -h DB_HOST -u DB_USER -p -e "SELECT 1"
```

### Port sudah digunakan
```bash
# Find process using port
sudo lsof -i :3001
sudo kill -9 <PID>
```

---

## 10. Security Checklist

- ✅ Change JWT_SECRET ke string random yang kuat
- ✅ Setup firewall rules
- ✅ Enable SSL/TLS
- ✅ Setup database user dengan limited privileges
- ✅ Regular security updates: `sudo apt-get update && sudo apt-get upgrade`
- ✅ Monitor logs untuk suspicious activity
- ✅ Setup rate limiting di Nginx
- ✅ Change database passwords

---

## 11. Domain Setup di DNS Provider

Pointing ke server:
```
A record: yourdomain.com → your-server-ip
A record: www.yourdomain.com → your-server-ip
```

Atau dengan Cloudflare:
1. Add domain ke Cloudflare
2. Update nameservers di registrar
3. Setup SSL di Cloudflare (Flexible atau Full)

---

## Environment Variables Penjelasan

| Variable | Keterangan |
|----------|-----------|
| PORT | Port aplikasi (jangan expose ke public) |
| NODE_ENV | Ubah ke 'production' |
| APP_URL | URL domain aplikasi |
| ALLOWED_ORIGINS | Domain yang boleh akses API |
| DB_HOST | Host database (bisa IP internal) |
| JWT_SECRET | Secret key untuk token (HARUS DIUBAH) |
| WA_SESSION_DIR | Folder untuk menyimpan session WhatsApp |

---

## Support & Monitoring Services

- **Sentry**: Error tracking
- **New Relic**: Performance monitoring  
- **DataDog**: Infrastructure monitoring
- **Better Stack**: Log management

---

Generated: 2026-01-17
