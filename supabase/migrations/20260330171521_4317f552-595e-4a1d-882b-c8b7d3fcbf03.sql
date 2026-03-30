
-- Create a security definer function to check admin/op manager roles
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'operation_manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
$$;

-- Profiles: admin/op_manager can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_admin_or_manager());

-- Admins can update any profile
CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (public.is_admin());

-- Deals: admin/op_manager can view all deals
CREATE POLICY "Admins can view all deals" ON public.deals
FOR SELECT TO authenticated
USING (public.is_admin_or_manager());

-- Admins/op_managers can update deals (approve/reject)
CREATE POLICY "Admins can update all deals" ON public.deals
FOR UPDATE TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

-- Admins can delete deals
CREATE POLICY "Admins can delete deals" ON public.deals
FOR DELETE TO authenticated
USING (public.is_admin());

-- Clients: admin can view all clients
CREATE POLICY "Admins can view all clients" ON public.clients
FOR SELECT TO authenticated
USING (public.is_admin());

-- Admins can insert clients
CREATE POLICY "Admins can insert clients" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- Admins can update clients
CREATE POLICY "Admins can update clients" ON public.clients
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admins can delete clients
CREATE POLICY "Admins can delete clients" ON public.clients
FOR DELETE TO authenticated
USING (public.is_admin());

-- Commissions: admin/op_manager can view all
CREATE POLICY "Admins can view all commissions" ON public.commissions
FOR SELECT TO authenticated
USING (public.is_admin_or_manager());

-- Admins can manage commissions
CREATE POLICY "Admins can update commissions" ON public.commissions
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Products: admin can manage
CREATE POLICY "Admins can insert products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products" ON public.products
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products" ON public.products
FOR DELETE TO authenticated
USING (public.is_admin());

-- Order items: admin/op_manager can view all
CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT TO authenticated
USING (public.is_admin_or_manager());

-- Wholesaler locations: everyone authenticated can view
CREATE POLICY "Authenticated can view locations" ON public.wholesaler_locations
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage locations" ON public.wholesaler_locations
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
