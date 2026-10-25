import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/product.controller';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return ProductController.adjustStock(req, { params });
}
