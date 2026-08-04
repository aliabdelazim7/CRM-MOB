with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('e:/CRM/تعديلات عميل/hierarchy_out.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines):
        if 'id="users"' in line:
            out.write(f'Line {i+1}: {line}')
            
            # print 5 preceding non-empty lines
            count = 0
            j = i - 1
            while j >= 0 and count < 5:
                if lines[j].strip():
                    out.write(f'Preceding: {lines[j]}')
                    count += 1
                j -= 1
            break
