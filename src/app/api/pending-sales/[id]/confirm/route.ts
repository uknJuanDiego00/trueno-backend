import { NextRequest } from 'next/server';
import { PendingSaleController } from '@/controllers/pending-sale.controller';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return PendingSaleController.confirmPendingSale(req, { params });
}
