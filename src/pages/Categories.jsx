import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Categories() {
  const [ageCategories, setAgeCategories] = useState([]);
  const [weightCategories, setWeightCategories] = useState([]);
  const [beltCategories, setBeltCategories] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState(null); // 'age', 'belt', 'modality'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Estados para navegação de categorias de peso
  const [weightView, setWeightView] = useState('list'); // 'list', 'age-selection', 'gender-selection', 'weight-management'
  const [selectedAgeCategory, setSelectedAgeCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [weightFormData, setWeightFormData] = useState({
    name: '',
    min_weight: '',
    max_weight: ''
  });
  const [editingWeightCategory, setEditingWeightCategory] = useState(null);

  // Estado para segmentação de categorias
  const [activeCategoryTab, setActiveCategoryTab] = useState('age'); // 'age', 'belt', 'modality'

  // Opções para idade e gênero
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

  // Funções para navegação de categorias de peso
  const selectAgeCategory = (ageCategory) => {
    setSelectedAgeCategory(ageCategory);
    setWeightView('gender-selection');
  };

  const selectGender = (gender) => {
    setSelectedGender(gender);
    setWeightView('weight-management');
  };

  const goBackToWeightList = () => {
    setWeightView('list');
    setSelectedAgeCategory('');
    setSelectedGender('');
    setWeightFormData({ name: '', min_weight: '', max_weight: '' });
    setEditingWeightCategory(null);
  };

  const goBackToGenderSelection = () => {
    setWeightView('gender-selection');
    setSelectedGender('');
    setEditingWeightCategory(null);
  };

  const getFilteredWeightCategories = () => {
    return weightCategories.filter(cat => 
      cat.age_category === selectedAgeCategory && 
      cat.gender === selectedGender
    );
  };

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingWeightCategory) {
        // Editando categoria existente
        const { error } = await supabase
          .from('weight_categories')
          .update({
            name: weightFormData.name,
            min_weight: parseFloat(weightFormData.min_weight),
            max_weight: parseFloat(weightFormData.max_weight)
          })
          .eq('id', editingWeightCategory.id);

        if (error) throw error;
        
        alert('Categoria de peso atualizada com sucesso!');
        setEditingWeightCategory(null);
        setWeightFormData({ name: '', min_weight: '', max_weight: '' });
      } else {
        // Criando nova categoria
        const { error } = await supabase
          .from('weight_categories')
          .insert([{
            name: weightFormData.name,
            min_weight: parseFloat(weightFormData.min_weight),
            max_weight: parseFloat(weightFormData.max_weight),
            age_category: selectedAgeCategory,
            gender: selectedGender
          }]);

        if (error) throw error;
        
        alert('Categoria de peso criada com sucesso!');
        setWeightFormData({ name: '', min_weight: '', max_weight: '' });
      }
      
      loadCategories();
    } catch (error) {
      alert('Erro ao salvar categoria de peso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (e) => {
    setWeightFormData({ ...weightFormData, [e.target.name]: e.target.value });
  };

  const editWeightCategory = (category) => {
    setEditingWeightCategory(category);
    setWeightFormData({
      name: category.name,
      min_weight: category.min_weight.toString(),
      max_weight: category.max_weight.toString()
    });
  };

  const cancelWeightEdit = () => {
    setEditingWeightCategory(null);
    setWeightFormData({ name: '', min_weight: '', max_weight: '' });
  };

  const deleteWeightCategory = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria de peso?')) return;
    
    try {
      const { error } = await supabase
        .from('weight_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      alert('Categoria de peso excluída com sucesso!');
      loadCategories();
    } catch (error) {
      alert('Erro ao excluir categoria de peso: ' + error.message);
    }
  };

  const replicateWeightCategories = async () => {
    if (!confirm('Deseja replicar todas as categorias de peso do masculino para o feminino nesta mesma faixa de idade? As categorias existentes no feminino serão substituídas.')) return;
    
    setLoading(true);
    try {
      // Buscar categorias de peso do masculino para esta idade
      const { data: maleCategories, error: fetchError } = await supabase
        .from('weight_categories')
        .select('*')
        .eq('age_category', selectedAgeCategory)
        .eq('gender', 'M');
      
      if (fetchError) throw fetchError;
      
      if (!maleCategories || maleCategories.length === 0) {
        alert('Nenhuma categoria de peso encontrada no masculino para replicar.');
        return;
      }
      
      // Remover categorias existentes no feminino para esta idade
      const { error: deleteError } = await supabase
        .from('weight_categories')
        .delete()
        .eq('age_category', selectedAgeCategory)
        .eq('gender', 'F');
      
      if (deleteError) throw deleteError;
      
      // Inserir novas categorias no feminino baseadas nas do masculino
      const femaleCategories = maleCategories.map(cat => ({
        name: cat.name,
        min_weight: cat.min_weight,
        max_weight: cat.max_weight,
        age_category: selectedAgeCategory,
        gender: 'F'
      }));
      
      const { error: insertError } = await supabase
        .from('weight_categories')
        .insert(femaleCategories);
      
      if (insertError) throw insertError;
      
      alert(`Sucesso! ${maleCategories.length} categorias de peso foram replicadas do masculino para o feminino.`);
      loadCategories();
    } catch (error) {
      alert('Erro ao replicar categorias de peso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const replicateWeightCategoriesFromAge = async (sourceAgeCategory) => {
    if (!confirm(`Deseja replicar todas as categorias de peso da categoria "${sourceAgeCategory}" para "${selectedAgeCategory}"? As categorias existentes em "${selectedAgeCategory}" serão substituídas.`)) return;
    
    setLoading(true);
    try {
      // Buscar categorias de peso da categoria de idade de origem
      const { data: sourceCategories, error: fetchError } = await supabase
        .from('weight_categories')
        .select('*')
        .eq('age_category', sourceAgeCategory);
      
      if (fetchError) throw fetchError;
      
      if (!sourceCategories || sourceCategories.length === 0) {
        alert(`Nenhuma categoria de peso encontrada em "${sourceAgeCategory}" para replicar.`);
        return;
      }
      
      // Remover categorias existentes na categoria de idade de destino
      const { error: deleteError } = await supabase
        .from('weight_categories')
        .delete()
        .eq('age_category', selectedAgeCategory);
      
      if (deleteError) throw deleteError;
      
      // Inserir novas categorias na categoria de idade de destino
      const newCategories = sourceCategories.map(cat => ({
        name: cat.name,
        min_weight: cat.min_weight,
        max_weight: cat.max_weight,
        age_category: selectedAgeCategory,
        gender: cat.gender
      }));
      
      const { error: insertError } = await supabase
        .from('weight_categories')
        .insert(newCategories);
      
      if (insertError) throw insertError;
      
      alert(`Sucesso! ${sourceCategories.length} categorias de peso foram replicadas de "${sourceAgeCategory}" para "${selectedAgeCategory}".`);
      loadCategories();
    } catch (error) {
      alert('Erro ao replicar categorias de peso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (type, item = null) => {
    setActiveForm(type);
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      setFormData(type === 'age' ? { name: '', min_age: '', max_age: '' } :
        type === 'modality' ? { name: '', description: '' } :
          { name: '', min_belt_color: '', max_belt_color: '' });
    }
  };

  const handleCloseForm = () => {
    setActiveForm(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const tableMap = {
      'age': 'age_categories',
      'belt': 'belt_categories',
      'modality': 'modalities'
    };
    const table = tableMap[activeForm];

    try {
      if (editingItem) {
        const { error } = await supabase.from(table).update(formData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(formData);
        if (error) throw error;
      }
      await loadCategories();
      handleCloseForm();
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Excluir este item?')) return;
    setLoading(true);
    const tableMap = {
      'age': 'age_categories',
      'belt': 'belt_categories',
      'modality': 'modalities'
    };
    const table = tableMap[type];
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await loadCategories();
    } catch (error) {
      alert('Erro ao excluir: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !activeForm && ageCategories.length === 0) {
    return (
      <div className="app-container">
        <div className="content-wrapper">
          <div className="content-card" style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-4)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Carregando categorias...</p>
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
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-10)',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary">← Voltar</button>
            <div>
              <h1 className="header-title">📊 Categorias</h1>
              <p className="header-subtitle">Gerencie as categorias de idade, peso, faixa e modalidades</p>
            </div>
          </div>
        </div>

        {/* Botões de Segmentação */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-2)', 
          marginBottom: 'var(--spacing-8)',
          padding: 'var(--spacing-1)',
          background: 'var(--gray-100)',
          borderRadius: 'var(--radius-lg)',
          width: 'fit-content'
        }}>
          {[
            { id: 'age', label: '🎂 Idade', icon: '🎂' },
            { id: 'belt', label: '🥋 Faixa', icon: '🥋' },
            { id: 'modality', label: '🏅 Modalidades', icon: '🏅' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveCategoryTab(tab.id);
                // Resetar estados ao mudar de aba
                setWeightView('list');
                setSelectedAgeCategory('');
                setSelectedGender('');
                setEditingWeightCategory(null);
              }}
              className={`btn ${activeCategoryTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: 'var(--spacing-3) var(--spacing-6)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: activeCategoryTab === tab.id ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ marginRight: 'var(--spacing-2)' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Form */}
        {activeForm && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000
          }}>
            <div className="content-card" style={{ width: '400px' }}>
              <h3>{editingItem ? 'Editar' : 'Nova'} {activeForm === 'age' ? 'Categoria Idade' : activeForm === 'belt' ? 'Categoria Faixa' : 'Modalidade'}</h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Nome" className="input-modern" required />
                {activeForm === 'age' && (
                  <>
                    <input name="min_age" type="number" value={formData.min_age || ''} onChange={handleChange} placeholder="Idade Mínima" className="input-modern" required />
                    <input name="max_age" type="number" value={formData.max_age || ''} onChange={handleChange} placeholder="Idade Máxima" className="input-modern" required />
                  </>
                )}
                {activeForm === 'belt' && (
                  <>
                    <input name="min_belt_color" value={formData.min_belt_color || ''} onChange={handleChange} placeholder="Cor Inicial" className="input-modern" />
                    <input name="max_belt_color" value={formData.max_belt_color || ''} onChange={handleChange} placeholder="Cor Final" className="input-modern" />
                  </>
                )}
                {activeForm === 'modality' && (
                  <>
                    <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Descrição" className="input-modern" style={{ height: '80px' }} />
                  </>
                )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={handleCloseForm} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Conteúdo Dinâmico Baseado na Aba Ativa */}
        <div style={{ width: '100%' }}>
          {/* Aba de Categorias de Idade */}
          {activeCategoryTab === 'age' && (
            <div className="content-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>🎂 Categorias de Idade</h3>
                <button onClick={() => handleOpenForm('age')} className="btn btn-primary">+ Nova Categoria</button>
              </div>

              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-4)' }}>
                  {ageCategories.map((category) => (
                    <div key={category.id} className="content-card" style={{
                      padding: 'var(--spacing-5)', 
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--gray-50)', 
                      border: '1px solid var(--border)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-3)' }}>
                        <div>
                          <h4 style={{ margin: '0 0 var(--spacing-1) 0', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                            {category.name}
                          </h4>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            {category.min_age} - {category.max_age} anos
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            onClick={() => {
                              setSelectedAgeCategory(category.name);
                              setWeightView('gender-selection');
                            }} 
                            className="btn btn-xs btn-primary"
                            title="Gerenciar categorias de peso"
                          >
                            ⚖️
                          </button>
                          <button onClick={() => handleOpenForm('age', category)} className="btn btn-xs btn-outline">✏️</button>
                          <button onClick={() => handleDelete('age', category.id)} className="btn btn-xs btn-danger">🗑️</button>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center', marginTop: 'var(--spacing-3)' }}>
                        <button 
                          onClick={() => {
                            setSelectedAgeCategory(category.name);
                            setWeightView('gender-selection');
                          }}
                          className="btn btn-outline"
                          style={{ width: '100%' }}
                        >
                          Gerenciar Categorias de Peso
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {ageCategories.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>🎂</div>
                    <h4 style={{ margin: '0 0 var(--spacing-2) 0', color: 'var(--text-secondary)' }}>Nenhuma categoria de idade cadastrada</h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Clique em "Nova Categoria" para começar</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal para Gerenciamento de Peso */}
          {weightView !== 'list' && (
            <div className="modal-overlay" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 1000
            }}>
              <div className="content-card" style={{ width: '90%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {weightView === 'age-selection' && '⚖️ Selecionar Categoria de Idade'}
                    {weightView === 'gender-selection' && `${selectedAgeCategory} - Selecionar Gênero`}
                    {weightView === 'weight-management' && `${selectedAgeCategory} - ${selectedGender === 'M' ? 'Masculino' : 'Feminino'}`}
                  </h3>
                  <button onClick={goBackToWeightList} className="btn btn-secondary">
                    ✕ Fechar
                  </button>
                </div>

                <div style={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
                }}>
                  {/* View Seleção de Idade */}
                  {weightView === 'age-selection' && (
                    <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                      {ageOptions.map(category => (
                        <div 
                          key={category.value}
                          className="content-card hover-lift"
                          style={{ 
                            cursor: 'pointer',
                            textAlign: 'center',
                            padding: 'var(--spacing-6)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onClick={() => selectAgeCategory(category.value)}
                        >
                          <div style={{ fontSize: '40px', marginBottom: 'var(--spacing-3)' }}>
                            {category.value === 'Fraldinha' && '👶'}
                            {category.value === 'Mirim' && '🧒'}
                            {category.value === 'Infantil' && '👦'}
                            {category.value === 'Juvenil' && '👧'}
                            {category.value === 'Júnior' && '👨‍🎓'}
                            {category.value === 'Sênior' && '🥋'}
                            {category.value === 'Master 1' && '🏆'}
                            {category.value === 'Master 2' && '🥇'}
                            {category.value === 'Master 3' && '👑'}
                          </div>
                          <h4 style={{ 
                            fontSize: 'var(--font-size-lg)', 
                            fontWeight: 'var(--font-weight-semibold)',
                            margin: '0 0 var(--spacing-2) 0'
                          }}>
                            {category.value}
                          </h4>
                          <p style={{ 
                            fontSize: 'var(--font-size-sm)', 
                            color: 'var(--text-secondary)',
                            margin: '0'
                          }}>
                            {category.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View Seleção de Gênero */}
                  {weightView === 'gender-selection' && (
                    <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                      {genderOptions.map(gender => (
                        <div 
                          key={gender.value}
                          className="content-card hover-lift"
                          style={{ 
                            cursor: 'pointer',
                            textAlign: 'center',
                            padding: 'var(--spacing-8)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onClick={() => selectGender(gender.value)}
                        >
                          <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-4)' }}>
                            {gender.value === 'M' ? '👦' : '👧'}
                          </div>
                          <h4 style={{ 
                            fontSize: 'var(--font-size-xl)', 
                            fontWeight: 'var(--font-weight-bold)',
                            margin: '0 0 var(--spacing-3) 0'
                          }}>
                            {gender.label}
                          </h4>
                          <p style={{ 
                            fontSize: 'var(--font-size-base)', 
                            color: 'var(--text-secondary)',
                            margin: '0'
                          }}>
                            Categorias de peso para {gender.label.toLowerCase()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View Gerenciamento de Peso */}
                  {weightView === 'weight-management' && (
                    <div>
                      {/* Card de replicação entre categorias de idade */}
                      <div className="content-card" style={{ marginBottom: 'var(--spacing-6)', background: 'var(--background-secondary)', border: '2px solid var(--success-color)', borderStyle: 'dashed' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: '0 0 var(--spacing-2) 0', fontSize: 'var(--font-size-lg)', color: 'var(--success-color)' }}>
                              🔄 Replicar de Outra Categoria
                            </h4>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                              Copie categorias de peso de outra faixa de idade para "{selectedAgeCategory}"
                            </p>
                          </div>
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                replicateWeightCategoriesFromAge(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            disabled={loading}
                            className="input-modern"
                            style={{ width: '200px', cursor: 'pointer' }}
                          >
                            <option value="">Selecione...</option>
                            {ageOptions.filter(opt => opt.value !== selectedAgeCategory).map(option => (
                              <option key={option.value} value={option.value}>
                                {option.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedGender === 'F' && (
                        <div className="content-card" style={{ marginBottom: 'var(--spacing-6)', background: 'var(--background-secondary)', border: '2px solid var(--primary-color)', borderStyle: 'dashed' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ margin: '0 0 var(--spacing-2) 0', fontSize: 'var(--font-size-lg)', color: 'var(--primary-color)' }}>
                                🔄 Replicar do Masculino
                              </h4>
                              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                Copie todas as categorias de peso cadastradas no masculino para o feminino nesta mesma faixa de idade
                              </p>
                            </div>
                            <button 
                              onClick={replicateWeightCategories}
                              disabled={loading}
                              className="btn btn-primary"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              {loading ? 'Replicando...' : '🔄 Replicar'}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="content-card" style={{ marginBottom: 'var(--spacing-6)', background: 'var(--background-secondary)' }}>
                        <h4 style={{ margin: '0 0 var(--spacing-4) 0', fontSize: 'var(--font-size-lg)' }}>
                          {editingWeightCategory ? 'Editar Categoria de Peso' : 'Adicionar Categoria de Peso'}
                        </h4>
                        <form onSubmit={handleWeightSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto auto', gap: 'var(--spacing-3)', alignItems: 'end' }}>
                          <input
                            type="text"
                            name="name"
                            value={weightFormData.name}
                            onChange={handleWeightChange}
                            placeholder="Nome (ex: até 30kg)"
                            className="input-modern"
                            required
                          />
                          <input
                            type="number"
                            name="min_weight"
                            value={weightFormData.min_weight}
                            onChange={handleWeightChange}
                            placeholder="Mínimo"
                            step="0.1"
                            className="input-modern"
                            required
                          />
                          <input
                            type="number"
                            name="max_weight"
                            value={weightFormData.max_weight}
                            onChange={handleWeightChange}
                            placeholder="Máximo"
                            step="0.1"
                            className="input-modern"
                            required
                          />
                          {editingWeightCategory && (
                            <button
                              type="button"
                              onClick={cancelWeightEdit}
                              className="btn btn-secondary"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                          >
                            {loading ? 'Salvando...' : (editingWeightCategory ? 'Atualizar' : 'Adicionar')}
                          </button>
                        </form>
                      </div>

                      <div className="content-card">
                        <h4 style={{ margin: '0 0 var(--spacing-4) 0', fontSize: 'var(--font-size-lg)' }}>Categorias Cadastradas</h4>
                        {getFilteredWeightCategories().length === 0 ? (
                          <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-3)' }}>⚖️</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-lg)' }}>
                              Nenhuma categoria de peso cadastrada
                            </p>
                            <p style={{ color: 'var(--text-muted)', margin: 'var(--spacing-2) 0 0 0' }}>
                              {selectedGender === 'M' ? 'Masculino' : 'Feminino'} - {selectedAgeCategory}
                            </p>
                            <p style={{ color: 'var(--success-color)', margin: 'var(--spacing-3) 0 0 0', fontSize: 'var(--font-size-sm)' }}>
                              💡 Dica: Use a opção "Replicar de Outra Categoria" acima para copiar categorias já cadastradas
                            </p>
                            {selectedGender === 'F' && (
                              <p style={{ color: 'var(--primary-color)', margin: 'var(--spacing-2) 0 0 0', fontSize: 'var(--font-size-sm)' }}>
                                Ou use "Replicar do Masculino" para copiar do mesmo gênero nesta faixa
                              </p>
                            )}
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                            gap: 'var(--spacing-3)'
                          }}>
                            {getFilteredWeightCategories().map(category => (
                              <div key={category.id} className="content-card" style={{
                                padding: 'var(--spacing-4)', 
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--gray-50)', 
                                border: '1px solid var(--border)',
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontWeight: '600', fontSize: 'var(--font-size-base)' }}>{category.name}</div>
                                  <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                    {category.min_weight} - {category.max_weight} kg
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => editWeightCategory(category)}
                                    className="btn btn-xs btn-outline"
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    onClick={() => deleteWeightCategory(category.id)}
                                    className="btn btn-xs btn-danger"
                                    title="Excluir"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {weightView !== 'age-selection' && (
                  <div style={{ marginTop: 'var(--spacing-4)', textAlign: 'center' }}>
                    <button onClick={weightView === 'gender-selection' ? goBackToWeightList : goBackToGenderSelection} className="btn btn-secondary">
                      ← Voltar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aba de Categorias de Faixa */}
          {activeCategoryTab === 'belt' && (
            <div className="content-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>🥋 Categorias de Faixa</h3>
                <button onClick={() => handleOpenForm('belt')} className="btn btn-primary">+ Nova Categoria</button>
              </div>
              
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-4)' }}>
                  {beltCategories.map((category) => (
                    <div key={category.id} className="content-card" style={{
                      padding: 'var(--spacing-5)', 
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--gray-50)', 
                      border: '1px solid var(--border)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 var(--spacing-2) 0', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                            {category.name}
                          </h4>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            {category.min_belt_color || 'Início'} - {category.max_belt_color || 'Fim'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleOpenForm('belt', category)} className="btn btn-xs btn-outline">✏️</button>
                          <button onClick={() => handleDelete('belt', category.id)} className="btn btn-xs btn-danger">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {beltCategories.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>🥋</div>
                    <h4 style={{ margin: '0 0 var(--spacing-2) 0', color: 'var(--text-secondary)' }}>Nenhuma categoria de faixa cadastrada</h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Clique em "Nova Categoria" para começar</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aba de Modalidades */}
          {activeCategoryTab === 'modality' && (
            <div className="content-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>🏅 Modalidades</h3>
                <button onClick={() => handleOpenForm('modality')} className="btn btn-primary">+ Nova Modalidade</button>
              </div>
              
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--spacing-4)' }}>
                  {modalities.map((modality) => (
                    <div key={modality.id} className="content-card" style={{
                      padding: 'var(--spacing-5)', 
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--gray-50)', 
                      border: '1px solid var(--border)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 var(--spacing-2) 0', fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
                            {modality.name}
                          </h4>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: '1.4' }}>
                            {modality.description || 'Sem descrição'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'var(--spacing-3)' }}>
                          <button onClick={() => handleOpenForm('modality', modality)} className="btn btn-xs btn-outline">✏️</button>
                          <button onClick={() => handleDelete('modality', modality.id)} className="btn btn-xs btn-danger">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {modalities.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>🏅</div>
                    <h4 style={{ margin: '0 0 var(--spacing-2) 0', color: 'var(--text-secondary)' }}>Nenhuma modalidade cadastrada</h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Clique em "Nova Modalidade" para começar</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}