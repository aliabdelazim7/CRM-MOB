-- إنشاء جدول تحصيلات المنصات وشركات الشحن
CREATE TABLE IF NOT EXISTS platform_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('platform', 'carrier')),
    entity_name TEXT NOT NULL,
    month TEXT NOT NULL, -- e.g., '2023-10'
    expected_amount NUMERIC DEFAULT 0,
    collected_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- سياسات الأمان RLS
ALTER TABLE platform_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to platform_collections"
    ON platform_collections
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
