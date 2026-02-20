import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Championships() {
  const [championships, setChampionships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChamp, setEditingChamp] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    google_forms_index: '',
    status: 'active'
  });

  useEffect(() => {
    loadChampionships();
  }, []);

  const loadChampionships = async () => {
    try {
      const { data, error } = await supabase
        .from('championships')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChampionships(data || []);
    } catch (error) {
      console.error('Erro ao carregar campeonatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingChamp) {
        const { error } = await supabase
          .from('championships')
          .update({
            name: formData.name,
            date: formData.date,
            google_forms_index: formData.google_forms_index,
            status: formData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingChamp.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('championships')
          .insert({
            name: formData.name,
            date: formData.date,
            google_forms_index: formData.google_forms_index,
            status: formData.status
          });

        if (error) throw error;
      }

      await loadChampionships();
      handleCancel();
    } catch (error) {
      console.error('Erro ao salvar campeonato:', error);
      alert('Erro ao salvar campeonato. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (champ) => {
    setEditingChamp(champ);
    setFormData({
      name: champ.name,
      date: champ.date ? new Date(champ.date).toISOString().split('T')[0] : '',
      google_forms_index: champ.google_forms_index || '',
      status: champ.status
    });
    setShowForm(true);
  };

  const handleToggleInscriptions = async (champ) => {
    try {
      const { error } = await supabase
        .from('championships')
        .update({ inscription_open: !champ.inscription_open })
        .eq('id', champ.id);

      if (error) throw error;
      await loadChampionships();
    } catch (error) {
      console.error('Erro ao alterar status das inscrições:', error);
      alert('Erro ao alterar status das inscrições. Tente novamente.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este campeonato?')) return;

    try {
      const { error } = await supabase
        .from('championships')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadChampionships();
    } catch (error) {
      console.error('Erro ao excluir campeonato:', error);
      alert('Erro ao excluir campeonato. Tente novamente.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingChamp(null);
    setFormData({ name: '', date: '', google_forms_index: '', status: 'active' });
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getStatusBadge = (status, inscriptionOpen) => {
    if (inscriptionOpen) {
      return { text: 'Inscrições Abertas', class: 'badge-success' };
    }
    
    const statusMap = {
      'active': { text: 'Ativo', class: 'badge-secondary' },
      'completed': { text: 'Concluído', class: 'badge-secondary' },
      'cancelled': { text: 'Cancelado', class: 'badge-error' }
    };
    return statusMap[status] || { text: status, class: 'badge-secondary' };
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                <h1 className="header-title" style={{ fontSize: 'var(--font-size-2xl)' }}>
                  {editingChamp ? 'Editar Campeonato' : 'Novo Campeonato'}
                </h1>
                {editingChamp && (
                  <button
                    onClick={() => window.open(`/inscrever-fetmg?id=${editingChamp.id}`, '_blank')}
                    className="btn btn-outline btn-sm"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      borderColor: 'var(--primary-500)',
                      color: 'var(--primary-600)'
                    }}
                    title="Ver Ficha de Inscrição"
                  >
                    🔗 Ficha de Inscrição
                  </button>
                )}
              </div>
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
                  Nome do Campeonato *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-modern"
                  placeholder="Ex: 1ª Etapa Campeonato Mineiro"
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
                  Data do Campeonato *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="input-modern"
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
                  Índice Google Forms
                </label>
                <input
                  type="text"
                  name="google_forms_index"
                  value={formData.google_forms_index}
                  onChange={handleChange}
                  className="input-modern"
                  placeholder="ID do formulário Google"
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
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="select-modern"
                >
                  <option value="active">Ativo</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
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
                  {loading ? 'Salvando...' : (editingChamp ? 'Atualizar' : 'Cadastrar')}
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
              <h1 className="header-title">🏆 Campeonatos</h1>
              <p className="header-subtitle">
                Gerencie todos os campeonatos de Taekwondo
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary hover-lift"
          >
            + Novo Campeonato
          </button>
        </div>

        {/* Championships List */}
        {loading ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-4)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Carregando campeonatos...</p>
          </div>
        ) : championships.length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
            <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-6)' }}>🏆</div>
            <h3 style={{ 
              fontSize: 'var(--font-size-xl)', 
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-primary)',
              marginBottom: 'var(--spacing-4)'
            }}>
              Nenhum campeonato cadastrado
            </h3>
            <p style={{ 
              fontSize: 'var(--font-size-base)', 
              color: 'var(--text-secondary)',
              marginBottom: 'var(--spacing-8)'
            }}>
              Comece criando o primeiro campeonato do sistema
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              + Criar Primeiro Campeonato
            </button>
          </div>
        ) : (
          <div className="grid-responsive">
            {championships.map((champ) => (
              <div key={champ.id} className="content-card hover-lift">
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
                    background: 'var(--warning-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    🏆
                  </div>
                  <div style={{ flex: 1, marginLeft: 'var(--spacing-4)' }}>
                    <h3 style={{ 
                      fontSize: 'var(--font-size-lg)', 
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--text-primary)',
                      margin: '0 0 var(--spacing-2) 0'
                    }}>
                      {champ.name}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-3)',
                      marginBottom: 'var(--spacing-2)'
                    }}>
                      <span className={getStatusBadge(champ.status, champ.inscription_open).class}>
                        {getStatusBadge(champ.status, champ.inscription_open).text}
                      </span>
                    </div>
                    <p style={{ 
                      fontSize: 'var(--font-size-sm)', 
                      color: 'var(--text-secondary)',
                      margin: '0'
                    }}>
                      📅 {champ.date ? new Date(champ.date).toLocaleDateString('pt-BR') : 'Data não definida'}
                    </p>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: 'var(--spacing-2)',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => handleToggleInscriptions(champ)}
                    className={`btn btn-sm ${champ.inscription_open ? 'btn-warning' : 'btn-success'}`}
                  >
                    {champ.inscription_open ? '🔒 Fechar Inscrições' : '🔓 Abrir Inscrições'}
                  </button>
                  <button
                    onClick={() => handleEdit(champ)}
                    className="btn btn-outline btn-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(champ.id)}
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
