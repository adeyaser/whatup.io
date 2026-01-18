module.exports = {
  apps: [
    {
      name: 'wa-gateway',
      script: './src/app.js',
      args: '--max-old-space-size=512 --optimize_for_size --gc_interval=100 --expose-gc',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '800M',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Auto restart
      max_restarts: 10,
      min_uptime: '10s',
      // Health check
      instance_var: 'INSTANCE_ID',
      // Merge logs from all instances
      merge_logs: true,
      // Autorestart on crash
      autorestart: true,
      // Watch for changes in development
      watch: process.env.NODE_ENV === 'development'
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'yourdomain.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/wa-gateway.git',
      path: '/home/node/apps/wa-gateway',
      'post-deploy': 'npm install && npm run start'
    }
  }
};
