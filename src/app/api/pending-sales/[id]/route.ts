import { NextRequest } from 'next/server';
import { PendingSaleController } from '@/controllers/pending-sale.controller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return PendingSaleController.getPendingSaleById(req, { params });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return PendingSaleController.updatePendingSale(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return PendingSaleController.deletePendingSale(req, { params });
}
