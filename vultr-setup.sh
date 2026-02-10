#!/bin/bash

# Vultr Server Security Hardening Script
# Run this script once after creating a new Vultr server

set -e

echo "🔒 Starting Vultr server security hardening..."

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges \
    git \
    curl \
    wget \
    nano \
    htop

# Configure automatic security updates
echo "🔄 Configuring automatic security updates..."
dpkg-reconfigure -plow unattended-upgrades

# Setup UFW Firewall
echo "🔥 Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo "y" | ufw enable

# Configure Fail2ban
echo "🛡️  Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@yurasis.com
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/*.error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/*.error.log
maxretry = 5
bantime = 3600
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# SSH Hardening
echo "🔐 Hardening SSH configuration..."
SSH_CONFIG="/etc/ssh/sshd_config"

# Backup original config
cp $SSH_CONFIG ${SSH_CONFIG}.backup

# Apply secure SSH settings
cat > /etc/ssh/sshd_config.d/99-hardening.conf << 'EOF'
# Disable root login
PermitRootLogin no

# Disable password authentication (use keys only)
PasswordAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes

# Security settings
MaxAuthTries 3
MaxSessions 2
LoginGraceTime 30

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Alive interval
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable unused authentication methods
KerberosAuthentication no
GSSAPIAuthentication no

# Use strong ciphers
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
EOF

# Restart SSH
echo "⚠️  WARNING: SSH configuration has been changed."
echo "⚠️  Make sure you have SSH key access before disconnecting!"
echo "⚠️  Press Enter to restart SSH, or Ctrl+C to cancel..."
read

systemctl restart sshd

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Nginx
echo "🌐 Installing Nginx..."
apt-get install -y nginx

# Configure Nginx default security
cat > /etc/nginx/conf.d/security.conf << 'EOF'
# Hide Nginx version
server_tokens off;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevent MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# Enable XSS protection
add_header X-XSS-Protection "1; mode=block" always;
EOF

systemctl enable nginx
systemctl restart nginx

# Install Certbot for Let's Encrypt
echo "🔐 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Create deploy user (non-root)
echo "👤 Creating deploy user..."
if ! id -u deploy > /dev/null 2>&1; then
    useradd -m -s /bin/bash deploy
    usermod -aG docker deploy
    echo "✅ Deploy user created"
    echo "⚠️  Set password for deploy user:"
    passwd deploy
else
    echo "⚠️  Deploy user already exists"
fi

# Setup SSH key for deploy user
echo "🔑 Setting up SSH for deploy user..."
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

echo "⚠️  Copy your SSH public key to /home/deploy/.ssh/authorized_keys"
echo "Then run: chown -R deploy:deploy /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/radiant
chown -R deploy:deploy /var/www/radiant

# Setup log rotation
echo "📝 Configuring log rotation..."
cat > /etc/logrotate.d/radiant << 'EOF'
/var/log/nginx/yurasis.com.*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
EOF

# Configure system limits
echo "⚙️  Configuring system limits..."
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Configure sysctl for better performance
echo "⚙️  Configuring sysctl..."
cat >> /etc/sysctl.conf << 'EOF'

# Network security
net.ipv4.conf.default.rp_filter=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.accept_redirects=0
net.ipv6.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
net.ipv4.conf.all.accept_source_route=0
net.ipv6.conf.all.accept_source_route=0

# Performance tuning
net.core.somaxconn=65536
net.ipv4.tcp_max_syn_backlog=8192
net.ipv4.tcp_fin_timeout=15
net.ipv4.tcp_keepalive_time=300
EOF

sysctl -p

echo ""
echo "✅ Security hardening completed!"
echo ""
echo "📋 Next steps:"
echo "1. Set up SSH key for deploy user"
echo "2. Test SSH access with deploy user"
echo "3. Disable root SSH access (already configured)"
echo "4. Clone your repository to /var/www/radiant"
echo "5. Configure .env file with strong passwords"
echo "6. Set up SSL certificate: certbot --nginx -d yurasis.com -d www.yurasis.com"
echo "7. Deploy application with deploy.sh"
echo ""
echo "🔐 Security features enabled:"
echo "  ✓ UFW Firewall (ports 22, 80, 443)"
echo "  ✓ Fail2ban (SSH, Nginx protection)"
echo "  ✓ SSH hardening (key-only, no root)"
echo "  ✓ Automatic security updates"
echo "  ✓ Docker & Docker Compose"
echo "  ✓ Nginx with security headers"
echo "  ✓ Certbot for SSL/TLS"
echo "  ✓ System hardening (sysctl, limits)"
echo ""
