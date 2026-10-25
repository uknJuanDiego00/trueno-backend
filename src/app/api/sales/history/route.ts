import { NextRequest } from 'next/server';
import { SaleController } from '@/controllers/sale.controller';

export async function GET(req: NextRequest) {
  return SaleController.listSales(req);
}
