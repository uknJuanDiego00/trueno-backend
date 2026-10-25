import { NextRequest } from 'next/server';
import { SaleController } from '@/controllers/sale.controller';

export async function GET(req: NextRequest) {
  return SaleController.listSales(req);
}

export async function POST(req: NextRequest) {
  return SaleController.registerSale(req);
}
