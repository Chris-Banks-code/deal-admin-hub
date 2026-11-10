DO $$
DECLARE p1 uuid; p2 uuid; so uuid; d uuid; x record;
BEGIN
 BEGIN
 INSERT INTO public.products(name,unit_price,commission_rate,agent_pct,supervisor_pct,manager_pct) VALUES ('Commission check A',1000,10,40,20,10) RETURNING id INTO p1;
 INSERT INTO public.products(name,unit_price,commission_rate,agent_pct,supervisor_pct,manager_pct) VALUES ('Commission check B',1000,20,50,10,5) RETURNING id INTO p2;
 INSERT INTO public.sales_orders(status,subtotal,total) VALUES ('draft',2000,2000) RETURNING id INTO so;
 INSERT INTO public.sales_order_items(sales_order_id,product_id,product_name,quantity,unit_price,subtotal) VALUES (so,p1,'Commission check A',1,1000,1000),(so,p2,'Commission check B',1,1000,1000);
 SELECT * INTO x FROM public.sales_orders WHERE id=so;
 IF x.agent_commission_total<>140 OR x.supervisor_commission_total<>40 OR x.manager_commission_total<>20 THEN RAISE EXCEPTION 'Admin product split failed'; END IF;
 UPDATE public.products SET agent_pct=10 WHERE id=p1;
 UPDATE public.sales_orders SET agent_commission_total=180 WHERE id=so;
 SELECT * INTO x FROM public.sales_orders WHERE id=so;
 IF x.agent_commission_total<>140 THEN RAISE EXCEPTION 'Snapshot protection failed'; END IF;
 INSERT INTO public.deals(deal_value,status,currency) VALUES (2000,'pending_admin','LRD') RETURNING id INTO d;
 INSERT INTO public.order_items(deal_id,product_id,product_name,quantity,unit_price,subtotal) VALUES (d,p1,'Commission check A',1,1000,1000),(d,p2,'Commission check B',1,1000,1000);
 UPDATE public.deals SET agent_commission=999 WHERE id=d;
 SELECT * INTO x FROM public.deals WHERE id=d;
 IF x.agent_commission<>110 OR x.supervisor_commission<>40 OR x.operation_manager_commission<>20 OR x.commission_amount<>300 THEN RAISE EXCEPTION 'Agent product split failed'; END IF;
 RAISE EXCEPTION SQLSTATE 'ZX001' USING MESSAGE='Product commission tests passed; discard test records';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN RAISE NOTICE 'Admin and agent product split tests passed; temporary data rolled back';
 END;
END $$;