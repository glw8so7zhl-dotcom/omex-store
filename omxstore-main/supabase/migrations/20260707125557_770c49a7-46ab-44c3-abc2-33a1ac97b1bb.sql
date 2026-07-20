
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  governorate text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  notes text NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cod','bank_transfer')),
  subtotal numeric(12,2) NOT NULL,
  shipping numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  whatsapp_sent boolean NOT NULL DEFAULT false
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  line_total numeric(12,2) NOT NULL
);

CREATE INDEX orders_user_id_idx ON public.orders(user_id);
CREATE INDEX order_items_order_id_idx ON public.order_items(order_id);

-- GRANTS
GRANT INSERT ON public.orders TO anon;
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders: anyone can insert (guest checkout). Only owner can read/update their own orders.
CREATE POLICY "Anyone can create an order"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users read own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Order items: mirror parent access via EXISTS check on order.
CREATE POLICY "Anyone can create order items"
  ON public.order_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users read own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  ));
