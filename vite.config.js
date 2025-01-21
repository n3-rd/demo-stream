// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	server: {
		hmr: {
			protocol: 'wss',
			host: 'viewroom.ca',
			clientPort: 443
		}
	}
};

export default config;
