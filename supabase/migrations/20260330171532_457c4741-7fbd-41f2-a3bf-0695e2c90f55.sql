
-- Enable RLS on order_items and wholesaler_locations
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesaler_locations ENABLE ROW LEVEL SECURITY;
