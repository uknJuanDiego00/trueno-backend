// =====================================================================
// TRUENO 219 - Migration Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { MigrationService } from '@/services/migration.service';
import { getAuthContext, requireAdmin } from '@/lib/supabase/auth';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class MigrationController {
  static async importLocalStorage(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      requireAdmin(auth);

      const body = await req.json();
      const report = await MigrationService.importData(body, auth.userId);

      return sendSuccess(report, 'Proceso de migración ejecutado correctamente', 200);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
