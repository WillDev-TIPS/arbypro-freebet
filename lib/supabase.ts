import { createClient } from '@supabase/supabase-js';

// Essas variáveis de ambiente precisam ser configuradas no arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Cria o cliente do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'freebet-planner-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Função para verificar se o Supabase está configurado corretamente
export const isSupabaseConfigured = () => {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-key'
  );
};

// Tipos para autenticação
export type User = {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
};

// Tipos para as freebets
export interface FreebetDB {
  id: string;
  user_id: string;
  name: string;
  value: number;
  min_odds: number;
  expiry: string;
  status: 'active' | 'expired' | 'extracted';
  extracted_value?: number;
  created_at?: string;
  updated_at?: string;
}

// Tipos para as configurações do usuário
export interface UserSettingsDB {
  id?: string;
  user_id: string;
  default_commission: number;
  auto_calculate: boolean;
  theme?: string;
  created_at?: string;
  updated_at?: string;
}

// Funções de autenticação

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function updateUserEmail(email: string) {
  return supabase.auth.updateUser({ email });
}

// Função para limpar todas as freebets de um usuário
export async function clearFreebets() {
  const user = await getUser();
  if (!user) return { data: null, error: new Error('Usuário não autenticado') };

  return supabase
    .from('freebets')
    .delete()
    .eq('user_id', user.id);
}

// Funções para gerenciamento de freebets
export async function getFreebets() {
  const user = await getUser();
  if (!user) return { data: null, error: new Error('Usuário não autenticado') };

  return supabase
    .from('freebets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
}

// Funções para gerenciamento de configurações do usuário
export async function getUserSettings() {
  try {
    const user = await getUser();
    if (!user) return { data: null, error: new Error('Usuário não autenticado') };

    const result = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    return result;
  } catch (error) {
    console.error('Erro ao buscar configurações do usuário:', error);
    return { data: null, error };
  }
}

export async function updateUserSettings(settings: Partial<UserSettingsDB>) {
  try {
    const user = await getUser();
    if (!user) {
      console.error('updateUserSettings: Usuário não autenticado');
      return { data: null, error: new Error('Usuário não autenticado') };
    }
    
    console.log('updateUserSettings: Usuário autenticado', user.id);
    console.log('updateUserSettings: Configurações a salvar', settings);

    // Verificar se já existem configurações para o usuário
    const { data: existingSettings, error: checkError } = await getUserSettings();
    
    console.log('updateUserSettings: Configurações existentes', existingSettings);
    
    if (checkError) {
      console.log('updateUserSettings: Erro ao verificar configurações', checkError);
      // Se for erro diferente de "No rows found", retornar o erro
      if (checkError.code !== 'PGRST116') {
        return { data: null, error: checkError };
      }
    }

    let result;
    
    if (existingSettings) {
      // Atualizar configurações existentes
      console.log('updateUserSettings: Atualizando configurações existentes');
      result = await supabase
        .from('user_settings')
        .update(settings)
        .eq('user_id', user.id)
        .select();
    } else {
      // Criar novas configurações
      console.log('updateUserSettings: Criando novas configurações');
      result = await supabase
        .from('user_settings')
        .insert([{ ...settings, user_id: user.id }])
        .select();
    }
    
    console.log('updateUserSettings: Resultado da operação', result);
    return result;
  } catch (error) {
    console.error('Erro ao atualizar configurações do usuário:', error);
    return { data: null, error };
  }
}

export async function addFreebet(freebet: Omit<FreebetDB, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const user = await getUser();
  if (!user) return { data: null, error: new Error('Usuário não autenticado') };

  return supabase
    .from('freebets')
    .insert([{ ...freebet, user_id: user.id }])
    .select();
}

export async function updateFreebet(id: string, freebet: Partial<FreebetDB>) {
  const user = await getUser();
  if (!user) return { data: null, error: new Error('Usuário não autenticado') };

  return supabase
    .from('freebets')
    .update(freebet)
    .eq('id', id)
    .eq('user_id', user.id)
    .select();
}

export async function deleteFreebet(id: string) {
  const user = await getUser();
  if (!user) return { data: null, error: new Error('Usuário não autenticado') };

  return supabase
    .from('freebets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
}
