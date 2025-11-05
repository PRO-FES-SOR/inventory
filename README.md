
# Unified Ops Starter (Next.js + Supabase + Scanner)

Mobile-first web app for **order scanning + inventory management** with Supabase.

## Quick Start
1. Create a Supabase project, copy the `NEXT_PUBLIC_SUPABASE_URL` and `ANON` key into `.env.local`.
2. Run the SQL below in Supabase SQL editor.
3. `npm i && npm run dev` (or `pnpm` / `yarn`).
4. Open `/scan` on a phone to start scanning.

## Minimal SQL (tables + RPC)
> This is a compact version. If you already created the full schema earlier, just add the RPC `scan_order_product` and `dashboard_kpis` here.

```sql
-- products
create table if not exists public.products(
  id uuid primary key default gen_random_uuid(),
  name text,
  sku text unique,
  barcode text unique,
  stock_qty int not null default 0,
  price numeric(10,2),
  category text,
  created_at timestamptz not null default now()
);

-- orders (very basic for demo; feel free to replace with your existing schema)
create type order_state as enum ('created','processed','shipped','in_transit','delivered','cancelled');
create table if not exists public.orders(
  id bigserial primary key,
  channel text not null default 'Website',
  channel_order_id text,
  state order_state not null default 'created',
  awb text,
  created_at timestamptz not null default now()
);

-- order_items
create table if not exists public.order_items(
  id bigserial primary key,
  order_id bigint references public.orders(id) on delete cascade,
  sku text not null,
  expected_qty int not null default 1
);

-- picks (scan logs)
create table if not exists public.picks(
  id uuid primary key default gen_random_uuid(),
  order_id bigint references public.orders(id) on delete cascade,
  sku text not null,
  scanned_qty int not null default 1,
  picker_id uuid,
  scanned_at timestamptz not null default now()
);

-- inventory logs
create table if not exists public.inventory_logs(
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  change_type text,
  qty_change int,
  ref_order_id bigint,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Auto decrement on pick insert
create or replace function reduce_stock_on_scan()
returns trigger as $$
begin
  update products set stock_qty = stock_qty - new.scanned_qty
  where sku = new.sku;
  insert into inventory_logs(product_id, change_type, qty_change, ref_order_id, created_by)
    select p.id, 'order_scan', -new.scanned_qty, new.order_id, new.picker_id
    from products p where p.sku = new.sku;
  -- Mark order processed if at least one scan
  update orders set state='processed' where id=new.order_id and state='created';
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reduce_stock on picks;
create trigger trg_reduce_stock after insert on picks
for each row execute function reduce_stock_on_scan();

-- View for dashboard KPIs
create or replace function dashboard_kpis()
returns json language sql as $$
  with t as (
    select
      count(*) filter (where state='processed') as processed,
      count(*) filter (where state='shipped') as shipped,
      count(*) filter (where state='in_transit') as in_transit,
      count(*) filter (where state='delivered') as delivered,
      (select count(*) from products where stock_qty < 10) as low_stock
    from orders
  )
  select to_json(t) from t;
$$;

-- RPC to scan order label + product barcode in one shot
-- Expects: order label (channel_order_id or awb) and product barcode
create or replace function scan_order_product(p_order_label text, p_barcode text)
returns json as $$
declare
  v_order_id bigint;
  v_sku text;
begin
  -- find order by AWB or channel_order_id
  select id into v_order_id from orders
   where awb = p_order_label or channel_order_id = p_order_label
   order by id desc limit 1;
  if v_order_id is null then
    return json_build_object('ok', false, 'message','Order not found');
  end if;

  -- map barcode -> sku
  select sku into v_sku from products where barcode = p_barcode or sku = p_barcode;
  if v_sku is null then
    return json_build_object('ok', false, 'message','Product not found for this barcode');
  end if;

  -- create pick record (this will auto decrement inventory via trigger)
  insert into picks(order_id, sku, scanned_qty) values (v_order_id, v_sku, 1);

  return json_build_object('ok', true, 'message', 'Scan recorded', 'order_id', v_order_id, 'sku', v_sku);
end;
$$ language plpgsql;
```

## Notes
- This starter calls Supabase **directly from the client**. For stricter security, move writes into **Edge Functions** and use RLS.
- Replace the demo schema with your robust schema when ready.

## Scripts
```bash
npm i
cp .env.example .env.local   # fill with Supabase URL + ANON KEY
npm run dev
```
