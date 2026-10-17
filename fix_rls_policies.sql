-- Fix RLS policies untuk orders dan order_items

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies jika ada (opsional, kalau mau clean)
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;

-- Policy: User bisa insert pesanan mereka sendiri
CREATE POLICY "Users can insert their own orders"
  ON orders 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: User bisa lihat pesanan mereka sendiri
CREATE POLICY "Users can view their own orders"
  ON orders 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: User bisa insert item pesanan mereka
CREATE POLICY "Users can insert order items"
  ON order_items 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Policy: User bisa lihat item dari pesanan mereka
CREATE POLICY "Users can view their order items"
  ON order_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Policy: Penjual bisa lihat pesanan di kantin mereka
CREATE POLICY "Sellers can view orders in their canteen"
  ON orders 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM canteens
      WHERE canteens.id = orders.canteen_id
      AND canteens.owner_id = auth.uid()
    )
  );

-- Policy: Penjual bisa update status pesanan di kantin mereka
CREATE POLICY "Sellers can update orders in their canteen"
  ON orders 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM canteens
      WHERE canteens.id = orders.canteen_id
      AND canteens.owner_id = auth.uid()
    )
  );
