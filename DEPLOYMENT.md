# Daleel Student Management - Deployment Guide

## Overview
This project uses GitHub Actions for automated deployment to a server via SSH and PM2 for process management.

## Prerequisites

### 1. Server Setup
- Ubuntu/Linux server with Node.js 20.x installed
- PM2 installed globally: `npm install -g pm2`
- SSH access configured
- Directory structure created:
  ```bash
  mkdir -p /var/www/daleel/{releases,shared,current}
  mkdir -p /var/log/daleel
  ```

### 2. GitHub Secrets
Configure the following secrets in your GitHub repository:
- `SSH_HOST`: Your server's IP address or domain
- `SSH_USER`: SSH username (e.g., `ubuntu`)
- `SSH_PORT`: SSH port (usually `22`)
- `SSH_PRIVATE_KEY`: Private SSH key for authentication

### 3. Environment Variables
Create `/var/www/daleel/shared/.env` on your server with:
```env
NODE_ENV=production
DALEEL_API_BASE_URL=https://api-daleel.spea.shj.ae
DALEEL_YEAR_ID=1052
```

## Deployment Process

### Automatic Deployment
1. Push to `main` branch triggers deployment
2. GitHub Actions builds the application
3. Creates standalone bundle for efficient deployment
4. Uploads via rsync to server
5. Updates symlinks and reloads PM2

### Manual Deployment
```bash
# Build locally
yarn build

# Upload to server (replace with your details)
rsync -az --delete .next/standalone/ user@server:/var/www/daleel/releases/release_$(date +%Y%m%d%H%M%S)/
```

## PM2 Configuration
The `ecosystem.config.js` file configures PM2 with:
- Process name: `daleel`
- Auto-restart on crashes
- Memory limit: 1GB
- Logging to `/var/log/daleel/`

## Monitoring
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs daleel

# Restart application
pm2 restart daleel
```

## Troubleshooting

### Common Issues
1. **Permission denied**: Check SSH key permissions
2. **Build fails**: Verify Node.js version and dependencies
3. **PM2 not found**: Install PM2 globally on server
4. **Environment missing**: Ensure `.env` file exists in shared directory

### Logs Location
- Application logs: `/var/log/daleel/`
- PM2 logs: `pm2 logs daleel`
- GitHub Actions: Repository → Actions tab
