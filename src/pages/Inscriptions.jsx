import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  ClipboardList,
  ArrowLeft,
  Search,
  Filter,
  FileSpreadsheet,
  FileDown,
  Pencil,
  Trash2,
  User,
  UserRound,
  X,
  Check,
  Calendar,
  MapPin,
  Circle
} from 'lucide-react';

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

  const handleEdit = (inscription) => {
    setEditData(inscription);
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (name === 'weight') {
      const weight = parseFloat(value);
      const age = editData.age || '';
      const gender = editData.gender || '';
      if (weight && age && gender) {
        const suggested = findWeightCategoryByWeight(weight, age, gender);
        if (suggested) {
          setEditData(prev => ({ ...prev, weight: weight, weight_category_id: suggested.id }));
        } else {
          setEditData(prev => ({ ...prev, weight: weight, weight_category_id: null }));
        }
      } else {
        setEditData(prev => ({ ...prev, weight: weight, weight_category_id: null }));
      }
    } else {
      setEditData(prev => ({ ...prev, [name]: value }));
      if ((name === 'age' || name === 'gender') && editData.weight) {
        const weight = editData.weight;
        const newAge = name === 'age' ? value : editData.age;
        const newGender = name === 'gender' ? value : editData.gender;
        if (weight && newAge && newGender) {
          const suggested = findWeightCategoryByWeight(weight, newAge, newGender);
          if (suggested) {
            setEditData(prev => ({ ...prev, weight_category_id: suggested.id }));
          } else {
            setEditData(prev => ({ ...prev, weight_category_id: null }));
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

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta inscrição?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', id);
      if (error) throw error;
      setMessage('Inscrição excluída com sucesso!');
      loadInscriptions(selectedChampionship);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir inscrição');
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
      setChampionships(champsData.data || []);
      setModalities(modsData.data || []);
      setOrganizations(orgsData.data || []);
      setAgeCategories(ageCatsData.data || []);
      setWeightCategories(weightCatsData.data || []);
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
    const ageCategory = getAgeCategory(age);
    if (!weight || !ageCategory || !gender) return null;
    return weightCategories.find(cat =>
      cat.age_category === ageCategory &&
      cat.gender === gender &&
      weight >= cat.min_weight &&
      weight <= cat.max_weight
    );
  };

  const loadInscriptions = async (championshipId) => {
    setLoading(true);
    try {
      const { data: registrationsData, error: regError } = await supabase
        .from('registrations')
        .select(`*, organizations(name)`)
        .eq('championship_id', championshipId)
        .order('created_at', { ascending: false });
      if (regError) throw regError;

      const { data: modalitiesData } = await supabase.from('modalities').select('id, name');
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

  const getBeltColor = (beltLevel) => {
    const colors = {
      1: '#FFFFFF', // Branca
      2: '#808080', // Cinza
      3: '#FFFF00', // Amarela
      4: '#FFA500', // Laranja
      5: '#008000', // Verde
      6: '#800080', // Roxa
      7: '#0000FF', // Azul
      8: '#8B4513', // Marrom
      9: '#FF0000', // Vermelha
      10: '#FF0000', // Vermelha Ponteira Preta (Visual aproximado)
      11: '#000000' // Preta
    };
    return colors[beltLevel] || '#CCCCCC';
  };

  const getBeltName = (beltLevel) => {
    const beltNames = {
      1: 'Branca', 2: 'Cinza', 3: 'Amarela', 4: 'Laranja', 5: 'Verde',
      6: 'Roxa', 7: 'Azul', 8: 'Marrom', 9: 'Vermelha',
      10: 'Vermelha P. Preta', 11: 'Preta'
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
      if (filteredInscriptions.length === 0) { alert('Nenhuma inscrição para exportar'); return; }
      const data = filteredInscriptions.map(ins => ({
        'Atleta': ins.full_name, 'Idade': ins.age, 'Gênero': ins.gender === 'M' ? 'Masculino' : 'Feminino',
        'Peso (kg)': ins.weight, 'Faixa': getBeltName(ins.belt_level), 'Modalidade': ins.modalities?.name || '---',
        'Academia': ins.organizations?.name || '---', 'Data Inscrição': new Date(ins.created_at).toLocaleDateString('pt-BR')
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inscritos");
      XLSX.writeFile(wb, `inscritos_${selectedChampionshipData?.name || 'campeonato'}.xlsx`);
    } catch (error) { alert('Erro ao exportar Excel'); }
  };

  const exportToPDF = () => {
    try {
      if (filteredInscriptions.length === 0) { alert('Nenhuma inscrição para exportar'); return; }
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Relatório de Inscritos - ${selectedChampionshipData?.name || 'Campeonato'}`, 14, 22);
      const tableRows = filteredInscriptions.map(ins => [
        ins.full_name, ins.age, ins.gender, ins.weight + " kg", getBeltName(ins.belt_level),
        ins.modalities?.name || '---', ins.organizations?.name || '---'
      ]);
      doc.autoTable({
        head: [["Atleta", "Idade", "Gênero", "Peso", "Faixa", "Modalidade", "Academia"]],
        body: tableRows, startY: 35, theme: 'striped', headStyles: { fillColor: [23, 130, 200] }
      });
      doc.save(`inscritos_${selectedChampionshipData?.name || 'campeonato'}.pdf`);
    } catch (error) { alert('Erro ao exportar PDF'); }
  };

  const selectedChampionshipData = championships.find(c => c.id === selectedChampionship);

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
    <div className="app-container" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="content-wrapper">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn btn-secondary"
              style={{ width: '42px', height: '42px', padding: 0 }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={24} color="var(--brand-blue)" />
                <h1 className="header-title" style={{ margin: 0, fontSize: '1.8rem' }}>Inscrições</h1>
              </div>
              <p className="header-subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>Controle oficial de atletas e entidades filiadas</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <button onClick={exportToExcel} className="btn btn-secondary" style={{ backgroundColor: '#FFFFFF' }}>
              <FileSpreadsheet size={18} /> Excel
            </button>
            <button onClick={exportToPDF} className="btn btn-secondary" style={{ backgroundColor: '#FFFFFF' }}>
              <FileDown size={18} /> PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="content-card" style={{ marginBottom: 'var(--spacing-8)', padding: 'var(--spacing-6)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-6)' }}>
            <div>
              <label>Campeonato</label>
              <select value={selectedChampionship} onChange={(e) => setSelectedChampionship(e.target.value)} className="select-modern">
                {championships.map(champ => <option key={champ.id} value={champ.id}>{champ.name}</option>)}
              </select>
            </div>
            <div>
              <label>Busca por Nome</label>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="Nome do atleta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-modern" style={{ paddingLeft: '2.5rem' }} />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              </div>
            </div>
            <div>
              <label>Gênero</label>
              <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="select-modern">
                <option value="all">Todos</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div>
              <label>Faixa</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="select-modern">
                <option value="all">Todas</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => <option key={n} value={n}>{getBeltName(n)}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Championship Info Bar */}
        {selectedChampionshipData && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-8)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                <Calendar size={16} color="var(--brand-blue)" /> {new Date(selectedChampionshipData.date).toLocaleDateString('pt-BR')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                <MapPin size={16} color="var(--brand-blue)" /> {selectedChampionshipData.location}
              </div>
            </div>
            <div className="badge badge-primary">{filteredInscriptions.length} ATLETAS CONFIRMADOS</div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--spacing-8)', background: 'var(--primary-50)', color: 'var(--brand-blue)', textAlign: 'center', fontWeight: 600 }}>
            {message}
          </div>
        )}

        {/* List Table */}
        <div className="table-modern-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-4)' }} />
              <p>Carregando registros...</p>
            </div>
          ) : filteredInscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
              <h3 style={{ color: 'var(--gray-400)' }}>Nenhum registro encontrado</h3>
            </div>
          ) : (
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>Idade</th>
                  <th>Gênero</th>
                  <th>Peso</th>
                  <th>Graduação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredInscriptions.map(ins => (
                  <tr key={ins.id}>
                    <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{ins.full_name}</td>
                    <td><span className="badge badge-secondary">{ins.age} anos</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {ins.gender === 'M' ? <User size={14} /> : <UserRound size={14} />}
                        {ins.gender}
                      </div>
                    </td>
                    <td>{ins.weight} kg</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Circle size={12} fill={getBeltColor(ins.belt_level)} color={ins.belt_level === 1 ? '#e2e8f0' : 'transparent'} />
                        {getBeltName(ins.belt_level)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(ins)} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '8px' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(ins.id)} className="btn btn-danger" style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'var(--brand-red)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '600px', maxWidth: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--gray-900)' }}>Editar Atleta</h3>
                <button onClick={() => setIsEditing(false)} className="btn btn-ghost"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label>Nome do Atleta</label>
                  <input name="full_name" value={editData.full_name} onChange={handleEditChange} className="input-modern" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Idade (Anos)</label>
                    <input name="age" type="number" value={editData.age} onChange={handleEditChange} className="input-modern" required />
                  </div>
                  <div>
                    <label>Gênero</label>
                    <select name="gender" value={editData.gender} onChange={handleEditChange} className="select-modern">
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Peso Corporal (kg)</label>
                    <input name="weight" type="number" step="0.1" value={editData.weight} onChange={handleEditChange} className="input-modern" required />
                  </div>
                  <div>
                    <label>Data de Nascimento</label>
                    <input name="birth_date" type="date" value={editData.birth_date} onChange={handleEditChange} className="input-modern" required />
                  </div>
                </div>
                <div>
                  <label>Graduação (Faixa)</label>
                  <select name="belt_level" value={editData.belt_level} onChange={handleEditChange} className="select-modern">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => <option key={n} value={n}>{getBeltName(n)}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ minWidth: '140px' }}>
                    <Check size={18} /> Salvar Atleta
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

export default Inscriptions;
