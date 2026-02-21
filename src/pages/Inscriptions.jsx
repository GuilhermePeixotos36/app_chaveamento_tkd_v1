import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Inscriptions = () => {
  const [weightCategories, setWeightCategories] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [ageCategories, setAgeCategories] = useState([]);
  const [selectedChampionship, setSelectedChampionship] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterModality, setFilterModality] = useState('all');
  const [filterOrganization, setFilterOrganization] = useState('all');
  const [filterAgeCategory, setFilterAgeCategory] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '',
    age: '',
    gender: '',
    weight: '',
    weight_category_id: null,
    belt_level: '',
    belt_category_id: null,
    modality_id: '',
    organization_id: '',
    birth_date: '',
    phone: '',
    observations: '',
    email: '',
    status: 'active'
  });
  const [suggestedWeightCategory, setSuggestedWeightCategory] = useState(null);

  // ... rest of the component state ...

  const handleEdit = (inscription) => {
    setEditData(inscription);
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    // Se o campo for peso, processar automaticamente a categoria de peso
    if (name === 'weight') {
      const weight = parseFloat(value);
      const age = editData.age || '';
      const gender = editData.gender || '';
      
      if (weight && age && gender) {
        const suggested = findWeightCategoryByWeight(weight, age, gender);
        
        if (suggested) {
          console.log('Categoria de peso sugerida:', suggested.name, 'ID:', suggested.id);
          setEditData(prev => ({
            ...prev,
            weight: weight,
            weight_category_id: suggested.id
          }));
        } else {
          console.log('Nenhuma categoria de peso encontrada para:', { weight, age, gender });
          setEditData(prev => ({
            ...prev,
            weight: weight,
            weight_category_id: null
          }));
        }
      } else {
        setEditData(prev => ({
          ...prev,
          weight: weight,
          weight_category_id: null
        }));
      }
    } else {
      // Para outros campos, apenas atualizar normalmente
      setEditData(prev => ({ ...prev, [name]: value }));
      
      // Se idade ou gênero mudar, recalcular categoria de peso se peso já estiver preenchido
      if ((name === 'age' || name === 'gender') && editData.weight) {
        const weight = editData.weight;
        const newAge = name === 'age' ? value : editData.age;
        const newGender = name === 'gender' ? value : editData.gender;
        
        if (weight && newAge && newGender) {
          const suggested = findWeightCategoryByWeight(weight, newAge, newGender);
          
          if (suggested) {
            console.log('Categoria de peso atualizada:', suggested.name, 'ID:', suggested.id);
            setEditData(prev => ({
              ...prev,
              [name]: value,
              weight_category_id: suggested.id
            }));
          } else {
            setEditData(prev => ({
              ...prev,
              [name]: value,
              weight_category_id: null
            }));
          }
        }
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .update({
          full_name: editData.full_name,
          age: parseInt(editData.age),
          gender: editData.gender,
          weight: parseFloat(editData.weight),
          belt_level: parseInt(editData.belt_level),
          belt_category_id: editData.belt_category_id,
          modality_id: editData.modality_id,
          organization_id: editData.organization_id,
          birth_date: editData.birth_date || new Date().toISOString().split('T')[0]
        })
        .eq('id', editData.id);

      if (error) throw error;
      setMessage('Inscrição atualizada com sucesso!');
      setIsEditing(false);
      loadInscriptions(selectedChampionship);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar inscrição');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('Dados do formulario:', editData);
    
    try {
      const { data, error } = await supabase
        .from('registrations')
        .insert({
          full_name: editData.full_name,
          age: parseInt(editData.age),
          gender: editData.gender,
          weight: parseFloat(editData.weight),
          weight_category_id: editData.weight_category_id,
          belt_level: parseInt(editData.belt_level),
          belt_category_id: editData.belt_category_id,
          modality_id: editData.modality_id,
          organization_id: editData.organization_id,
          birth_date: editData.birth_date || new Date().toISOString().split('T')[0],
          phone: editData.phone || '',
          observations: editData.observations || '',
          email: editData.email || '',
          status: editData.status || 'active'
        });

      console.log('Resultado:', { data, error });
      
      if (error) {
        console.error('Erro:', error);
        alert('Erro ao criar inscrição: ' + error.message);
      } else {
        console.log('Sucesso! ID:', data?.[0]?.id);
        setMessage('Inscrição criada com sucesso!');
        setIsEditing(false);
        setEditData({
          full_name: '',
          age: '',
          gender: '',
          weight: '',
          weight_category_id: null,
          belt_level: '',
          belt_category_id: null,
          modality_id: '',
          organization_id: '',
          birth_date: '',
          phone: '',
          observations: '',
          email: '',
          status: 'active'
        });
        loadInscriptions(selectedChampionship);
      }
    } catch (error) {
    console.error('Erro ao criar inscrição:', error);
    alert('Erro ao criar inscrição');
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedChampionship) {
      loadInscriptions(selectedChampionship);
    }
  }, [selectedChampionship]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [champsData, modsData, orgsData, ageCatsData, weightCatsData] = await Promise.all([
        supabase.from('championships').select('*').order('created_at', { ascending: false }),
        supabase.from('modalities').select('*').order('name'),
        supabase.from('organizations').select('*').order('name'),
        supabase.from('age_categories').select('*').order('min_age'),
        supabase.from('weight_categories').select('*').order('min_weight')
      ]);

      console.log('Weight categories loaded:', weightCatsData.data); // Debug
      
      setChampionships(champsData.data || []);
      setModalities(modsData.data || []);
      setOrganizations(orgsData.data || []);
      setAgeCategories(ageCatsData.data || []);
      setWeightCategories(weightCatsData.data || []);

      // Select first championship by default
      if (champsData.data && champsData.data.length > 0) {
        setSelectedChampionship(champsData.data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const findWeightCategoryByWeight = (weight, age, gender) => {
    console.log('--- DEBUG FIND WEIGHT CATEGORY ---');
    console.log('Parâmetros:', { weight, age, gender });
    
    // Converter idade numérica para categoria
    const ageCategory = getAgeCategory(age);
    console.log('Idade convertida para categoria:', ageCategory);
    console.log('Weight categories disponíveis:', weightCategories);
    
    if (!weight || !ageCategory || !gender) {
      console.log('Parâmetros faltando, retornando null');
      return null;
    }
    
    const found = weightCategories.find(cat => 
      cat.age_category === ageCategory &&
      cat.gender === gender &&
      weight >= cat.min_weight && 
      weight <= cat.max_weight
    );
    
    console.log('Categoria encontrada:', found);
    return found;
  };

  const handleWeightChange = (weight) => {
    const age = editData.age || '';
    const gender = editData.gender || '';
    
    if (weight && age && gender) {
      const suggested = findWeightCategoryByWeight(parseFloat(weight), age, gender);
      setSuggestedWeightCategory(suggested);
      
      if (suggested) {
        setEditData(prev => ({
          ...prev,
          weight: parseFloat(weight),
          weight_category_id: suggested.id
        }));
      }
    }
  };

  const loadInscriptions = async (championshipId) => {
    setLoading(true);
    try {
      // Primeiro busca as inscrições
      const { data: registrationsData, error: regError } = await supabase
        .from('registrations')
        .select(`
          *,
          organizations (
            name
          )
        `)
        .eq('championship_id', championshipId)
        .order('created_at', { ascending: false });

      if (regError) throw regError;

      // Depois busca as modalidades separadamente
      const { data: modalitiesData, error: modError } = await supabase
        .from('modalities')
        .select('id, name');

      if (modError) throw modError;

      // Combina os dados
      const enrichedData = registrationsData.map(registration => ({
        ...registration,
        modalities: modalitiesData.find(m => m.id === registration.modality_id)
      }));

      setInscriptions(enrichedData || []);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
      setMessage('Erro ao carregar inscrições');
    } finally {
      setLoading(false);
    }
  };

  const getBeltEmoji = (beltLevel) => {
    const colors = {
      1: '⚪',  // Branca
      2: '🟡',  // Amarela
      3: '🟢',  // Verde
      4: '🔵',  // Azul
      5: '🔴',  // Vermelha
      6: '⚫'   // Preta
    };
    return colors[beltLevel] || '🥋';
  };

  const getBeltName = (beltLevel) => {
    const beltNames = {
      1: 'Branca',
      2: 'Amarela',
      3: 'Verde',
      4: 'Azul',
      5: 'Vermelha',
      6: 'Preta'
    };
    return beltNames[beltLevel] || 'Desconhecida';
  };

  const getAgeCategory = (age) => {
    if (age >= 4 && age <= 6) return 'Fraldinha';
    if (age >= 7 && age <= 9) return 'Mirim';
    if (age >= 10 && age <= 12) return 'Infantil';
    if (age >= 13 && age <= 15) return 'Juvenil';
    if (age >= 16 && age <= 17) return 'Júnior';
    if (age >= 18 && age <= 34) return 'Sênior';
    if (age >= 35 && age <= 44) return 'Master 1';
    if (age >= 45 && age <= 54) return 'Master 2';
    if (age >= 55) return 'Master 3';
    return 'Fora de categoria';
  };

  const exportToExcel = () => {
    try {
      if (filteredInscriptions.length === 0) {
        alert('Nenhuma inscrição para exportar');
        return;
      }

      const data = filteredInscriptions.map(ins => ({
        'Atleta': ins.full_name,
        'Idade': ins.age,
        'Gênero': ins.gender === 'M' ? 'Masculino' : 'Feminino',
        'Peso (kg)': ins.weight,
        'Faixa': getBeltName(ins.belt_level),
        'Modalidade': ins.modalities?.name || '---',
        'Academia': ins.organizations?.name || '---',
        'Data Inscrição': new Date(ins.created_at).toLocaleDateString('pt-BR')
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inscritos");

      const fileName = `inscritos_${selectedChampionshipData?.name || 'campeonato'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setMessage('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao exportar Excel');
    }
  };

  const exportToPDF = () => {
    try {
      if (filteredInscriptions.length === 0) {
        alert('Nenhuma inscrição para exportar');
        return;
      }

      const doc = new jsPDF();
      const title = `Relatório de Inscritos - ${selectedChampionshipData?.name || 'Campeonato'}`;

      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);

      const reportDate = new Date().toLocaleString('pt-BR');
      doc.text(`Gerado em: ${reportDate}`, 14, 30);

      const tableColumn = ["Atleta", "Idade", "Gênero", "Peso", "Faixa", "Modalidade", "Academia"];
      const tableRows = filteredInscriptions.map(ins => [
        ins.full_name,
        ins.age,
        ins.gender,
        ins.weight + " kg",
        getBeltName(ins.belt_level),
        ins.modalities?.name || '---',
        ins.organizations?.name || '---'
      ]);

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      const fileName = `inscritos_${selectedChampionshipData?.name || 'campeonato'}.pdf`;
      doc.save(fileName);
      setMessage('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF');
    }
  };

  const selectedChampionshipData = championships.find(c => c.id === selectedChampionship);

  console.log('Organizations state:', organizations); // Debug

  const filteredInscriptions = inscriptions.filter(inscription => {
    const matchesSearch = inscription.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || inscription.belt_level === parseInt(filterCategory);
    const matchesModality = filterModality === 'all' || inscription.modality_id === filterModality;
    const matchesOrganization = filterOrganization === 'all' || inscription.organization_id === filterOrganization;
    const matchesAgeCategory = filterAgeCategory === 'all' || getAgeCategory(inscription.age) === filterAgeCategory;
    const matchesGender = filterGender === 'all' || inscription.gender === filterGender;
    return matchesSearch && matchesCategory && matchesModality && matchesOrganization && matchesAgeCategory && matchesGender;
  });

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
              <h1 className="header-title">📝 Lista de Inscritos</h1>
              <p className="header-subtitle">
                Visualize e gerencie os inscritos por campeonato
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="content-card card-compact" style={{ marginBottom: 'var(--spacing-8)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--spacing-4)'
          }}>
            {/* Championship Selector */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)'
              }}>
                Campeonato
              </label>
              <select
                value={selectedChampionship}
                onChange={(e) => setSelectedChampionship(e.target.value)}
                className="select-modern"
              >
                {championships.map(champ => (
                  <option key={champ.id} value={champ.id}>
                    {champ.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)'
              }}>
                Buscar Atleta
              </label>
              <input
                type="text"
                placeholder="Nome do atleta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--text-primary)'
              }}>
                Filtrar por Faixa
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="select-modern"
              >
                <option value="all">Todas as faixas</option>
                <option value="1">Branca</option>
                <option value="2">Amarela</option>
                <option value="3">Verde</option>
                <option value="4">Azul</option>
                <option value="5">Vermelha</option>
                <option value="6">Preta</option>
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
                Filtrar por Modalidade
              </label>
              <select
                value={filterModality}
                onChange={(e) => setFilterModality(e.target.value)}
                className="select-modern"
              >
                <option value="all">Todas as modalidades</option>
                {modalities.map(modality => (
                  <option key={modality.id} value={modality.id}>
                    {modality.name}
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
                Filtrar por Academia
              </label>
              <select
                value={filterOrganization}
                onChange={(e) => setFilterOrganization(e.target.value)}
                className="select-modern"
              >
                <option value="all">Todas as academias</option>
                {console.log('Rendering organizations:', organizations) || organizations.map(organization => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
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
                Filtrar por Categoria de Idade
              </label>
              <select
                value={filterAgeCategory}
                onChange={(e) => setFilterAgeCategory(e.target.value)}
                className="select-modern"
              >
                <option value="all">Todas as categorias</option>
                <option value="Fraldinha">Fraldinha (4-6 anos)</option>
                <option value="Mirim">Mirim (7-9 anos)</option>
                <option value="Infantil">Infantil (10-12 anos)</option>
                <option value="Juvenil">Juvenil (13-15 anos)</option>
                <option value="Júnior">Júnior (16-17 anos)</option>
                <option value="Sênior">Sênior (18-34 anos)</option>
                <option value="Master 1">Master 1 (35-44 anos)</option>
                <option value="Master 2">Master 2 (45-54 anos)</option>
                <option value="Master 3">Master 3 (55+ anos)</option>
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
                Filtrar por Gênero
              </label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="select-modern"
              >
                <option value="all">Todos os gêneros</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-3)',
            marginTop: 'var(--spacing-6)',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={exportToExcel}
              className="btn btn-success"
            >
              📊 Exportar Excel
            </button>
            <button
              onClick={exportToPDF}
              className="btn btn-danger"
            >
              📄 Exportar PDF
            </button>
          </div>
        </div>

        {/* Championship Info */}
        {selectedChampionshipData && (
          <div className="content-card card-compact" style={{ marginBottom: 'var(--spacing-8)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  margin: '0'
                }}>
                  {selectedChampionshipData.name}
                </h3>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  margin: 'var(--spacing-1) 0 0 0'
                }}>
                  📍 {selectedChampionshipData.location} • 📅 {new Date(selectedChampionshipData.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)'
              }}>
                <span className="badge badge-primary">
                  {filteredInscriptions.length} inscritos
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--spacing-8)',
            background: 'var(--warning-50)',
            color: 'var(--warning-600)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* Inscriptions List */}
        <div className="content-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-4)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Carregando inscrições...</p>
            </div>
          ) : filteredInscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
              <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-4)' }}>📝</div>
              <h3 style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-2)'
              }}>
                Nenhuma inscrição encontrada
              </h3>
              <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-secondary)',
                margin: '0'
              }}>
                {searchTerm || filterCategory !== 'all' || filterModality !== 'all' || filterOrganization !== 'all' || filterAgeCategory !== 'all' || filterGender !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Nenhum atleta se inscreveu neste campeonato ainda'
                }
              </p>
            </div>
          ) : (
            <div className="table-modern-container">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Atleta</th>
                    <th>Idade</th>
                    <th>Gênero</th>
                    <th>Peso</th>
                    <th>Faixa</th>
                    <th>Modalidade</th>
                    <th>Academia</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInscriptions.map((inscription, index) => (
                    <tr key={inscription.id || index}>
                      <td>
                        <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-primary)' }}>
                          {inscription.full_name}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{inscription.age} anos</span>
                      </td>
                      <td>
                        <span className="badge badge-primary">{inscription.gender === 'M' ? 'M' : 'F'}</span>
                      </td>
                      <td>{inscription.weight} kg</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                          <span>{getBeltEmoji(inscription.belt_level)}</span>
                          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {getBeltName(inscription.belt_level)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${inscription.modalities?.name ? 'badge-primary' : 'badge-secondary'}`}>
                          {inscription.modalities?.name || '---'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {inscription.organizations?.name || '---'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEdit(inscription)}
                            className="btn btn-xs btn-outline"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(inscription.id)}
                            className="btn btn-xs btn-danger"
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000
          }}>
            <div className="content-card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ marginBottom: '20px' }}>Editar Inscrição</h3>
              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label className="form-label">Nome Completo</label>
                  <input
                    name="full_name"
                    value={editData.full_name || ''}
                    onChange={handleEditChange}
                    className="input-modern"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label className="form-label">Idade</label>
                    <input
                      name="age"
                      type="number"
                      value={editData.age || ''}
                      onChange={handleEditChange}
                      className="input-modern"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Gênero</label>
                    <select
                      name="gender"
                      value={editData.gender || ''}
                      onChange={handleEditChange}
                      className="select-modern"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label className="form-label">Peso (kg)</label>
                    <input
                      name="weight"
                      type="number"
                      step="0.1"
                      value={editData.weight || ''}
                      onChange={handleEditChange}
                      className="input-modern"
                      placeholder="Ex: 67.9"
                      required
                    />
                    {suggestedWeightCategory && (
                      <div style={{ 
                        marginTop: 'var(--spacing-2)', 
                        fontSize: 'var(--font-size-xs)', 
                        color: 'var(--success-600)' 
                      }}>
                        ✅ Categoria sugerida: {suggestedWeightCategory.name}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Data de Nascimento</label>
                    <input
                      name="birth_date"
                      type="date"
                      value={editData.birth_date || ''}
                      onChange={handleEditChange}
                      className="input-modern"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Faixa</label>
                  <select
                    name="belt_level"
                    value={editData.belt_level || ''}
                    onChange={handleEditChange}
                    className="select-modern"
                  >
                    <option value="1">Branca</option>
                    <option value="2">Amarela</option>
                    <option value="3">Verde</option>
                    <option value="4">Azul</option>
                    <option value="5">Vermelha</option>
                    <option value="6">Preta</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Modalidade</label>
                  <select
                    name="modality_id"
                    value={editData.modality_id || ''}
                    onChange={handleEditChange}
                    className="select-modern"
                  >
                    {modalities.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Academia</label>
                  <select
                    name="organization_id"
                    value={editData.organization_id || ''}
                    onChange={handleEditChange}
                    className="select-modern"
                  >
                    {organizations.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Salvar Alterações</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inscriptions;
