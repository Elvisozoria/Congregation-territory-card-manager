export default {
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  }
};
