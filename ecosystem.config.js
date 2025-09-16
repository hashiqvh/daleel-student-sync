module.exports = {
  apps: [{
    name: 'daleel',
    script: 'server.js',
    cwd: '/var/www/daleel/current',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/daleel/error.log',
    out_file: '/var/log/daleel/out.log',
    log_file: '/var/log/daleel/combined.log',
    time: true
  }]
};
