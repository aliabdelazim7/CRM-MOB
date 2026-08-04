const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    
    // Capture page errors
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('file:///e:/CRM/تعديلات عميل/__سيتسم hances_.html', { waitUntil: 'networkidle0' });
    
    console.log('Page loaded. Clicking Add Product button...');
    
    // Find the first Add Product button and click it
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.textContent.includes('إضافة منتج'));
        if (addBtn) {
            console.log('Found Add Product button. Clicking...');
            addBtn.click();
        } else {
            console.log('Add Product button not found!');
        }
    });
    
    // Wait a bit for modal to appear or error to be logged
    await page.waitForTimeout(2000);
    
    console.log('Done.');
    await browser.close();
})();
