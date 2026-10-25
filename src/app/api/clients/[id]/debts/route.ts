import { NextRequest } from 'next/server';
import { ClientController } from '@/controllers/client.controller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return ClientController.getClientDebts(req, { params });
}
