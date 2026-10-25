// =====================================================================
// TRUENO 219 - Dashboard Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { DashboardService } from '@/services/settings.service';
import { getAuthContext } from '@/lib/supabase/auth';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class DashboardController {
  static async getSummary(req: NextRequest) {
    try {
      await getAuthContext(req);
      const summary = await DashboardService.getSummary();
      return sendSuccess(summary);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getTopProducts(req: NextRequest) {
    try {
      await getAuthContext(req);
      const { searchParams } = new URL(req.url);
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 5;
      const top = await DashboardService.getTopProducts(limit);
      return sendSuccess(top);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getSalesByPeriod(req: NextRequest) {
    try {
      await getAuthContext(req);
      const { searchParams } = new URL(req.url);
      const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 7;
      const sales = await DashboardService.getSalesByPeriod(days);
      return sendSuccess(sales);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
