import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Medal,
  Plus,
  List,
  ArrowLeft,
  Check,
  X,
  Shield,
  Activity,
  Layout,
  Scale,
  Settings,
  AlertCircle
} from 'lucide-react';

const AthleteClassifications = () => {
  const [classifications, setClassifications] = useState([]);
  const [weightCategories, setWeightCategories] = useState([]);
  const [view, setView] = useState('main'); // 'main', 'form', 'list'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    age_category: '',
    gender: '',
    belt_group: '',
    weight_category_id: '',
    description: '',
    is_active: true
  });

  const ageCategories = [
    { value: 'Fraldinha', label: 'Fraldinha (2-6 anos)' },
    { value: 'Mirim', label: 'Mirim (7-9 anos)' },
    { value: 'Infantil', label: 'Infantil (10-11 anos)' },
    { value: 'Cadete', label: 'Cadete (12-14 anos)' },
    { value: 'Juvenil', label: 'Juvenil (15-17 anos)' },
    { value: 'Adulto', label: 'Adulto (18-30 anos)' },
    { value: 'Master 1', label: 'Master 1 (31-34 anos)' },
    { value: 'Master 2', label: 'Master 2 (35-44 anos)' },
    { value: 'Master 3', label: 'Master 3 (45-55 anos)' }
  ];

  const genders = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' }
  ];

  const [beltGroups, setBeltGroups] = useState([]);

  useEffect(() => {
    loadClassifications();
    loadBeltGroups();
  }, []);

  const loadBeltGroups = async () => {
    try {
      const { data, error } = await supabase.from('belt_categories').select('*').order('name');
      if (error) throw error;
      const beltGroupOptions = (data || []).map((cat, index) => ({
        value: index + 1,
        label: `${cat.name} (${cat.min_belt_color} à ${cat.max_belt_color})`
      }));
      setBeltGroups(beltGroupOptions);
    } catch (error) { console.error('Erro ao carregar categorias de faixa:', error); }
  };

  const goToAddClassification = () => setView('form');
  const goToList = () => setView('list');
  const goBack = () => { setView('main'); resetForm(); };

  const generateCode = () => {
    if (!formData.age_category || !formData.gender || !formData.belt_group || !formData.weight_category_id) return '';
    const ageCodes = { 'Fraldinha': 'F', 'Mirim': 'M', 'Infantil': 'I', 'Juvenil': 'J', 'Cadete': 'C', 'Adulto': 'A', 'Master 1': 'M1', 'Master 2': 'M2', 'Master 3': 'M3' };
    const weightCategory = weightCategories.find(cat => cat.id === formData.weight_category_id);
    const weightCode = weightCategory ? weightCategory.name.replace('até-', '').replace('acima-', '+').replace(' kg', '') : '';
    const ageCode = ageCodes[formData.age_category];
    const genderCode = formData.gender;
    return `${ageCode}${genderCode}${formData.belt_group}-${weightCode}`;
  };

  const loadClassifications = async () => {
    setLoading(true);
    try {
      const [classificationsData, weightCategoriesData] = await Promise.all([
        supabase.from('kyorugi_classifications').select('*').order('created_at', { ascending: false }),
        supabase.from('weight_categories').select('*').order('min_weight', { ascending: true })
      ]);
      if (classificationsData.error) throw classificationsData.error;
      if (weightCategoriesData.error) throw weightCategoriesData.error;
      setClassifications(classificationsData.data || []);
      setWeightCategories(weightCategoriesData.data || []);
    } catch (error) { setMessage('Erro ao carregar classificações'); } finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const weightCategory = weightCategories.find(cat => cat.id === formData.weight_category_id);
      if (!weightCategory) throw new Error('Categoria de peso não encontrada');
      const submitData = { ...formData, belt_group: parseInt(formData.belt_group) || 1, min_weight: weightCategory.min_weight, max_weight: weightCategory.max_weight, code: generateCode() };
      const { error } = await supabase.from('kyorugi_classifications').insert([submitData]);
      if (error) throw error;
      setMessage('Classificação criada com sucesso!');
      resetForm();
      loadClassifications();
      setView('list');
    } catch (error) { setMessage(`Erro ao salvar: ${error.message}`); } finally { setLoading(false); }
  };

  const resetForm = () => { setFormData({ name: '', age_category: '', gender: '', belt_group: '', weight_category_id: '', description: '', is_active: true }); };

  return (
    <div className="app-container" style={{ backgroundColor: '#F2EFEA' }}>
      <div className="content-wrapper">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            {view !== 'main' ? (
              <button onClick={goBack} className="btn btn-secondary" style={{ backgroundColor: '#FFF', width: '42px', height: '42px', padding: 0 }}><ArrowLeft size={18} /></button>
            ) : (
              <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary" style={{ backgroundColor: '#FFF', width: '42px', height: '42px', padding: 0 }}><ArrowLeft size={18} /></button>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Medal size={24} color="var(--brand-blue)" />
                <h1 className="header-title" style={{ margin: 0, fontSize: '1.8rem' }}>
                  {view === 'main' && 'Classificações Kyorugi'}
                  {view === 'form' && 'Nova Classificação'}
                  {view === 'list' && 'Base de Classificações'}
                </h1>
              </div>
              <p className="header-subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>Parametrização técnica para sorteio de chaves</p>
            </div>
          </div>
        </div>

        {message && (
          <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: message.includes('sucesso') ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${message.includes('sucesso') ? '#10B981' : '#EF4444'}`, color: message.includes('sucesso') ? '#047857' : '#B91C1C' }}>
            {message.includes('sucesso') ? <Check size={18} /> : <AlertCircle size={18} />}
            {message}
          </div>
        )}

        {view === 'main' && (
          <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            <div className="content-card hover-lift" style={{ cursor: 'pointer', textAlign: 'center', padding: '48px' }} onClick={goToAddClassification}>
              <div className="card-icon-container" style={{ margin: '0 auto 24px auto' }}><Plus size={32} /></div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Criar Classificação</h3>
              <p style={{ color: 'var(--gray-600)' }}>Gere automaticamente siglas de competição baseadas em idade, gênero e peso.</p>
            </div>

            <div className="content-card hover-lift" style={{ cursor: 'pointer', textAlign: 'center', padding: '48px' }} onClick={goToList}>
              <div className="card-icon-container" style={{ margin: '0 auto 24px auto' }}><List size={32} /></div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Consultar Base</h3>
              <p style={{ color: 'var(--gray-600)' }}>Visualize e gerencie todas as classificações técnicas cadastradas no sistema.</p>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="content-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label>Nome Descritivo (Ex: Sênior Masculino até 54kg)</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="input-modern" required />
                </div>
                <div>
                  <label>Faixa Etária</label>
                  <select name="age_category" value={formData.age_category} onChange={handleChange} className="select-modern" required>
                    <option value="">Selecione...</option>
                    {ageCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label>Gênero</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="select-modern" required>
                    <option value="">Selecione...</option>
                    {genders.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label>Grupo de Graduação</label>
                  <select name="belt_group" value={formData.belt_group} onChange={handleChange} className="select-modern" required>
                    <option value="">Selecione...</option>
                    {beltGroups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label>Categoria de Peso</label>
                  <select name="weight_category_id" value={formData.weight_category_id} onChange={handleChange} className="select-modern" required>
                    <option value="">Selecione...</option>
                    {weightCategories.filter(cat => cat.age_category === formData.age_category && cat.gender === formData.gender).map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.min_weight}kg - {c.max_weight}kg)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--gray-900)' }}>Sigla de Sistema</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-600)' }}>Identificador único para automação de chaves</p>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-blue)', letterSpacing: '1px' }}>
                    {generateCode() || '---'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={goBack} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading}><Check size={18} /> Cadastrar Classificação</button>
              </div>
            </form>
          </div>
        )}

        {view === 'list' && (
          <div className="content-card">
            {classifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <Medal size={48} color="var(--gray-200)" style={{ marginBottom: '16px' }} />
                <p>Nenhuma classificação encontrada.</p>
              </div>
            ) : (
              <div className="table-modern-container">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Classificação</th>
                      <th>Categoria</th>
                      <th>Graduação</th>
                      <th>Peso</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classifications.map((c) => (
                      <tr key={c.id}>
                        <td><span className="badge badge-primary" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{c.code}</span></td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.age_category} {c.gender === 'M' ? '(Masc)' : '(Fem)'}</td>
                        <td><span className="badge badge-secondary">Grupo {c.belt_group}</span></td>
                        <td>{c.min_weight} - {c.max_weight} kg</td>
                        <td>{c.is_active ? <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Activity size={10} /> Ativo</span> : 'Inativo'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AthleteClassifications;