// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	server: {
		watch: {
			usePolling: true,
			interval: 300, // Adjust polling interval (milliseconds)
		},
		hmr: {
			host: 'localhost', // Ensure it matches your deployed domain
			protocol: 'wss', // Use secure WebSockets
			clientPort: 443, // Use standard HTTPS port for client connections
		},
		cors: true, // Enable CORS for all origins
	},
	optimizeDeps: {
		exclude: ['canvas']
	},
	ssr: {
		noExternal: ['canvas']
	},
	resolve: {
		alias: {
			// Provide an empty module for canvas
			canvas: resolve(__dirname, './src/lib/mocks/canvas.js')
		}
	}
};

export default config;
