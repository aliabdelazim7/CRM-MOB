const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    console.log('Starting E2E Dashboard Test...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('file:///e:/CRM/تعديلات عميل/__سيتسم hances_.html', { waitUntil: 'networkidle0' });
    
    // 1. Clear Data to start fresh
    await page.evaluate(() => {
        localStorage.clear();
        location.reload();
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log('Data cleared.');

    // 2. Inject Test Data Directly via JS to bypass complex UI interactions
    // This tests the logic of the Dashboard and core functions, which is what we fixed.
    await page.evaluate(() => {
        // Add a supplier
        suppliers.push("مورد تيست");
        
        // Add a product (Cost: 100, Selling: 200, Noon Com: 10%, Noon Ship: 15)
        const product = {
            id: 1,
            name: "منتج تيست",
            productCode: "T123",
            barcode: "T123",
            category: "test",
            purchasePrice: 100,
            sellingPrice: 200,
            noonPrice: 200,
            noonCommission: 10,
            noonShipping: 15,
            quantity: 100,
            totalQuantity: 100,
            colors: [],
            platformDiscounts: [],
            customStores: [],
            dateAdded: new Date().toISOString()
        };
        products.push(product);
        
        // Add an expense (50)
        expenses.push({
            id: 1,
            amount: 50,
            type: "تسويق",
            date: new Date().toISOString(),
            notes: "إعلان",
            confirmed: true
        });
        
        // Add an invoice (Qty: 2, Noon Platform)
        // Unit Price: 200, Quantity: 2 => grossTotal = 400
        const invoice = {
            id: 1,
            customerName: "عميل تيست",
            customerPhone: "010000",
            customerAddress: "Test",
            platform: "noon",
            paymentMethod: "cash",
            deliveryStatus: "delivered", // Must be delivered for dashboard
            commissionPercent: 10, // 10%
            shipping: 30, // 2 items * 15 shipping
            items: [
                {
                    productId: 1,
                    quantity: 2,
                    unitPrice: 200, // sellingAmount = 400
                    purchasePrice: 100 // Test if our code uses this or falls back to product
                }
            ],
            grossTotal: 400,
            totalCommission: 40,
            totalShipping: 30,
            netTotal: 330, // Just a placeholder, dashboard calculates independently
            date: new Date().toISOString()
        };
        invoices.push(invoice);
        
        // Save data to sync
        saveData();
        
        // Trigger Dashboard update
        updateDashboard();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 3. Read Dashboard Values
    const dashboardValues = await page.evaluate(() => {
        return {
            revenue: document.getElementById('totalRevenue').textContent,
            expenses: document.getElementById('totalExpenses').textContent,
            grossProfit: document.getElementById('grossProfit').textContent,
            netProfit: document.getElementById('netProfit').textContent,
            avgProfit: document.getElementById('avgProfitPerUnit').textContent
        };
    });
    
    console.log('\n--- DASHBOARD RESULTS ---');
    console.log('Revenue (Expected: 400.00 جنيه):', dashboardValues.revenue);
    console.log('Expenses (Expected: 50.00 جنيه):', dashboardValues.expenses);
    console.log('Gross Profit (Expected: 400 - 200(cost) - 40(com) - 30(ship) - 56(tax) = 74.00 جنيه):', dashboardValues.grossProfit);
    console.log('Net Profit (Expected: 74 - 50 = 24.00 جنيه):', dashboardValues.netProfit);
    console.log('Avg Profit/Unit (Expected: 24 / 2 = 12.00 جنيه):', dashboardValues.avgProfit);
    console.log('-------------------------\n');
    
    await page.screenshot({ path: 'e:/CRM/تعديلات عميل/e2e_dashboard_test.png' });
    console.log('Screenshot saved to e2e_dashboard_test.png');
    
    await browser.close();
})().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
