// =====================================================================
// TRUENO 219 - Pending Sale Service
// =====================================================================

import { PendingSaleRepository } from '@/repositories/pending-sale.repository';
import { SaleService } from './sale.service';
import { ProductRepository } from '@/repositories/product.repository';

export class PendingSaleService {
  static async listPendingSales(status?: string) {
    return await PendingSaleRepository.findAll({ status });
  }

  static async getPendingSaleById(id: string) {
    const item = await PendingSaleRepository.findById(id);
    if (!item) {
      const err: any = new Error('Venta pendiente no encontrada');
      err.status = 404;
      throw err;
    }
    return item;
  }

  static async createPendingSale(params: {
    clientId?: string | null;
    clientName?: string;
    clientDocument?: string;
    items: any[];
    discount?: number;
    paymentMethod?: 'Efectivo' | 'Transferencia' | 'Crédito';
    notes?: string;
    userId: string;
  }) {
    if (!params.items || params.items.length === 0) {
      throw new Error('La venta pendiente debe contener al menos un producto');
    }

    const randNum = Math.floor(100 + Math.random() * 900);
    const pendingNumber = `PEND-${randNum}`;

    // Calculate subtotal and total
    let subtotal = 0;
    for (const item of params.items) {
      const prod = await ProductRepository.findById(item.productId);
      const price = item.price !== undefined ? Number(item.price) : (prod?.sell_price || 0);
      subtotal += price * (item.qty || 1);
    }

    const discount = Math.max(0, params.discount || 0);
    const total = Math.max(0, subtotal - discount);

    return await PendingSaleRepository.create({
      pending_number: pendingNumber,
      client_id: params.clientId || null,
      client_name_snapshot: params.clientName || 'Cliente General',
      client_document_snapshot: params.clientDocument || '',
      items: params.items,
      subtotal,
      discount,
      total,
      payment_method: params.paymentMethod || 'Efectivo',
      notes: params.notes || '',
      status: 'PENDIENTE',
      created_by: params.userId
    });
  }

  static async updatePendingSale(id: string, updates: any) {
    await this.getPendingSaleById(id);
    return await PendingSaleRepository.update(id, updates);
  }

  static async deletePendingSale(id: string) {
    await this.getPendingSaleById(id);
    await PendingSaleRepository.delete(id);
  }

  static async confirmPendingSale(id: string, params: {
    paymentMethod?: 'Efectivo' | 'Transferencia' | 'Crédito';
    paid?: number;
    userId: string;
  }) {
    const pending = await this.getPendingSaleById(id);
    if (pending.status !== 'PENDIENTE') {
      throw new Error(`Esta venta pendiente ya se encuentra en estado "${pending.status}"`);
    }

    const saleNumber = SaleService.generateSaleNumber();

    return await PendingSaleRepository.confirmAtomic({
      pendingId: id,
      saleNumber,
      paymentMethod: params.paymentMethod || pending.payment_method || 'Efectivo',
      paidAmount: params.paid !== undefined ? params.paid : pending.total,
      userId: params.userId
    });
  }
}
