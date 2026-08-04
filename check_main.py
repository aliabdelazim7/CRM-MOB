with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()

main_content_start = content.find('class="main-content"')
if main_content_start != -1:
    with open('e:/CRM/تعديلات عميل/out.txt', 'w', encoding='utf-8') as out:
        out.write(content[main_content_start:main_content_start+1000])
