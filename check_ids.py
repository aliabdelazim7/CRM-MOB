with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()

ids_to_check = [
    'productName', 'productCode', 'productBarcode', 'productCollection', 
    'productSupplier', 'purchasePrice', 'sellingPrice', 'minStock', 
    'noonPrice', 'noonCommission', 'noonShipping', 'jumiaPrice', 
    'jumiaCommission', 'jumiaShipping', 'siteAdsExpense', 'jumiaAdsExpense', 
    'noonAdsExpense', 'amazonPrice', 'amazonCommission', 'amazonAdsExpense', 
    'otherPrice', 'productImageUrl', 'productImage'
]

missing_ids = []
for idx in ids_to_check:
    if f'id="{idx}"' not in content and f"id='{idx}'" not in content:
        missing_ids.append(idx)

print('Missing IDs:', missing_ids)
