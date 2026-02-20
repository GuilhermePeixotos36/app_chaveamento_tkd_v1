import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    responsible_name: '',
    phone: ''
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Erro ao carregar academias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingOrg) {
        // Editar academia existente
        const { error } = await supabase
          .from('organizations')
          .update({
            name: formData.name,
            responsible_name: formData.responsible_name,
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingOrg.id);

        if (error) throw error;
      } else {
        // Criar nova academia
        const { error } = await supabase
          .from('organizations')
          .insert({
            name: formData.name,
            responsible_name: formData.responsible_name,
            phone: formData.phone
          });

        if (error) throw error;
      }

      await loadOrganizations();
      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar academia:', error);
      alert('Erro ao salvar academia. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      responsible_name: org.responsible_name,
      phone: org.phone
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta academia?')) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadOrganizations();
    } catch (error) {
      console.error('Erro ao excluir academia:', error);
      alert('Erro ao excluir academia. Tente novamente.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrg(null);
    setFormData({ name: '', responsible_name: '', phone: '' });
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (showForm) {
    return (
      <div className="app-container">
        <div className="content-wrapper">
          <div className="content-card card-centered" style={{ maxWidth: '600px' }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-8)'
            }}>
              <h1 className="header-title" style={{ fontSize: 'var(--font-size-2xl)' }}>
                {editingOrg ? 'Editar Academia' : 'Nova Academia'}
              </h1>
              <button
                onClick={handleCancel}
                className="btn btn-secondary"
              >
                ← Voltar
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--spacing-2)', 
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)'
                }}>
                  Nome da Academia *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-modern"
                  placeholder="Nome da academia"
                  required
                />
              </div>

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
                <input
                  type="text"
                  name="responsible_name"
                  value={formData.responsible_name}
                  onChange={handleChange}
                  className="input-modern"
                  placeholder="Nome completo do responsável"
                  required
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--spacing-2)', 
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)'
                }}>
                  Telefone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-modern"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div style={{
                display: 'flex',
                gap: 'var(--spacing-3)',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : (editingOrg ? 'Atualizar' : 'Cadastrar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="content-wrapper">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-10)',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-4)'
          }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn btn-secondary"
            >
              ← Voltar
            </button>
            <div>
              <h1 className="header-title">🏢 Academias</h1>
              <p className="header-subtitle">
                Gerencie todas as academias de Taekwondo
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary hover-lift"
          >
            + Nova Academia
          </button>
        </div>

        {/* Organizations List */}
        {loading ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-4)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Carregando academias...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
            <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-6)' }}>🏢</div>
            <h3 style={{ 
              fontSize: 'var(--font-size-xl)', 
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-4)'
            }}>
              Nenhuma academia cadastrada
            </h3>
            <p style={{ 
              fontSize: 'var(--font-size-base)', 
              color: 'var(--text-secondary)',
              marginBottom: 'var(--spacing-8)'
            }}>
              Comece cadastrando a primeira academia do sistema
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              + Cadastrar Primeira Academia
            </button>
          </div>
        ) : (
          <div className="grid-responsive">
            {organizations.map((org) => (
              <div key={org.id} className="content-card hover-lift">
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--spacing-4)'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--success-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    🏢
                  </div>
                  <div style={{ flex: 1, marginLeft: 'var(--spacing-4)' }}>
                    <h3 style={{ 
                      fontSize: 'var(--font-size-lg)', 
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--text-primary)',
                      margin: '0 0 var(--spacing-2) 0'
                    }}>
                      {org.name}
                    </h3>
                    <p style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      color: 'var(--text-secondary)',
                      margin: '0 0 var(--spacing-1) 0'
                    }}>
                      📍 Responsável: {org.responsible_name}
                    </p>
                    {org.phone && (
                      <p style={{ 
                        fontSize: 'var(--font-size-sm)', 
                        color: 'var(--text-secondary)',
                        margin: '0'
                      }}>
                        📞 {org.phone}
                      </p>
                    )}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-2)',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => handleEdit(org)}
                    className="btn btn-outline btn-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(org.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
