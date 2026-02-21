import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Layers,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Scale,
  Users,
  Circle,
  Trophy,
  Copy,
  Layout,
  User,
  UserRound
} from 'lucide-react';

export default function Categories() {
  const [ageCategories, setAgeCategories] = useState([]);
  const [weightCategories, setWeightCategories] = useState([]);
  const [beltCategories, setBeltCategories] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const [weightView, setWeightView] = useState('list');
  const [selectedAgeCategory, setSelectedAgeCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [weightFormData, setWeightFormData] = useState({ name: '', min_weight: '', max_weight: '' });
  const [editingWeightCategory, setEditingWeightCategory] = useState(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState('age');

  const ageOptions = [
    { value: 'Fraldinha', label: 'Fraldinha (4-6 anos)' },
    { value: 'Mirim', label: 'Mirim (7-9 anos)' },
    { value: 'Infantil', label: 'Infantil (10-12 anos)' },
    { value: 'Juvenil', label: 'Juvenil (13-15 anos)' },
    { value: 'Júnior', label: 'Júnior (16-17 anos)' },
    { value: 'Sênior', label: 'Sênior (18-34 anos)' },
    { value: 'Master 1', label: 'Master 1 (35-44 anos)' },
    { value: 'Master 2', label: 'Master 2 (45-54 anos)' },
    { value: 'Master 3', label: 'Master 3 (55+ anos)' }
  ];

  const genderOptions = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' }
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const [ageData, weightData, beltData, modData] = await Promise.all([
        supabase.from('age_categories').select('*').order('min_age'),
        supabase.from('weight_categories').select('*').order('min_weight'),
        supabase.from('belt_categories').select('*').order('created_at'),
        supabase.from('modalities').select('*').order('name')
      ]);
      setAgeCategories(ageData.data || []);
      setWeightCategories(weightData.data || []);
      setBeltCategories(beltData.data || []);
      setModalities(modData.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectAgeCategory = (ageCategory) => { setSelectedAgeCategory(ageCategory); setWeightView('gender-selection'); };
  const selectGender = (gender) => { setSelectedGender(gender); setWeightView('weight-management'); };
  const goBackToWeightList = () => { setWeightView('list'); setSelectedAgeCategory(''); setSelectedGender(''); setWeightFormData({ name: '', min_weight: '', max_weight: '' }); setEditingWeightCategory(null); };

  const getFilteredWeightCategories = () => {
    return weightCategories.filter(cat => cat.age_category === selectedAgeCategory && cat.gender === selectedGender);
  };

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingWeightCategory) {
        const { error } = await supabase.from('weight_categories').update({
          name: weightFormData.name, min_weight: parseFloat(weightFormData.min_weight), max_weight: parseFloat(weightFormData.max_weight)
        }).eq('id', editingWeightCategory.id);
        if (error) throw error;
        setEditingWeightCategory(null);
      } else {
        const { error } = await supabase.from('weight_categories').insert([{
          name: weightFormData.name, min_weight: parseFloat(weightFormData.min_weight), max_weight: parseFloat(weightFormData.max_weight),
          age_category: selectedAgeCategory, gender: selectedGender
        }]);
        if (error) throw error;
      }
      setWeightFormData({ name: '', min_weight: '', max_weight: '' });
      loadCategories();
    } catch (error) { alert('Erro ao salvar categoria de peso: ' + error.message); } finally { setLoading(false); }
  };

  const deleteWeightCategory = async (id) => {
    if (!confirm('Excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('weight_categories').delete().eq('id', id);
      if (error) throw error;
      loadCategories();
    } catch (error) { alert('Erro ao excluir: ' + error.message); }
  };

  const replicateWeightCategories = async () => {
    if (!confirm('Replicar categorias do masculino para o feminino?')) return;
    setLoading(true);
    try {
      const { data: maleCategories } = await supabase.from('weight_categories').select('*').eq('age_category', selectedAgeCategory).eq('gender', 'M');
      if (!maleCategories?.length) { alert('Nenhuma categoria masculina encontrada.'); return; }
      await supabase.from('weight_categories').delete().eq('age_category', selectedAgeCategory).eq('gender', 'F');
      const femaleCategories = maleCategories.map(cat => ({ name: cat.name, min_weight: cat.min_weight, max_weight: cat.max_weight, age_category: selectedAgeCategory, gender: 'F' }));
      await supabase.from('weight_categories').insert(femaleCategories);
      loadCategories();
    } catch (error) { alert('Erro ao replicar: ' + error.message); } finally { setLoading(false); }
  };

  const replicateWeightCategoriesFromAge = async (sourceAgeCategory) => {
    if (!confirm(`Copiar categorias de "${sourceAgeCategory}" para "${selectedAgeCategory}"?`)) return;
    setLoading(true);
    try {
      const { data: sourceCategories } = await supabase.from('weight_categories').select('*').eq('age_category', sourceAgeCategory);
      if (!sourceCategories?.length) { alert('Categoria de origem vazia.'); return; }
      await supabase.from('weight_categories').delete().eq('age_category', selectedAgeCategory);
      const newCategories = sourceCategories.map(cat => ({ name: cat.name, min_weight: cat.min_weight, max_weight: cat.max_weight, age_category: selectedAgeCategory, gender: cat.gender }));
      await supabase.from('weight_categories').insert(newCategories);
      loadCategories();
    } catch (error) { alert('Erro ao replicar: ' + error.message); } finally { setLoading(false); }
  };

  const handleOpenForm = (type, item = null) => { setActiveForm(type); setEditingItem(item); setFormData(item || (type === 'age' ? { name: '', min_age: '', max_age: '' } : type === 'modality' ? { name: '', description: '' } : { name: '', min_belt_color: '', max_belt_color: '' })); };
  const handleCloseForm = () => { setActiveForm(null); setEditingItem(null); setFormData({}); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const table = { 'age': 'age_categories', 'belt': 'belt_categories', 'modality': 'modalities' }[activeForm];
    try {
      if (editingItem) { await supabase.from(table).update(formData).eq('id', editingItem.id); }
      else { await supabase.from(table).insert(formData); }
      await loadCategories();
      handleCloseForm();
    } catch (error) { alert('Erro ao salvar: ' + error.message); } finally { setLoading(false); }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="content-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary" style={{ width: '42px', height: '42px', padding: 0 }}><ArrowLeft size={18} /></button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={24} color="var(--brand-blue)" />
                <h1 className="header-title" style={{ margin: 0, fontSize: '1.8rem' }}>Categorias</h1>
              </div>
              <p className="header-subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>Estrutura técnica de competição e graduações</p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-8)', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
          {[
            { id: 'age', label: 'Idade', icon: <Users size={16} /> },
            { id: 'belt', label: 'Faixas', icon: <Circle size={16} strokeWidth={3} /> },
            { id: 'modality', label: 'Modalidades', icon: <Trophy size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveCategoryTab(tab.id); setWeightView('list'); }}
              className={`btn ${activeCategoryTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="content-card">
          {activeCategoryTab === 'age' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Categorias de Idade</h2>
                <button onClick={() => handleOpenForm('age')} className="btn btn-primary"><Plus size={18} /> Adicionar</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {ageCategories.map(cat => (
                  <div key={cat.id} className="content-card" style={{ background: 'var(--bg-secondary)', border: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, color: 'var(--gray-900)' }}>{cat.name}</h4>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleOpenForm('age', cat)} className="btn btn-ghost" style={{ padding: '6px' }}><Pencil size={14} /></button>
                        <button onClick={() => { setSelectedAgeCategory(cat.name); setWeightView('gender-selection'); }} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--brand-blue)' }}><Scale size={14} /></button>
                        <button onClick={() => { if (confirm('Excluir?')) supabase.from('age_categories').delete().eq('id', cat.id).then(() => loadCategories()) }} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--brand-red)' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Intervalo: {cat.min_age} - {cat.max_age} anos</p>
                    <button onClick={() => { setSelectedAgeCategory(cat.name); setWeightView('gender-selection'); }} className="btn btn-secondary btn-block" style={{ marginTop: '16px', background: '#FFF' }}>
                      <Scale size={16} /> Gerenciar Pesos
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeCategoryTab === 'belt' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Graduações</h2>
                <button onClick={() => handleOpenForm('belt')} className="btn btn-primary"><Plus size={18} /> Nova Faixa</button>
              </div>
              <div className="table-modern-container">
                <table className="table-modern">
                  <thead><tr><th>Faixa</th><th>Início</th><th>Fim</th><th>Ações</th></tr></thead>
                  <tbody>
                    {beltCategories.map(belt => (
                      <tr key={belt.id}>
                        <td style={{ fontWeight: 600 }}>{belt.name}</td>
                        <td>{belt.min_belt_color}</td>
                        <td>{belt.max_belt_color}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleOpenForm('belt', belt)} className="btn btn-ghost" style={{ padding: '4px' }}><Pencil size={14} /></button>
                            <button onClick={() => handleDelete('belt', belt.id)} className="btn btn-ghost" style={{ padding: '4px', color: 'var(--brand-red)' }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeCategoryTab === 'modality' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Modalidades Oficiais</h2>
                <button onClick={() => handleOpenForm('modality')} className="btn btn-primary"><Plus size={18} /> Nova Modalidade</button>
              </div>
              <div style={{ display: 'grid', gap: '16px' }}>
                {modalities.map(mod => (
                  <div key={mod.id} className="content-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: 'none' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0' }}>{mod.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-600)' }}>{mod.description || 'Sem descrição'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleOpenForm('modality', mod)} className="btn btn-ghost"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete('modality', mod.id)} className="btn btn-ghost" style={{ color: 'var(--brand-red)' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weights Management View - Modal style */}
        {weightView !== 'list' && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '900px', maxWidth: '95%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Scale size={24} color="var(--brand-blue)" />
                  <h2 style={{ margin: 0 }}>Pesos: {selectedAgeCategory} {selectedGender && ` - ${selectedGender === 'M' ? 'Masculino' : 'Feminino'}`}</h2>
                </div>
                <button onClick={goBackToWeightList} className="btn btn-ghost"><X size={24} /></button>
              </div>

              {weightView === 'gender-selection' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '20px 0' }}>
                  <div onClick={() => selectGender('M')} className="content-card hover-lift" style={{ cursor: 'pointer', textAlign: 'center', padding: '48px' }}>
                    <User size={64} strokeWidth={1.5} color="var(--brand-blue)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: 0 }}>Masculino</h3>
                  </div>
                  <div onClick={() => selectGender('F')} className="content-card hover-lift" style={{ cursor: 'pointer', textAlign: 'center', padding: '48px' }}>
                    <UserRound size={64} strokeWidth={1.5} color="var(--brand-blue)" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: 0 }}>Feminino</h3>
                  </div>
                </div>
              )}

              {weightView === 'weight-management' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Actions Row */}
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1, background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Copy size={18} color="var(--gray-600)" />
                      <label style={{ margin: 0, flexShrink: 0 }}>Clonar de:</label>
                      <select onChange={(e) => e.target.value && replicateWeightCategoriesFromAge(e.target.value)} className="select-modern" style={{ background: '#FFF' }}>
                        <option value="">Selecione categoria...</option>
                        {ageOptions.filter(o => o.value !== selectedAgeCategory).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
                      </select>
                    </div>
                    {selectedGender === 'F' && (
                      <button onClick={replicateWeightCategories} className="btn btn-secondary" style={{ background: '#FFF' }}><Copy size={18} /> Replicar do Masculino</button>
                    )}
                  </div>

                  {/* Add Form */}
                  <div className="content-card" style={{ background: 'var(--bg-secondary)', border: 'none' }}>
                    <form onSubmit={handleWeightSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px auto', gap: '12px', alignItems: 'end' }}>
                      <div><label>Nome da Categoria</label><input name="name" value={weightFormData.name} onChange={(e) => setWeightFormData({ ...weightFormData, name: e.target.value })} placeholder="Ex: até 54kg" className="input-modern" required /></div>
                      <div><label>Mín (kg)</label><input type="number" step="0.1" name="min_weight" value={weightFormData.min_weight} onChange={(e) => setWeightFormData({ ...weightFormData, min_weight: e.target.value })} className="input-modern" required /></div>
                      <div><label>Máx (kg)</label><input type="number" step="0.1" name="max_weight" value={weightFormData.max_weight} onChange={(e) => setWeightFormData({ ...weightFormData, max_weight: e.target.value })} className="input-modern" required /></div>
                      <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', height: '42px' }}>{editingWeightCategory ? 'Atualizar' : 'Adicionar'}</button>
                    </form>
                  </div>

                  {/* List */}
                  <div className="table-modern-container">
                    <table className="table-modern">
                      <thead><tr><th>Nome</th><th>Mínimo</th><th>Máximo</th><th>Ações</th></tr></thead>
                      <tbody>
                        {getFilteredWeightCategories().map(w => (
                          <tr key={w.id}>
                            <td style={{ fontWeight: 600 }}>{w.name}</td>
                            <td>{w.min_weight} kg</td>
                            <td>{w.max_weight} kg</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setEditingWeightCategory(w); setWeightFormData({ name: w.name, min_weight: w.min_weight.toString(), max_weight: w.max_weight.toString() }) }} className="btn btn-ghost" style={{ padding: '4px' }}><Pencil size={14} /></button>
                                <button onClick={() => deleteWeightCategory(w.id)} className="btn btn-ghost" style={{ padding: '4px', color: 'var(--brand-red)' }}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Modal Form (Age/Belt/Modality) */}
        {activeForm && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>{editingItem ? 'Editar' : 'Nova'} Categoria</h3>
                <button onClick={handleCloseForm} className="btn btn-ghost"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div><label>Nome</label><input name="name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-modern" required /></div>
                {activeForm === 'age' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label>Idade Mín</label><input name="min_age" type="number" value={formData.min_age || ''} onChange={(e) => setFormData({ ...formData, min_age: e.target.value })} className="input-modern" required /></div>
                    <div><label>Idade Máx</label><input name="max_age" type="number" value={formData.max_age || ''} onChange={(e) => setFormData({ ...formData, max_age: e.target.value })} className="input-modern" required /></div>
                  </div>
                )}
                {activeForm === 'belt' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label>Cor Inicial</label>
                      <select name="min_belt_color" value={formData.min_belt_color || ''} onChange={(e) => setFormData({ ...formData, min_belt_color: e.target.value })} className="select-modern">
                        <option value="">Selecione...</option>
                        {['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Roxa', 'Azul', 'Marrom', 'Vermelha', 'Ponta Preta', 'Preta'].map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Cor Final</label>
                      <select name="max_belt_color" value={formData.max_belt_color || ''} onChange={(e) => setFormData({ ...formData, max_belt_color: e.target.value })} className="select-modern">
                        <option value="">Selecione...</option>
                        {['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Roxa', 'Azul', 'Marrom', 'Vermelha', 'Ponta Preta', 'Preta'].map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {activeForm === 'modality' && (
                  <div><label>Descrição</label><textarea name="description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-modern" style={{ height: '80px' }} /></div>
                )}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="button" onClick={handleCloseForm} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary"><Check size={18} /> Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}