// =====================================================================
// TRUENO 219 - Debt Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { DebtService } from '@/services/debt.service';
import { getAuthContext } from '@/lib/supabase/auth';
import { CreateDebtPaymentSchema } from '@/schemas';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class DebtController {
  static async listDebts(req: NextRequest) {
    try {
      await getAuthContext(req);
      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId') || undefined;
      const status = searchParams.get('status') || undefined;
      const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

      const result = await DebtService.listDebts({ clientId, status, page, limit });
      return sendSuccess(result.debts, undefined, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getDebtById(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const debt = await DebtService.getDebtById(params.id);
      return sendSuccess(debt);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async addPayment(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = CreateDebtPaymentSchema.parse(body);

      const result = await DebtService.addPayment({
        debtId: params.id,
        amount: validated.amount,
        paymentMethod: validated.paymentMethod,
        note: validated.note,
        userId: auth.userId
      });

      return sendSuccess(result, 'Abono registrado correctamente', 201);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getPayments(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const payments = await DebtService.getDebtPayments(params.id);
      return sendSuccess(payments);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getSummary(req: NextRequest) {
    try {
      await getAuthContext(req);
      const summary = await DebtService.getSummary();
      return sendSuccess(summary);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
