// =====================================================================
// TRUENO 219 - Dashboard Repository
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';

export class DashboardRepository {
  static async getSummary() {
    // 1. Get products count and stock numbers
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('stock, warehouse_stock, min_stock')
      .is('deleted_at', null);

    const prodList = products || [];
    const totalProducts = prodList.length;
    const totalStoreStock = prodList.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalWarehouseStock = prodList.reduce((acc, p) => acc + (p.warehouse_stock || 0), 0);
    const totalInventoryUnits = totalStoreStock + totalWarehouseStock;
    const lowStockCount = prodList.filter(p => p.stock > 0 && p.stock <= p.min_stock).length;
    const outOfStockCount = prodList.filter(p => p.stock <= 0).length;

    // 2. Get clients count
    const { count: totalClients } = await supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // 3. Get debts pending balance
    const { data: debts } = await supabaseAdmin
      .from('debts')
      .select('balance, status')
      .neq('status', 'pagada')
      .neq('status', 'cancelada');

    const totalPendingDebt = (debts || []).reduce((acc, d) => acc + Number(d.balance || 0), 0);

    // 4. Today sales
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todaySalesData } = await supabaseAdmin
      .from('sales')
      .select('total')
      .neq('status', 'cancelada')
      .gte('created_at', todayStart.toISOString());

    const todaySales = todaySalesData || [];
    const todayTotal = todaySales.reduce((acc, s) => acc + Number(s.total || 0), 0);

    // 5. Month sales
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthSalesData } = await supabaseAdmin
      .from('sales')
      .select('total')
      .neq('status', 'cancelada')
      .gte('created_at', monthStart.toISOString());

    const monthSales = monthSalesData || [];
    const monthTotal = monthSales.reduce((acc, s) => acc + Number(s.total || 0), 0);

    return {
      totalProducts,
      totalStoreStock,
      totalWarehouseStock,
      totalInventoryUnits,
      lowStockCount,
      outOfStockCount,
      totalClients: totalClients || 0,
      totalPendingDebt,
      todaySalesCount: todaySales.length,
      todayTotal,
      monthSalesCount: monthSales.length,
      monthTotal
    };
  }

  static async getTopProducts(limit: number = 5) {
    const { data, error } = await supabaseAdmin
      .from('sale_items')
      .select('product_id, product_name_snapshot, quantity, subtotal');

    if (error) throw error;

    const map: Record<string, { id: string; name: string; qty: number; revenue: number }> = {};

    (data || []).forEach(item => {
      const pId = item.product_id;
      if (!map[pId]) {
        map[pId] = {
          id: pId,
          name: item.product_name_snapshot,
          qty: 0,
          revenue: 0
        };
      }
      map[pId].qty += Number(item.quantity || 0);
      map[pId].revenue += Number(item.subtotal || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, limit);
  }

  static async getSalesByPeriod(days: number = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('created_at, total')
      .neq('status', 'cancelada')
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
