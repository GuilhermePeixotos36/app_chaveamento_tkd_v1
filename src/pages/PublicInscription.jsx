import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PublicInscription = () => {
  const [championships, setChampionships] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [weightCategories, setWeightCategories] = useState([]);
  const [ageCategories, setAgeCategories] = useState([]);
  const [beltCategories, setBeltCategories] = useState([]);
  const [suggestedWeightCategory, setSuggestedWeightCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNewOrgModal, setShowNewOrgModal] = useState(false);

  const [formData, setFormData] = useState({
    championship_id: '',
    organization_id: '',
    athlete_name: '',
    athlete_birthdate: '',
    athlete_weight: '',
    weight_category_id: null,
    age_category_id: null,
    belt_category_id: null,
    athlete_gender: '',
    athlete_belt: '',
    modality_id: '',
    athlete_phone: '',
    athlete_email: '',
    observations: ''
  });

  const [newOrgData, setNewOrgData] = useState({
    name: '',
    phone: '',
    responsible_teacher: ''
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const champId = urlParams.get('id');
    loadData(champId);
  }, []);

  const loadData = async (champId) => {
    setLoading(true);
    try {
      // Buscar campeonato (específico ou aberto)
      let query = supabase.from('championships').select('*');

      if (champId) {
        query = query.eq('id', champId);
      } else {
        query = query.eq('inscription_open', true);
      }

      const { data: champsData, error: champError } = await query.single();

      if (champError && champError.code !== 'PGRST116') {
        console.error('Erro ao buscar campeonato:', champError);
        setMessage('Erro ao carregar campeonato');
      }

      if (champsData) {
        setChampionships([champsData]);
        setFormData(prev => ({
          ...prev,
          championship_id: champsData.id
        }));
      } else {
        setChampionships([]);
        if (champId) {
          setMessage('Campeonato não encontrado ou inscrições encerradas.');
        } else {
          setMessage('Nenhum campeonato aberto para inscrições no momento.');
        }
      }

      // Buscar academias (apenas aprovadas)
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      setOrganizations(orgsData || []);

      // Buscar modalidades
      const { data: modsData } = await supabase
        .from('modalities')
        .select('*')
        .order('name');

      setModalities(modsData || []);

      // Buscar categorias de peso
      console.log('=== CARREGANDO WEIGHT CATEGORIES ===');
      const { data: weightData, error: weightError } = await supabase
        .from('weight_categories')
        .select('*')
        .order('age_category, gender, min_weight');

      if (weightError) {
        console.error('Erro ao carregar weight categories:', weightError);
      } else {
        setWeightCategories(weightData || []);
        console.log('✅ Weight categories carregadas:', weightData?.length || 0, 'itens');
      }

      // Buscar categorias de idade
      console.log('=== CARREGANDO AGE CATEGORIES ===');
      const { data: ageData, error: ageError } = await supabase
        .from('age_categories')
        .select('*')
        .order('min_age');

      if (ageError) {
        console.error('Erro ao carregar age categories:', ageError);
      } else {
        setAgeCategories(ageData || []);
        console.log('✅ Age categories carregadas:', ageData?.length || 0, 'itens');
      }

      // Buscar categorias de faixa
      console.log('=== CARREGANDO BELT CATEGORIES ===');
      const { data: beltData, error: beltError } = await supabase
        .from('belt_categories')
        .select('*')
        .order('min_level');

      if (beltError) {
        console.error('❌ Erro ao carregar belt categories:', beltError);
        console.error('Detalhes do erro:', {
          message: beltError.message,
          details: beltError.details,
          hint: beltError.hint
        });
        setBeltCategories([]);
      } else {
        setBeltCategories(beltData || []);
        console.log('✅ Belt categories carregadas:', beltData?.length || 0, 'itens');
        console.log('Estrutura das belt categories:', beltData?.map(cat => ({
          id: cat.id,
          name: cat.name,
          min_level: cat.min_level,
          max_level: cat.max_level
        })));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados do formulário');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    console.log('=== PUBLIC INSCRIPTION HANDLE CHANGE ===');
    console.log('Campo:', name, 'Valor:', value);
    
    // Se o campo for peso, processar automaticamente a categoria de peso
    if (name === 'athlete_weight') {
      const weight = parseFloat(value);
      const age = calculateAge(formData.athlete_birthdate);
      const gender = formData.athlete_gender;
      
      console.log('=== PROCESSANDO PESO (PUBLIC) ===');
      console.log('Peso:', weight, 'Idade:', age, 'Gênero:', gender);
      
      if (weight && age && gender) {
        const suggested = findWeightCategoryByWeight(weight, age, gender);
        
        console.log('=== RESULTADO SUGESTÃO (PUBLIC) ===');
        console.log('Sugerido:', suggested);
        
        if (suggested) {
          console.log('✅ Categoria sugerida (PUBLIC):', suggested.name, 'ID:', suggested.id);
          
          // Calcular IDs das outras categorias
          const age = calculateAge(formData.athlete_birthdate);
          const beltLevel = parseInt(formData.athlete_belt);
          const ageCategoryId = findAgeCategoryId(age);
          const beltCategoryId = findBeltCategoryId(beltLevel);
          
          console.log('IDs calculados:', {
            weight_category_id: suggested.id,
            age_category_id: ageCategoryId,
            belt_category_id: beltCategoryId
          });
          
          setFormData(prev => ({
            ...prev,
            athlete_weight: value,
            weight_category_id: suggested.id,
            age_category_id: ageCategoryId,
            belt_category_id: beltCategoryId
          }));
          setSuggestedWeightCategory(suggested);
        } else {
          console.log('❌ Nenhuma categoria encontrada (PUBLIC):', { weight, age, gender });
          setFormData(prev => ({
            ...prev,
            athlete_weight: value,
            weight_category_id: null,
            age_category_id: null,
            belt_category_id: null
          }));
          setSuggestedWeightCategory(null);
        }
      } else {
        console.log('⚠️ Dados incompletos para sugestão (PUBLIC)');
        setFormData(prev => ({
          ...prev,
          athlete_weight: value,
          weight_category_id: null
        }));
        setSuggestedWeightCategory(null);
      }
    } else if (name === 'athlete_birthdate' || name === 'athlete_gender') {
      // Se idade ou gênero mudar, recalcular categoria se peso já estiver preenchido
      const weight = formData.athlete_weight;
      const age = name === 'athlete_birthdate' ? calculateAge(value) : calculateAge(formData.athlete_birthdate);
      const gender = name === 'athlete_gender' ? value : formData.athlete_gender;
      
      console.log('=== RECALCULANDO CATEGORIA (PUBLIC) ===');
      console.log('Novos dados:', { weight, age, gender });
      
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (weight && age && gender) {
        const suggested = findWeightCategoryByWeight(weight, age, gender);
        
        console.log('🔄 Categoria atualizada (PUBLIC):', suggested);
        
        if (suggested) {
          console.log('✅ Categoria atualizada (PUBLIC):', suggested.name, 'ID:', suggested.id);
          setFormData(prev => ({
            ...prev,
            weight_category_id: suggested.id
          }));
          setSuggestedWeightCategory(suggested);
        } else {
          console.log('❌ Nenhuma categoria encontrada após atualização (PUBLIC)');
          setFormData(prev => ({
            ...prev,
            weight_category_id: null
          }));
          setSuggestedWeightCategory(null);
        }
      }
    } else {
      // Para outros campos, apenas atualizar normalmente
      console.log('🔄 Atualizando campo normal (PUBLIC):', name, value);
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleNewOrgChange = (e) => {
    const { name, value } = e.target;
    setNewOrgData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getAgeCategory = (age) => {
    if (age >= 4 && age <= 6) return 'Fraldinha';
    if (age >= 7 && age <= 9) return 'Mirim';
    if (age >= 10 && age <= 12) return 'Infantil';
    if (age >= 13 && age <= 15) return 'Infantojuvenil';
    if (age >= 16 && age <= 17) return 'Juvenil';
    if (age >= 18) return 'Adulto';
    return 'Adulto';
  };

  const findWeightCategoryByWeight = (weight, age, gender) => {
    console.log('--- DEBUG FIND WEIGHT CATEGORY (PUBLIC) ---');
    console.log('Parâmetros:', { weight, age, gender });
    
    // Converter idade numérica para categoria
    const ageCategory = getAgeCategory(age);
    console.log('Idade convertida para categoria (PUBLIC):', ageCategory);
    console.log('Weight categories disponíveis (PUBLIC):', weightCategories);
    
    if (!weight || !ageCategory || !gender) {
      console.log('Parâmetros faltando, retornando null (PUBLIC)');
      return null;
    }
    
    const found = weightCategories.find(cat => 
      cat.age_category === ageCategory &&
      cat.gender === gender &&
      weight >= cat.min_weight && 
      weight <= cat.max_weight
    );
    
    console.log('Categoria encontrada (PUBLIC):', found);
    return found;
  };

  const findAgeCategoryId = (age) => {
    console.log('--- DEBUG FIND AGE CATEGORY ID ---');
    console.log('Age:', age);
    const ageCategory = getAgeCategory(age);
    console.log('AgeCategory:', ageCategory);
    console.log('Age categories disponíveis:', ageCategories);
    
    const found = ageCategories.find(cat => {
      console.log('Comparando:', {
        cat_name: cat.name,
        ageCategory: ageCategory,
        match: cat.name === ageCategory
      });
      return cat.name === ageCategory;
    });
    
    console.log('Age category encontrada:', found);
    return found ? found.id : null;
  };

  const findBeltCategoryId = (beltLevel) => {
    console.log('--- DEBUG FIND BELT CATEGORY ID ---');
    console.log('BeltLevel:', beltLevel);
    console.log('Belt categories disponíveis:', beltCategories);
    
    if (!beltCategories || beltCategories.length === 0) {
      console.log('Nenhuma belt category disponível, retornando null');
      return null;
    }
    
    // Usar a estrutura exata da tabela: name, min_level, max_level
    const found = beltCategories.find(cat => {
      console.log('Comparando com categoria:', {
        beltLevel: beltLevel,
        cat_name: cat.name,
        cat_min_level: cat.min_level,
        cat_max_level: cat.max_level,
        match: beltLevel >= cat.min_level && beltLevel <= cat.max_level
      });
      
      return beltLevel >= cat.min_level && beltLevel <= cat.max_level;
    });
    
    if (found) {
      console.log('✅ Belt category encontrada:', found);
      return found.id;
    } else {
      console.log('❌ Nenhuma belt category encontrada para nível:', beltLevel);
      console.log('Verifique se os níveis de faixa estão configurados corretamente na tabela');
      console.log('Estrutura esperada: min_level <= beltLevel <= max_level');
      return null;
    }
  };

  const handleOrganizationChange = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewOrgModal(true);
    } else {
      setFormData(prev => ({
        ...prev,
        organization_id: value
      }));
    }
  };

  const validateNewOrganization = () => {
    if (!newOrgData.name.trim()) {
      setMessage('Informe o nome da academia');
      return false;
    }
    if (!newOrgData.responsible_teacher.trim()) {
      setMessage('Informe o nome do responsável');
      return false;
    }
    if (!newOrgData.phone.trim()) {
      setMessage('Informe o telefone da academia');
      return false;
    }

    return true;
  };

  const handleNewOrganizationSubmit = async (e) => {
    e.preventDefault();

    if (!validateNewOrganization()) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Check if organization already exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', newOrgData.name.trim())
        .single();

      if (existingOrg) {
        setMessage('Esta academia já está cadastrada em nosso sistema!');
        return;
      }

      // Create new organization
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: newOrgData.name.trim(),
          responsible_name: newOrgData.responsible_teacher.trim(),
          phone: newOrgData.phone.trim()
        })
        .select();

      if (error) throw error;

      // Update form with new organization ID
      setFormData(prev => ({
        ...prev,
        organization_id: data[0].id
      }));

      // Add to organizations list
      setOrganizations(prev => [...prev, data[0]]);

      // Close modal and reset
      setShowNewOrgModal(false);
      setNewOrgData({
        name: '',
        phone: '',
        responsible_teacher: ''
      });

      setMessage('Academia cadastrada com sucesso!');

    } catch (error) {
      console.error('Erro ao cadastrar academia:', error);
      setMessage('Erro ao cadastrar academia. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!formData.championship_id) throw new Error('Selecione um campeonato');
      if (!formData.organization_id) throw new Error('Selecione sua academia');
      if (!formData.modality_id) throw new Error('Selecione a modalidade');

      const age = calculateAge(formData.athlete_birthdate);

      const { data, error } = await supabase
        .from('registrations')
        .insert({
          championship_id: formData.championship_id,
          organization_id: formData.organization_id,
          full_name: formData.athlete_name,
          birth_date: formData.athlete_birthdate,
          weight: parseFloat(formData.athlete_weight),
          weight_category_id: formData.weight_category_id,
          age_category_id: formData.age_category_id,
          belt_category_id: formData.belt_category_id,
          gender: formData.athlete_gender,
          belt_level: parseInt(formData.athlete_belt),
          modality_id: formData.modality_id,
          phone: formData.athlete_phone,
          email: formData.athlete_email,
          observations: formData.observations,
          age: age,
          status: 'pending'
        });

      console.log('=== RESULTADO INSERÇÃO (PUBLIC) ===');
      console.log('Dados inseridos:', {
        championship_id: formData.championship_id,
        organization_id: formData.organization_id,
        full_name: formData.athlete_name,
        weight: parseFloat(formData.athlete_weight),
        weight_category_id: formData.weight_category_id,
        age_category_id: formData.age_category_id,
        belt_category_id: formData.belt_category_id,
        gender: formData.athlete_gender,
        age: age
      });
      console.log('Resultado:', { data, error });

      if (error) throw error;

      setShowSuccess(true);
      setFormData({
        championship_id: formData.championship_id,
        organization_id: '',
        athlete_name: '',
        athlete_birthdate: '',
        athlete_weight: '',
        weight_category_id: null,
        age_category_id: null,
        belt_category_id: null,
        athlete_gender: '',
        athlete_belt: '',
        modality_id: '',
        athlete_phone: '',
        athlete_email: '',
        observations: ''
      });
      setMessage('Inscrição realizada com sucesso!');

    } catch (error) {
      console.error('Erro ao realizar inscrição:', error);
      setMessage(error.message || 'Erro ao processar inscrição. Verifique os campos.');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="app-container flex-center">
        <div className="content-card card-centered scale-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
          <h2 className="header-title">Inscrição Confirmada!</h2>
          <p className="header-subtitle">
            Sua inscrição foi realizada com sucesso e está aguardando aprovação da organização.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setShowSuccess(false)}
              className="btn btn-primary btn-lg"
            >
              Realizar Nova Inscrição
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn btn-secondary"
            >
              Ir para o Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="content-wrapper" style={{ maxWidth: '800px' }}>
        {/* Header Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--spacing-12)',
          animation: 'slideUp 0.6s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-4)',
            marginBottom: 'var(--spacing-6)'
          }}>
            <button
              onClick={() => window.history.back()}
              className="btn btn-ghost btn-sm"
              style={{ position: 'absolute', left: '0' }}
            >
              ← Voltar
            </button>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              boxShadow: 'var(--shadow-lg)'
            }}>
              🥋
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{
                fontSize: 'var(--font-size-4xl)',
                fontWeight: 'var(--font-weight-bold)',
                margin: '0',
                color: 'var(--text-primary)',
                letterSpacing: '-0.025em'
              }}>
                FETMG
              </h1>
              <p style={{
                margin: 'var(--spacing-1) 0 0 0',
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-secondary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Federação Mineira de Taekwondo
              </p>
            </div>
          </div>

          <h2 style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            margin: 'var(--spacing-8) 0 var(--spacing-4) 0',
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em'
          }}>
            Formulário de Inscrição
          </h2>
          <p style={{
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-secondary)',
            margin: '0',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 'var(--line-height-relaxed)'
          }}>
            Preencha os dados abaixo para se inscrever no campeonato oficial da FETMG
          </p>
        </div>

        {/* Form */}
        <div className="content-card card-elevated" style={{ animation: 'fadeIn 0.8s ease-out' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            {/* Championship Info */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.05)',
              padding: '16px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 12px 0',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏆 Campeonato Aberto para Inscrições
              </h3>
              {championships.length > 0 ? (
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--primary-600)',
                    marginBottom: '8px'
                  }}>
                    {championships[0].name}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)'
                  }}>
                    📅 {championships[0].date
                      ? new Date(championships[0].date).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : 'Data a definir'}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--error-600)', fontSize: '14px' }}>
                  {loading ? 'Carregando campeonato...' : (message || 'Nenhum campeonato disponível')}
                </div>
              )}
            </div>

            {/* Organization Section */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Sua Academia *
              </label>
              <select
                name="organization_id"
                value={formData.organization_id}
                onChange={handleOrganizationChange}
                required
                className="input-modern"
              >
                <option value="">Selecione sua academia</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
                <option value="new" style={{ fontWeight: 'bold', color: 'var(--primary-600)' }}>
                  🆕 Minha academia não está na lista
                </option>
              </select>
            </div>

            {/* Athlete Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Nome Completo do Atleta *
                </label>
                <input
                  type="text"
                  name="athlete_name"
                  value={formData.athlete_name}
                  onChange={handleChange}
                  required
                  placeholder="Nome do atleta"
                  className="input-modern"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  name="athlete_birthdate"
                  value={formData.athlete_birthdate}
                  onChange={handleChange}
                  required
                  className="input-modern"
                />
              </div>
            </div>

            {/* Competition Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Gênero *
                </label>
                <select
                  name="athlete_gender"
                  value={formData.athlete_gender}
                  onChange={handleChange}
                  required
                  className="input-modern"
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Peso (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="athlete_weight"
                  value={formData.athlete_weight}
                  onChange={handleChange}
                  required
                  placeholder="Ex: 65.5"
                  className="input-modern"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Graduação (Faixa) *
                </label>
                <select
                  name="athlete_belt"
                  value={formData.athlete_belt}
                  onChange={handleChange}
                  required
                  className="input-modern"
                >
                  <option value="">Selecione a faixa</option>
                  <option value="1">⚪ Branca</option>
                  <option value="2">🟡 Amarela</option>
                  <option value="3">🟢 Verde</option>
                  <option value="4">🔵 Azul</option>
                  <option value="5">🔴 Vermelha</option>
                  <option value="6">⚫ Preta</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Modalidade *
              </label>
              <select
                name="modality_id"
                value={formData.modality_id}
                onChange={handleChange}
                required
                className="input-modern"
              >
                <option value="">Selecione a modalidade</option>
                {modalities.map(mod => (
                  <option key={mod.id} value={mod.id}>{mod.name}</option>
                ))}
              </select>
            </div>

            {/* Contact Info */}
            <div style={{
              padding: '20px',
              background: 'rgba(59, 130, 246, 0.05)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(59, 130, 246, 0.1)'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
                Informações de Contato (Opcional)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="athlete_phone"
                    value={formData.athlete_phone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                    className="input-modern"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="athlete_email"
                    value={formData.athlete_email}
                    onChange={handleChange}
                    placeholder="email@exemplo.com"
                    className="input-modern"
                  />
                </div>
              </div>
            </div>

            {/* Observations */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Observações (opcional)
              </label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                rows={3}
                placeholder="Alguma informação adicional ou necessidade especial..."
                className="input-modern"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Message */}
            {message && (
              <div style={{
                padding: '12px',
                borderRadius: 'var(--border-radius-md)',
                fontSize: '14px',
                background: message.includes('sucesso') || message.includes('confirmada')
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${message.includes('sucesso') || message.includes('confirmada')
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
                  }`,
                color: message.includes('sucesso') || message.includes('confirmada')
                  ? '#10b981'
                  : '#ef4444'
              }}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-block"
              style={{
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {loading ? 'Processando...' : 'Realizar Inscrição'}
            </button>

            {/* Footer Info */}
            <div style={{
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--text-muted)',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>
                Ao se inscrever, você concorda com os regulamentos da FETMG
              </p>
              <p style={{ margin: '0' }}>
                Dúvidas? Entre em contato com a organização do campeonato
              </p>
            </div>
          </form>
        </div>

        {/* Modal Nova Academia */}
        {showNewOrgModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}>
            <div className="content-card" style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  margin: '0',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🆕 Cadastrar Nova Academia
                </h3>
                <button
                  onClick={() => {
                    setShowNewOrgModal(false);
                    setNewOrgData({
                      name: '',
                      phone: '',
                      responsible_teacher: ''
                    });
                    setMessage('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleNewOrganizationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  padding: '12px',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: '8px'
                }}>
                  📋 Preencha os dados da sua academia. Após o cadastro, ela poderá ser selecionada para inscrições.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-primary)'
                    }}>
                      Nome da Academia *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newOrgData.name}
                      onChange={handleNewOrgChange}
                      required
                      placeholder="Ex: Taekwondo Centro"
                      className="input-modern"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-primary)'
                    }}>
                      Responsável (Mestre/Professor) *
                    </label>
                    <input
                      type="text"
                      name="responsible_teacher"
                      value={newOrgData.responsible_teacher}
                      onChange={handleNewOrgChange}
                      required
                      placeholder="Nome completo do responsável"
                      className="input-modern"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-primary)'
                    }}>
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={newOrgData.phone}
                      onChange={handleNewOrgChange}
                      required
                      placeholder="(00) 00000-0000"
                      className="input-modern"
                    />
                  </div>
                </div>

                {message && (
                  <div style={{
                    padding: '12px',
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: '14px',
                    background: message.includes('sucesso') || message.includes('cadastrada')
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.includes('sucesso') || message.includes('cadastrada')
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                      }`,
                    color: message.includes('sucesso') || message.includes('cadastrada')
                      ? '#10b981'
                      : '#ef4444'
                  }}>
                    {message}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  marginTop: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewOrgModal(false);
                      setNewOrgData({
                        name: '',
                        phone: '',
                        responsible_teacher: ''
                      });
                      setMessage('');
                    }}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Cadastrando...' : 'Cadastrar Academia'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicInscription;
