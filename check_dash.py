with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('id="dashboard"')
if idx != -1: print(content[idx:idx+1500])
