import { NextRequest } from 'next/server';
import { PendingSaleController } from '@/controllers/pending-sale.controller';

export async function GET(req: NextRequest) {
  return PendingSaleController.listPendingSales(req);
}

export async function POST(req: NextRequest) {
  return PendingSaleController.createPendingSale(req);
}
