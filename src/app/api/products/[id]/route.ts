import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/product.controller';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return ProductController.getProductById(req, { params });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return ProductController.updateProduct(req, { params });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return ProductController.deleteProduct(req, { params });
}
