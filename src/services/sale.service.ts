// =====================================================================
// TRUENO 219 - Sale Service
// =====================================================================

import { SaleRepository } from '@/repositories/sale.repository';
import { ProductRepository } from '@/repositories/product.repository';
import { supabaseAdmin } from '@/lib/supabase/client';

export class SaleService {
  static async listSales(params?: {
    clientId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    return await SaleRepository.findAll(params);
  }

  static async getSaleById(id: string) {
    const sale = await SaleRepository.findById(id);
    if (!sale) {
      const err: any = new Error('Venta no encontrada');
      err.status = 404;
      throw err;
    }
    return sale;
  }

  static generateSaleNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `VTA-${dateStr}-${rand}`;
  }

  static async registerSale(params: {
    clientId?: string | null;
    clientName?: string;
    clientDocument?: string;
    paymentMethod: 'Efectivo' | 'Transferencia' | 'Crédito';
    discount?: number;
    interestRate?: number;
    paid?: number;
    items: Array<{ productId: string; qty: number; price?: number }>;
    notes?: string;
    userId: string;
  }) {
    if (!params.items || params.items.length === 0) {
      throw new Error('La venta debe contener al menos un producto');
    }

    // Verify products exist and prepare items payload with exact quantities
    const itemsPayload = [];
    for (const item of params.items) {
      const prod = await ProductRepository.findById(item.productId);
      if (!prod) {
        throw new Error(`Producto con ID ${item.productId} no encontrado`);
      }
      if (prod.stock < item.qty) {
        throw new Error(`Stock insuficiente para "${prod.name}" (Disponible en tienda: ${prod.stock}, Solicitado: ${item.qty})`);
      }
      itemsPayload.push({
        productId: prod.id,
        quantity: item.qty
      });
    }

    const saleNumber = this.generateSaleNumber();

    const result = await SaleRepository.registerSaleAtomic({
      saleNumber,
      clientId: params.clientId || null,
      clientName: params.clientName || 'Cliente General',
      clientDocument: params.clientDocument || '',
      paymentMethod: params.paymentMethod,
      discount: Math.max(0, params.discount || 0),
      interestRate: params.paymentMethod === 'Crédito' ? Math.max(0, Math.min(100, params.interestRate || 0)) : 0,
      paidAmount: params.paid !== undefined ? params.paid : 0,
      items: itemsPayload,
      notes: params.notes || '',
      createdBy: params.userId
    });

    return result;
  }

  static async cancelSale(saleId: string, userId: string, reason: string) {
    const sale = await this.getSaleById(saleId);
    if (sale.status === 'cancelada') {
      throw new Error('La venta ya se encuentra cancelada');
    }

    return await SaleRepository.cancelSaleAtomic(saleId, userId, reason);
  }
}
