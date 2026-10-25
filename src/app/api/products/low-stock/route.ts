import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/product.controller';

export async function GET(req: NextRequest) {
  return ProductController.getLowStock(req);
}
