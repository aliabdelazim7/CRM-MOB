import re
with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('id="productModal"')
if idx == -1:
    print('productModal not found')
else:
    print('productModal found')
    # get 500 characters after productModal
    subcontent = content[idx:idx+500]
    if '<h3' in subcontent:
        print('h3 found inside productModal')
    else:
        print('h3 NOT FOUND inside productModal')
        print(subcontent)
