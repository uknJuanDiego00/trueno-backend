import { NextRequest } from 'next/server';
import { ClientController } from '@/controllers/client.controller';

export async function GET(req: NextRequest) {
  return ClientController.listClients(req);
}

export async function POST(req: NextRequest) {
  return ClientController.createClient(req);
}
