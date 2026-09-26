import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Change this to your real domain before going live (used for sitemap, canonical URLs and social previews).
const SITE = process.env.SITE_URL || 'https://brightlivesenglish.com';

export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
});
