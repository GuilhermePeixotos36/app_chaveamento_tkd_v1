import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Users, Award, ChevronLeft, Share2, Download, Eye, Save } from 'lucide-react';

const Brackets = () => {
    const [championships, setChampionships] = useState([]);
    const [selectedChampionship, setSelectedChampionship] = useState('');
    const [categories, setCategories] = useState({});
    const [kyorugiClassifications, setKyorugiClassifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showBracketModal, setShowBracketModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [saving, setSaving] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);

    useEffect(() => {
        loadChampionships();
        loadKyorugiClassifications();
    }, []);

    useEffect(() => {
        if (selectedChampionship) {
            loadRegistrations(selectedChampionship);
        }
    }, [selectedChampionship]);

    const loadChampionships = async () => {
        try {
            const { data, error } = await supabase
                .from('championships')
                .select('*')
                .order('date', { ascending: false });
            if (error) throw error;
            setChampionships(data || []);
            if (data && data.length > 0) {
                setSelectedChampionship(data[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar campeonatos:', error);
        }
    };

    const loadKyorugiClassifications = async () => {
        setLoading(true);
        try {
            console.log('=== DEBUG LOAD CLASSIFICATIONS (BRACKETS) ===');
            console.log('Carregando classificações...');
            
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

            console.log('Classifications carregadas:', classificationsData.data?.length || 0);
            console.log('Weight categories carregadas:', weightCategoriesData.data?.length || 0);
            console.log('Exemplo de classificação:', classificationsData.data?.[0]);
            
            setKyorugiClassifications(classificationsData.data || []);
        } catch (error) {
            console.error('Erro ao carregar classificações:', error);
            setMessage('Erro ao carregar classificações');
        } finally {
            setLoading(false);
        }
    };

    const loadRegistrations = async (champId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
          *,
          organizations (name),
          modalities (name)
        `)
                .eq('championship_id', champId);

            if (error) throw error;

            console.log('--- DEBUG INSCRIÇÕES CARREGADAS ---');
            console.log('Total de inscrições:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('Exemplo de inscrição:', data[0]);
                console.log('Campos da primeira inscrição:', Object.keys(data[0]));
            }
            console.log('--- END DEBUG INSCRIÇÕES ---');

            // Group by Kyorugi Classification
            const grouped = {};
            const unclassifiedAthletes = []; // Para armazenar atletas sem classificação

            data.forEach(reg => {
                const classification = findMatchingClassification(reg);
                
                if (classification) {
                    // Use classification ID as key
                    const catKey = `classification_${classification.id}`;
                    
                    if (!grouped[catKey]) {
                        grouped[catKey] = {
                            id: catKey,
                            classification_id: classification.id,
                            classification_code: classification.code,
                            classification_name: classification.name,
                            info: {
                                age: classification.age_category,
                                gender: classification.gender === 'M' ? 'Masculino' : 'Feminino',
                                belt: `Grupo ${classification.belt_group}`,
                                modality: reg.modalities?.name || '---',
                                weight: classification.weight_categories?.name || '---'
                            },
                            category_params: {
                                modality_id: reg.modality_id,
                                age_category_id: reg.age_category_id,
                                weight_category_id: reg.weight_category_id,
                                belt_category_id: reg.belt_category_id
                            },
                            athletes: [],
                            bracket: null
                        };
                    }
                    grouped[catKey].athletes.push(reg);
                } else {
                    // Atletas sem classificação correspondente são ignorados por enquanto
                    unclassifiedAthletes.push(reg);
                    console.log('Atleta sem classificação correspondente:', reg.full_name, 'Idade:', reg.age, 'Gênero:', reg.gender);
                }
            });

            // Load existing brackets
            const { data: existingBrackets } = await supabase
                .from('brackets')
                .select('*')
                .eq('championship_id', champId);

            if (existingBrackets) {
                existingBrackets.forEach(b => {
                    // Find matching group by classification_id or by category_params
                    Object.keys(grouped).forEach(key => {
                        const g = grouped[key];
                        
                        // If group has classification_id, match by that
                        if (g.classification_id && b.kyorugi_classification_id === g.classification_id) {
                            grouped[key].bracket = b.bracket_data;
                            grouped[key].db_id = b.id;
                        }
                        // Fallback: match by category params for non-classification groups
                        else if (!g.classification_id &&
                            g.category_params.modality_id === b.modality_id &&
                            g.category_params.age_category_id === b.age_category_id &&
                            g.category_params.weight_category_id === b.weight_category_id &&
                            g.category_params.belt_category_id === b.belt_category_id) {
                            grouped[key].bracket = b.bracket_data;
                            grouped[key].db_id = b.id;
                        }
                    });
                });
            }

            setCategories(grouped);
            
            console.log('--- DEBUG GROUPED CATEGORIES ---');
            console.log('Total grouped categories:', Object.keys(grouped).length);
            console.log('Grouped data:', grouped);
            console.log('Unclassified athletes:', unclassifiedAthletes.length);
            console.log('--- END DEBUG GROUPED ---');
        } catch (error) {
            console.error('Erro ao carregar inscrições:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryKey = (reg) => {
        return `${reg.modality_id || 'null'}-${reg.age_category_id || 'null'}-${reg.weight_category_id || 'null'}-${reg.belt_category_id || 'null'}`;
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

    const getBeltGroup = (beltLevel) => {
        if (beltLevel <= 3) return 1; // Grupo 1 - Iniciante (Branca, Cinza, Amarela)
        if (beltLevel <= 6) return 2; // Grupo 2 - Intermediário (Laranja, Verde, Roxa)
        if (beltLevel <= 9) return 3; // Grupo 3 - Avançado (Azul, Marrom, Vermelha)
        return 4; // Grupo 4 - Elite (Vermelha-Preta, Preta)
    };

    const findMatchingClassification = (registration) => {
        const ageGroup = getAgeGroup(registration.age);
        const beltGroup = getBeltGroup(registration.belt_level);
        
        console.log('--- DEBUG CLASSIFICATION MATCH ---');
        console.log('Atleta:', registration.full_name);
        console.log('Idade:', registration.age, '→ AgeGroup:', ageGroup);
        console.log('Gênero:', registration.gender, '→ Expected:', registration.gender);
        console.log('Nível Faixa:', registration.belt_level, '→ BeltGroup:', beltGroup);
        console.log('Peso Category ID:', registration.weight_category_id);
        console.log('Peso real:', registration.weight, 'kg');
        
        // Log todas as classificações disponíveis para comparação
        console.log('=== TODAS AS CLASSIFICAÇÕES DISPONÍVEIS ===');
        kyorugiClassifications.forEach((classification, index) => {
            console.log(`Classificação ${index}:`, {
                id: classification.id,
                name: classification.name,
                age_category: classification.age_category,
                gender: classification.gender,
                belt_group: classification.belt_group,
                weight_category_id: classification.weight_category_id
            });
        });
        
        // Lógica corrigida: priorizar weight_category_id da inscrição, mesmo que seja null
        let matchingClassification = null;
        
        console.log('=== DEBUG CLASSIFICATION MATCH INÍCIO ===');
        console.log('Atleta:', registration.full_name);
        console.log('Dados completos do atleta:', {
          full_name: registration.full_name,
          age: registration.age,
          gender: registration.gender,
          belt_level: registration.belt_level,
          weight: registration.weight,
          weight_category_id: registration.weight_category_id,
          age_category_id: registration.age_category_id,
          belt_category_id: registration.belt_category_id
        });
        
        // Tentar encontrar por weight_category_id da inscrição primeiro
        if (registration.weight_category_id) {
            console.log('=== TENTANDO ENCONTRAR POR WEIGHT_CATEGORY_ID ===');
            matchingClassification = kyorugiClassifications.find(classification => {
                console.log('Comparando com classificação (por ID da inscrição):', {
                    classification_age_category: classification.age_category,
                    expected_age_group: ageGroup,
                    classification_gender: classification.gender,
                    expected_gender: registration.gender,
                    classification_belt_group: classification.belt_group,
                    expected_belt_group: beltGroup,
                    classification_weight_category_id: classification.weight_category_id,
                    expected_weight_category_id: registration.weight_category_id
                });
                
                const match = classification.age_category === ageGroup &&
                              classification.gender === registration.gender &&
                              classification.belt_group === beltGroup &&
                              classification.weight_category_id === registration.weight_category_id;
                
                console.log('Match por ID:', match);
                return match;
            });
        }
        
        // Se não encontrar por ID, tentar encontrar pelo peso real
        if (!matchingClassification && registration.weight) {
            console.log('=== TENTANDO ENCONTRAR POR PESO REAL ===');
            matchingClassification = kyorugiClassifications.find(classification => {
                console.log('Comparando com classificação (por peso):', {
                    classification_age_category: classification.age_category,
                    expected_age_group: ageGroup,
                    classification_gender: classification.gender,
                    expected_gender: registration.gender,
                    classification_belt_group: classification.belt_group,
                    expected_belt_group: beltGroup,
                    classification_min_weight: classification.min_weight,
                    classification_max_weight: classification.max_weight,
                    athlete_weight: registration.weight
                });
                
                const match = classification.age_category === ageGroup &&
                              classification.gender === registration.gender &&
                              classification.belt_group === beltGroup &&
                              registration.weight >= classification.min_weight &&
                              registration.weight <= classification.max_weight;
                
                console.log('Match por peso:', match);
                return match;
            });
        }
        
        console.log('=== RESULTADO FINAL ===');
        console.log('Classificação encontrada:', matchingClassification ? matchingClassification.name : 'NENHUMA');
        
        return matchingClassification;
    };

    const getBeltName = (level) => {
        const belts = [
            'Branca', 'Branca Ponta Amarela', 'Amarela', 'Amarela Ponta Verde',
            'Verde', 'Verde Ponta Azul', 'Azul', 'Azul Ponta Vermelha',
            'Vermelha', 'Vermelha Ponta Preta', 'Preta'
        ];
        return belts[level] || '---';
    };

    const getCategoryInfo = (reg) => {
        return {
            gender: reg.gender === 'M' ? 'Masculino' : 'Feminino',
            age: getAgeGroup(reg.age),
            belt: getBeltName(reg.belt_level),
            modality: reg.modalities?.name || '---'
        };
    };

    const createSingleEliminationBracket = (athletes) => {
        const n = athletes.length;
        const powerOf2 = Math.pow(2, Math.ceil(Math.log2(n)));
        const totalSlots = powerOf2;

        // Initial seeds
        let seeds = Array.from({ length: totalSlots }, (_, i) => i < n ? athletes[i] : null);

        // Optimal seeding distribution (1 vs 8, 4 vs 5, etc)
        // For now, keeping it simple as they were already shuffled

        const rounds = [];
        let currentRoundAthletes = seeds;

        while (currentRoundAthletes.length >= 2) {
            const roundMatches = [];
            for (let i = 0; i < currentRoundAthletes.length; i += 2) {
                roundMatches.push({
                    id: Math.random().toString(36).substr(2, 9),
                    player1: currentRoundAthletes[i],
                    player2: currentRoundAthletes[i + 1],
                    winner: null
                });
            }
            rounds.push(roundMatches);
            // Next round has half the matches
            currentRoundAthletes = Array.from({ length: roundMatches.length }, () => null);
        }

        return rounds;
    };

    const generateBracket = (catKey) => {
        const athletes = [...categories[catKey].athletes];
        if (athletes.length < 2) {
            alert('São necessários pelo menos 2 atletas para gerar uma chave.');
            return;
        }

        // Shuffle
        for (let i = athletes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [athletes[i], athletes[j]] = [athletes[j], athletes[i]];
        }

        const bracketData = createSingleEliminationBracket(athletes);

        setCategories(prev => ({
            ...prev,
            [catKey]: {
                ...prev[catKey],
                bracket: bracketData
            }
        }));

        setActiveCategory(catKey);
        setShowBracketModal(true);
    };

    const saveBracket = async (catKey) => {
        setSaving(true);
        const cat = categories[catKey];
        try {
            const payload = {
                championship_id: selectedChampionship,
                kyorugi_classification_id: cat.classification_id || null,
                modality_id: cat.category_params.modality_id,
                age_category_id: cat.category_params.age_category_id,
                weight_category_id: cat.category_params.weight_category_id,
                belt_category_id: cat.category_params.belt_category_id,
                bracket_data: cat.bracket
            };

            if (cat.db_id) {
                const { error } = await supabase
                    .from('brackets')
                    .update(payload)
                    .eq('id', cat.db_id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('brackets')
                    .insert(payload)
                    .select();
                if (error) throw error;
                setCategories(prev => ({
                    ...prev,
                    [catKey]: { ...prev[catKey], db_id: data[0].id }
                }));
            }
            setMessage('Chave salva com sucesso!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Erro ao salvar chave:', error);
            alert('Erro ao salvar chave');
        } finally {
            setSaving(false);
        }
    };

    const viewBracket = (catKey) => {
        setActiveCategory(catKey);
        setShowBracketModal(true);
    };

    const BracketModal = () => {
        if (!activeCategory || !categories[activeCategory]) return null;
        const cat = categories[activeCategory];
        const rounds = cat.bracket;

        return (
            <div className="modal-overlay" onClick={() => setShowBracketModal(false)}>
                <div className="modal-content" style={{ maxWidth: '98vw', width: 'fit-content' }} onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h2 className="modal-title">
                                {cat.classification_code ? (
                                    <span>
                                        <span className="badge badge-primary" style={{ marginRight: 'var(--spacing-2)', fontSize: '12px', fontWeight: 'bold' }}>
                                            {cat.classification_code}
                                        </span>
                                        {cat.classification_name}
                                    </span>
                                ) : (
                                    'Chaveamento'
                                )}
                            </h2>
                            <p style={{ margin: 0 }}>
                                {cat.info.age} - {cat.info.gender} • {cat.classification_code ? cat.info.weight : `${cat.info.belt} • ${cat.info.modality}`}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                            <button
                                className="btn btn-success"
                                onClick={() => saveBracket(activeCategory)}
                                disabled={saving}
                            >
                                <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Chave'}
                            </button>
                            <button className="modal-close" onClick={() => setShowBracketModal(false)}>&times;</button>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', padding: 'var(--spacing-8)', minHeight: '60vh' }}>
                        <div style={{ display: 'flex', gap: 'var(--spacing-12)', alignItems: 'center' }}>
                            {rounds.map((round, rIndex) => (
                                <div key={rIndex} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', justifyContent: 'space-around' }}>
                                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 'var(--spacing-4)', color: 'var(--primary-600)' }}>
                                        {rIndex === rounds.length - 1 ? 'FINAL' :
                                            rIndex === rounds.length - 2 ? 'SEMIFINAL' :
                                                rIndex === rounds.length - 3 ? 'QUARTAS' : `RODADA ${rIndex + 1}`}
                                    </div>
                                    {round.map((match, mIndex) => (
                                        <div key={match.id} style={{ position: 'relative' }}>
                                            <div className="content-card card-compact" style={{
                                                width: '240px',
                                                padding: 'var(--spacing-3)',
                                                borderLeft: '4px solid var(--primary-500)',
                                                marginBottom: 'var(--spacing-2)'
                                            }}>
                                                <div style={{
                                                    padding: 'var(--spacing-2)',
                                                    borderBottom: '1px solid var(--border)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    background: match.player1 ? 'transparent' : 'var(--gray-50)',
                                                    borderRadius: 'var(--radius-sm)'
                                                }}>
                                                    <span style={{ fontWeight: match.player1 ? '500' : '400' }}>
                                                        {match.player1?.full_name || 'ISENTO (BYE)'}
                                                    </span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                        {match.player1?.organizations?.name.substring(0, 15)}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    padding: 'var(--spacing-2)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    background: match.player2 ? 'transparent' : 'var(--gray-50)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    marginTop: 'var(--spacing-1)'
                                                }}>
                                                    <span style={{ fontWeight: match.player2 ? '500' : '400' }}>
                                                        {match.player2?.full_name || 'ISENTO (BYE)'}
                                                    </span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                        {match.player2?.organizations?.name.substring(0, 15)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Connection lines */}
                                            {rIndex < rounds.length - 1 && (
                                                <>
                                                    <div style={{
                                                        position: 'absolute',
                                                        right: '-32px',
                                                        top: '50%',
                                                        width: '32px',
                                                        height: '2px',
                                                        background: 'var(--border)'
                                                    }} />
                                                    {mIndex % 2 === 0 ? (
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: '-32px',
                                                            top: '50%',
                                                            width: '2px',
                                                            height: 'calc(100% + var(--spacing-8))',
                                                            background: 'var(--border)'
                                                        }} />
                                                    ) : (
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: '-32px',
                                                            bottom: '50%',
                                                            width: '2px',
                                                            height: 'calc(100% + var(--spacing-8))',
                                                            background: 'var(--border)'
                                                        }} />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}

                            {/* Champion Box */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'gold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                                    fontSize: '24px'
                                }}>
                                    🏆
                                </div>
                                <div style={{ fontWeight: 'bold', color: 'var(--primary-600)' }}>CAMPEÃO</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            <div className="content-wrapper">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-8)' }}>
                    <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary">
                        <ChevronLeft size={18} /> Voltar
                    </button>
                    <div>
                        <h1 className="header-title">🌳 Chaveamento</h1>
                        <p className="header-subtitle">Gere os sorteios das lutas por categoria</p>
                    </div>
                </div>

                <div className="content-card card-compact" style={{ marginBottom: 'var(--spacing-8)' }}>
                    <label className="form-label">Selecione o Campeonato</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                        <select
                            className="select-modern"
                            value={selectedChampionship}
                            onChange={(e) => setSelectedChampionship(e.target.value)}
                            style={{ flex: 1 }}
                        >
                            {championships.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <button className="btn btn-outline">
                            <Download size={18} /> Exportar Todas
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-12)' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto', width: '40px', height: '40px' }} />
                        <p style={{ marginTop: 'var(--spacing-4)' }}>Carregando atletas e chaves...</p>
                    </div>
                ) : (
                    <div className="grid-responsive">
                        {Object.keys(categories).length === 0 ? (
                            <div className="content-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 'var(--spacing-20)' }}>
                                <Users size={48} style={{ color: 'var(--gray-300)', marginBottom: 'var(--spacing-4)' }} />
                                <h3>Nenhuma inscrição encontrada</h3>
                                <p>Ainda não há atletas inscritos neste campeonato.</p>
                            </div>
                        ) : Object.keys(categories).map(key => (
                            <div key={key} className="content-card hover-lift">
                                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            {categories[key].classification_code ? (
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
                                                        <span className="badge badge-primary" style={{ marginRight: 'var(--spacing-2)', fontSize: '11px', fontWeight: 'bold' }}>
                                                            {categories[key].classification_code}
                                                        </span>
                                                        {categories[key].classification_name}
                                                    </h3>
                                                    <p style={{ margin: 'var(--spacing-1) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                        {categories[key].info.age} - {categories[key].info.gender} • {categories[key].info.weight}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}>
                                                        {categories[key].info.age} - {categories[key].info.gender}
                                                    </h3>
                                                    <p style={{ margin: 'var(--spacing-1) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                        {categories[key].info.belt} • {categories[key].info.modality}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {categories[key].bracket && (
                                            <span className="badge badge-success" style={{ fontSize: '10px' }}>Chave Gerada</span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-6)' }}>
                                    <div className="badge badge-primary">
                                        <Users size={12} style={{ marginRight: '4px' }} /> {categories[key].athletes.length} Atletas
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-6)' }}>
                                    {categories[key].athletes.slice(0, 3).map(a => (
                                        <div key={a.id} style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-2)'
                                        }}>
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-500)' }} />
                                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {a.full_name}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                {a.organizations?.name.substring(0, 10)}...
                                            </span>
                                        </div>
                                    ))}
                                    {categories[key].athletes.length > 3 && (
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-1)', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                                            + {categories[key].athletes.length - 3} outros atletas
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                    {categories[key].bracket ? (
                                        <>
                                            <button
                                                onClick={() => viewBracket(key)}
                                                className="btn btn-outline"
                                                style={{ flex: 1 }}
                                            >
                                                <Eye size={16} /> Ver
                                            </button>
                                            <button
                                                onClick={() => generateBracket(key)}
                                                className="btn btn-ghost"
                                            >
                                                Refazer
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => generateBracket(key)}
                                            className="btn btn-primary btn-block"
                                        >
                                            <Trophy size={16} /> Gerar Sorteio
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showBracketModal && <BracketModal />}

                {message && (
                    <div className="toast success show" style={{ zIndex: 'calc(var(--z-modal) + 10)' }}>
                        <Award size={18} style={{ marginRight: '8px' }} />
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Brackets;