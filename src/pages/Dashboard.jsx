import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  Building2,
  Trophy,
  Layers,
  ClipboardList,
  Medal,
  GitBranch,
  LogOut
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    athletes: 0,
    organizations: 0,
    championships: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
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
    <div className="app-container" style={{ backgroundColor: '#F2EFEA' }}>
      <div className="content-wrapper">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-12)',
          padding: 'var(--spacing-4) 0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Trophy size={32} color="var(--brand-blue)" strokeWidth={2.5} />
              <h1 className="header-title" style={{ margin: 0, fontSize: '2rem' }}>FETMG</h1>
            </div>
            <p className="header-subtitle" style={{ margin: 0, fontSize: '1.1rem' }}>SISTEMA ADMINISTRATIVO DE FEDERAÇÃO</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem' }}
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid-responsive" style={{ marginBottom: 'var(--spacing-12)' }}>
          <div className="content-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ margin: 0, color: 'var(--gray-600)' }}>Atletas Inscritos</label>
                <h3 style={{ fontSize: '2.5rem', margin: '8px 0', color: 'var(--gray-900)' }}>{stats.athletes}</h3>
              </div>
              <div className="card-icon-container" style={{ marginBottom: 0 }}>
                <Users size={28} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="content-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ margin: 0, color: 'var(--gray-600)' }}>Academias Ativas</label>
                <h3 style={{ fontSize: '2.5rem', margin: '8px 0', color: 'var(--gray-900)' }}>{stats.organizations}</h3>
              </div>
              <div className="card-icon-container" style={{ marginBottom: 0 }}>
                <Building2 size={28} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="content-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ margin: 0, color: 'var(--gray-600)' }}>Campeonatos</label>
                <h3 style={{ fontSize: '2.5rem', margin: '8px 0', color: 'var(--gray-900)' }}>{stats.championships}</h3>
              </div>
              <div className="card-icon-container" style={{ marginBottom: 0 }}>
                <Trophy size={28} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <h2 style={{ marginBottom: 'var(--spacing-6)', fontSize: '1.5rem' }}>Gestão Institucional</h2>
        <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>

          <div className="content-card">
            <div className="card-icon-container">
              <Layers size={24} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Categorias</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>
              Gerenciamento técnico de faixas, pesos e divisões de idade da federação.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/categories'}
            >
              Acessar Módulo
            </button>
          </div>

          <div className="content-card">
            <div className="card-icon-container">
              <Building2 size={24} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Academias</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>
              Cadastro de entidades filiadas e controle de responsáveis técnicos.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/organizations'}
            >
              Gerenciar Filiadas
            </button>
          </div>

          <div className="content-card">
            <div className="card-icon-container">
              <Trophy size={24} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Campeonatos</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>
              Organização de eventos oficiais e controle de datas de inscrição.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/championships'}
            >
              Configurar Eventos
            </button>
          </div>

          <div className="content-card">
            <div className="card-icon-container">
              <ClipboardList size={24} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Inscrições</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>
              Listagem completa de atletas inscritos e validação de documentos.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/inscriptions'}
            >
              Ver Inscritos
            </button>
          </div>

          <div className="content-card">
            <div className="card-icon-container">
              <Medal size={24} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Classificações</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>
              Definição de códigos oficiais de kyorugi e categorias de competição.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/kyorugi-classifications'}
            >
              Definir Regras
            </button>
          </div>

          <div className="content-card">
            <div className="card-icon-container">
              <GitBranch size={24} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Chaveamento</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>
              Geração automática de chaves de luta e sorteios por categoria.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => window.location.href = '/brackets'}
            >
              Gerar Chaves
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
