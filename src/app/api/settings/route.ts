import { NextRequest } from 'next/server';
import { SettingsController } from '@/controllers/settings.controller';

export async function GET(req: NextRequest) {
  return SettingsController.getSettings(req);
}

export async function PATCH(req: NextRequest) {
  return SettingsController.updateSettings(req);
}
