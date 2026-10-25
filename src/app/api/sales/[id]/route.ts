import { NextRequest } from 'next/server';
import { SaleController } from '@/controllers/sale.controller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return SaleController.getSaleById(req, { params });
}
