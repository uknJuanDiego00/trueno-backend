-- =====================================================================
-- MIGRATION: 20261025_002_atomic_rpc_functions.sql
-- TRUENO 219 - Atomic Stored Procedures & Business Transactions
-- =====================================================================

-- 1. ATOMIC REGISTER SALE FUNCTION
CREATE OR REPLACE FUNCTION public.register_sale_atomic(
    p_sale_number TEXT,
    p_client_id UUID,
    p_client_name TEXT,
    p_client_document TEXT,
    p_payment_method TEXT,
    p_discount NUMERIC,
    p_interest_rate NUMERIC,
    p_paid_amount NUMERIC,
    p_items JSONB, -- Array of { productId, quantity, unitPrice, unitCost }
    p_notes TEXT,
    p_created_by UUID
)
RETURNS JSONB AS $$
DECLARE
    v_sale_id UUID;
    v_subtotal NUMERIC := 0;
    v_base_total NUMERIC := 0;
    v_interest_amount NUMERIC := 0;
    v_total NUMERIC := 0;
    v_paid NUMERIC := 0;
    v_sale_status TEXT;
    v_item JSONB;
    v_prod RECORD;
    v_item_subtotal NUMERIC;
    v_debt_id UUID := NULL;
    v_due_date TIMESTAMPTZ;
BEGIN
    -- Basic validation
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito no contiene productos';
    END IF;

    -- Validate payment method
    IF p_payment_method NOT IN ('Efectivo', 'Transferencia', 'Crédito') THEN
        RAISE EXCEPTION 'Método de pago inválido: %', p_payment_method;
    END IF;

    -- 1. Lock and validate product stocks
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_prod
        FROM public.products
        WHERE id = (v_item->>'productId')::UUID AND deleted_at IS NULL
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado', (v_item->>'productId');
        END IF;

        IF v_prod.stock < (v_item->>'quantity')::INTEGER THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto "%" (Disponible en tienda: %, Solicitado: %)',
                v_prod.name, v_prod.stock, (v_item->>'quantity')::INTEGER;
        END IF;

        v_item_subtotal := (v_item->>'quantity')::INTEGER * v_prod.sell_price;
        v_subtotal := v_subtotal + v_item_subtotal;
    END LOOP;

    -- 2. Financial calculation on server
    v_base_total := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));
    IF p_payment_method = 'Crédito' THEN
        v_interest_amount := ROUND((v_base_total * GREATEST(0, LEAST(100, COALESCE(p_interest_rate, 0))) / 100), 2);
    ELSE
        v_interest_amount := 0;
    END IF;
    v_total := v_base_total + v_interest_amount;

    IF p_payment_method = 'Crédito' THEN
        v_paid := GREATEST(0, LEAST(v_total, COALESCE(p_paid_amount, 0)));
        IF v_paid >= v_total THEN
            v_sale_status := 'pagada';
        ELSE
            v_sale_status := 'pendiente';
        END IF;
    ELSE
        v_paid := v_total;
        v_sale_status := 'completada';
    END IF;

    -- 3. Insert Sale
    INSERT INTO public.sales (
        sale_number,
        client_id,
        created_by,
        client_name_snapshot,
        client_document_snapshot,
        subtotal,
        discount,
        base_total,
        interest_rate,
        interest_amount,
        total,
        paid_amount,
        payment_method,
        status,
        notes
    ) VALUES (
        p_sale_number,
        p_client_id,
        p_created_by,
        COALESCE(p_client_name, 'Cliente General'),
        COALESCE(p_client_document, ''),
        v_subtotal,
        COALESCE(p_discount, 0),
        v_base_total,
        COALESCE(p_interest_rate, 0),
        v_interest_amount,
        v_total,
        v_paid,
        p_payment_method,
        v_sale_status,
        COALESCE(p_notes, '')
    ) RETURNING id INTO v_sale_id;

    -- 4. Deduct Stock, Record Sale Items and Inventory Movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_prod
        FROM public.products
        WHERE id = (v_item->>'productId')::UUID;

        -- Deduct stock
        UPDATE public.products
        SET stock = stock - (v_item->>'quantity')::INTEGER,
            total_sold = total_sold + (v_item->>'quantity')::INTEGER,
            updated_at = now()
        WHERE id = v_prod.id;

        -- Record sale item
        INSERT INTO public.sale_items (
            sale_id,
            product_id,
            product_name_snapshot,
            sku_snapshot,
            quantity,
            unit_price,
            unit_cost,
            subtotal
        ) VALUES (
            v_sale_id,
            v_prod.id,
            v_prod.name,
            v_prod.sku,
            (v_item->>'quantity')::INTEGER,
            v_prod.sell_price,
            v_prod.buy_price,
            (v_item->>'quantity')::INTEGER * v_prod.sell_price
        );

        -- Audit inventory movement
        INSERT INTO public.inventory_movements (
            product_id,
            movement_type,
            source_location,
            destination_location,
            quantity,
            reference_type,
            reference_id,
            notes,
            created_by
        ) VALUES (
            v_prod.id,
            'VENTA',
            'TIENDA',
            'CLIENTE',
            (v_item->>'quantity')::INTEGER,
            'SALE',
            v_sale_id,
            'Venta #' || p_sale_number,
            p_created_by
        );
    END LOOP;

    -- 5. Update client total_bought if client_id is present
    IF p_client_id IS NOT NULL THEN
        UPDATE public.clients
        SET total_bought = total_bought + v_total,
            updated_at = now()
        WHERE id = p_client_id;
    END IF;

    -- 6. Create Debt if credit sale and balance > 0
    IF p_payment_method = 'Crédito' AND v_paid < v_total THEN
        v_due_date := now() + interval '30 days';

        INSERT INTO public.debts (
            sale_id,
            client_id,
            client_name_snapshot,
            client_document_snapshot,
            total_amount,
            base_total,
            interest_rate,
            interest_amount,
            paid_amount,
            balance,
            due_date,
            status
        ) VALUES (
            v_sale_id,
            p_client_id,
            COALESCE(p_client_name, 'Cliente General'),
            COALESCE(p_client_document, ''),
            v_total,
            v_base_total,
            COALESCE(p_interest_rate, 0),
            v_interest_amount,
            v_paid,
            v_total - v_paid,
            v_due_date,
            'pendiente'
        ) RETURNING id INTO v_debt_id;

        -- Record initial payment if paid > 0
        IF v_paid > 0 THEN
            INSERT INTO public.debt_payments (
                debt_id,
                amount,
                payment_method,
                note,
                received_by
            ) VALUES (
                v_debt_id,
                v_paid,
                'Efectivo',
                'Pago inicial al momento de la venta',
                p_created_by
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'sale_number', p_sale_number,
        'subtotal', v_subtotal,
        'discount', COALESCE(p_discount, 0),
        'interest_amount', v_interest_amount,
        'total', v_total,
        'paid', v_paid,
        'debt_id', v_debt_id,
        'status', v_sale_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. ATOMIC DEBT PAYMENT FUNCTION
CREATE OR REPLACE FUNCTION public.register_debt_payment_atomic(
    p_debt_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_note TEXT,
    p_received_by UUID
)
RETURNS JSONB AS $$
DECLARE
    v_debt RECORD;
    v_new_paid NUMERIC;
    v_new_balance NUMERIC;
    v_new_status TEXT;
    v_payment_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto del abono debe ser mayor a 0';
    END IF;

    -- Lock debt row
    SELECT * INTO v_debt
    FROM public.debts
    WHERE id = p_debt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deuda no encontrada';
    END IF;

    IF v_debt.status = 'pagada' OR v_debt.balance <= 0 THEN
        RAISE EXCEPTION 'La deuda ya se encuentra completamente pagada';
    END IF;

    IF p_amount > v_debt.balance THEN
        RAISE EXCEPTION 'El monto del abono (%) excede el saldo pendiente (%)', p_amount, v_debt.balance;
    END IF;

    v_new_paid := v_debt.paid_amount + p_amount;
    v_new_balance := GREATEST(0, v_debt.balance - p_amount);

    IF v_new_balance = 0 THEN
        v_new_status := 'pagada';
    ELSE
        IF v_debt.due_date < now() THEN
            v_new_status := 'vencida';
        ELSE
            v_new_status := 'pendiente';
        END IF;
    END IF;

    -- Update debt
    UPDATE public.debts
    SET paid_amount = v_new_paid,
        balance = v_new_balance,
        status = v_new_status,
        updated_at = now()
    WHERE id = p_debt_id;

    -- Insert payment record
    INSERT INTO public.debt_payments (
        debt_id,
        amount,
        payment_method,
        note,
        received_by
    ) VALUES (
        p_debt_id,
        p_amount,
        COALESCE(p_payment_method, 'Efectivo'),
        COALESCE(p_note, ''),
        p_received_by
    ) RETURNING id INTO v_payment_id;

    -- Sync associated sale
    UPDATE public.sales
    SET paid_amount = LEAST(total, paid_amount + p_amount),
        status = CASE WHEN v_new_balance = 0 THEN 'pagada' ELSE status END,
        updated_at = now()
    WHERE id = v_debt.sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'debt_id', p_debt_id,
        'amount', p_amount,
        'new_paid', v_new_paid,
        'new_balance', v_new_balance,
        'status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. ATOMIC STOCK TRANSFER FUNCTION (STORE <-> WAREHOUSE)
CREATE OR REPLACE FUNCTION public.transfer_stock_atomic(
    p_product_id UUID,
    p_from_location TEXT, -- 'store' or 'warehouse'
    p_to_location TEXT,   -- 'store' or 'warehouse'
    p_quantity INTEGER,
    p_user_id UUID,
    p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_prod RECORD;
    v_src_loc TEXT;
    v_dst_loc TEXT;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'La cantidad a trasladar debe ser mayor a 0';
    END IF;

    IF p_from_location = p_to_location THEN
        RAISE EXCEPTION 'El origen y el destino no pueden ser iguales';
    END IF;

    SELECT * INTO v_prod
    FROM public.products
    WHERE id = p_product_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto no encontrado';
    END IF;

    IF p_from_location = 'warehouse' AND p_to_location = 'store' THEN
        IF v_prod.warehouse_stock < p_quantity THEN
            RAISE EXCEPTION 'Stock insuficiente en bodega (disponible: %, solicitado: %)',
                v_prod.warehouse_stock, p_quantity;
        END IF;

        UPDATE public.products
        SET warehouse_stock = warehouse_stock - p_quantity,
            stock = stock + p_quantity,
            updated_at = now()
        WHERE id = p_product_id;

        v_src_loc := 'BODEGA';
        v_dst_loc := 'TIENDA';

    ELSIF p_from_location = 'store' AND p_to_location = 'warehouse' THEN
        IF v_prod.stock < p_quantity THEN
            RAISE EXCEPTION 'Stock insuficiente en tienda (disponible: %, solicitado: %)',
                v_prod.stock, p_quantity;
        END IF;

        UPDATE public.products
        SET stock = stock - p_quantity,
            warehouse_stock = warehouse_stock + p_quantity,
            updated_at = now()
        WHERE id = p_product_id;

        v_src_loc := 'TIENDA';
        v_dst_loc := 'BODEGA';
    ELSE
        RAISE EXCEPTION 'Ubicaciones inválidas. Use "store" o "warehouse"';
    END IF;

    -- Record movement audit
    INSERT INTO public.inventory_movements (
        product_id,
        movement_type,
        source_location,
        destination_location,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
    ) VALUES (
        p_product_id,
        'TRASLADO',
        v_src_loc,
        v_dst_loc,
        p_quantity,
        'TRANSFER',
        p_product_id,
        COALESCE(p_notes, 'Traslado entre ' || v_src_loc || ' y ' || v_dst_loc),
        p_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'quantity', p_quantity,
        'from', p_from_location,
        'to', p_to_location
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. ATOMIC CONFIRM PENDING SALE FUNCTION
CREATE OR REPLACE FUNCTION public.confirm_pending_sale_atomic(
    p_pending_id UUID,
    p_sale_number TEXT,
    p_payment_method TEXT,
    p_paid_amount NUMERIC,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_pending RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_pending
    FROM public.pending_sales
    WHERE id = p_pending_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta pendiente no encontrada';
    END IF;

    IF v_pending.status <> 'PENDIENTE' THEN
        RAISE EXCEPTION 'La venta pendiente ya ha sido procesada o cancelada (Estado actual: %)', v_pending.status;
    END IF;

    -- Register sale atomically
    v_result := public.register_sale_atomic(
        p_sale_number,
        v_pending.client_id,
        v_pending.client_name_snapshot,
        v_pending.client_document_snapshot,
        COALESCE(p_payment_method, v_pending.payment_method, 'Efectivo'),
        v_pending.discount,
        0, -- interest_rate
        COALESCE(p_paid_amount, v_pending.total),
        v_pending.items,
        'Confirmación de venta pendiente #' || v_pending.pending_number,
        p_user_id
    );

    -- Mark pending sale as confirmed
    UPDATE public.pending_sales
    SET status = 'CONFIRMADA',
        updated_at = now()
    WHERE id = p_pending_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. ATOMIC CANCEL SALE FUNCTION
CREATE OR REPLACE FUNCTION public.cancel_sale_atomic(
    p_sale_id UUID,
    p_user_id UUID,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_sale
    FROM public.sales
    WHERE id = p_sale_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada';
    END IF;

    IF v_sale.status = 'cancelada' THEN
        RAISE EXCEPTION 'La venta ya se encuentra cancelada';
    END IF;

    -- Revert product stocks and log reverse inventory movements
    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        UPDATE public.products
        SET stock = stock + v_item.quantity,
            total_sold = GREATEST(0, total_sold - v_item.quantity),
            updated_at = now()
        WHERE id = v_item.product_id;

        INSERT INTO public.inventory_movements (
            product_id,
            movement_type,
            source_location,
            destination_location,
            quantity,
            reference_type,
            reference_id,
            notes,
            created_by
        ) VALUES (
            v_item.product_id,
            'CANCELACION_VENTA',
            'CLIENTE',
            'TIENDA',
            v_item.quantity,
            'SALE_CANCEL',
            p_sale_id,
            'Reverso por cancelación de venta: ' || COALESCE(p_reason, 'Sin motivo especificado'),
            p_user_id
        );
    END LOOP;

    -- Revert client total_bought
    IF v_sale.client_id IS NOT NULL THEN
        UPDATE public.clients
        SET total_bought = GREATEST(0, total_bought - v_sale.total),
            updated_at = now()
        WHERE id = v_sale.client_id;
    END IF;

    -- Update debt if exists
    UPDATE public.debts
    SET status = 'cancelada',
        updated_at = now()
    WHERE sale_id = p_sale_id;

    -- Update sale status
    UPDATE public.sales
    SET status = 'cancelada',
        notes = CASE WHEN notes = '' THEN 'Cancelada: ' || COALESCE(p_reason, '') ELSE notes || ' | Cancelada: ' || COALESCE(p_reason, '') END,
        updated_at = now()
    WHERE id = p_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', p_sale_id,
        'status', 'cancelada'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
