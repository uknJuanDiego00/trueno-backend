// =====================================================================
// TRUENO 219 - Debt Service
// =====================================================================

import { DebtRepository } from '@/repositories/debt.repository';

export class DebtService {
  static async listDebts(params?: {
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return await DebtRepository.findAll(params);
  }

  static async getDebtById(id: string) {
    const debt = await DebtRepository.findById(id);
    if (!debt) {
      const err: any = new Error('Deuda no encontrada');
      err.status = 404;
      throw err;
    }
    return debt;
  }

  static async addPayment(params: {
    debtId: string;
    amount: number;
    paymentMethod?: string;
    note?: string;
    userId: string;
  }) {
    const debt = await this.getDebtById(params.debtId);

    if (debt.status === 'pagada' || Number(debt.balance) <= 0) {
      throw new Error('La deuda ya se encuentra totalmente saldada');
    }

    if (params.amount <= 0) {
      throw new Error('El monto del abono debe ser mayor a 0');
    }

    if (params.amount > Number(debt.balance)) {
      throw new Error(`El abono ($${params.amount}) no puede superar el saldo pendiente ($${debt.balance})`);
    }

    return await DebtRepository.addPaymentAtomic({
      debtId: params.debtId,
      amount: params.amount,
      paymentMethod: params.paymentMethod || 'Efectivo',
      note: params.note || '',
      receivedBy: params.userId
    });
  }

  static async getDebtPayments(debtId: string) {
    await this.getDebtById(debtId);
    return await DebtRepository.getPaymentsByDebtId(debtId);
  }

  static async getSummary() {
    return await DebtRepository.getSummary();
  }
}
