import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    athletes: 0,
    organizations: 0,
    championships: 0
  });

  useEffect(() => {
    // Carregar estatísticas
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Carregar estatísticas reais do banco
      const [organizationsCount, championshipsCount, athletesCount] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('championships').select('id', { count: 'exact', head: true }),
        supabase.from('registrations').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        athletes: athletesCount.count || 0,
        organizations: organizationsCount.count || 0,
        championships: championshipsCount.count || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-10)'
        }}>
          <div>
            <h1 className="header-title">Dashboard</h1>
            <p className="header-subtitle">Gerencie sua federação de Taekwondo</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
          >
            Sair
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid-responsive" style={{ marginBottom: 'var(--spacing-10)' }}>
          <div className="content-card card-compact hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--spacing-2)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  Atletas
                </p>
                <h3 style={{
                  fontSize: 'var(--font-size-3xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  {stats.athletes}
                </h3>
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--primary-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                👥
              </div>
            </div>
          </div>

          <div className="content-card card-compact hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--spacing-2)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  Academias
                </p>
                <h3 style={{
                  fontSize: 'var(--font-size-3xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  {stats.organizations}
                </h3>
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--success-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                🏢
              </div>
            </div>
          </div>

          <div className="content-card card-compact hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--spacing-2)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  Campeonatos
                </p>
                <h3 style={{
                  fontSize: 'var(--font-size-3xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  {stats.championships}
                </h3>
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--warning-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                🏆
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid-responsive">
          <div className="content-card hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--primary-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📊
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  Categorias
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  margin: '0'
                }}>
                  Gerencie categorias de idade, peso e faixa
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/categories'}
            >
              Gerenciar Categorias
            </button>
          </div>

          <div className="content-card hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--success-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                🏢
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  Academias
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  margin: '0'
                }}>
                  Cadastre e gerencie academias
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/organizations'}
            >
              Gerenciar Academias
            </button>
          </div>

          <div className="content-card hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--warning-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                🏆
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  Campeonatos
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  margin: '0'
                }}>
                  Crie e gerencie campeonatos
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/championships'}
            >
              Gerenciar Campeonatos
            </button>
          </div>

          <div className="content-card hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--error-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                📝
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  Inscrições
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  margin: '0'
                }}>
                  Visualize e gerencie inscrições
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/inscriptions'}
            >
              Gerenciar Inscrições
            </button>
          </div>

          <div className="content-card hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--success-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                🥋
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  Classificações de Atletas
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  margin: '0'
                }}>
                  Crie classificações com geração automática de sigla
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/kyorugi-classifications'}
            >
              Criar Classificações
            </button>
          </div>

          <div className="content-card hover-lift">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-4)',
              marginBottom: 'var(--spacing-4)'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--warning-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                🌳
              </div>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  Chaveamento
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  margin: '0'
                }}>
                  Gere as chaves das lutas (Sorteio)
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/brackets'}
            >
              Gerenciar Chaves
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
