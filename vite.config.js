// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	server: {
		watch: {
		  usePolling: true,
		  interval: 300, // Adjust polling interval (milliseconds)
		}
	  }
};

export default config;
