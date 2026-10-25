// =====================================================================
// TRUENO 219 - Server-side Authentication & Authorization Helpers
// =====================================================================

import { NextRequest } from 'next/server';
import { supabaseAdmin, createAuthenticatedClient } from './client';
import { UserProfile } from '@/types';

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: UserProfile;
  token: string;
}

/**
 * Extracts the bearer token from the Authorization header of a NextRequest
 */
export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}

/**
 * Verifies JWT token and retrieves the authenticated user's profile
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const token = extractBearerToken(req);
  if (!token) {
    const error: any = new Error('No se proporcionó token de autorización');
    error.status = 401;
    throw error;
  }

  // Verify token with Supabase Auth
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    const error: any = new Error('Sesión inválida o expirada. Inicie sesión nuevamente.');
    error.status = 401;
    throw error;
  }

  // Fetch or ensure profile
  let { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // Attempt to create default profile if missing
    const newProfile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      email: user.email || null,
      role: (user.user_metadata?.role as any) || 'empleado',
      is_active: true
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('profiles')
      .upsert(newProfile)
      .select('*')
      .single();

    if (insertErr || !inserted) {
      const error: any = new Error('No se pudo verificar el perfil del usuario');
      error.status = 500;
      throw error;
    }
    profile = inserted;
  }

  if (!profile.is_active) {
    const error: any = new Error('Su cuenta ha sido desactivada. Comuníquese con el administrador.');
    error.status = 403;
    throw error;
  }

  return {
    userId: user.id,
    email: user.email || null,
    profile,
    token
  };
}

/**
 * Enforces admin role requirement
 */
export function requireAdmin(context: AuthContext) {
  if (context.profile.role !== 'admin') {
    const error: any = new Error('Acceso denegado: Se requieren permisos de administrador');
    error.status = 403;
    throw error;
  }
}
