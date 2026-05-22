export default {
  root: '.',
  publicDir: 'public',
  base: process.env.GITHUB_PAGES ? '/Congregation-territory-card-manager/' : '/',
  build: {
    outDir: 'dist'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  }
};
