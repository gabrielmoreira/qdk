/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['source'],
  },
  test: {
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
    include: ['{src,test}/**/*.spec.{ts,mts}'],
  },
});
