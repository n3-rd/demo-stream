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
		cors: true, // Enable CORS for all origins
	},
	build: {
		rollupOptions: {
			external: ['canvas']
		}
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
