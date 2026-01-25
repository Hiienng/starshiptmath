const fs = require('fs');
const path = require('path');

// Simple 1x1 pixel PNG (purple color #667eea)
// This is a minimal valid PNG file
const createSimplePNG = (width, height, r, g, b) => {
  // For simplicity, create a base64 encoded simple PNG
  // This creates a valid 1024x1024 purple PNG
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill with gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add math symbol
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.floor(width * 0.5)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧮', width / 2, height / 2);

  return canvas.toBuffer('image/png');
};

// Alternative: Use a pre-made minimal PNG
// Minimal 1x1 purple PNG in base64
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRgAAAABJRU5ErkJggg==',
  'base64'
);

const assetsDir = path.join(__dirname, '..', 'assets');

// Create simple valid PNGs
const files = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];

files.forEach(file => {
  const filePath = path.join(assetsDir, file);
  fs.writeFileSync(filePath, minimalPNG);
  console.log(`Created: ${filePath}`);
});

console.log('Done! Icons created successfully.');
