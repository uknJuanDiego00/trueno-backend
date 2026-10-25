import { NextRequest } from 'next/server';
import { DebtController } from '@/controllers/debt.controller';

export async function GET(req: NextRequest) {
  return DebtController.getSummary(req);
}
