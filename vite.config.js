const isProduction = process.env.NODE_ENV === 'production';

const config = {
    plugins: [sveltekit()],
    server: {
        hmr: isProduction
            ? {
                host: 'viewroom.ca',
                port: 443,
                protocol: 'wss'
            }
            : undefined // Defaults to localhost in dev mode
    }
};

export default config;
