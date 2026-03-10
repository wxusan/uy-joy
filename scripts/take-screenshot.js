const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  // Go to the apartments page
  await page.goto('http://localhost:3000/kvartiralar', { waitUntil: 'networkidle0' });
  
  // Wait for the apartments to load then click the first "View Details" (Batafsil / Подробнее) button
  // We'll use a broad selector that targets the link/button inside the card
  await page.waitForSelector('a[href^="/kvartiralar/"], button', { timeout: 10000 });
  
  // Click the first card's link to open the modal
  const cards = await page.$$('a[href^="/kvartiralar/"].group');
  if (cards.length > 0) {
      await cards[0].click();
      // Wait for modal to appear and animation to finish
      await new Promise(r => setTimeout(r, 2000));
      
      await page.screenshot({ path: '/Users/xusan/.gemini/antigravity/brain/ed59eafc-7bb3-457b-8e92-99d680b9b308/new_cta_preview.png' });
      console.log('Screenshot saved to /Users/xusan/.gemini/antigravity/brain/ed59eafc-7bb3-457b-8e92-99d680b9b308/new_cta_preview.png');
  } else {
      console.log('Could not find apartment cards');
  }
  
  await browser.close();
})();
