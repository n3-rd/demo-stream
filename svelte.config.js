import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			bodySizeLimit: 1024 * 1024
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
