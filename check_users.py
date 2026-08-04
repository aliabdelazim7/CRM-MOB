with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('id="users"')
if start != -1:
    with open('e:/CRM/تعديلات عميل/users_out.txt', 'w', encoding='utf-8') as out:
        out.write(content[start:start+2000])
