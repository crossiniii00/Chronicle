const fs = require('fs');
const path = require('path');

const uploadDir = path.resolve(process.cwd(), 'uploads', 'account-images');
const publicDir = path.resolve(process.cwd(), 'public', 'assets', 'accounts');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const logos = {
    'microsoft.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="4" y="4" width="44" height="44" fill="#F25022" rx="4"/>
  <rect x="52" y="4" width="44" height="44" fill="#7FBA00" rx="4"/>
  <rect x="4" y="52" width="44" height="44" fill="#00A4EF" rx="4"/>
  <rect x="52" y="52" width="44" height="44" fill="#FFB900" rx="4"/>
</svg>`,

    'nvidia.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0b0b0b"/>
  <path d="M78 50c0-15.5-12.5-28-28-28S22 34.5 22 50c0 10.2 5.5 19.2 13.7 24.1-1.2-2.5-1.9-5.3-1.9-8.3 0-10 8.1-18.1 18.1-18.1 7.2 0 13.4 4.2 16.3 10.2-1.9-2.1-4.7-3.4-7.8-3.4-6.1 0-11 4.9-11 11s4.9 11 11 11c6.1 0 11-4.9 11-11 0-.9-.1-1.7-.3-2.5 1.5 1.8 2.4 4.2 2.4 6.7 0 5.8-4.7 10.5-10.5 10.5-3.3 0-6.2-1.5-8.1-3.9.8 1.6 1.3 3.4 1.3 5.3 0 6.6-5.4 12-12 12-3.1 0-6-1.2-8.1-3.2C30.6 86 39.8 90 50 90c22.1 0 40-17.9 40-40h-12z" fill="#76B900"/>
</svg>`,

    'amd.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0d0d0d"/>
  <path d="M18 18h36l-14 14H32v22L18 40V18zm64 0v64H18l14-14h42V28l10-10zm-20 20v24H38l14-14h10V38z" fill="#ED1C24"/>
</svg>`,

    'apple.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#18181b"/>
  <path d="M64.6 48.5c-.1-8.2 6.7-12.2 7-12.4-3.8-5.6-9.8-6.3-11.9-6.4-5.1-.5-9.9 3-12.5 3-2.6 0-6.6-2.9-10.8-2.8-5.6.1-10.7 3.2-13.6 8.2-5.8 10-1.5 24.8 4.1 32.9 2.8 4 6.1 8.5 10.4 8.3 4.2-.2 5.8-2.7 10.8-2.7s6.5 2.7 10.9 2.6c4.5-.1 7.3-4.1 10-8.1 3.2-4.6 4.5-9.1 4.6-9.3-.1-.1-8.8-3.4-9-13.3zM56.3 25.1c2.3-2.8 3.8-6.6 3.4-10.5-3.3.1-7.3 2.2-9.6 4.9-2.1 2.4-3.9 6.3-3.4 10.1 3.7.3 7.4-1.8 9.6-4.5z" fill="#FFFFFF"/>
</svg>`,

    'amazon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#0f172a"/>
  <!-- a letter -->
  <text x="50" y="55" font-family="'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="44" fill="#FFFFFF" text-anchor="middle">a</text>
  <!-- smile arrow -->
  <path d="M 28 64 C 42 74, 58 74, 72 64" fill="none" stroke="#FF9900" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M 68 62 L 74 65 L 70 70 Z" fill="#FF9900"/>
</svg>`,

    'google.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#ffffff"/>
  <path d="M85.3 50.8c0-2.8-.2-5.5-.7-8.1H50v15.3h19.8c-.9 4.6-3.4 8.5-7.3 11.2v9.3h11.8c6.9-6.4 11-15.8 11-27.7z" fill="#4285F4"/>
  <path d="M50 86.8c9.9 0 18.3-3.3 24.4-8.9L62.6 68.6c-3.3 2.2-7.5 3.5-12.6 3.5-9.7 0-17.8-6.5-20.8-15.3H17v9.6C23.1 78.5 35.8 86.8 50 86.8z" fill="#34A853"/>
  <path d="M29.2 56.8c-.8-2.3-1.2-4.7-1.2-7.2s.4-4.9 1.2-7.2V32.8H17C14.5 37.8 13.1 43.6 13.1 49.6s1.4 11.8 3.9 16.8l12.2-9.6z" fill="#FBBC05"/>
  <path d="M50 32.5c5.4 0 10.3 1.9 14.1 5.5l10.6-10.6C68.2 21.3 59.8 18 50 18 35.8 18 23.1 26.3 17 38.4l12.2 9.6c3-8.8 11.1-15.5 20.8-15.5z" fill="#EA4335"/>
</svg>`
};

for (const [filename, content] of Object.entries(logos)) {
    fs.writeFileSync(path.join(uploadDir, filename), content.trim(), 'utf8');
    fs.writeFileSync(path.join(publicDir, filename), content.trim(), 'utf8');
    console.log('[SAVED]', filename);
}
console.log('All brand logos generated successfully!');
