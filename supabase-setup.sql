create extension if not exists pgcrypto;

create table if not exists public.products (
    id text primary key,
    name text not null,
    category text not null,
    price numeric(10, 2) not null default 0,
    stock_shelf integer not null default 0,
    stock_reserve integer not null default 0,
    image text not null default '',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
    id text primary key,
    label text not null
);

create table if not exists public.sales (
    id uuid primary key default gen_random_uuid(),
    sale_date date not null default current_date,
    created_at timestamptz not null default timezone('utc', now()),
    total numeric(10, 2) not null default 0,
    created_by_email text not null default '',
    created_by_label text not null default ''
);

create table if not exists public.sale_items (
    id bigint generated always as identity primary key,
    sale_id uuid not null references public.sales(id) on delete cascade,
    product_id text not null,
    source_product_id text not null,
    name text not null,
    qty integer not null default 1,
    price numeric(10, 2) not null default 0,
    stock_step integer not null default 1
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create or replace function public.change_product_stock(
    p_product_id text,
    p_stock_shelf_delta integer default 0,
    p_stock_reserve_delta integer default 0
)
returns public.products
language plpgsql
security definer
as $$
declare
    updated_product public.products;
begin
    update public.products
    set
        stock_shelf = stock_shelf + p_stock_shelf_delta,
        stock_reserve = stock_reserve + p_stock_reserve_delta
    where id = p_product_id
    and stock_shelf + p_stock_shelf_delta >= 0
    and stock_reserve + p_stock_reserve_delta >= 0
    returning * into updated_product;

    if updated_product.id is null then
        raise exception 'Stock insuffisant ou produit introuvable.';
    end if;

    return updated_product;
end;
$$;

create or replace function public.rename_category(
    p_old_id text,
    p_new_id text,
    p_new_label text
)
returns void
language plpgsql
security definer
as $$
begin
    if p_old_id = p_new_id then
        update public.categories
        set label = p_new_label
        where id = p_old_id;
    else
        insert into public.categories (id, label)
        values (p_new_id, p_new_label);

        update public.products
        set category = p_new_id
        where category = p_old_id;

        delete from public.categories
        where id = p_old_id;
    end if;
end;
$$;

create or replace function public.delete_category_and_reassign_products(
    p_category_id text,
    p_fallback_category_id text
)
returns void
language plpgsql
security definer
as $$
begin
    update public.products
    set category = p_fallback_category_id
    where category = p_category_id;

    delete from public.categories
    where id = p_category_id;
end;
$$;

create or replace function public.delete_sale_and_restore_stock(p_sale_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    sale_item record;
begin
    for sale_item in
        select *
        from public.sale_items
        where sale_id = p_sale_id
    loop
        perform public.change_product_stock(
            sale_item.source_product_id,
            sale_item.qty * sale_item.stock_step,
            0
        );
    end loop;

    delete from public.sales
    where id = p_sale_id;
end;
$$;

alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "Authenticated users can read categories" on public.categories;
create policy "Authenticated users can read categories"
on public.categories
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert categories" on public.categories;
create policy "Authenticated users can insert categories"
on public.categories
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update categories" on public.categories;
create policy "Authenticated users can update categories"
on public.categories
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete categories" on public.categories;
create policy "Authenticated users can delete categories"
on public.categories
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read products" on public.products;
create policy "Authenticated users can read products"
on public.products
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert products" on public.products;
create policy "Authenticated users can insert products"
on public.products
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update products" on public.products;
create policy "Authenticated users can update products"
on public.products
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Authenticated users can delete products"
on public.products
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read sales" on public.sales;
create policy "Authenticated users can read sales"
on public.sales
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert sales" on public.sales;
create policy "Authenticated users can insert sales"
on public.sales
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can delete sales" on public.sales;
create policy "Authenticated users can delete sales"
on public.sales
for delete
to authenticated
using (true);

drop policy if exists "Authenticated users can read sale items" on public.sale_items;
create policy "Authenticated users can read sale items"
on public.sale_items
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert sale items" on public.sale_items;
create policy "Authenticated users can insert sale items"
on public.sale_items
for insert
to authenticated
with check (true);

do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'categories'
    ) then
        execute 'alter publication supabase_realtime add table public.categories';
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'products'
    ) then
        execute 'alter publication supabase_realtime add table public.products';
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sales'
    ) then
        execute 'alter publication supabase_realtime add table public.sales';
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sale_items'
    ) then
        execute 'alter publication supabase_realtime add table public.sale_items';
    end if;
end $$;
