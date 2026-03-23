module.exports = {
  apps: [
    {
      name: 'suika-game',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 7860',
      cwd: './',
      env: {
        NODE_ENV: 'production'
      },

      // 自動重啟設定
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,

      // Log 設定
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // 記憶體超過 512MB 自動重啟
      max_memory_restart: '512M'
    }
  ]
};
