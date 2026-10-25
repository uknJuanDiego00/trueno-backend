-- =====================================================================
-- MIGRATION: 20261025_001_initial_schema.sql
-- TRUENO 219 - PostgreSQL Relational Database Schema with Supabase
-- =====================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. STORE SETTINGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'Trueno 219',
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    currency TEXT NOT NULL DEFAULT 'COP',
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2. USER PROFILES (Linked to auth.users)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'empleado' CHECK (role IN ('admin', 'empleado')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'Usuario'),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'empleado')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 3. PRODUCTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    buy_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (buy_price >= 0),
    sell_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    warehouse_stock INTEGER NOT NULL DEFAULT 0 CHECK (warehouse_stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
    sku TEXT UNIQUE NOT NULL,
    image_url TEXT,
    total_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_sold >= 0),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON public.products(deleted_at);

-- =====================================================================
-- 4. CLIENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document TEXT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    email TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    total_bought NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_bought >= 0),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_unique_active_doc
    ON public.clients(document)
    WHERE (document IS NOT NULL AND document <> '' AND deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

-- =====================================================================
-- 5. SALES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_name_snapshot TEXT NOT NULL DEFAULT 'Cliente General',
    client_document_snapshot TEXT DEFAULT '',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    base_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_total >= 0),
    interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0 AND interest_rate <= 100),
    interest_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (interest_amount >= 0),
    total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Efectivo', 'Transferencia', 'Crédito')),
    status TEXT NOT NULL DEFAULT 'completada' CHECK (status IN ('completada', 'pendiente', 'pagada', 'cancelada')),
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON public.sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- =====================================================================
-- 6. SALE ITEMS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- =====================================================================
-- 7. DEBTS (Accounts Receivable for Credit Sales)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID UNIQUE NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name_snapshot TEXT NOT NULL,
    client_document_snapshot TEXT DEFAULT '',
    total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0),
    base_total NUMERIC(14,2) NOT NULL CHECK (base_total >= 0),
    interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
    interest_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (interest_amount >= 0),
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance NUMERIC(14,2) NOT NULL CHECK (balance >= 0),
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'vencida', 'pagada', 'cancelada')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_sale_id ON public.debts(sale_id);
CREATE INDEX IF NOT EXISTS idx_debts_client_id ON public.debts(client_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON public.debts(due_date);

-- =====================================================================
-- 8. DEBT PAYMENTS (Immutable Payment History)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'Efectivo',
    note TEXT DEFAULT '',
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);

-- =====================================================================
-- 9. PENDING SALES (Pre-orders / Drafts)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pending_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pending_number TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    client_name_snapshot TEXT NOT NULL DEFAULT 'Cliente General',
    client_document_snapshot TEXT DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Efectivo',
    notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'CONFIRMADA', 'CANCELADA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_sales_number ON public.pending_sales(pending_number);
CREATE INDEX IF NOT EXISTS idx_pending_sales_status ON public.pending_sales(status);

-- =====================================================================
-- 10. INVENTORY MOVEMENTS (Kardex / Audit Trail)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('VENTA', 'AJUSTE', 'TRASLADO', 'DEVOLUCION', 'CANCELACION_VENTA')),
    source_location TEXT CHECK (source_location IN ('TIENDA', 'BODEGA', 'PROVEEDOR', 'EXTERNO')),
    destination_location TEXT CHECK (destination_location IN ('TIENDA', 'BODEGA', 'CLIENTE', 'MERMA', 'EXTERNO')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reference_type TEXT, -- 'SALE', 'TRANSFER', 'MANUAL_ADJUST', 'RETURN'
    reference_id UUID,
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);

-- =====================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Store Settings Policies
CREATE POLICY "Allow authenticated active users to read store_settings"
    ON public.store_settings FOR SELECT
    TO authenticated
    USING (public.is_active_user());

CREATE POLICY "Allow admin to update store_settings"
    ON public.store_settings FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Profiles Policies
CREATE POLICY "Allow users to read active profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_active_user());

CREATE POLICY "Allow users to update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow admin full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Products Policies
CREATE POLICY "Allow active users to read products"
    ON public.products FOR SELECT
    TO authenticated
    USING (public.is_active_user() AND deleted_at IS NULL);

CREATE POLICY "Allow active users to insert products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_user());

CREATE POLICY "Allow active users to update products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (public.is_active_user())
    WITH CHECK (public.is_active_user());

CREATE POLICY "Allow admin to delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Clients Policies
CREATE POLICY "Allow active users to read clients"
    ON public.clients FOR SELECT
    TO authenticated
    USING (public.is_active_user() AND deleted_at IS NULL);

CREATE POLICY "Allow active users to insert clients"
    ON public.clients FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_user());

CREATE POLICY "Allow active users to update clients"
    ON public.clients FOR UPDATE
    TO authenticated
    USING (public.is_active_user())
    WITH CHECK (public.is_active_user());

CREATE POLICY "Allow admin to delete clients"
    ON public.clients FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Sales Policies
CREATE POLICY "Allow active users to read sales"
    ON public.sales FOR SELECT
    TO authenticated
    USING (public.is_active_user());

CREATE POLICY "Allow active users to insert sales"
    ON public.sales FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_user());

CREATE POLICY "Allow active users to update sales"
    ON public.sales FOR UPDATE
    TO authenticated
    USING (public.is_active_user())
    WITH CHECK (public.is_active_user());

-- Sale Items Policies
CREATE POLICY "Allow active users to read sale_items"
    ON public.sale_items FOR SELECT
    TO authenticated
    USING (public.is_active_user());

CREATE POLICY "Allow active users to insert sale_items"
    ON public.sale_items FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_user());

-- Debts Policies
CREATE POLICY "Allow active users to read debts"
    ON public.debts FOR SELECT
    TO authenticated
    USING (public.is_active_user());

CREATE POLICY "Allow active users to insert/update debts"
    ON public.debts FOR ALL
    TO authenticated
    USING (public.is_active_user())
    WITH CHECK (public.is_active_user());

-- Debt Payments Policies
CREATE POLICY "Allow active users to read debt_payments"
    ON public.debt_payments FOR SELECT
    TO authenticated
    USING (public.is_active_user());

CREATE POLICY "Allow active users to insert debt_payments"
    ON public.debt_payments FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_user());

-- Pending Sales Policies
CREATE POLICY "Allow active users full access to pending_sales"
    ON public.pending_sales FOR ALL
    TO authenticated
    USING (public.is_active_user())
    WITH CHECK (public.is_active_user());

-- Inventory Movements Policies
CREATE POLICY "Allow active users to read inventory_movements"
    ON public.inventory_movements FOR SELECT
    TO authenticated
    USING (public.is_active_user());

CREATE POLICY "Allow active users to insert inventory_movements"
    ON public.inventory_movements FOR INSERT
    TO authenticated
    WITH CHECK (public.is_active_user());

-- Insert default store settings if none exists
INSERT INTO public.store_settings (store_name, low_stock_threshold, currency, tax_rate)
SELECT 'Trueno 219', 5, 'COP', 0
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);
