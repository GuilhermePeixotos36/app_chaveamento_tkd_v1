import React, { useState } from 'react';
import { User, Lock, Mail } from 'lucide-react';
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
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) throw error;

        window.location.href = '/dashboard';
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              responsible_name: formData.responsibleName
            }
          }
        });

        if (error) throw error;

        setMessage('Cadastro realizado! Verifique seu email para confirmar.');
        setIsLogin(true);
      }
    } catch (error) {
      setError(error.message || 'Erro ao processar solicitação');
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
    <div className="app-container flex-center">
      <div className="content-wrapper" style={{ maxWidth: '500px' }}>
        <div className="content-card card-centered scale-in">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-8)' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-2xl)',
              background: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto var(--spacing-6)',
              boxShadow: 'var(--shadow-lg)'
            }}>
              🥋
            </div>
            <h1 className="header-title" style={{ fontSize: 'var(--font-size-3xl)' }}>
              {isLogin ? 'Bem-vindo' : 'Criar Conta'}
            </h1>
            <p className="header-subtitle" style={{ fontSize: 'var(--font-size-base)' }}>
              {isLogin
                ? 'Entre para gerenciar sua federação'
                : 'Cadastre-se para começar'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)'
              }}>
                Email *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{
                  position: 'absolute',
                  left: 'var(--spacing-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-modern"
                  style={{ paddingLeft: 'var(--spacing-10)' }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)'
              }}>
                Senha *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute',
                  left: 'var(--spacing-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-modern"
                  style={{ paddingLeft: 'var(--spacing-10)' }}
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            {!isLogin && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-2)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)'
                }}>
                  Confirmar Senha *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute',
                    left: 'var(--spacing-3)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input-modern"
                    style={{ paddingLeft: 'var(--spacing-10)' }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Responsible Name */}
            {!isLogin && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 'var(--spacing-2)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)'
                }}>
                  Nome do Responsável *
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{
                    position: 'absolute',
                    left: 'var(--spacing-3)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type="text"
                    name="responsibleName"
                    placeholder="Seu nome completo"
                    value={formData.responsibleName}
                    onChange={handleChange}
                    className="input-modern"
                    style={{ paddingLeft: 'var(--spacing-10)' }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--error-50)',
                color: 'var(--error-600)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div style={{
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--font-size-sm)',
                background: 'var(--success-50)',
                color: 'var(--success-600)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                textAlign: 'center'
              }}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                  <div className="loading-spinner" />
                  Processando...
                </div>
              ) : (
                isLogin ? 'Entrar' : 'Criar Conta'
              )}
            </button>
          </form>

          {/* Toggle */}
          <div style={{
            textAlign: 'center',
            marginTop: 'var(--spacing-8)',
            paddingTop: 'var(--spacing-6)',
            borderTop: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setMessage('');
              }}
              className="btn btn-ghost"
            >
              {isLogin
                ? 'Não tem uma conta? Criar conta'
                : 'Já tem uma conta? Entrar'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
