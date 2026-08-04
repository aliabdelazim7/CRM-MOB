const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

function check(query) {
    const el = document.querySelector(query);
    if (el) console.log(query + ' FOUND');
    else console.log(query + ' NOT FOUND');
}

check('#productCollection');
check('#collectionFilter');
check('#productSupplier');
check('#platformDiscountsList');
check('#colorsContainer');
check('#productModal .modal-header h3');
