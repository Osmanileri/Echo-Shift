/**
 * PWA Icon Generator Script
 * 
 * Bu script SVG ikonunu PNG formatına dönüştürür.
 * Kullanım: npm install sharp && node scripts/generate-icons.js
 * 
 * Alternatif olarak şu online araçları kullanabilirsin:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 * - https://maskable.app/editor
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    
    const svgPath = path.join(__dirname, '../public/icons/icon.svg');
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate 192x192 PNG
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, '../public/icons/pwa-192x192.png'));
    
    console.log('✅ Generated pwa-192x192.png');
    
    // Generate 512x512 PNG
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, '../public/icons/pwa-512x512.png'));
    
    console.log('✅ Generated pwa-512x512.png');
    console.log('\n🎉 PWA icons generated successfully!');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ Sharp module not found.');
      console.log('\nTo generate PNG icons, run:');
      console.log('  npm install sharp -D');
      console.log('  node scripts/generate-icons.js');
      console.log('\nOr use online tools:');
      console.log('  - https://realfavicongenerator.net/');
      console.log('  - https://www.pwabuilder.com/imageGenerator');
    } else {
      console.error('Error:', error.message);
    }
  }
}

generateIcons();
