// =====================================================================
// TRUENO 219 - Auth Service
// =====================================================================

import { supabaseAdmin, supabasePublic } from '@/lib/supabase/client';
import { UserProfile } from '@/types';

export class AuthService {
  static async register(params: {
    full_name: string;
    email: string;
    password: string;
    role?: 'admin' | 'empleado';
  }) {
    // 1. Create user in Supabase Auth via Admin Client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        full_name: params.full_name,
        role: params.role || 'empleado'
      }
    });

    if (error) {
      throw new Error(`Error al crear usuario: ${error.message}`);
    }

    const user = data.user;

    // 2. Insert/Update in profiles table
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: params.full_name,
        email: params.email,
        role: params.role || 'empleado',
        is_active: true
      })
      .select('*')
      .single();

    if (profileErr) {
      console.error('Error creating profile row:', profileErr);
    }

    // 3. Issue session tokens by signing in
    const { data: sessionData, error: signinErr } = await supabasePublic.auth.signInWithPassword({
      email: params.email,
      password: params.password
    });

    if (signinErr) {
      return {
        user: profile || { id: user.id, full_name: params.full_name, email: params.email, role: params.role || 'empleado' },
        token: null,
        session: null
      };
    }

    return {
      user: profile,
      token: sessionData.session?.access_token,
      session: sessionData.session
    };
  }

  static async login(email: string, password: string) {
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      throw new Error('Credenciales inválidas. Por favor verifique correo y contraseña.');
    }

    // Get profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      throw new Error('No se encontró el perfil del usuario');
    }

    if (!profile.is_active) {
      throw new Error('Su usuario ha sido desactivado');
    }

    return {
      user: profile as UserProfile,
      token: data.session.access_token,
      session: data.session
    };
  }

  static async forgotPassword(email: string) {
    const { error } = await supabasePublic.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(`Error al solicitar restablecimiento de contraseña: ${error.message}`);
    }
    return { success: true, message: 'Correo de restablecimiento enviado' };
  }

  static async listUsers() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserProfile[];
  }

  static async updateUser(id: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as UserProfile;
  }
}
