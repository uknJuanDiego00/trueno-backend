import { NextRequest } from 'next/server';
import { ClientController } from '@/controllers/client.controller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return ClientController.getClientById(req, { params });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return ClientController.updateClient(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return ClientController.deleteClient(req, { params });
}
