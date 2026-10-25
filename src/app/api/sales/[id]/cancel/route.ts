import { NextRequest } from 'next/server';
import { SaleController } from '@/controllers/sale.controller';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return SaleController.cancelSale(req, { params });
}
