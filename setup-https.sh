#!/bin/bash
# Setup HTTPS for game server using Nginx and Let's Encrypt

echo "🔒 Setting up HTTPS for game server..."

# Install Nginx and Certbot
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config for game server
cat > /etc/nginx/sites-available/gameserver << 'EOF'
server {
    listen 80;
    server_name 188.166.220.144;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/gameserver /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Nginx configured!"
echo "Your game server is now accessible at http://188.166.220.144"
echo ""
echo "Note: For HTTPS, you need a domain name (not an IP address)."
echo "For now, you can use HTTP, or get a free domain from:"
echo "  - Freenom (free domains)"
echo "  - Duck DNS (free subdomain)"
echo "  - No-IP (free subdomain)"
