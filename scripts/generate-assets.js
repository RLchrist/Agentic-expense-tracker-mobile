const sharp = require('sharp')
const path = require('path')

async function generateAssets() {
  console.log('Generating assets...')

  // Icon SVG — purple background with money bag
  const iconSvg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" rx="200" fill="#6C63FF"/>
      <circle cx="512" cy="512" r="320" fill="#4B44CC"/>
      <text x="512" y="620" font-size="320" text-anchor="middle" fill="white">💰</text>
    </svg>
  `

  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(__dirname, '../assets/icon.png'))
  console.log('✅ assets/icon.png created')

  // Adaptive icon
  const adaptiveSvg = `
    <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#0F0F1A"/>
      <circle cx="512" cy="512" r="300" fill="#6C63FF"/>
      <text x="512" y="620" font-size="280" text-anchor="middle" fill="white">💰</text>
    </svg>
  `

  await sharp(Buffer.from(adaptiveSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(__dirname, '../assets/adaptive-icon.png'))
  console.log('✅ assets/adaptive-icon.png created')

  // Splash screen
  const splashSvg = `
    <svg width="1284" height="2778" xmlns="http://www.w3.org/2000/svg">
      <rect width="1284" height="2778" fill="#0F0F1A"/>
      <circle cx="642" cy="1389" r="200" fill="#6C63FF"/>
      <text x="642" y="1460" font-size="180" text-anchor="middle" fill="white">💰</text>
      <text x="642" y="1620" font-size="72" text-anchor="middle" fill="white" font-family="Arial">Expense Tracker</text>
      <text x="642" y="1700" font-size="42" text-anchor="middle" fill="#A0A0B0" font-family="Arial">AI-powered · Offline-ready</text>
    </svg>
  `

  await sharp(Buffer.from(splashSvg))
    .resize(1284, 2778)
    .png()
    .toFile(path.join(__dirname, '../assets/splash.png'))
  console.log('✅ assets/splash.png created')

  console.log('\n🎉 All assets generated successfully!')
}

generateAssets().catch(console.error)