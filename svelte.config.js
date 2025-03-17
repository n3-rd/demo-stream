import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// Add Netlify adapter-specific options
			external: ['canvas'],
		}),
		csrf: {
			checkOrigin: false,
		},
		alias: {
			"@/*": "./src/lib/*",
		},
		prerender: {
			handleHttpError: ({ path, message }) => {
				// Ignore API routes
				if (path.startsWith('/api')) {
					return;
				}
				
				// Otherwise, throw an error
				throw new Error(message);
			}
		}
	},
	preprocess: vitePreprocess()
};

export default config;
