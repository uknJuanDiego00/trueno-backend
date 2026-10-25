// =====================================================================
// TRUENO 219 - Settings Repository
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';
import { StoreSettings } from '@/types';

export class SettingsRepository {
  static async getSettings(): Promise<StoreSettings> {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      // Create initial settings if not present
      const { data: created, error: createErr } = await supabaseAdmin
        .from('store_settings')
        .insert({
          store_name: 'Trueno 219',
          low_stock_threshold: 5,
          currency: 'COP',
          tax_rate: 0
        })
        .select('*')
        .single();

      if (createErr) throw createErr;
      return created as StoreSettings;
    }

    return data as StoreSettings;
  }

  static async updateSettings(settingsData: Partial<StoreSettings>): Promise<StoreSettings> {
    const current = await this.getSettings();
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .update({ ...settingsData, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .select('*')
      .single();

    if (error) throw error;
    return data as StoreSettings;
  }
}
