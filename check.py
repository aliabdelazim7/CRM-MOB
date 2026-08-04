with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()
if 'id="productBarcode"' in content or "id='productBarcode'" in content:
    print('productBarcode FOUND')
else:
    print('productBarcode NOT FOUND')
