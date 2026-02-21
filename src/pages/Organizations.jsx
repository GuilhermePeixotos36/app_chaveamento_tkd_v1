import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building2,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  User,
  Phone,
  Check,
  X,
  Search
} from 'lucide-react';

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
    } catch (error) { console.error('Erro ao carregar:', error); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingOrg) {
        await supabase.from('organizations').update({
          name: formData.name, responsible_name: formData.responsible_name, phone: formData.phone, updated_at: new Date().toISOString()
        }).eq('id', editingOrg.id);
      } else {
        await supabase.from('organizations').insert({ name: formData.name, responsible_name: formData.responsible_name, phone: formData.phone });
      }
      await loadOrganizations();
      handleCancel();
    } catch (error) { alert('Erro ao salvar academia.'); } finally { setLoading(false); }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({ name: org.name, responsible_name: org.responsible_name, phone: org.phone });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza?')) return;
    try {
      await supabase.from('organizations').delete().eq('id', id);
      await loadOrganizations();
    } catch (error) { alert('Erro ao excluir academia.'); }
  };

  const handleCancel = () => { setShowForm(false); setEditingOrg(null); setFormData({ name: '', responsible_name: '', phone: '' }); };
  const handleChange = (e) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };

  if (showForm) {
    return (
      <div className="app-container" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="content-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-12)' }}>
            <button onClick={handleCancel} className="btn btn-secondary" style={{ width: '42px', height: '42px', padding: 0 }}><ArrowLeft size={18} /></button>
            <h1 className="header-title" style={{ margin: 0 }}>{editingOrg ? 'Editar Entidade' : 'Nova Entidade'}</h1>
          </div>

          <div className="content-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div><label>Nome da Academia / Clube</label><input name="name" value={formData.name} onChange={handleChange} className="input-modern" placeholder="Ex: Dojang Central de Taekwondo" required /></div>
              <div><label>Nome do Grão-Mestre / Professor Responsável</label><input name="responsible_name" value={formData.responsible_name} onChange={handleChange} className="input-modern" placeholder="Nome completo" required /></div>
              <div><label>Telefone de Contato (WhatsApp)</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-modern" placeholder="(00) 90000-0000" /></div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: '150px' }}><Check size={18} /> {editingOrg ? 'Salvar Alterações' : 'Cadastrar Entidade'}</button>
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
                <Building2 size={24} color="var(--brand-blue)" />
                <h1 className="header-title" style={{ margin: 0, fontSize: '1.8rem' }}>Academias</h1>
              </div>
              <p className="header-subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>Gestão de entidades filiadas e mestres responsáveis</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus size={18} /> Adicionar Academia</button>
        </div>

        {loading ? (
          <div className="content-card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : organizations.length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: '64px' }}>
            <Building2 size={64} color="var(--gray-200)" style={{ marginBottom: '24px' }} />
            <h3 style={{ color: 'var(--gray-600)' }}>Nenhuma entidade cadastrada</h3>
          </div>
        ) : (
          <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
            {organizations.map((org) => (
              <div key={org.id} className="content-card" style={{ padding: 'var(--spacing-8)' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                  <div className="card-icon-container" style={{ margin: 0, flexShrink: 0 }}>
                    <Building2 size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--gray-900)' }}>{org.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-600)' }}>
                        <User size={14} />
                        <span style={{ fontSize: '0.875rem' }}>{org.responsible_name}</span>
                      </div>
                      {org.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-600)' }}>
                          <Phone size={14} />
                          <span style={{ fontSize: '0.875rem' }}>{org.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <button onClick={() => handleEdit(org)} className="btn btn-secondary" style={{ background: '#FFF' }}>
                    <Pencil size={16} /> Editar
                  </button>
                  <button onClick={() => handleDelete(org.id)} className="btn btn-danger" style={{ padding: '8px', backgroundColor: 'var(--brand-red)' }}>
                    <Trash2 size={16} />
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
