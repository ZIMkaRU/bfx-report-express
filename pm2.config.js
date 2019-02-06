module.exports = {
  apps: [
    {
      name: 'bfx-report',
      script: './index.js',
      error_file: './logs/pm2.error.log',
      out_file: './logs/pm2.out.log',
      pid_file: './logs/pm2.pid',
      instance_var: 'INSTANCE_ID',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
