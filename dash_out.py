with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find('id="dashboard"')
if idx != -1:
    with open('e:/CRM/تعديلات عميل/dash_out.txt', 'w', encoding='utf-8') as out:
        out.write(content[idx:idx+2500])
