import { NextRequest } from 'next/server';
import { AuthController } from '@/controllers/auth.controller';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return AuthController.updateUser(req, { params });
}
