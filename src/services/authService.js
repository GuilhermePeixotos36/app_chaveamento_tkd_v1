import { supabase } from '../lib/supabase';

export const authService = {
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Verificar se é um organizador cadastrado
      if (data.user) {
        const { data: organizer, error: organizerError } = await supabase
          .from('organizers')
          .select('*')
          .eq('email', email)
          .single();

        if (organizerError && organizerError.code !== 'PGRST116') {
          throw organizerError;
        }

        return { user: data.user, organizer };
      }

      return { user: data.user, organizer: null };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(email, password, organizerData) {
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Criar registro na tabela organizers
      if (authData.user) {
        const { data: organizer, error: organizerError } = await supabase
          .from('organizers')
          .insert({
            email,
            password_hash: 'managed_by_supabase_auth', // Indicação que senha é gerenciada pelo auth
            ...organizerData
          })
          .select()
          .single();

        if (organizerError) throw organizerError;

        return { user: authData.user, organizer };
      }

      return { user: authData.user, organizer: null };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: organizer } = await supabase
          .from('organizers')
          .select('*')
          .eq('email', user.email)
          .single();

        return { user, organizer };
      }

      return { user: null, organizer: null };
    } catch (error) {
      console.error('Get current user error:', error);
      return { user: null, organizer: null };
    }
  }
};
