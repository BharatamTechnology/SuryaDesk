const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src', 'assets', 'images', 'sitvik_solar_logo_1780899742253.png');
const publicDir = path.join(__dirname, 'public');
const dest512 = path.join(publicDir, 'icon-512.png');
const dest192 = path.join(publicDir, 'icon-192.png');

try {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dest512);
    fs.copyFileSync(srcPath, dest192);
    console.log('Successfully copied icons to public/ directory!');
  } else {
    console.log('Source file not found:', srcPath);
    // As a backup, write a simple solid placeholder if not found
    fs.writeFileSync(dest512, '');
    fs.writeFileSync(dest192, '');
  }
} catch (err) {
  console.error('Error copying assets:', err);
}
