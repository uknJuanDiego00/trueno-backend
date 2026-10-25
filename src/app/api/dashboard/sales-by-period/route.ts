import { NextRequest } from 'next/server';
import { DashboardController } from '@/controllers/dashboard.controller';

export async function GET(req: NextRequest) {
  return DashboardController.getSalesByPeriod(req);
}
