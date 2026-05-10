module.exports = {
  apps: [{
    name: 'holiday-system',
    script: '/Users/harryfushen/personal/AI/CC/holiday-system/deploy/start_backend.sh',
    watch: false,
    max_memory_restart: '500M',
    error_file: '/Users/harryfushen/personal/AI/CC/holiday-system/logs/error.log',
    out_file: '/Users/harryfushen/personal/AI/CC/holiday-system/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
