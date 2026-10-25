import { NextRequest } from 'next/server';
import { DebtController } from '@/controllers/debt.controller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return DebtController.getPayments(req, { params });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return DebtController.addPayment(req, { params });
}
