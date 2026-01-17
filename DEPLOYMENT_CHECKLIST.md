# ✅ Production Deployment Checklist

## Pre-Deployment
- [ ] Baca DEPLOYMENT.md lengkap
- [ ] Siapkan server (Ubuntu 20.04 LTS atau lebih baru)
- [ ] Siapkan domain dan pointing DNS
- [ ] Generate strong JWT_SECRET (min 32 chars)
- [ ] Backup database existing jika ada
- [ ] Test aplikasi di development dengan .env production

## Server Setup (Choose One)

### Option 1: Traditional Server (Nginx + PM2)
- [ ] Install Node.js v18+
- [ ] Install Nginx
- [ ] Install PM2
- [ ] Install Certbot & Let's Encrypt
- [ ] Install MySQL Server (atau gunakan managed)
- [ ] Configure firewall (allow 22, 80, 443)
- [ ] Clone repository
- [ ] Setup .env dengan production values
- [ ] Run `npm install`
- [ ] Setup Nginx config (`nginx.conf`)
- [ ] Generate SSL certificate
- [ ] Start dengan PM2 (`pm2 start ecosystem.config.js`)
- [ ] Setup PM2 auto-startup
- [ ] Test aplikasi dan health check

### Option 2: Docker Compose (Recommended)
- [ ] Install Docker & Docker Compose
- [ ] Clone repository
- [ ] Copy `.env.example` ke `.env` dan `.env.docker`
- [ ] Edit nilai di `.env.docker` dengan production values
- [ ] Run `docker-compose -f docker-compose.yml up -d`
- [ ] Run migrations: `docker exec wa-gateway-db mysql -u root -p < database.sql`
- [ ] Check logs: `docker-compose logs -f wa-gateway`
- [ ] Test dengan `curl http://localhost/health`

### Option 3: Systemd Service
- [ ] Copy `wa-gateway.service` ke `/etc/systemd/system/`
- [ ] Edit path di service file
- [ ] Run `sudo systemctl daemon-reload`
- [ ] Run `sudo systemctl enable wa-gateway`
- [ ] Run `sudo systemctl start wa-gateway`
- [ ] Check status: `sudo systemctl status wa-gateway`

## Configuration Verification
- [ ] Check .env variables all set correctly
- [ ] Verify database connectivity
- [ ] Confirm JWT_SECRET is strong & unique
- [ ] Check ALLOWED_ORIGINS includes your domain
- [ ] Verify APP_URL and FRONTEND_URL correct
- [ ] Test NODE_ENV=production

## Application Testing
- [ ] Test `/health` endpoint returns 200
- [ ] Test auth routes work (login/register)
- [ ] Test API with valid JWT token
- [ ] Test CORS from your domain
- [ ] Test WebSocket connection for socket.io
- [ ] Test file uploads (jika ada)
- [ ] Test database queries
- [ ] Monitor memory & CPU usage

## SSL/TLS
- [ ] Generate SSL certificate (Let's Encrypt)
- [ ] Certificate auto-renewal configured
- [ ] HSTS header enabled
- [ ] Force HTTPS redirect
- [ ] SSL grade A+ (check ssllabs.com)

## Security
- [ ] Change default passwords
- [ ] Setup database user with limited privileges
- [ ] Enable firewall rules
- [ ] Setup fail2ban (optional)
- [ ] Disable SSH password login (use key only)
- [ ] Remove unnecessary services
- [ ] Setup monitoring/alerting
- [ ] Regular security updates scheduled
- [ ] Sensitive routes protected with auth
- [ ] CORS properly configured (not *)

## Performance
- [ ] Gzip compression enabled
- [ ] Static file caching configured
- [ ] Database indexes created
- [ ] Connection pooling configured
- [ ] Load testing done (optional)
- [ ] Monitor response times

## Monitoring & Logs
- [ ] PM2 monitoring setup (`pm2 monit`)
- [ ] Log rotation configured
- [ ] Check error logs for warnings
- [ ] Setup log aggregation (optional)
- [ ] Setup uptime monitoring (optional)
- [ ] Setup error tracking (Sentry optional)

## Backup & Recovery
- [ ] Database backup automated (daily)
- [ ] Backup storage verified (remote location)
- [ ] Test restore procedure
- [ ] Document recovery procedures
- [ ] Setup version control for configs

## DNS & Domain
- [ ] DNS A records pointing to server
- [ ] WWW subdomain configured
- [ ] DNS propagation verified
- [ ] Domain SSL certificate generated
- [ ] Wildcard SSL if needed

## Post-Deployment
- [ ] Test all features on production domain
- [ ] Monitor error logs 24 hours
- [ ] Check PM2 status regularly
- [ ] Monitor server resources (RAM, disk, CPU)
- [ ] Test auto-restart on crash
- [ ] Document deployment procedures
- [ ] Create runbook for common issues
- [ ] Schedule maintenance windows

## Ongoing Maintenance
- [ ] Daily: Check server health & logs
- [ ] Weekly: Review error logs
- [ ] Monthly: Update dependencies (`npm update`)
- [ ] Monthly: Database optimization
- [ ] Quarterly: Security audit
- [ ] Quarterly: SSL certificate renewal test
- [ ] Annually: Full disaster recovery test

## Quick Command Reference

```bash
# PM2 Management
pm2 start ecosystem.config.js --env production
pm2 logs wa-gateway
pm2 monit
pm2 stop wa-gateway
pm2 restart wa-gateway

# Docker Management
docker-compose -f docker-compose.yml up -d
docker-compose logs -f wa-gateway
docker-compose restart wa-gateway

# System Management
sudo systemctl status wa-gateway
sudo systemctl logs -u wa-gateway -n 100

# Database
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME
mysqldump -u $DB_USER -p $DB_NAME > backup.sql

# Health Check
curl -i https://yourdomain.com/health
curl -i http://localhost:3001/health
```

## Support Contacts
- Node.js Issues: https://github.com/nodejs/node
- Express: https://expressjs.com
- PM2: https://pm2.keymetrics.io
- Docker: https://docs.docker.com

## Notes
- Selalu gunakan HTTPS di production
- Keep sensitive data di .env, bukan di code
- Regular backup adalah mandatory
- Monitor logs dan metrics regularly
- Test sebelum update dependencies

---
Last Updated: 2026-01-17
