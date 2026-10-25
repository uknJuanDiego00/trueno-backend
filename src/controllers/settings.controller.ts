// =====================================================================
// TRUENO 219 - Settings Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { SettingsService } from '@/services/settings.service';
import { getAuthContext, requireAdmin } from '@/lib/supabase/auth';
import { UpdateStoreSettingsSchema } from '@/schemas';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class SettingsController {
  static async getSettings(req: NextRequest) {
    try {
      await getAuthContext(req);
      const settings = await SettingsService.getSettings();
      return sendSuccess(settings);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updateSettings(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      requireAdmin(auth);
      const body = await req.json();
      const validated = UpdateStoreSettingsSchema.parse(body);
      const updated = await SettingsService.updateSettings(validated);
      return sendSuccess(updated, 'Configuración actualizada correctamente');
    } catch (error) {
      return handleApiError(error);
    }
  }
}
