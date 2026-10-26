// After `expo export -p web`: make the web build installable on iPhone (Add to Home Screen)
// and full-screen, with the Iman icon and colours.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const dist = 'dist';
copyFileSync('assets/images/icon.png', `${dist}/apple-touch-icon.png`);
copyFileSync('assets/images/icon.png', `${dist}/icon-512.png`);
writeFileSync(`${dist}/manifest.json`, JSON.stringify({
  name: 'Iman', short_name: 'Iman', lang: 'sq', start_url: '/', display: 'standalone',
  background_color: '#0B0D17', theme_color: '#0B0D17',
  icons: [{ src: '/icon-512.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
}, null, 2));

let html = readFileSync(`${dist}/index.html`, 'utf8');
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no">');
html = html.replace('<html lang="en">', '<html lang="sq">');
html = html.replace('</head>', [
  '<meta name="theme-color" content="#0B0D17">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Iman">',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  '<link rel="manifest" href="/manifest.json">',
  '<style>html,body{background:#0B0D17;overscroll-behavior:none}</style>',
  '</head>',
].join('\n'));
writeFileSync(`${dist}/index.html`, html);
console.log('web postbuild ok');
