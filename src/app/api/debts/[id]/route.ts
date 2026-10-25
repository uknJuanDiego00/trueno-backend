import { NextRequest } from 'next/server';
import { DebtController } from '@/controllers/debt.controller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return DebtController.getDebtById(req, { params });
}
