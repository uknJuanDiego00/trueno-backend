// =====================================================================
// TRUENO 219 - Client Repository
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';
import { Client } from '@/types';

export class ClientRepository {
  static async findAll(params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,document.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      clients: (data || []) as Client[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  static async findById(id: string): Promise<Client | null> {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as Client | null;
  }

  static async findByDocument(document: string): Promise<Client | null> {
    if (!document || !document.trim()) return null;
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('document', document.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as Client | null;
  }

  static async create(clientData: Partial<Client>): Promise<Client> {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert(clientData)
      .select('*')
      .single();

    if (error) throw error;
    return data as Client;
  }

  static async update(id: string, clientData: Partial<Client>): Promise<Client> {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .update({ ...clientData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Client;
  }

  static async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}
