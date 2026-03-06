module.exports = {
	apps: [
		{
			name: 'demo-room-stream',
			script: './build/index.js',
			instances: 1,
			exec_mode: 'fork',
			env: {
				NODE_ENV: 'production',
				PORT: 3001,
				HOST: '0.0.0.0',
				BODY_SIZE_LIMIT: 'Infinity'
			},
			error_file: './logs/pm2-error.log',
			out_file: './logs/pm2-out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			autorestart: true,
			max_restarts: 10,
			min_uptime: '10s',
			watch: false
		}
	]
};
