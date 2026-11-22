/** The whole database layout. `node scripts/db-setup.mjs` applies it (safe to run again). */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name_ar text NOT NULL, name_en text NOT NULL,
  blurb_ar text NOT NULL DEFAULT '', blurb_en text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name_ar text NOT NULL, name_en text NOT NULL,
  desc_ar text NOT NULL DEFAULT '', desc_en text NOT NULL DEFAULT '',
  category_id text NOT NULL REFERENCES categories(id) ON UPDATE CASCADE,
  hex text NOT NULL DEFAULT '#0E3A33',
  art text NOT NULL DEFAULT '#F4ECDC',
  image text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft',
  tags jsonb NOT NULL DEFAULT '[]',
  details jsonb NOT NULL DEFAULT '{}',
  sort integer NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category_id);

CREATE TABLE IF NOT EXISTS variants (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  key text NOT NULL,
  label_ar text NOT NULL DEFAULT '', label_en text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price > 0),
  compare_at integer,
  cost integer,
  stock integer CHECK (stock IS NULL OR stock >= 0),
  threshold integer NOT NULL DEFAULT 5,
  sort integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, key)
);

CREATE SEQUENCE IF NOT EXISTS order_seq START 1001;

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  created_at bigint NOT NULL,
  source text NOT NULL DEFAULT 'web',
  status text NOT NULL DEFAULT 'new',
  customer jsonb NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  lines jsonb NOT NULL,
  subtotal integer NOT NULL,
  discount jsonb,
  shipping jsonb,
  total integer NOT NULL,
  refunds jsonb NOT NULL DEFAULT '[]',
  pay_method text NOT NULL DEFAULT 'cod',
  paid boolean NOT NULL DEFAULT false,
  pay_discount integer NOT NULL DEFAULT 0,
  gift jsonb,
  tracking jsonb NOT NULL DEFAULT '{"courier":"","number":""}',
  internal_note text NOT NULL DEFAULT '',
  timeline jsonb NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  created_at bigint NOT NULL,
  name text NOT NULL, contact text NOT NULL, topic text NOT NULL DEFAULT '', body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS messages_created_idx ON messages (created_at DESC);

CREATE TABLE IF NOT EXISTS adjustments (
  id text PRIMARY KEY,
  at bigint NOT NULL,
  product_id text NOT NULL,
  variant_key text NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  note text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS adjustments_at_idx ON adjustments (at DESC);

CREATE TABLE IF NOT EXISTS discounts (
  id text PRIMARY KEY,
  code text NOT NULL,
  type text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  min_subtotal integer NOT NULL DEFAULT 0,
  usage_limit integer,
  used integer NOT NULL DEFAULT 0,
  starts_at bigint,
  ends_at bigint,
  scope text NOT NULL DEFAULT 'all',
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS discounts_code_idx ON discounts (lower(code));

CREATE TABLE IF NOT EXISTS shipping_rates (
  id text PRIMARY KEY,
  name_ar text NOT NULL DEFAULT '', name_en text NOT NULL DEFAULT '',
  cities jsonb NOT NULL DEFAULT '[]',
  price integer NOT NULL DEFAULT 0,
  free_over integer,
  eta_ar text NOT NULL DEFAULT '', eta_en text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS hits (
  key text NOT NULL,
  at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS hits_key_idx ON hits (key, at);
`;
