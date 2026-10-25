import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/product.controller';

export async function GET(req: NextRequest) {
  return ProductController.listProducts(req);
}

export async function POST(req: NextRequest) {
  return ProductController.createProduct(req);
}
