const Jimp = require('jimp')
const path = require('path')

async function generateIcon() {
  // App icon — purple background with emoji-style design
  const icon = new Jimp(1024, 1024, 0x6C63FFff)

  // Add inner circle
  for (let x = 0; x < 1024; x++) {
    for (let y = 0; y < 1024; y++) {
      const dx = x - 512
      const dy = y - 512
      if (Math.sqrt(dx * dx + dy * dy) < 380) {
        icon.setPixelColor(0x5550DDff, x, y)
      }
    }
  }

  await icon.writeAsync(path.join(__dirname, '../assets/icon.png'))
  console.log('✅ icon.png generated')

  // Splash screen — dark background
  const splash = new Jimp(1284, 2778, 0x0F0F1Aff)

  // Center circle
  for (let x = 0; x < 1284; x++) {
    for (let y = 0; y < 2778; y++) {
      const dx = x - 642
      const dy = y - 1389
      if (Math.sqrt(dx * dx + dy * dy) < 200) {
        splash.setPixelColor(0x6C63FFff, x, y)
      }
    }
  }

  await splash.writeAsync(path.join(__dirname, '../assets/splash.png'))
  console.log('✅ splash.png generated')
}

generateIcon().catch(console.error)