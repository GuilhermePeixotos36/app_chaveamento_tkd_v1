import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Trophy,
    Users,
    Award,
    ChevronLeft,
    Eye,
    Save,
    Printer,
    ArrowLeft,
    GitBranch,
    RefreshCw,
    X,
    Check,
    AlertCircle
} from 'lucide-react';

const Brackets = () => {
    const [championships, setChampionships] = useState([]);
    const [selectedChampionship, setSelectedChampionship] = useState('');
    const [categories, setCategories] = useState({});
    const [unclassifiedAthletes, setUnclassifiedAthletes] = useState([]);
    const [kyorugiClassifications, setKyorugiClassifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [showBracketModal, setShowBracketModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedChampionship) {
            loadRegistrations(selectedChampionship);
        }
    }, [selectedChampionship, kyorugiClassifications]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Load championships
            const { data: champs } = await supabase.from('championships').select('*').order('date', { ascending: false });
            setChampionships(champs || []);
            if (champs && champs.length > 0) setSelectedChampionship(champs[0].id);

            // Load classifications and weights separately
            const [classRes, weightRes] = await Promise.all([
                supabase.from('kyorugi_classifications').select('*'),
                supabase.from('weight_categories').select('*')
            ]);

            const wMap = {};
            if (weightRes.data) weightRes.data.forEach(w => wMap[w.id] = w.name);

            const enrichedClass = (classRes.data || []).map(c => ({
                ...c,
                weight_name: wMap[c.weight_category_id] || '---'
            }));

            setKyorugiClassifications(enrichedClass);
        } catch (e) {
            console.error('Base load error:', e);
            setErrorMsg('Erro ao inicializar sistema');
        } finally { setLoading(false); }
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

    const getBeltGroup = (level) => {
        if (level <= 1) return 1;
        if (level <= 4) return 2;
        if (level <= 7) return 3;
        if (level <= 9) return 4;
        return 5;
    };

    const findMatchingClassification = (reg) => {
        const ageGroup = getAgeGroup(reg.age);
        const beltGroup = getBeltGroup(reg.belt_level);

        let match = kyorugiClassifications.find(c =>
            c.age_category === ageGroup &&
            c.gender === reg.gender &&
            c.belt_group === beltGroup &&
            c.weight_category_id === reg.weight_category_id
        );

        if (!match && reg.weight) {
            match = kyorugiClassifications.find(c =>
                c.age_category === ageGroup &&
                c.gender === reg.gender &&
                c.belt_group === beltGroup &&
                parseFloat(reg.weight) >= parseFloat(c.min_weight) &&
                parseFloat(reg.weight) <= parseFloat(c.max_weight)
            );
        }
        return match;
    };

    const loadRegistrations = async (champId) => {
        setLoading(true);
        setErrorMsg('');
        try {
            // USING THE EXACT QUERY PATTERN THE USER CONFIRMED WORKED BEFORE
            const { data: regData, error: regErr } = await supabase
                .from('registrations')
                .select('*, organizations(name), modalities(name)')
                .eq('championship_id', champId);

            if (regErr) throw regErr;

            const grouped = {};
            const unmapped = [];

            if (regData) {
                regData.forEach(reg => {
                    const classification = findMatchingClassification(reg);
                    if (classification) {
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
                                    weight: classification.weight_name || '---',
                                    modality: reg.modalities?.name || '---'
                                },
                                athletes: [],
                                bracket: null,
                                category_params: {
                                    modality_id: reg.modality_id,
                                    age_category_id: reg.age_category_id,
                                    weight_category_id: reg.weight_category_id,
                                    belt_category_id: reg.belt_category_id
                                }
                            };
                        }
                        grouped[catKey].athletes.push(reg);
                    } else {
                        unmapped.push(reg);
                    }
                });
            }

            // Brackets load
            const { data: bData } = await supabase.from('brackets').select('*').eq('championship_id', champId);
            if (bData) {
                bData.forEach(b => {
                    const k = `classification_${b.kyorugi_classification_id}`;
                    if (grouped[k]) {
                        grouped[k].bracket = b.bracket_data;
                        grouped[k].db_id = b.id;
                    }
                });
            }

            setCategories(grouped);
            setUnclassifiedAthletes(unmapped);
        } catch (error) {
            console.error('Error loadRegistrations:', error);
            setErrorMsg('Erro: ' + (error.message || 'Falha ao carregar atletas'));
        } finally { setLoading(false); }
    };

    const createSingleEliminationBracket = (athletes) => {
        const n = athletes.length;
        if (n < 2) return null;
        const totalSlots = Math.pow(2, Math.ceil(Math.log2(n)));
        const shuffled = [...athletes].sort(() => Math.random() - 0.5);
        let seeds = Array.from({ length: totalSlots }, (_, i) => i < n ? shuffled[i] : null);
        let matchCounter = 101;
        const rounds = [];
        let currentLevel = seeds;
        while (currentLevel.length >= 2) {
            const matches = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                matches.push({ id: Math.random().toString(36).substr(2, 9), match_number: matchCounter++, player1: currentLevel[i], player2: currentLevel[i + 1], winner: null });
            }
            rounds.push(matches);
            currentLevel = Array.from({ length: matches.length }, () => null);
        }
        return rounds;
    };

    const generateBracket = (key) => {
        const bracket = createSingleEliminationBracket(categories[key].athletes);
        if (!bracket) { alert('Mínimo 2 atletas.'); return; }
        setCategories(prev => ({ ...prev, [key]: { ...prev[key], bracket } }));
        setActiveCategory(key);
        setShowBracketModal(true);
    };

    const generateAllBrackets = () => {
        let count = 0;
        const nextCats = { ...categories };
        Object.keys(nextCats).forEach(k => {
            if (nextCats[k].athletes.length >= 2 && !nextCats[k].bracket) {
                nextCats[k].bracket = createSingleEliminationBracket(nextCats[k].athletes);
                count++;
            }
        });
        setCategories(nextCats);
        if (count > 0) setMessage(`${count} chaves geradas!`);
    };

    const saveBracket = async (key) => {
        const cat = categories[key];
        setSaving(true);
        try {
            const payload = {
                championship_id: selectedChampionship,
                kyorugi_classification_id: cat.classification_id,
                modality_id: cat.category_params.modality_id,
                age_category_id: cat.category_params.age_category_id,
                weight_category_id: cat.category_params.weight_category_id,
                belt_category_id: cat.category_params.belt_category_id,
                bracket_data: cat.bracket
            };
            if (cat.db_id) {
                await supabase.from('brackets').update(payload).eq('id', cat.db_id);
            } else {
                const { data } = await supabase.from('brackets').insert(payload).select();
                setCategories(prev => ({ ...prev, [key]: { ...prev[key], db_id: data[0].id } }));
            }
            setMessage('Chave salva com sucesso!');
            setTimeout(() => setMessage(''), 3000);
        } catch (e) {
            console.error('Save error:', e);
            alert('Erro ao salvar no banco.');
        } finally { setSaving(false); }
    };

    const renderMatch = (match, roundIndex, matchIndex, totalMatches) => {
        const position = calculateTreePosition(roundIndex, matchIndex, totalMatches);
    setActiveCategory(key);
    setShowBracketModal(true);
};

const generateAllBrackets = () => {
    let count = 0;
    const nextCats = { ...categories };
    Object.keys(nextCats).forEach(k => {
        if (nextCats[k].athletes.length >= 2 && !nextCats[k].bracket) {
            nextCats[k].bracket = createSingleEliminationBracket(nextCats[k].athletes);
            count++;
        }
    });
    setCategories(nextCats);
    if (count > 0) setMessage(`${count} chaves geradas!`);
};

const saveBracket = async (key) => {
    const cat = categories[key];
    setSaving(true);
    try {
        const payload = {
            championship_id: selectedChampionship,
            kyorugi_classification_id: cat.classification_id,
            modality_id: cat.category_params.modality_id,
            age_category_id: cat.category_params.age_category_id,
            weight_category_id: cat.category_params.weight_category_id,
            belt_category_id: cat.category_params.belt_category_id,
            bracket_data: cat.bracket
        };
        if (cat.db_id) {
            await supabase.from('brackets').update(payload).eq('id', cat.db_id);
        } else {
            const { data } = await supabase.from('brackets').insert(payload).select();
            setCategories(prev => ({ ...prev, [key]: { ...prev[key], db_id: data[0].id } }));
        }
        setMessage('Chave salva com sucesso!');
        setTimeout(() => setMessage(''), 3000);
    } catch (e) {
        console.error('Save error:', e);
        alert('Erro ao salvar no banco.');
    } finally { setSaving(false); }
};

// Função para renderizar um nó (luta)
const renderMatch = (match, roundIndex, matchIndex, totalMatches) => {
    const position = calculateTreePosition(roundIndex, matchIndex, totalMatches);
    const isFinal = roundIndex === numRounds - 1;
        const isFinal = roundIndex === numRounds - 1;

        return (
            <div key={match.id} style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '200px',
                height: '80px',
                zIndex: 10
            }}>
                {/* Container dos jogadores */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    height: '100%'
                }}>
                    {/* Jogador 1 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: '2px solid #111',
                        background: '#fff',
                        minHeight: '35px'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ 
                                fontSize: '8px', 
                                color: '#1782C8', 
                                fontWeight: 800, 
                                marginRight: '6px' 
                            }}>AZUL</div>
                            <div style={{ 
                                fontSize: '11px', 
                                fontWeight: 950, 
                                textTransform: 'uppercase' 
                            }}>
                                {match.player1?.full_name || '---'}
                            </div>
                            <div style={{ 
                                fontSize: '8px', 
                                color: '#666', 
                                fontWeight: 800 
                            }}>
                                {match.player1?.organizations?.name || ''}
                            </div>
                        </div>
                    </div>

                    {/* Jogador 2 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        borderBottom: '2px solid #111',
                        background: '#fff',
                        minHeight: '35px'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ 
                                fontSize: '8px', 
                                color: '#E71546', 
                                fontWeight: 800, 
                                marginRight: '6px' 
                            }}>VERMELHO</div>
                            <div style={{ 
                                fontSize: '11px', 
                                fontWeight: 950, 
                                textTransform: 'uppercase' 
                            }}>
                                {match.player2?.full_name || '---'}
                            </div>
                            <div style={{ 
                                fontSize: '8px', 
                                color: '#666', 
                                fontWeight: 800 
                            }}>
                                {match.player2?.organizations?.name || ''}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Número da luta */}
                <div style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#000',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 950,
                    padding: '4px 8px',
                    borderRadius: '3px',
                    minWidth: '30px',
                    textAlign: 'center',
                    zIndex: 20
                }}>
                    {match.match_number}
                </div>
            </div>
        );
    };

    // Renderizar todas as lutas e conexões
    const allMatches = [];
    const allConnections = [];
        const [scale, setScale] = useState(1);
        const bracketRef = React.useRef(null);
        const containerRef = React.useRef(null);

        React.useLayoutEffect(() => {
            if (bracketRef.current && containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth - 60;
                const containerHeight = window.innerHeight - 380;
                const contentWidth = bracketRef.current.scrollWidth;
                const contentHeight = bracketRef.current.scrollHeight;
                let finalScale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight);
                setScale(finalScale < 1 ? Math.max(0.2, finalScale) : 1);
            }
        }, [cat]);

        return (
            <div className="modal-overlay" style={{ display: 'flex', padding: 0, alignItems: 'center', overflow: 'auto', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1000 }}>
                <div ref={containerRef} className="modal-content" style={{ width: '100%', maxWidth: '100vw', padding: '40px', borderRadius: '0', background: '#FFF', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #111', paddingBottom: '20px', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <img
                                    src="/logo.png"
                                    alt="Federação"
                                    style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div style={{
                                    display: 'none', width: '100px', height: '100px', background: 'linear-gradient(135deg, #1782C8 0%, #E71546 100%)',
                                    borderRadius: '10px', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 950, textAlign: 'center'
                                }}>FETEMG</div>

                                <div>
                                    <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 950, textTransform: 'uppercase' }}>{champ?.name}</h1>
                                    <p style={{ margin: 0, color: '#1782C8', fontWeight: 800 }}>FEDERAÇÃO DE TAEKWONDO DO ESTADO DE MINAS GERAIS</p>
                                </div>
                            </div>
                            <div className="no-print" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <button className="btn btn-primary" onClick={() => saveBracket(activeCategory)} disabled={saving}><Save size={20} /> SALVAR</button>
                                <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={20} /> IMPRIMIR</button>
                                <button className="btn btn-ghost" onClick={() => setShowBracketModal(false)}><X size={40} /></button>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, textTransform: 'uppercase' }}>{cat.classification_name}</h2>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', fontWeight: 800 }}>
                                <span>{cat.classification_code}</span>
                                <span>{cat.info.gender}</span>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '20px 0' }}>
                            <div ref={bracketRef} style={{
                                transform: `scale(${scale})`,
                                transformOrigin: 'top center',
                                transition: 'transform 0.2s'
                            }}>
                                <BracketView cat={cat} />
                            </div>
                        </div>

                        <div className="bracket-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', borderTop: '2px solid #EEE', paddingTop: '30px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                            <div style={{ fontSize: '12px', color: '#555', maxWidth: '700px', lineHeight: '1.6' }}>
                                <strong style={{ color: '#10151C' }}>LEGENDA TÉCNICA OFICIAL:</strong><br />
                                (PTF) Pontos, (PTG) Superioridade Técnica, (GDP) Ponto de Ouro, (SUP) Superioridade por Decisão,<br />
                                (WDR) Desistência, (DSQ) Desclassificação, (PUN) Punição, (RSC) Interrupção pelo Árbitro
                            </div>
                            <div style={{ width: '320px', border: '3px solid #10151C', padding: '15px' }}>
                                <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 950, textTransform: 'uppercase' }}>Vencedor da Categoria:</p>
                                <div style={{ height: '3px', background: '#DDD', margin: '10px 0' }} />
                                <div style={{ height: '3px', background: '#DDD', margin: '10px 0' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container" style={{ backgroundColor: '#F2EFEA' }}>
            <div className="content-wrapper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary" style={{ backgroundColor: '#FFF', width: '56px', height: '56px', padding: 0 }}><ArrowLeft size={24} /></button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <GitBranch size={32} color="var(--brand-blue)" />
                                <h1 className="header-title" style={{ margin: 0, fontSize: '2.4rem' }}>Chaveamento</h1>
                            </div>
                            <p className="header-subtitle">Gestão institucional de sorteios e chaves</p>
                        </div>
                    </div>
                </div>

                <div className="content-card" style={{ marginBottom: '40px', background: 'var(--brand-blue)', color: '#FFF', padding: '32px' }}>
                    <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Selecione o Campeonato</label>
                            <select className="select-modern" value={selectedChampionship} onChange={(e) => setSelectedChampionship(e.target.value)} style={{ background: '#FFF', color: '#10151C', border: 'none', fontWeight: 800, height: '52px' }}>
                                {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={generateAllBrackets} style={{ background: '#FFF', height: '52px', fontWeight: 800 }}><RefreshCw size={20} /> SORTEIO AUTOMÁTICO</button>
                    </div>
                </div>

                {loading ? (
                    <div className="content-card" style={{ textAlign: 'center', padding: '120px' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                        {errorMsg && (
                            <div style={{ backgroundColor: '#FEF2F2', border: '2px solid #FEE2E2', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <AlertCircle color="#B91C1C" size={32} />
                                <h4 style={{ margin: 0, color: '#991B1B', fontWeight: 950 }}>{errorMsg}</h4>
                            </div>
                        )}

                        {unclassifiedAthletes.length > 0 && (
                            <div style={{ backgroundColor: '#FFFBEB', border: '2px solid #FEF3C7', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'start', gap: '20px' }}>
                                <AlertCircle color="#D97706" size={28} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 6px 0', color: '#92400E', fontWeight: 950 }}>{unclassifiedAthletes.length} Atletas fora de classificação</h4>
                                    <p style={{ margin: 0, color: '#B45309', fontSize: '0.95rem', fontWeight: 700 }}>Estes atletas não possuem uma classificação técnica (peso/faixa/idade) correspondente cadastrada.</p>
                                </div>
                            </div>
                        )}

                        {Object.keys(categories).length === 0 && !loading && (
                            <div className="content-card" style={{ textAlign: 'center', padding: '100px', border: '2px dashed #DDD', background: 'transparent' }}>
                                <Users size={64} color="#DDD" style={{ marginBottom: '24px' }} />
                                <h3 style={{ color: '#AAA', fontWeight: 800 }}>Nenhuma inscrição encontrada neste campeonato.</h3>
                            </div>
                        )}

                        <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                            {Object.keys(categories).map(key => (
                                <div key={key} className="content-card shadow-sm" style={{ display: 'flex', flexDirection: 'column', border: '1px solid #E5E7EB', padding: '32px' }}>
                                    <div style={{ marginBottom: '28px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <span className="badge badge-primary" style={{ fontWeight: 950, fontSize: '0.9rem' }}>{categories[key].classification_code}</span>
                                            {categories[key].bracket && <span className="badge badge-success" style={{ fontWeight: 900 }}><Check size={14} /> CHAVE GERADA</span>}
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#10151C', margin: '0 0 8px 0' }}>{categories[key].classification_name}</h3>
                                        <div style={{ fontSize: '0.95rem', color: '#666', fontWeight: 800, display: 'flex', gap: '16px' }}>
                                            <span>{categories[key].info.gender}</span>
                                            <span>•</span>
                                            <span>{categories[key].info.weight}</span>
                                        </div>
                                    </div>

                                    <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '12px', marginBottom: '32px', flex: 1, border: '1px solid #F3F4F6' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                            <Users size={18} color="var(--brand-blue)" />
                                            <span style={{ fontWeight: 950, fontSize: '0.95rem' }}>{categories[key].athletes.length} ATLETAS INSCRITOS</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {categories[key].athletes.slice(0, 4).map(a => (
                                                <div key={a.id} style={{ fontSize: '0.9rem', color: '#4B5563', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 800 }}>• {a.full_name}</span>
                                                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 700 }}>{a.organizations?.name?.substring(0, 18)}</span>
                                                </div>
                                            ))}
                                            {categories[key].athletes.length > 4 && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--brand-blue)', fontWeight: 900, marginTop: '8px' }}>+ {categories[key].athletes.length - 4} outros atletas</div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {categories[key].bracket ? (
                                            <>
                                                <button onClick={() => { setActiveCategory(key); setShowBracketModal(true); }} className="btn btn-secondary" style={{ flex: 1, backgroundColor: '#FFF', fontWeight: 800 }}><Eye size={20} /> VER CHAVE</button>
                                                <button onClick={() => generateBracket(key)} className="btn btn-ghost" title="REFAZER SORTEIO"><RefreshCw size={20} /></button>
                                            </>
                                        ) : (
                                            <button onClick={() => generateBracket(key)} className="btn btn-primary btn-block" style={{ fontWeight: 900, height: '52px' }}><Trophy size={20} /> GERAR SORTEIO</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {showBracketModal && <BracketModal />}
                {message && <div className="toast success show" style={{ zIndex: 10000 }}><Check size={24} /> {message}</div>}
                <style>{`
                    @media print {
                        @page { 
                          size: landscape; 
                          margin: 5mm; 
                        }
                        
                        html, body {
                          background: #FFF !important;
                          margin: 0 !important;
                          padding: 0 !important;
                          height: auto !important;
                          overflow: visible !important;
                        }

                        /* Esconde o conteúdo principal do dashboard ao imprimir */
                        .app-container > .content-wrapper > *:not(.modal-overlay) {
                          display: none !important;
                        }

                        /* Remove o fundo e sombras da aplicação */
                        .app-container {
                          background: #FFF !important;
                          padding: 0 !important;
                          min-height: auto !important;
                        }

                        .no-print, .btn, .navbar, .sidebar, .toast { 
                          display: none !important; 
                        }

                        .modal-overlay { 
                          position: fixed !important;
                          top: 0 !important;
                          left: 0 !important;
                          width: 100% !important;
                          height: 100% !important;
                          background: #FFF !important; 
                          display: block !important; 
                          padding: 0 !important; 
                          margin: 0 !important;
                          z-index: 9999 !important;
                        }

                        .modal-content { 
                          box-shadow: none !important; 
                          border: none !important; 
                          padding: 30px !important; 
                          width: 100% !important;
                          height: 100vh !important;
                          display: flex !important;
                          flex-direction: column !important;
                          background: #FFF !important;
                          position: relative !important;
                        }

                        .bracket-footer {
                          margin-top: auto !important;
                          padding-top: 20px !important;
                          border-top: 2px solid #10151C !important;
                          width: 100% !important;
                          display: flex !important;
                        }

                        h1, h2 { margin-top: 0 !important; }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Brackets;