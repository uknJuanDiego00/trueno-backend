// =====================================================================
// TRUENO 219 - Auth Controller
// =====================================================================

import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { getAuthContext, requireAdmin } from '@/lib/supabase/auth';
import { LoginSchema, RegisterSchema, ForgotPasswordSchema, UpdateUserSchema } from '@/schemas';
import { sendSuccess, handleApiError } from '@/utils/api-response';

export class AuthController {
  static async register(req: NextRequest) {
    try {
      const body = await req.json();
      const validated = RegisterSchema.parse(body);
      const result = await AuthService.register(validated);
      return sendSuccess(result, 'Usuario registrado exitosamente', 201);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async login(req: NextRequest) {
    try {
      const body = await req.json();
      const validated = LoginSchema.parse(body);
      const result = await AuthService.login(validated.email, validated.password);
      return sendSuccess(result, 'Inicio de sesión exitoso');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async logout() {
    try {
      // In JWT/stateless sessions, frontend simply discards the token.
      return sendSuccess({ loggedOut: true }, 'Sesión cerrada correctamente');
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async forgotPassword(req: NextRequest) {
    try {
      const body = await req.json();
      const validated = ForgotPasswordSchema.parse(body);
      const result = await AuthService.forgotPassword(validated.email);
      return sendSuccess(result);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async me(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      return sendSuccess({ user: auth.profile });
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async listUsers(req: NextRequest) {
    try {
      const auth = await getAuthContext(req);
      requireAdmin(auth);
      const users = await AuthService.listUsers();
      return sendSuccess(users);
    } catch (error) {
      return handleApiError(error);
    }
  }

  static async updateUser(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const auth = await getAuthContext(req);
      requireAdmin(auth);
      const body = await req.json();
      const validated = UpdateUserSchema.parse(body);
      const updated = await AuthService.updateUser(params.id, validated);
      return sendSuccess(updated, 'Usuario actualizado');
    } catch (error) {
      return handleApiError(error);
    }
  }
}
