// =====================================================================
// TRUENO 219 - Client Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { ClientService } from '@/services/client.service';
import { getAuthContext, requireAdmin } from '@/lib/supabase/auth';
import { CreateClientSchema, UpdateClientSchema } from '@/schemas';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class ClientController {
  static async listClients(req: NextRequest) {
    try {
      await getAuthContext(req);
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

      const result = await ClientService.listClients({ search, page, limit });
      return sendSuccess(result.clients, undefined, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getClientById(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const client = await ClientService.getClientById(params.id);
      return sendSuccess(client);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async createClient(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = CreateClientSchema.parse(body);
      const client = await ClientService.createClient(validated, auth.userId);
      return sendSuccess(client, 'Cliente registrado', 201);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updateClient(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const body = await req.json();
      const validated = UpdateClientSchema.parse(body);
      const updated = await ClientService.updateClient(params.id, validated);
      return sendSuccess(updated, 'Cliente actualizado');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async deleteClient(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      requireAdmin(auth);
      await ClientService.deleteClient(params.id);
      return sendSuccess({ deleted: true }, 'Cliente eliminado');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getClientSales(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const sales = await ClientService.getClientSales(params.id);
      return sendSuccess(sales.sales);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getClientDebts(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const debts = await ClientService.getClientDebts(params.id);
      return sendSuccess(debts.debts);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
