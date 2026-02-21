import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    responsibleName: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        setMessage('As senhas não coincidem');
        setLoading(false);
        return;
      }

      if (isLogin) {
        try {
          // 1. Tenta fazer login com Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (!authError && authData.user) {
            // Login Supabase Auth bem-sucedido
            // Verifica se o usuário existe na tabela 'organizers'
            const { data: organizer, error: organizerError } = await supabase
              .from('organizers')
              .select('*')
              .eq('email', formData.email)
              .single();

            if (organizerError && organizerError.code === 'PGRST116') { // Não encontrado
              // Usuário existe no Auth mas não na tabela organizers, cria o registro
              await supabase
                .from('organizers')
                .insert({
                  email: formData.email,
                  password_hash: 'managed_by_supabase_auth',
                  responsible_name: authData.user.user_metadata.display_name || 'Organizador'
                });
            }
            setMessage('Login realizado com sucesso!');
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
          } else if (authError) {
            // Login Supabase Auth falhou
            // 2. Verifica se é um usuário de teste na tabela 'organizers'
            const { data: organizer, error: organizerError } = await supabase
              .from('organizers')
              .select('*')
              .eq('email', formData.email)
              .single();

            console.log('Organizer encontrado:', organizer);
            console.log('Error organizer:', organizerError);

            if (organizer && (organizer.password_hash === 'temp_test_user' || organizer.password_hash === formData.password)) {
              setMessage('Login realizado! (Modo Gerenciador)');
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            } else if (organizerError && organizerError.code === 'PGRST116') { // Não encontrado
              // Usuário não existe no Auth nem na tabela organizers, cria como teste
              console.log('Criando usuário de teste...');
              await supabase
                .from('organizers')
                .insert({
                  email: formData.email,
                  password_hash: 'temp_test_user',
                  responsible_name: 'Organizador Teste'
                });
              setMessage('Usuário de teste criado! Agora pode fazer login com qualquer senha.');
            } else {
              // Usuário existe na tabela organizers (não é teste) e Auth falhou
              setMessage('Email ou senha incorretos');
            }
          }
        } catch (error) {
          console.error('Erro no login:', error);
          setMessage('Erro ao fazer login. Tente novamente.');
        }
      } else {
        // Registro de novo usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              display_name: formData.responsibleName
            }
          }
        });

        if (authError) {
          console.error('Erro no registro:', authError);
          setMessage('Erro ao criar conta. Tente novamente.');
        } else {
          // Cria registro na tabela organizers
          await supabase
            .from('organizers')
            .insert({
              email: formData.email,
              password_hash: 'managed_by_supabase_auth',
              responsible_name: formData.responsibleName
            });
          setMessage('Conta criada com sucesso! Verifique seu email.');
        }
      }
    } catch (error) {
      console.error('Erro geral:', error);
      setMessage('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="app-container">
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        {/* Background Elements */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div className="content-card" style={{
          width: '100%',
          maxWidth: '400px',
          padding: '40px',
          position: 'relative',
          zIndex: 10,
          animation: 'fadeIn 0.6s ease-out'
        }}>
          {/* Logo/Title */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥋</div>
            <h1 className="header-title" style={{ fontSize: '28px', marginBottom: '8px' }}>
              TKD Bracket Manager
            </h1>
            <p className="header-subtitle" style={{ marginBottom: 0 }}>
              Sistema de Campeonatos
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="seu@email.com"
                className="input-modern"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Senha
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="input-modern"
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="input-modern"
                />
              </div>
            )}

            {message && (
              <div style={{
                padding: '12px',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: '20px',
                fontSize: '14px',
                background: message.includes('sucesso')
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${message.includes('sucesso')
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                  }`,
                color: message.includes('sucesso')
                  ? '#10b981'
                  : '#ef4444'
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                  Processando...
                </div>
              ) : (
                isLogin ? 'Entrar' : 'Criar Conta'
              )}
            </button>
          </form>

          {/* Toggle */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage('');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '14px' }}
            >
              {isLogin
                ? 'Não tem uma conta? Criar conta'
                : 'Já tem uma conta? Fazer login'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
