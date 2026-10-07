import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/public/vtoi/**',
        '**/public/prframe/**',
        '**/public/prframe_old/**'
      ]
    }
  }
});
