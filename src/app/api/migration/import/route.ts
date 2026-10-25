import { NextRequest } from 'next/server';
import { MigrationController } from '@/controllers/migration.controller';

export async function POST(req: NextRequest) {
  return MigrationController.importLocalStorage(req);
}
