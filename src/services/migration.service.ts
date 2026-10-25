// =====================================================================
// TRUENO 219 - Migration Service (localStorage to PostgreSQL Supabase)
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';
import { ProductRepository } from '@/repositories/product.repository';
import { ClientRepository } from '@/repositories/client.repository';
import { SettingsRepository } from '@/repositories/settings.repository';

export interface LocalStoragePayload {
  products?: any[];
  clients?: any[];
  sales?: any[];
  debts?: any[];
  pendingSales?: any[];
  config?: any;
}

export class MigrationService {
  static async importData(payload: LocalStoragePayload, userId: string) {
    const report = {
      products: { imported: 0, skipped: 0, errors: [] as string[] },
      clients: { imported: 0, skipped: 0, errors: [] as string[] },
      sales: { imported: 0, skipped: 0, errors: [] as string[] },
      debts: { imported: 0, skipped: 0, errors: [] as string[] },
      pendingSales: { imported: 0, skipped: 0, errors: [] as string[] },
      configUpdated: false
    };

    // Mapping maps old numeric ID -> new UUID
    const productIdMap = new Map<any, string>();
    const clientIdMap = new Map<any, string>();
    const saleIdMap = new Map<any, string>();

    // 1. IMPORT CONFIG
    if (payload.config) {
      try {
        await SettingsRepository.updateSettings({
          store_name: payload.config.storeName || 'Trueno 219',
          low_stock_threshold: Number(payload.config.lowStockThreshold) || 5,
          currency: payload.config.currency || 'COP',
          tax_rate: Number(payload.config.taxRate) || 0
        });
        report.configUpdated = true;
      } catch (err: any) {
        console.error('Error importing config:', err);
      }
    }

    // 2. IMPORT PRODUCTS
    if (Array.isArray(payload.products)) {
      for (const p of payload.products) {
        try {
          const sku = (p.sku || `SKU-${p.id || Date.now()}`).trim();
          const existing = await ProductRepository.findBySku(sku);

          if (existing) {
            productIdMap.set(p.id, existing.id);
            report.products.skipped++;
            continue;
          }

          const created = await ProductRepository.create({
            name: p.name || 'Producto sin nombre',
            category: p.category || 'General',
            description: p.description || '',
            buy_price: Math.max(0, Number(p.buyPrice) || 0),
            sell_price: Math.max(0, Number(p.sellPrice) || 0),
            stock: Math.max(0, Number(p.stock) || 0),
            warehouse_stock: Math.max(0, Number(p.warehouseStock) || 0),
            min_stock: Math.max(0, Number(p.minStock) || 5),
            sku,
            image_url: p.image || null,
            total_sold: Math.max(0, Number(p.totalSold) || 0),
            created_by: userId,
            created_at: p.createdAt || new Date().toISOString()
          });

          productIdMap.set(p.id, created.id);
          report.products.imported++;
        } catch (err: any) {
          report.products.errors.push(`Error en producto "${p.name}": ${err.message}`);
        }
      }
    }

    // 3. IMPORT CLIENTS
    if (Array.isArray(payload.clients)) {
      for (const c of payload.clients) {
        try {
          const doc = (c.document || '').trim();
          if (doc) {
            const existing = await ClientRepository.findByDocument(doc);
            if (existing) {
              clientIdMap.set(c.id, existing.id);
              report.clients.skipped++;
              continue;
            }
          }

          const created = await ClientRepository.create({
            name: c.name || 'Cliente',
            document: doc || null,
            phone: c.phone || '',
            address: c.address || '',
            email: c.email || '',
            notes: c.notes || '',
            total_bought: Math.max(0, Number(c.totalBought) || 0),
            created_by: userId,
            created_at: c.createdAt || new Date().toISOString()
          });

          clientIdMap.set(c.id, created.id);
          report.clients.imported++;
        } catch (err: any) {
          report.clients.errors.push(`Error en cliente "${c.name}": ${err.message}`);
        }
      }
    }

    // 4. IMPORT SALES & SALE ITEMS
    if (Array.isArray(payload.sales)) {
      for (const s of payload.sales) {
        try {
          const saleNumber = s.saleNumber || `VTA-MIG-${s.id || Math.floor(Math.random() * 10000)}`;

          // Check if already imported
          const { data: existingSale } = await supabaseAdmin
            .from('sales')
            .select('id')
            .eq('sale_number', saleNumber)
            .maybeSingle();

          if (existingSale) {
            saleIdMap.set(s.id, existingSale.id);
            report.sales.skipped++;
            continue;
          }

          const mappedClientId = s.clientId ? (clientIdMap.get(s.clientId) || null) : null;

          const { data: createdSale, error: saleErr } = await supabaseAdmin
            .from('sales')
            .insert({
              sale_number: saleNumber,
              client_id: mappedClientId,
              created_by: userId,
              client_name_snapshot: s.clientName || 'Cliente General',
              client_document_snapshot: s.clientDocument || '',
              subtotal: Math.max(0, Number(s.subtotal) || 0),
              discount: Math.max(0, Number(s.discount) || 0),
              base_total: Math.max(0, Number(s.baseTotal || s.total) || 0),
              interest_rate: Math.max(0, Number(s.interestRate) || 0),
              interest_amount: Math.max(0, Number(s.interestAmount) || 0),
              total: Math.max(0, Number(s.total) || 0),
              paid_amount: Math.max(0, Number(s.paid || s.paidAmount || s.total) || 0),
              payment_method: s.paymentMethod === 'Crédito' ? 'Crédito' : (s.paymentMethod === 'Transferencia' ? 'Transferencia' : 'Efectivo'),
              status: s.status === 'pagada' ? 'pagada' : (s.status === 'pendiente' ? 'pendiente' : 'completada'),
              notes: s.notes || 'Importado desde localStorage',
              created_at: s.date || s.createdAt || new Date().toISOString()
            })
            .select('id')
            .single();

          if (saleErr || !createdSale) {
            throw saleErr || new Error('No se pudo registrar la venta');
          }

          saleIdMap.set(s.id, createdSale.id);

          // Insert sale items
          if (Array.isArray(s.items)) {
            for (const item of s.items) {
              const mappedProductId = item.productId ? (productIdMap.get(item.productId) || null) : null;
              await supabaseAdmin.from('sale_items').insert({
                sale_id: createdSale.id,
                product_id: mappedProductId,
                product_name_snapshot: item.name || 'Producto',
                sku_snapshot: item.sku || 'N/A',
                quantity: Math.max(1, Number(item.qty || item.quantity) || 1),
                unit_price: Math.max(0, Number(item.price || item.unitPrice) || 0),
                unit_cost: 0,
                subtotal: Math.max(0, Number(item.subtotal) || 0),
                created_at: s.date || s.createdAt || new Date().toISOString()
              });
            }
          }

          report.sales.imported++;
        } catch (err: any) {
          report.sales.errors.push(`Error en venta #${s.id}: ${err.message}`);
        }
      }
    }

    // 5. IMPORT DEBTS & PAYMENTS
    if (Array.isArray(payload.debts)) {
      for (const d of payload.debts) {
        try {
          const mappedSaleId = d.saleId ? saleIdMap.get(d.saleId) : null;
          if (!mappedSaleId) {
            // Cannot import debt without corresponding sale
            report.debts.errors.push(`Deuda #${d.id} omitida: venta relacionada #${d.saleId} no encontrada`);
            continue;
          }

          // Check if debt exists
          const { data: existingDebt } = await supabaseAdmin
            .from('debts')
            .select('id')
            .eq('sale_id', mappedSaleId)
            .maybeSingle();

          if (existingDebt) {
            report.debts.skipped++;
            continue;
          }

          const mappedClientId = d.clientId ? (clientIdMap.get(d.clientId) || null) : null;

          const { data: createdDebt, error: debtErr } = await supabaseAdmin
            .from('debts')
            .insert({
              sale_id: mappedSaleId,
              client_id: mappedClientId,
              client_name_snapshot: d.clientName || 'Cliente General',
              client_document_snapshot: d.clientDocument || '',
              total_amount: Math.max(0, Number(d.total || d.totalAmount) || 0),
              base_total: Math.max(0, Number(d.baseTotal || d.total) || 0),
              interest_rate: Math.max(0, Number(d.interestRate) || 0),
              interest_amount: Math.max(0, Number(d.interestAmount) || 0),
              paid_amount: Math.max(0, Number(d.paid || d.paidAmount) || 0),
              balance: Math.max(0, Number(d.balance) || 0),
              due_date: d.dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
              status: d.status === 'pagada' ? 'pagada' : (d.status === 'vencida' ? 'vencida' : 'pendiente'),
              created_at: d.createdAt || new Date().toISOString()
            })
            .select('id')
            .single();

          if (debtErr || !createdDebt) {
            throw debtErr || new Error('No se pudo crear la deuda');
          }

          // Insert historical debt payments
          if (Array.isArray(d.payments)) {
            for (const pay of d.payments) {
              await supabaseAdmin.from('debt_payments').insert({
                debt_id: createdDebt.id,
                amount: Math.max(0, Number(pay.amount) || 0),
                payment_method: 'Efectivo',
                note: pay.note || 'Pago migrado',
                received_by: userId,
                created_at: pay.date || new Date().toISOString()
              });
            }
          }

          report.debts.imported++;
        } catch (err: any) {
          report.debts.errors.push(`Error en deuda #${d.id}: ${err.message}`);
        }
      }
    }

    // 6. IMPORT PENDING SALES
    if (Array.isArray(payload.pendingSales)) {
      for (const ps of payload.pendingSales) {
        try {
          const pendingNumber = ps.id && String(ps.id).startsWith('PEND-') ? ps.id : `PEND-${Math.floor(100 + Math.random() * 900)}`;

          const { data: existingPending } = await supabaseAdmin
            .from('pending_sales')
            .select('id')
            .eq('pending_number', pendingNumber)
            .maybeSingle();

          if (existingPending) {
            report.pendingSales.skipped++;
            continue;
          }

          const mappedClientId = ps.clientId ? (clientIdMap.get(ps.clientId) || null) : null;

          await supabaseAdmin.from('pending_sales').insert({
            pending_number: pendingNumber,
            client_id: mappedClientId,
            client_name_snapshot: ps.clientName || 'Cliente General',
            client_document_snapshot: ps.clientDocument || '',
            items: ps.items || [],
            subtotal: Math.max(0, Number(ps.subtotal) || 0),
            discount: Math.max(0, Number(ps.discount) || 0),
            total: Math.max(0, Number(ps.total) || 0),
            payment_method: ps.paymentMethod === 'Crédito' ? 'Crédito' : (ps.paymentMethod === 'Transferencia' ? 'Transferencia' : 'Efectivo'),
            notes: ps.notes || 'Migrado desde localStorage',
            status: 'PENDIENTE',
            created_by: userId,
            created_at: ps.createdAt || new Date().toISOString()
          });

          report.pendingSales.imported++;
        } catch (err: any) {
          report.pendingSales.errors.push(`Error en venta pendiente: ${err.message}`);
        }
      }
    }

    return report;
  }
}
