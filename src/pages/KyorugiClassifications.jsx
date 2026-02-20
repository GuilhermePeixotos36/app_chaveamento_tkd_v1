import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AthleteClassifications = () => {
  const [classifications, setClassifications] = useState([]);
  const [weightCategories, setWeightCategories] = useState([]);
  const [selectedAgeCategory, setSelectedAgeCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [view, setView] = useState('main'); // 'main', 'form', 'list'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    age_category: '',
    gender: '',
    belt_group: '',
    weight_category_id: '',
    description: '',
    is_active: true
  });

  // Opções para os selects
  const ageCategories = [
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

  const genders = [
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Feminino' }
  ];

  const beltGroups = [
    { value: 1, label: 'Grupo 1 - Iniciante (Branca, Cinza, Amarela)' },
    { value: 2, label: 'Grupo 2 - Intermediário (Laranja, Verde, Roxa)' },
    { value: 3, label: 'Grupo 3 - Avançado (Azul, Marrom, Vermelha)' },
    { value: 4, label: 'Grupo 4 - Elite (Vermelha-Preta, Preta)' }
  ];

  useEffect(() => {
    loadClassifications();
  }, []);

  // Funções de navegação
  const goToAddClassification = () => {
    setView('form');
  };

  const goToList = () => {
    setView('list');
  };

  const goBack = () => {
    setView('main');
    resetForm();
  };

  // Gerar sigla automática baseada nas características
  const generateCode = () => {
    if (!formData.age_category || !formData.gender || !formData.belt_group || !formData.weight_category_id) {
      return '';
    }

    const ageCodes = {
      'Fraldinha': 'F',
      'Mirim': 'M',
      'Infantil': 'I',
      'Juvenil': 'J',
      'Júnior': 'JR',
      'Sênior': 'A', // A de Adulto
      'Master 1': 'M1',
      'Master 2': 'M2',
      'Master 3': 'M3'
    };

    const weightCategory = weightCategories.find(cat => cat.id === formData.weight_category_id);
    const weightCode = weightCategory ? weightCategory.name.replace('até-', '').replace('acima-', '+') : '';
    
    const ageCode = ageCodes[formData.age_category];
    const genderCode = formData.gender;
    const beltCode = formData.belt_group;

    return `${ageCode}${genderCode}${beltCode}-${weightCode}`;
  };

  const loadClassifications = async () => {
    setLoading(true);
    try {
      const [classificationsData, weightCategoriesData] = await Promise.all([
        supabase
          .from('kyorugi_classifications')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('weight_categories')
          .select('*')
          .order('min_weight', { ascending: true })
      ]);

      if (classificationsData.error) throw classificationsData.error;
      if (weightCategoriesData.error) throw weightCategoriesData.error;

      console.log('--- DEBUG LOAD CLASSIFICATIONS ---');
      console.log('Classifications loaded:', classificationsData.data?.length || 0);
      console.log('Weight categories loaded:', weightCategoriesData.data?.length || 0);
      console.log('Sample weight category:', weightCategoriesData.data?.[0]);

      setClassifications(classificationsData.data || []);
      setWeightCategories(weightCategoriesData.data || []);
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
      setMessage('Erro ao carregar classificações');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Gerar código automaticamente quando os campos mudam
    if (['age_category', 'gender', 'belt_group', 'weight_category_id'].includes(name)) {
      setFormData(prev => {
        const newFormData = { ...prev, [name]: type === 'checkbox' ? checked : value };
        const ageCodes = {
          'Fraldinha': 'F',
          'Mirim': 'M',
          'Infantil': 'I',
          'Juvenil': 'J',
          'Júnior': 'JR',
          'Sênior': 'A', // A de Adulto
          'Master 1': 'M1',
          'Master 2': 'M2',
          'Master 3': 'M3'
        };

        if (newFormData.age_category && newFormData.gender && newFormData.belt_group && newFormData.weight_category_id) {
          const weightCategory = weightCategories.find(cat => cat.id === newFormData.weight_category_id);
          const weightCode = weightCategory ? weightCategory.name.replace('até-', '').replace('acima-', '+') : '';
          const ageCode = ageCodes[newFormData.age_category];
          const genderCode = newFormData.gender;
          const beltCode = newFormData.belt_group;
          
          return {
            ...newFormData,
            code: `${ageCode}${genderCode}${beltCode}-${weightCode}`
          };
        }
        
        return newFormData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Buscar a categoria de peso para obter min_weight e max_weight
      const weightCategory = weightCategories.find(cat => cat.id === formData.weight_category_id);
      
      if (!weightCategory) {
        throw new Error('Categoria de peso não encontrada');
      }
      
      const submitData = {
        ...formData,
        belt_group: parseInt(formData.belt_group),
        min_weight: weightCategory.min_weight,
        max_weight: weightCategory.max_weight,
        code: generateCode()
      };

      console.log('--- DEBUG WEIGHT CATEGORIES ---');
      console.log('Total categories:', weightCategories.length);
      console.log('Age category selected:', formData.age_category);
      console.log('Gender selected:', formData.gender);
      
      const filteredCategories = weightCategories.filter(cat => cat.age_category === formData.age_category && cat.gender === formData.gender);
      console.log('Filtered categories:', filteredCategories.length);
      console.log('Sample category:', weightCategories[0]);

      const { error } = await supabase
        .from('kyorugi_classifications')
        .insert([submitData]);

      if (error) throw error;
      setMessage('Classificação criada com sucesso!');
      resetForm();
      loadClassifications();
      setView('list');
    } catch (error) {
      console.error('Erro ao salvar classificação:', error);
      setMessage(`Erro ao salvar classificação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age_category: '',
      gender: '',
      belt_group: '',
      weight_category_id: '',
      description: '',
      is_active: true
    });
    setShowForm(false);
  };

  const getStatusBadge = (isActive) => {
    return isActive 
      ? { text: 'Ativo', class: 'badge-success' }
      : { text: 'Inativo', class: 'badge-secondary' };
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            {view !== 'main' && (
              <button
                onClick={goBack}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: 'var(--spacing-2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-1)'
                }}
              >
                ← Voltar
              </button>
            )}
            <div>
              <h1 style={{ 
                fontSize: 'var(--font-size-2xl)', 
                fontWeight: 'var(--font-weight-bold)',
                margin: '0',
                color: 'var(--text-primary)'
              }}>
                🥋 {view === 'main' && 'Classificações de Atletas'}
                {view === 'form' && 'Criar Nova Classificação'}
                {view === 'list' && 'Lista de Classificações'}
              </h1>
              <p style={{ 
                margin: 'var(--spacing-1) 0 0 0',
                color: 'var(--text-secondary)',
                fontSize: 'var(--font-size-sm)'
              }}>
                {view === 'main' && 'Crie classificações com geração automática de sigla para chaveamento'}
                {view === 'form' && 'Preencha os dados para gerar uma classificação automática'}
                {view === 'list' && 'Visualize todas as classificações cadastradas'}
              </p>
            </div>
          </div>
          {view === 'main' && (
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn btn-outline"
            >
              ← Dashboard
            </button>
          )}
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: 'var(--spacing-4)',
            backgroundColor: message.includes('sucesso') || message.includes('criada') || message.includes('atualizada') || message.includes('excluída')
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${
              message.includes('sucesso') || message.includes('criada') || message.includes('atualizada') || message.includes('excluída')
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)'
            }`,
            color: message.includes('sucesso') || message.includes('criada') || message.includes('atualizada') || message.includes('excluída')
              ? '#10b981'
              : '#ef4444'
          }}>
            {message}
          </div>
        )}

        {/* Main View - Menu Principal */}
        {view === 'main' && (
          <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div 
              className="content-card hover-lift"
              style={{ 
                cursor: 'pointer',
                textAlign: 'center',
                padding: 'var(--spacing-8)'
              }}
              onClick={goToAddClassification}
            >
              <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>➕</div>
              <h3 style={{ 
                fontSize: 'var(--font-size-xl)', 
                fontWeight: 'var(--font-weight-semibold)',
                margin: '0 0 var(--spacing-2) 0',
                color: 'var(--text-primary)'
              }}>
                Criar Classificação
              </h3>
              <p style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--text-secondary)',
                margin: '0'
              }}>
                Crie uma nova classificação com geração automática de sigla
              </p>
            </div>
            
            <div 
              className="content-card hover-lift"
              style={{ 
                cursor: 'pointer',
                textAlign: 'center',
                padding: 'var(--spacing-8)'
              }}
              onClick={goToList}
            >
              <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>📋</div>
              <h3 style={{ 
                fontSize: 'var(--font-size-xl)', 
                fontWeight: 'var(--font-weight-semibold)',
                margin: '0 0 var(--spacing-2) 0',
                color: 'var(--text-primary)'
              }}>
                Ver Classificações
              </h3>
              <p style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--text-secondary)',
                margin: '0'
              }}>
                Visualize todas as classificações cadastradas
              </p>
            </div>
          </div>
        )}

        {/* Form View - Criar Classificação */}
        {view === 'form' && (
          <div className="content-card">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--spacing-4)'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--spacing-2)', 
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--text-primary)'
                  }}>
                    Nome da Classificação *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Sênior Masculino Elite"
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
                    Categoria de Idade *
                  </label>
                  <select
                    name="age_category"
                    value={formData.age_category}
                    onChange={handleChange}
                    className="input-modern"
                    required
                  >
                    <option value="">Selecione...</option>
                    {ageCategories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--spacing-2)', 
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--text-primary)'
                  }}>
                    Gênero *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input-modern"
                    required
                  >
                    <option value="">Selecione...</option>
                    {genders.map(gender => (
                      <option key={gender.value} value={gender.value}>
                        {gender.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--spacing-2)', 
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--text-primary)'
                  }}>
                    Grupo de Faixas *
                  </label>
                  <select
                    name="belt_group"
                    value={formData.belt_group}
                    onChange={handleChange}
                    className="input-modern"
                    required
                  >
                    <option value="">Selecione...</option>
                    {beltGroups.map(group => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--spacing-2)', 
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--text-primary)'
                  }}>
                    Categoria de Peso *
                  </label>
                  <select
                    name="weight_category_id"
                    value={formData.weight_category_id}
                    onChange={handleChange}
                    className="input-modern"
                    required
                  >
                    <option value="">Selecione...</option>
                    {(() => {
                    const filtered = weightCategories.filter(cat => cat.age_category === formData.age_category && cat.gender === formData.gender);
                    console.log('--- DEBUG FORM SELECT ---');
                    console.log('Total weightCategories:', weightCategories.length);
                    console.log('Filtered for form:', filtered.length);
                    console.log('formData.age_category:', formData.age_category);
                    console.log('formData.gender:', formData.gender);
                    return filtered;
                  })()
                    .map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name} ({category.min_weight}kg - {category.max_weight}kg)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 'var(--spacing-2)', 
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--text-primary)'
                  }}>
                    Sigla (Gerada Automaticamente)
                  </label>
                  <input
                    type="text"
                    value={generateCode()}
                    readOnly
                    className="input-modern"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      cursor: 'not-allowed',
                      fontWeight: 'bold',
                      textAlign: 'center'
                    }}
                    placeholder="Ex: AM4-68"
                  />
                </div>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--spacing-2)', 
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--text-primary)'
                }}>
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Descrição detalhada da classificação..."
                  rows={3}
                  className="input-modern"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)'
              }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  id="is_active"
                />
                <label htmlFor="is_active" style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-primary)'
                }}>
                  Classificação ativa
                </label>
              </div>

              <div style={{
                display: 'flex',
                gap: 'var(--spacing-3)',
                justifyContent: 'flex-end',
                marginTop: 'var(--spacing-4)'
              }}>
                <button
                  type="button"
                  onClick={goBack}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Salvando...' : 'Criar Classificação'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List View - Visualizar Classificações */}
        {view === 'list' && (
          <div className="content-card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-4)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Carregando classificações...</p>
              </div>
            ) : classifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>🥋</div>
                <h3 style={{ 
                  fontSize: 'var(--font-size-xl)', 
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-2)'
                }}>
                  Nenhuma classificação encontrada
                </h3>
                <p style={{ 
                  fontSize: 'var(--font-size-base)', 
                  color: 'var(--text-secondary)',
                  margin: '0 0 var(--spacing-4) 0'
                }}>
                  Crie sua primeira classificação
                </p>
                <button
                  onClick={goToAddClassification}
                  className="btn btn-primary"
                >
                  Criar Primeira Classificação
                </button>
              </div>
            ) : (
              <div>
                <div className="table-modern-container">
                  <table className="table-modern">
                    <thead>
                      <tr>
                        <th>Sigla</th>
                        <th>Nome</th>
                        <th>Categoria</th>
                        <th>Gênero</th>
                        <th>Faixas</th>
                        <th>Peso</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classifications.map((classification) => {
                        const status = getStatusBadge(classification.is_active);
                        const beltGroup = beltGroups.find(group => group.value === classification.belt_group);
                        const ageCategory = ageCategories.find(cat => cat.value === classification.age_category);
                        const gender = genders.find(g => g.value === classification.gender);

                        return (
                          <tr key={classification.id}>
                            <td>
                              <span className="badge badge-primary" style={{ fontWeight: 'bold' }}>
                                {classification.code}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                {classification.name}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                                {ageCategory?.label || classification.age_category}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-info">
                                {gender?.label || classification.gender}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-warning">
                                Grupo {classification.belt_group}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                                {classification.min_weight}kg - {classification.max_weight}kg
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${status.class}`}>
                                {status.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AthleteClassifications;