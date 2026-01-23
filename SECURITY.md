# 🔒 Security Hardening Guide

## Critical Security Issues Fixed

### 1. ⚠️ Database Port Exposure (FIXED)
**Issue**: PostgreSQL was exposed to the internet on port 5432  
**Impact**: Anyone could attempt brute force attacks on your database  
**Fix**: Ports now bound to localhost only

```yaml
# Before (DANGEROUS):
ports:
  - "5432:5432"  # Exposed to internet

# After (SECURE):
ports:
  - "127.0.0.1:5432:5432"  # Localhost only
```

### 2. ⚠️ Application Port Exposure (FIXED)
**Issue**: Next.js app exposed directly on port 3000  
**Impact**: Bypassing Nginx security, rate limiting  
**Fix**: App now only accessible via localhost

```yaml
# Before:
ports:
  - "3000:3000"

# After:
ports:
  - "127.0.0.1:3000:3000"
```

### 3. ⚠️ Weak Default Passwords (FIXED)
**Issue**: Default passwords "changeme" if env vars not set  
**Impact**: Easily guessable credentials  
**Fix**: Docker Compose now fails without strong passwords

```yaml
# Before:
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}

# After:
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
```

### 4. ⚠️ Missing Security Headers (FIXED)
**Added Headers**:
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `Permissions-Policy`

### 5. ⚠️ No Rate Limiting (FIXED)
**Added**:
- General requests: 10 req/sec
- API requests: 5 req/sec
- Auth endpoints: 3 req/min

---

## 🚀 Deployment Checklist

### Before Deploying to New Server:

#### 1. Generate Strong Secrets
```bash
# PostgreSQL password (24 chars base64)
openssl rand -base64 24

# Redis password (24 chars base64)
openssl rand -base64 24

# Session secret (64 chars hex)
openssl rand -hex 32

# JWT secret (64 chars hex)
openssl rand -hex 32
```

#### 2. Create `.env` File
```bash
cp .env.example .env
nano .env  # Fill in all REQUIRED variables
```

#### 3. Verify Environment Variables
```bash
# Check that all required vars are set:
docker compose config 2>&1 | grep -i "required"
# Should show NO errors
```

#### 4. Configure Firewall (UFW)
```bash
# Install UFW
sudo apt update && sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable firewall
sudo ufw enable
sudo ufw status verbose
```

#### 5. Secure SSH
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 22  # Consider changing to non-standard port

# Restart SSH
sudo systemctl restart sshd
```

#### 6. Install Fail2Ban
```bash
# Install
sudo apt install -y fail2ban

# Configure for SSH and Nginx
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Enable:
[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true

# Start service
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

#### 7. Verify Docker Network Security
```bash
# Check that ports are NOT exposed to 0.0.0.0
docker compose ps

# Should see:
# 127.0.0.1:5432->5432/tcp   (NOT 0.0.0.0:5432)
# 127.0.0.1:3000->3000/tcp   (NOT 0.0.0.0:3000)
# 127.0.0.1:6379->6379/tcp   (NOT 0.0.0.0:6379)
```

#### 8. Test Security Headers
```bash
# After deployment, test headers:
curl -I https://yurasis.com

# Should see:
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: default-src 'self' ...
# X-Frame-Options: SAMEORIGIN
```

---

## 🛡️ Ongoing Security Practices

### Regular Updates
```bash
# Update system packages weekly
sudo apt update && sudo apt upgrade -y

# Update Docker images monthly
docker compose pull
docker compose up -d --force-recreate
```

### Monitor Logs
```bash
# Check Nginx logs for suspicious activity
sudo tail -f /var/log/nginx/yurasis.com.access.log
sudo tail -f /var/log/nginx/yurasis.com.error.log

# Check fail2ban bans
sudo fail2ban-client status sshd
```

### Database Backups
```bash
# Automated daily backups
docker exec radiant-postgres pg_dump -U radiant radiant > backup_$(date +%Y%m%d).sql

# Store backups securely off-site
```

### SSL Certificate Renewal
```bash
# Certbot auto-renews, but verify:
sudo certbot renew --dry-run
```

---

## 🔍 Network Abuse Investigation

**Possible causes of abuse reports**:
1. ❌ Open database ports → Fixed
2. ❌ No rate limiting → Fixed
3. ❌ Weak passwords → Fixed
4. ⚠️ Compromised application (check logs)
5. ⚠️ Botnet/malware on server (run malware scan)

### Post-Deployment Verification
```bash
# Scan open ports (from external machine)
nmap -sV YOUR_SERVER_IP

# Should ONLY see:
# 22/tcp  - SSH
# 80/tcp  - HTTP
# 443/tcp - HTTPS

# If you see 3000, 5432, 6379 → PROBLEM!
```

---

## 📧 Contact

If you receive abuse reports:
1. Check `/var/log/nginx/` for unusual traffic
2. Check `docker logs radiant-app` for errors
3. Verify firewall: `sudo ufw status`
4. Check fail2ban: `sudo fail2ban-client status`

**Prevention > Reaction**
