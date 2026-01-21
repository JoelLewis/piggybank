import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'directory',
    platformProxy: {
      enabled: true
    }
  }),
  integrations: [react(), tailwind()],
  server: {
    port: 3000,
    host: true
  },
  vite: {
    ssr: {
      noExternal: ['lucide-react'],
      external: ['node:async_hooks']
    }
  }
});