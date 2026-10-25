// =====================================================================
// TRUENO 219 - Product Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { ProductService } from '@/services/product.service';
import { getAuthContext, requireAdmin } from '@/lib/supabase/auth';
import { CreateProductSchema, UpdateProductSchema, AdjustStockSchema, TransferStockSchema } from '@/schemas';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class ProductController {
  static async listProducts(req: NextRequest) {
    try {
      await getAuthContext(req);
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || undefined;
      const category = searchParams.get('category') || undefined;
      const lowStock = searchParams.get('lowStock') === 'true';
      const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

      const result = await ProductService.listProducts({ search, category, lowStock, page, limit });
      return sendSuccess(result.products, undefined, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getProductById(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const product = await ProductService.getProductById(params.id);
      return sendSuccess(product);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async createProduct(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = CreateProductSchema.parse(body);
      const product = await ProductService.createProduct(validated, auth.userId);
      return sendSuccess(product, 'Producto creado exitosamente', 201);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updateProduct(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      await getAuthContext(req);
      const body = await req.json();
      const validated = UpdateProductSchema.parse(body);
      const updated = await ProductService.updateProduct(params.id, validated);
      return sendSuccess(updated, 'Producto actualizado');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async deleteProduct(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      requireAdmin(auth);
      await ProductService.deleteProduct(params.id);
      return sendSuccess({ deleted: true }, 'Producto eliminado correctamente');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async adjustStock(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = AdjustStockSchema.parse(body);
      const result = await ProductService.adjustStock({
        id: params.id,
        delta: validated.delta,
        location: validated.location,
        notes: validated.notes,
        userId: auth.userId
      });
      return sendSuccess(result, 'Stock ajustado correctamente');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async transferStock(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      const body = await req.json();
      const validated = TransferStockSchema.parse(body);
      const result = await ProductService.transferStock({
        id: params.id,
        from: validated.from,
        to: validated.to,
        quantity: validated.quantity,
        userId: auth.userId,
        notes: validated.notes
      });
      return sendSuccess(result, 'Traslado de stock completado');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async getLowStock(req: NextRequest) {
    try {
      await getAuthContext(req);
      const result = await ProductService.getLowStockProducts();
      return sendSuccess(result.products);
    } catch (error) {
      return handleApiError(error);
    }
  }
}
