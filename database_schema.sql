-- Tabel untuk menyimpan pesanan
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canteen_id UUID NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  total_amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_method VARCHAR(50) DEFAULT 'QRIS',
  payment_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel untuk item pesanan
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  variant VARCHAR(100),
  price INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_canteen_id ON orders(canteen_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_id ON order_items(menu_id);

-- Trigger untuk update updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa lihat pesanan mereka sendiri
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: User bisa insert pesanan mereka sendiri
CREATE POLICY "Users can insert their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa lihat item dari pesanan mereka
CREATE POLICY "Users can view their order items"
  ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

-- Policy: User bisa insert item pesanan mereka
CREATE POLICY "Users can insert their order items"
  ON order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

-- Policy: Penjual bisa lihat pesanan di kantin mereka
CREATE POLICY "Sellers can view orders in their canteen"
  ON orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM canteens
    WHERE canteens.id = orders.canteen_id
    AND canteens.user_id = auth.uid()
  ));

-- Policy: Penjual bisa update status pesanan di kantin mereka
CREATE POLICY "Sellers can update orders in their canteen"
  ON orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM canteens
    WHERE canteens.id = orders.canteen_id
    AND canteens.user_id = auth.uid()
  ));

-- Storage bucket untuk bukti pembayaran (jalankan di Supabase Dashboard -> Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- Policy storage: User bisa upload bukti bayar mereka
-- CREATE POLICY "Users can upload their payment proofs"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy storage: User bisa download bukti bayar mereka
-- CREATE POLICY "Users can view their payment proofs"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
