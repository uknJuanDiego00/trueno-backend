// =====================================================================
// TRUENO 219 - Sale Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { SaleService } from '@/services/sale.service';
import { getAuthContext } from '@/lib/supabase/auth';
import { CreateSaleSchema, CancelSaleSchema } from '@/schemas';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class SaleController {
  static async listSales(req: NextRequest) {
    try {
      await getAuthContext(req);
      const { searchParams } = new URL(req.url);
      const clientId = searchParams.get('clientId') || undefined;
      const status = searchParams.get('status') || undefined;
      const dateFrom = searchParams.get('dateFrom') || undefined;
      const dateTo = searchParams.get('dateTo') || undefined;
      const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

      const result = await SaleService.listSales({ clientId, status, dateFrom, dateTo, page, limit });
      return sendSuccess(result.sales, undefined, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getSaleById(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const sale = await SaleService.getSaleById(params.id);
      return sendSuccess(sale);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async registerSale(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = CreateSaleSchema.parse(body);

      const result = await SaleService.registerSale({
        clientId: validated.clientId,
        clientName: validated.clientName,
        clientDocument: validated.clientDocument,
        paymentMethod: validated.paymentMethod,
        discount: validated.discount,
        interestRate: validated.interestRate,
        paid: validated.paid,
        items: validated.items,
        notes: validated.notes,
        userId: auth.userId
      });

      return sendSuccess(result, 'Venta registrada correctamente', 201);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async cancelSale(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = CancelSaleSchema.parse(body);
      const result = await SaleService.cancelSale(params.id, auth.userId, validated.reason);
      return sendSuccess(result, 'Venta cancelada y stock restituido');
    } catch (error) {
      return handleApiError(error);
    }
  }
}
