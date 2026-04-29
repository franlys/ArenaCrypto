CREATE TABLE IF NOT EXISTS platform_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Everyone can read platform_settings"
    ON platform_settings FOR SELECT
    USING (true);

-- Only admins can update
CREATE POLICY "Admins can update platform_settings"
    ON platform_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert platform_settings"
    ON platform_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Initial data
INSERT INTO platform_settings (key, value)
VALUES ('features', '{"sports": false, "gaming": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
