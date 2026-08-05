-- ============================================================
-- تصفير قاعدة البيانات وإضافة منتجات ديمو متكاملة لـ HANCES PRO
-- (ساعات، سلاسل، أساور، شنط، إكسسوارات)
-- شغّل هذا السكريبت في Supabase SQL Editor لتصفير الداتا القديمة بالكامل
-- ============================================================

-- 1. تصفير البيانات القديمة والمعاملات المخزنة
truncate table order_items cascade;
truncate table orders cascade;
truncate table purchase_items cascade;
truncate table purchase_invoices cascade;
truncate table supplier_transactions cascade;
truncate table supplier_ledger cascade;
truncate table stock_movement_logs cascade;
truncate table stock_transfer_items cascade;
truncate table stock_transfers cascade;
truncate table logistics_orders cascade;
truncate table expenses cascade;
truncate table financing_transactions cascade;
truncate table financing_payments cascade;
truncate table financing_accounts cascade;
truncate table employee_transactions cascade;
truncate table employee_leaves cascade;
truncate table cashier_notes cascade;
truncate table product_suggestions cascade;
delete from products;
delete from categories;
delete from suppliers;
delete from customers;

-- تصفير عداد الفواتير ليصبح 1
update invoice_counter set current_value = 1 where id = 1;

-- 2. إعدادات المتجر الهوية الرسمية
insert into store_settings (name, currency, tax_rate, theme_color, initial_balance)
select 'HANCES PRO — للساعات والإكسسوارات والشنط', 'ج.م', 0, '#4f46e5', 0
where not exists (select 1 from store_settings);

update store_settings set name = 'HANCES PRO — للساعات والإكسسوارات والشنط' where true;

-- 3. إضافة الكوليكشنات والتصنيفات الأساسية
alter table categories add column if not exists image_url text;

insert into categories (name, image_url) values
  ('ساعات', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60'),
  ('سلاسل', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&auto=format&fit=crop&q=60'),
  ('أساور', 'https://images.unsplash.com/photo-1611591475143-4f8a7795ecdb?w=500&auto=format&fit=crop&q=60'),
  ('شنط',   'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=60'),
  ('خواتم ودلايات', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=60'),
  ('محافظ وإكسسوارات جلدية', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&auto=format&fit=crop&q=60'),
  ('نظارات شمسية فاخرة', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=60'),
  ('بوكسات هدايا وتغليف', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60')
on conflict do nothing;

-- 4. إضافة منتجات ديمو واقعية لكل كوليكشن
insert into products (name, barcode, purchase_price, average_purchase_price, sale_price, stock_quantity, category_id) values
-- ساعات
('ساعة رولكس دايتونا ستيل مينا سوداء',        '1001', 1800, 1800, 2800, 20, (select id from categories where name='ساعات' limit 1)),
('ساعة كاسيو إيديفيس كلاسيك سبورت',         '1002', 700,  700,  1250, 30, (select id from categories where name='ساعات' limit 1)),
('ساعة كارتييه سانتوس جلد بني فاخر',          '1003', 1950, 1950, 3100, 15, (select id from categories where name='ساعات' limit 1)),
('ساعة أوميغا سيمستر استيل رجالي',            '1004', 2200, 2200, 3600, 12, (select id from categories where name='ساعات' limit 1)),
('ساعة نسائية روز جولد بفصوص كريستال',       '1005', 500,  500,  950,  35, (select id from categories where name='ساعات' limit 1)),
('ساعة سمارت ووتش الترا شاشة أموليد',        '1006', 600,  600,  1050, 45, (select id from categories where name='ساعات' limit 1)),
('ساعة هوبلوت أوتوماتيك مطاط أسود',           '1007', 1500, 1500, 2450, 18, (select id from categories where name='ساعات' limit 1)),

-- سلاسل
('سلسلة فضة إيطالي عيار 925 دلاية قلب',       '2001', 300,  300,  520,  40, (select id from categories where name='سلاسل' limit 1)),
('سلسلة ذهب صيني لون ثابت دلاية فراشة',      '2002', 130,  130,  260,  60, (select id from categories where name='سلاسل' limit 1)),
('عقد لؤلؤ طبيعي كلاسيك أنيق',              '2003', 480,  480,  890,  25, (select id from categories where name='سلاسل' limit 1)),
('سلسلة رجالي كارتييه ستيل ذهبي',             '2004', 210,  210,  390,  35, (select id from categories where name='سلاسل' limit 1)),
('سلسلة نسائية طبقات متعددة Layered',         '2005', 180,  180,  340,  30, (select id from categories where name='سلاسل' limit 1)),
('كوليه سهرة سواريه بفصوص زيركون',           '2006', 420,  420,  790,  20, (select id from categories where name='سلاسل' limit 1)),

-- أساور
('إسوارة كارتييه لوف ستيل ذهبي مع مفك',       '3001', 340,  340,  620,  35, (select id from categories where name='أساور' limit 1)),
('إسوارة فان كليف أربيلس 5 وردات',          '3002', 310,  310,  580,  40, (select id from categories where name='أساور' limit 1)),
('بوشرون إسوارة عريضة جولد براقة',           '3003', 380,  380,  690,  25, (select id from categories where name='أساور' limit 1)),
('أسوارة جلد رجالي مع قفل استيل مميز',        '3004', 150,  150,  290,  45, (select id from categories where name='أساور' limit 1)),
('طقم أساور تنس فصوص زيركون ناصعة',          '3005', 280,  280,  520,  30, (select id from categories where name='أساور' limit 1)),
('إسوارة فضة حريمي مرصعة بأحجار زرقاء',       '3006', 330,  330,  620,  22, (select id from categories where name='أساور' limit 1)),

-- شنط
('شنطة يد كوتش جلد طبيعي لون بيج',          '4001', 900,  900,  1550, 18, (select id from categories where name='شنط' limit 1)),
('شنطة كروس شانيل غطاء حزام سلسلة',         '4002', 980,  980,  1720, 15, (select id from categories where name='شنط' limit 1)),
('شنطة ظهر لويس فيتون مونوغرام',             '4003', 1150, 1150, 1950, 12, (select id from categories where name='شنط' limit 1)),
('شنطة يد حريمي كلاسيك برادا سوداء',          '4004', 950,  950,  1650, 16, (select id from categories where name='شنط' limit 1)),
('شنطة يد وسط مايكل كورس جولد',             '4005', 820,  820,  1420, 20, (select id from categories where name='شنط' limit 1)),
('حقيبة يد نسائية للمناسبات والسهرة',         '4006', 450,  450,  820,  25, (select id from categories where name='شنط' limit 1)),

-- خواتم ودلايات
('خاتم توينز فضة إيطالي فصوص زيركون',       '5001', 230,  230,  420,  35, (select id from categories where name='خواتم ودلايات' limit 1)),
('خاتم سوليتير أنيق لون فضي لميع',           '5002', 190,  190,  360,  40, (select id from categories where name='خواتم ودلايات' limit 1)),
('دبلة رجالي تيتانيوم أسود مطفأ',             '5003', 140,  140,  270,  45, (select id from categories where name='خواتم ودلايات' limit 1)),
('دلاية فضة عيار 925 شكل ما شاء الله',        '5004', 160,  160,  310,  30, (select id from categories where name='خواتم ودلايات' limit 1)),

-- محافظ وإكسسوارات جلدية
('محفظة رجالي جلد طبيعي تومي',               '6001', 190,  190,  360,  45, (select id from categories where name='محافظ وإكسسوارات جلدية' limit 1)),
('محفظة كروت ذكية ألومنيوم ضد السرقة',        '6002', 95,   95,   210,  55, (select id from categories where name='محافظ وإكسسوارات جلدية' limit 1)),
('بورتفيه نسائي سواريه جلد طبيعي',           '6003', 310,  310,  550,  30, (select id from categories where name='محافظ وإكسسوارات جلدية' limit 1)),
('حزام رجالي جلد طبيعي قفل اتوماتيك',        '6004', 180,  180,  340,  35, (select id from categories where name='محافظ وإكسسوارات جلدية' limit 1)),

-- نظارات شمسية فاخرة
('نظارة شمسية راي بان أفياتور كلاسيك',        '7001', 450,  450,  820,  25, (select id from categories where name='نظارات شمسية فاخرة' limit 1)),
('نظارة شمسية كارتييه فريم جولد',             '7002', 620,  620,  1050, 18, (select id from categories where name='نظارات شمسية فاخرة' limit 1)),
('نظارة شمسية حريمي كات آي ديور',            '7003', 500,  500,  890,  22, (select id from categories where name='نظارات شمسية فاخرة' limit 1)),

-- بوكسات هدايا وتغليف
('علبة هدايا قطيفة فاخرة للساعات والأسورة',    '8001', 50,   50,   110,  100, (select id from categories where name='بوكسات هدايا وتغليف' limit 1)),
('بوكس هدايا VIP مجمع (ساعة + سلسلة + قلم + محفظة)', '8002', 800, 800, 1450, 20, (select id from categories where name='بوكسات هدايا وتغليف' limit 1))
on conflict (barcode) do nothing;
