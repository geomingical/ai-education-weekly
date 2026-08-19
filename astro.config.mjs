import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ai-edu.aimingdata.com',
  output: 'static',
  i18n: {
    locales: ['zh-tw', 'en'],
    defaultLocale: 'zh-tw',
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
      fallbackType: 'redirect',
    },
  },
});
