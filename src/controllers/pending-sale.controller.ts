// =====================================================================
// TRUENO 219 - Pending Sale Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { PendingSaleService } from '@/services/pending-sale.service';
import { getAuthContext } from '@/lib/supabase/auth';
import { CreatePendingSaleSchema, ConfirmPendingSaleSchema } from '@/schemas';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class PendingSaleController {
  static async listPendingSales(req: NextRequest) {
    try {
      await getAuthContext(req);
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status') || undefined;
      const list = await PendingSaleService.listPendingSales(status);
      return sendSuccess(list);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getPendingSaleById(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const item = await PendingSaleService.getPendingSaleById(params.id);
      return sendSuccess(item);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async createPendingSale(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = CreatePendingSaleSchema.parse(body);

      const result = await PendingSaleService.createPendingSale({
        clientId: validated.clientId,
        clientName: validated.clientName,
        clientDocument: validated.clientDocument,
        items: validated.items,
        discount: validated.discount,
        paymentMethod: validated.paymentMethod,
        notes: validated.notes,
        userId: auth.userId
      });

      return sendSuccess(result, 'Venta pendiente guardada', 201);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updatePendingSale(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const body = await req.json();
      const updated = await PendingSaleService.updatePendingSale(params.id, body);
      return sendSuccess(updated, 'Venta pendiente actualizada');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async deletePendingSale(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      await PendingSaleService.deletePendingSale(params.id);
      return sendSuccess({ deleted: true }, 'Venta pendiente eliminada');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async confirmPendingSale(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = ConfirmPendingSaleSchema.parse(body);

      const result = await PendingSaleService.confirmPendingSale(params.id, {
        paymentMethod: validated.paymentMethod,
        paid: validated.paid,
        userId: auth.userId
      });

      return sendSuccess(result, 'Venta confirmada exitosamente');
    } catch (error) {
      return handleApiError(error);
    }
  }
}
