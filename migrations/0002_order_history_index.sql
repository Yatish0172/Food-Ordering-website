CREATE INDEX IF NOT EXISTS idx_orders_status_updated
  ON orders(status, updated_at DESC);