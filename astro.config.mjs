// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  i18n: {
  defaultLocale: 'fr',
  locales: ['en', 'fr'],
  routing: { prefixDefaultLocale: false }
  },

  adapter: vercel()
});