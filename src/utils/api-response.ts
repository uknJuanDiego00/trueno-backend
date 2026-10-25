// =====================================================================
// TRUENO 219 - API Response and Error Handling Utilities
// =====================================================================

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export function sendSuccess<T>(data: T, message?: string, status: number = 200, meta?: ApiResponse['meta']) {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      ...(message ? { message } : {}),
      data,
      ...(meta ? { meta } : {})
    },
    { status }
  );
}

export function sendError(message: string, status: number = 400, details?: any) {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      message,
      ...(details ? { error: details } : {})
    },
    { status }
  );
}

export function handleApiError(error: any) {
  console.error('[API Error]:', error);

  if (error instanceof ZodError) {
    const issues = error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message
    }));
    return sendError('Error de validación en los datos enviados', 422, issues);
  }

  const message = error?.message || 'Error interno del servidor';
  return sendError(message, error?.status || 500);
}
