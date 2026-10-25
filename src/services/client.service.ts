// =====================================================================
// TRUENO 219 - Client Service
// =====================================================================

import { ClientRepository } from '@/repositories/client.repository';
import { SaleRepository } from '@/repositories/sale.repository';
import { DebtRepository } from '@/repositories/debt.repository';
import { Client } from '@/types';

export class ClientService {
  static async listClients(params?: { search?: string; page?: number; limit?: number }) {
    return await ClientRepository.findAll(params);
  }

  static async getClientById(id: string): Promise<Client> {
    const client = await ClientRepository.findById(id);
    if (!client) {
      const err: any = new Error('Cliente no encontrado');
      err.status = 404;
      throw err;
    }
    return client;
  }

  static async createClient(clientData: Partial<Client>, userId?: string): Promise<Client> {
    if (clientData.document && clientData.document.trim()) {
      const existing = await ClientRepository.findByDocument(clientData.document.trim());
      if (existing) {
        const err: any = new Error(`Ya existe un cliente con el documento "${clientData.document}": ${existing.name}`);
        err.status = 409;
        throw err;
      }
    }

    return await ClientRepository.create({
      ...clientData,
      created_by: userId || null
    });
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    await this.getClientById(id);

    if (updates.document && updates.document.trim()) {
      const existing = await ClientRepository.findByDocument(updates.document.trim());
      if (existing && existing.id !== id) {
        const err: any = new Error(`El documento "${updates.document}" ya está registrado para otro cliente: ${existing.name}`);
        err.status = 409;
        throw err;
      }
    }

    return await ClientRepository.update(id, updates);
  }

  static async deleteClient(id: string): Promise<void> {
    await this.getClientById(id);
    await ClientRepository.softDelete(id);
  }

  static async getClientSales(clientId: string) {
    await this.getClientById(clientId);
    return await SaleRepository.findAll({ clientId, limit: 100 });
  }

  static async getClientDebts(clientId: string) {
    await this.getClientById(clientId);
    return await DebtRepository.findAll({ clientId, limit: 100 });
  }
}
