import sys

with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = """// Get pending debts
const pendingDebts = debts ? debts.filter(d => !d.paid || d.paid < d.amount).length : 0;"""

replacement = """// Get pending debts
const allDebts = [...(typeof customerDebts !== "undefined" ? customerDebts : []), ...(typeof supplierDebts !== "undefined" ? supplierDebts : [])];
const pendingDebts = allDebts.filter(d => !d.paid || d.paid < d.amount).length;"""

new_content = content.replace(target, replacement)
if new_content != content:
    with open('e:/CRM/تعديلات عميل/__سيتسم hances_.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replaced successfully')
else:
    print('Target not found')
