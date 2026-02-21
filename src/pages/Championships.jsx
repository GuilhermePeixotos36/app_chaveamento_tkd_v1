import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Trophy,
  Plus,
  Calendar,
  ExternalLink,
  ArrowLeft,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  X,
  Check,
  Layout,
  Activity
} from 'lucide-react';

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
    } catch (error) { console.error('Erro:', error); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingChamp) {
        await supabase.from('championships').update({
          name: formData.name, date: formData.date, google_forms_index: formData.google_forms_index, status: formData.status, updated_at: new Date().toISOString()
        }).eq('id', editingChamp.id);
      } else {
        await supabase.from('championships').insert({ name: formData.name, date: formData.date, google_forms_index: formData.google_forms_index, status: formData.status });
      }
      await loadChampionships();
      handleCancel();
    } catch (error) { alert('Erro ao salvar campeonato.'); } finally { setLoading(false); }
  };

  const handleEdit = (champ) => {
    setEditingChamp(champ);
    setFormData({ name: champ.name, date: champ.date ? new Date(champ.date).toISOString().split('T')[0] : '', google_forms_index: champ.google_forms_index || '', status: champ.status });
    setShowForm(true);
  };

  const handleToggleInscriptions = async (champ) => {
    try {
      await supabase.from('championships').update({ inscription_open: !champ.inscription_open }).eq('id', champ.id);
      await loadChampionships();
    } catch (error) { alert('Erro ao alterar status.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza?')) return;
    try {
      await supabase.from('championships').delete().eq('id', id);
      await loadChampionships();
    } catch (error) { alert('Erro ao excluir.'); }
  };

  const handleCancel = () => { setShowForm(false); setEditingChamp(null); setFormData({ name: '', date: '', google_forms_index: '', status: 'active' }); };
  const handleChange = (e) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };

  if (showForm) {
    return (
      <div className="app-container" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-12)' }}>
            <button onClick={handleCancel} className="btn btn-secondary" style={{ width: '42px', height: '42px', padding: 0 }}><ArrowLeft size={18} /></button>
            <h1 className="header-title" style={{ margin: 0 }}>{editingChamp ? 'Editar Evento' : 'Novo Evento'}</h1>
          </div>

          <div className="content-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div><label>Nome Oficial do Campeonato</label><input name="name" value={formData.name} onChange={handleChange} className="input-modern" placeholder="Ex: Open de Taekwondo 2025" required /></div>
              <div><label>Data Prevista</label><input type="date" name="date" value={formData.date} onChange={handleChange} className="input-modern" required /></div>
              <div><label>Referência de Registro</label><input name="google_forms_index" value={formData.google_forms_index} onChange={handleChange} className="input-modern" placeholder="ID Interno" /></div>
              <div>
                <label>Status do Evento</label>
                <select name="status" value={formData.status} onChange={handleChange} className="select-modern">
                  <option value="active">Em Planejamento / Ativo</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Suspenso</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }}><Check size={18} /> {editingChamp ? 'Salvar Evento' : 'Criar Evento'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ backgroundColor: '#F2EFEA' }}>
      <div className="content-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary" style={{ backgroundColor: '#FFF', width: '42px', height: '42px', padding: 0 }}><ArrowLeft size={18} /></button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={24} color="var(--brand-blue)" />
                <h1 className="header-title" style={{ margin: 0, fontSize: '1.8rem' }}>Campeonatos</h1>
              </div>
              <p className="header-subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>Gestão de eventos oficiais e períodos de inscrição</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus size={18} /> Adicionar Evento</button>
        </div>

        {loading ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : championships.length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: '64px' }}>
            <Trophy size={64} color="var(--gray-200)" style={{ marginBottom: '24px' }} />
            <h3 style={{ color: 'var(--gray-600)' }}>Nenhum evento registrado</h3>
          </div>
        ) : (
          <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
            {championships.map((champ) => (
              <div key={champ.id} className="content-card" style={{ padding: 'var(--spacing-8)' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                  <div className="card-icon-container" style={{ margin: 0, flexShrink: 0 }}>
                    <Trophy size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--gray-900)' }}>{champ.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-600)', marginBottom: '12px' }}>
                      <Calendar size={14} />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{champ.date ? new Date(champ.date).toLocaleDateString('pt-BR') : 'Data a definir'}</span>
                    </div>
                    {champ.inscription_open ? (
                      <span className="badge badge-primary">INSCRIÇÕES ABERTAS</span>
                    ) : (
                      <span className="badge badge-secondary">{champ.status === 'completed' ? 'CONCLUÍDO' : 'INSCRIÇÕES FECHADAS'}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <button onClick={() => handleEdit(champ)} className="btn btn-ghost" style={{ padding: '8px' }}><Pencil size={16} /></button>
                  <button onClick={() => window.open(`/inscrever-fetmg?id=${champ.id}`, '_blank')} className="btn btn-ghost" title="Ver Link Público" style={{ padding: '8px' }}><ExternalLink size={16} /></button>
                  <button
                    onClick={() => handleToggleInscriptions(champ)}
                    className="btn btn-secondary"
                    style={{ background: '#FFF', fontSize: '0.8rem', padding: '8px 16px' }}
                  >
                    {champ.inscription_open ? <Lock size={14} /> : <Unlock size={14} />} {champ.inscription_open ? 'Fechar' : 'Abrir'}
                  </button>
                  <button onClick={() => handleDelete(champ.id)} className="btn btn-danger" style={{ padding: '8px', backgroundColor: 'var(--brand-red)' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
