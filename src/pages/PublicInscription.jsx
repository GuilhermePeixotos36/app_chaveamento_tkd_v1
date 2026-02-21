import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Shield,
  CheckCircle2,
  Trophy,
  PlusCircle,
  ArrowLeft,
  Info,
  User,
  Calendar,
  Activity,
  Phone,
  Mail,
  X,
  Check,
  Building2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

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
    championship_id: '', organization_id: '', athlete_name: '', athlete_birthdate: '', athlete_weight: '',
    weight_category_id: null, age_category_id: null, belt_category_id: null, athlete_gender: '',
    athlete_belt: '', modality_id: '', athlete_phone: '', athlete_email: '', observations: ''
  });

  const [newOrgData, setNewOrgData] = useState({ name: '', phone: '', responsible_teacher: '' });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const champId = urlParams.get('id');
    loadData(champId);
  }, []);

  const loadData = async (champId) => {
    setLoading(true);
    try {
      let query = supabase.from('championships').select('*');
      if (champId) { query = query.eq('id', champId); } else { query = query.eq('inscription_open', true); }
      const { data: champsData } = await query.single();

      if (champsData) {
        setChampionships([champsData]);
        setFormData(prev => ({ ...prev, championship_id: champsData.id }));
      }

      const { data: orgsData } = await supabase.from('organizations').select('*').order('name');
      setOrganizations(orgsData || []);
      const { data: modsData } = await supabase.from('modalities').select('*').order('name');
      setModalities(modsData || []);
      const { data: weightData } = await supabase.from('weight_categories').select('*').order('min_weight');
      setWeightCategories(weightData || []);
      const { data: ageData } = await supabase.from('age_categories').select('*').order('min_age');
      setAgeCategories(ageData || []);
      const { data: beltData } = await supabase.from('belt_categories').select('*');
      setBeltCategories(beltData || []);
    } catch (error) { setMessage('Erro ao carregar dados.'); } finally { setLoading(false); }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const getAgeGroup = (age) => {
    if (age <= 6) return 'Fraldinha';
    if (age <= 9) return 'Mirim';
    if (age <= 11) return 'Infantil';
    if (age <= 14) return 'Cadete';
    if (age <= 17) return 'Juvenil';
    if (age <= 30) return 'Adulto';
    if (age <= 34) return 'Master 1';
    if (age <= 44) return 'Master 2';
    return 'Master 3';
  };

  const findWeightCategory = (weight, age, gender) => {
    const ageName = getAgeGroup(age);
    return weightCategories.find(c => c.age_category === ageName && c.gender === gender && weight >= c.min_weight && weight <= c.max_weight);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (['athlete_weight', 'athlete_birthdate', 'athlete_gender', 'athlete_belt'].includes(name)) {
        const age = calculateAge(next.athlete_birthdate);
        const weight = parseFloat(next.athlete_weight) || 0;
        const gender = next.athlete_gender;
        const beltLevel = parseInt(next.athlete_belt) || 1;

        if (weight && age && gender) {
          const suggested = findWeightCategory(weight, age, gender);
          next.weight_category_id = suggested?.id || null;
          setSuggestedWeightCategory(suggested);
        }
        if (age) next.age_category_id = ageCategories.find(c => c.name === getAgeGroup(age))?.id || null;
        if (beltLevel) {
          const beltName = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Roxa', 'Azul', 'Marrom', 'Vermelha', 'Ponta Preta', 'Preta'][beltLevel - 1];
          next.belt_category_id = beltCategories.find(c => beltName >= c.min_belt_color && beltName <= c.max_belt_color)?.id || null;
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('registrations').insert({
        championship_id: formData.championship_id, organization_id: formData.organization_id, full_name: formData.athlete_name,
        birth_date: formData.athlete_birthdate, weight: parseFloat(formData.athlete_weight), weight_category_id: formData.weight_category_id,
        age_category_id: formData.age_category_id, belt_category_id: formData.belt_category_id, gender: formData.athlete_gender,
        belt_level: parseInt(formData.athlete_belt), modality_id: formData.modality_id, phone: formData.athlete_phone,
        email: formData.athlete_email, observations: formData.observations, age: calculateAge(formData.athlete_birthdate), status: 'pending'
      });
      if (error) throw error;
      setShowSuccess(true);
    } catch (error) { setMessage('Erro: ' + error.message); } finally { setLoading(false); }
  };

  const handleNewOrgSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('organizations').insert({ name: newOrgData.name, responsible_name: newOrgData.responsible_teacher, phone: newOrgData.phone }).select();
      if (error) throw error;
      setOrganizations(prev => [...prev, data[0]]);
      setFormData(p => ({ ...p, organization_id: data[0].id }));
      setShowNewOrgModal(false);
    } catch (error) { setMessage('Erro ao cadastrar academia.'); } finally { setLoading(false); }
  };

  if (showSuccess) {
    return (
      <div className="app-container" style={{ backgroundColor: '#F2EFEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="content-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '64px 32px' }}>
          <div style={{ width: '80px', height: '80px', background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px auto' }}>
            <CheckCircle2 size={48} color="#10B981" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#10151C' }}>Inscrição Realizada!</h1>
          <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '40px' }}>Seu registro foi enviado com sucesso. Aguarde a confirmação técnica por parte da federação.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary btn-block" style={{ padding: '16px' }}>Nova Inscrição</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ backgroundColor: '#F2EFEA', padding: '0' }}>
      <header style={{ background: 'var(--brand-blue)', color: '#FFF', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', background: '#FFF', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
          <Shield size={32} color="var(--brand-blue)" />
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '1px' }}>FETMG</h1>
        <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>FEDERAÇÃO DE TAEKWONDO DO ESTADO DE MINAS GERAIS</p>
      </header>

      <div className="content-wrapper" style={{ maxWidth: '800px', transform: 'translateY(-20px)', zIndex: 10 }}>
        <div className="content-card" style={{ padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>Ficha de Inscrição</h2>
            <p style={{ color: '#666' }}>Preencha os dados do atleta para participação oficial.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Champ Info */}
            <div style={{ backgroundColor: '#F8F9FA', padding: '24px', borderRadius: '12px', borderLeft: '6px solid var(--brand-blue)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-blue)', marginBottom: '8px' }}>
                <Trophy size={20} />
                <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Campeonato Selecionado</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{championships[0]?.name || '---'}</h3>
              <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '0.9rem' }}>{championships[0]?.date ? new Date(championships[0].date).toLocaleDateString('pt-BR') : 'Data a definir'}</p>
            </div>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px 0', fontSize: '1.1rem' }}><Building2 size={18} color="var(--brand-blue)" /> Entidade Responsável</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label>Sua Academia / Clube</label>
                  <select name="organization_id" value={formData.organization_id} onChange={handleChange} required className="select-modern">
                    <option value="">Selecione sua academia</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <button type="button" onClick={() => setShowNewOrgModal(true)} className="btn btn-ghost" style={{ alignSelf: 'flex-end', height: '42px', color: 'var(--brand-blue)' }}><PlusCircle size={18} /> Nova</button>
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px 0', fontSize: '1.1rem' }}><User size={18} color="var(--brand-blue)" /> Dados do Atleta</h4>
              <div><label>Nome Completo</label><input name="athlete_name" value={formData.athlete_name} onChange={handleChange} required className="input-modern" placeholder="Nome completo do competidor" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div><label>Data de Nascimento</label><input type="date" name="athlete_birthdate" value={formData.athlete_birthdate} onChange={handleChange} required className="input-modern" /></div>
                <div>
                  <label>Gênero</label>
                  <select name="athlete_gender" value={formData.athlete_gender} onChange={handleChange} required className="select-modern">
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Graduação Atual (Kup/Dan)</label>
                  <select name="athlete_belt" value={formData.athlete_belt} onChange={handleChange} required className="select-modern">
                    <option value="">Selecione...</option>
                    <option value="1">Branca</option>
                    <option value="2">Cinza</option>
                    <option value="3">Amarela</option>
                    <option value="4">Laranja</option>
                    <option value="5">Verde</option>
                    <option value="6">Roxa</option>
                    <option value="7">Azul</option>
                    <option value="8">Marrom</option>
                    <option value="9">Vermelha</option>
                    <option value="10">Ponta Preta</option>
                    <option value="11">Preta</option>
                  </select>
                </div>
                <div>
                  <label>Modalidade</label>
                  <select name="modality_id" value={formData.modality_id} onChange={handleChange} required className="select-modern">
                    <option value="">Selecione...</option>
                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 10px 0', fontSize: '1.1rem' }}><Activity size={18} color="var(--brand-blue)" /> Peso e Categoria</h4>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ width: '150px' }}><label>Peso Atual (kg)</label><input type="number" step="0.1" name="athlete_weight" value={formData.athlete_weight} onChange={handleChange} required className="input-modern" placeholder="00.0" /></div>
                <div style={{ flex: 1, backgroundColor: '#F8F9FA', padding: '16px', borderRadius: '12px', border: '1px dashed #DDD' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 800, marginBottom: '4px' }}>CATEGORIA SUGERIDA</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: suggestedWeightCategory ? 'var(--brand-blue)' : '#AAA' }}>
                    {suggestedWeightCategory ? suggestedWeightCategory.name : 'Aguardando peso e idade'}
                  </div>
                </div>
              </div>
              {message && <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '8px', color: '#B91C1C', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={14} /> {message}</div>}
            </section>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ padding: '20px', fontSize: '1.1rem' }}>
              {loading ? 'Processando...' : <><Check size={20} /> Confirmar Inscrição Oficial</>}
            </button>
          </form>
        </div>
      </div>

      {showNewOrgModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '24px' }}>Cadastrar Nova Academia</h3>
            <form onSubmit={handleNewOrgSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label>Nome da Academia</label><input name="name" value={newOrgData.name} onChange={e => setNewOrgData({ ...newOrgData, name: e.target.value })} className="input-modern" required /></div>
              <div><label>Mestre/Professor Responsável</label><input name="responsible_teacher" value={newOrgData.responsible_teacher} onChange={e => setNewOrgData({ ...newOrgData, responsible_teacher: e.target.value })} className="input-modern" required /></div>
              <div><label>Telefone de Contato</label><input name="phone" value={newOrgData.phone} onChange={e => setNewOrgData({ ...newOrgData, phone: e.target.value })} className="input-modern" required /></div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowNewOrgModal(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Academia</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <footer style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '0.8rem' }}>
        © 2025 FETMG - Federação de Taekwondo do Estado de Minas Gerais. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default PublicInscription;
