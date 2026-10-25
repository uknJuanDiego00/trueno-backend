// =====================================================================
// TRUENO 219 - Settings & Dashboard Services
// =====================================================================

import { SettingsRepository } from '@/repositories/settings.repository';
import { DashboardRepository } from '@/repositories/dashboard.repository';
import { StoreSettings } from '@/types';

export class SettingsService {
  static async getSettings(): Promise<StoreSettings> {
    return await SettingsRepository.getSettings();
  }

  static async updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    return await SettingsRepository.updateSettings(updates);
  }
}

export class DashboardService {
  static async getSummary() {
    return await DashboardRepository.getSummary();
  }

  static async getTopProducts(limit: number = 5) {
    return await DashboardRepository.getTopProducts(limit);
  }

  static async getSalesByPeriod(days: number = 7) {
    return await DashboardRepository.getSalesByPeriod(days);
  }
}
