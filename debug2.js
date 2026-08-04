const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Capture console messages
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    console.log('Navigating to local HTML file...');
    await page.goto('file:///e:/CRM/تعديلات عميل/__سيتسم hances_.html', { waitUntil: 'networkidle0' });
    
    // Wait for 1 second to ensure JS initializes
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('Looking for Add Product button...');
    const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.textContent.includes('إضافة منتج'));
        if (addBtn) {
            console.log('Found Add Product button. Clicking...');
            addBtn.click();
            return true;
        }
        return false;
    });
    
    if (clicked) {
        console.log('Button clicked! Waiting for modal to open...');
        await new Promise(r => setTimeout(r, 1000)); // wait for modal animation
        
        // Check if modal is visible
        const modalDisplay = await page.evaluate(() => {
            const modal = document.getElementById('productModal');
            return modal ? window.getComputedStyle(modal).display : 'null';
        });
        
        console.log('Modal display style:', modalDisplay);
        
        if (modalDisplay === 'block') {
            console.log('SUCCESS! Modal opened correctly.');
            await page.screenshot({ path: 'e:/CRM/تعديلات عميل/modal_test_screenshot.png' });
            console.log('Screenshot saved to modal_test_screenshot.png');
        } else {
            console.log('ERROR: Modal did not open! display is', modalDisplay);
            await page.screenshot({ path: 'e:/CRM/تعديلات عميل/error_screenshot.png' });
        }
    } else {
        console.log('ERROR: Add Product button not found.');
    }
    
    await browser.close();
    console.log('Test completed.');
})().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
