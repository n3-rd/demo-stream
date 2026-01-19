# Nginx Setup Instructions for viewroom.ca

## 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

## 2. Copy Configuration File

Copy the nginx configuration to the appropriate location:

**For Ubuntu/Debian:**
```bash
sudo cp nginx-viewroom.conf /etc/nginx/sites-available/viewroom.ca
sudo ln -s /etc/nginx/sites-available/viewroom.ca /etc/nginx/sites-enabled/
```

**For CentOS/RHEL:**
```bash
sudo cp nginx-viewroom.conf /etc/nginx/conf.d/viewroom.ca.conf
```

## 3. Test Nginx Configuration

```bash
sudo nginx -t
```

## 4. Reload Nginx

```bash
sudo systemctl reload nginx
# or
sudo service nginx reload
```

## 5. Enable Nginx to Start on Boot

```bash
sudo systemctl enable nginx
```

## 6. Set Up SSL (Recommended)

After DNS is properly configured, set up SSL with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d viewroom.ca -d www.viewroom.ca
```

This will automatically:
- Obtain SSL certificates
- Update the nginx configuration
- Set up automatic renewal

After SSL is set up, uncomment the HTTPS server block in the config file and comment out the HTTP-only block.

## 7. Firewall Configuration

Make sure ports 80 and 443 are open:

```bash
sudo ufw allow 'Nginx Full'
# or
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Verify Setup

1. Check nginx status: `sudo systemctl status nginx`
2. Check if your app is running on port 3001: `pm2 status`
3. Test the domain: Visit `http://viewroom.ca` in your browser

## Troubleshooting

- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Check nginx access logs: `sudo tail -f /var/log/nginx/access.log`
- Verify your app is listening: `netstat -tlnp | grep 3001` or `ss -tlnp | grep 3001`
