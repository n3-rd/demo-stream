// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	server: {
		watch: {
		  usePolling: true,
		  interval: 300, // Adjust polling interval (milliseconds)
		}
	  },
	envPrefix: ['VITE_', 'PUBLIC_']
};

export default config;
