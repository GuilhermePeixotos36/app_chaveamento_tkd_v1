import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Trophy,
    Users,
    Award,
    ChevronLeft,
    Share2,
    Download,
    Eye,
    Save,
    Printer,
    ArrowLeft,
    GitBranch,
    RefreshCw,
    Layout,
    FileSpreadsheet,
    Check,
    X
} from 'lucide-react';

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
    }, [selectedChampionship, kyorugiClassifications]);

    const loadChampionships = async () => {
        try {
            const { data, error } = await supabase.from('championships').select('*').order('date', { ascending: false });
            if (error) throw error;
            setChampionships(data || []);
            if (data && data.length > 0) setSelectedChampionship(data[0].id);
        } catch (error) { console.error('Erro:', error); }
    };

    const loadKyorugiClassifications = async () => {
        setLoading(true);
        try {
            const [classificationsData, weightCategoriesData] = await Promise.all([
                supabase.from('kyorugi_classifications').select('*').order('created_at', { ascending: false }),
                supabase.from('weight_categories').select('*').order('min_weight', { ascending: true })
            ]);
            if (classificationsData.error) throw classificationsData.error;
            setKyorugiClassifications(classificationsData.data || []);
        } catch (error) { setMessage('Erro ao carregar classificações'); } finally { setLoading(false); }
    };

    const loadRegistrations = async (champId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('registrations').select(`*, organizations (name), modalities (name)`).eq('championship_id', champId);
            if (error) throw error;

            const grouped = {};
            data.forEach(reg => {
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
                                modality: reg.modalities?.name || '---',
                                weight: classification.weight_categories?.name || '---'
                            },
                            category_params: { modality_id: reg.modality_id, age_category_id: reg.age_category_id, weight_category_id: reg.weight_category_id, belt_category_id: reg.belt_category_id },
                            athletes: [],
                            bracket: null
                        };
                    }
                    grouped[catKey].athletes.push(reg);
                }
            });

            const { data: existingBrackets } = await supabase.from('brackets').eq('championship_id', champId).select('*');
            if (existingBrackets) {
                existingBrackets.forEach(b => {
                    Object.keys(grouped).forEach(key => {
                        const g = grouped[key];
                        if (g.classification_id && b.kyorugi_classification_id === g.classification_id) {
                            grouped[key].bracket = b.bracket_data;
                            grouped[key].db_id = b.id;
                        }
                    });
                });
            }
            setCategories(grouped);
        } catch (error) { console.error('Erro:', error); } finally { setLoading(false); }
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

    const findMatchingClassification = (registration) => {
        const ageGroup = getAgeGroup(registration.age);
        const beltGroup = getBeltGroup(registration.belt_level);
        let matching = kyorugiClassifications.find(c => c.age_category === ageGroup && c.gender === registration.gender && c.belt_group === beltGroup && c.weight_category_id === registration.weight_category_id);
        if (!matching && registration.weight) {
            matching = kyorugiClassifications.find(c => c.age_category === ageGroup && c.gender === registration.gender && c.belt_group === beltGroup && registration.weight >= c.min_weight && registration.weight <= c.max_weight);
        }
        return matching;
    };

    const createSingleEliminationBracket = (athletes) => {
        const n = athletes.length;
        const totalSlots = Math.pow(2, Math.ceil(Math.log2(n)));
        let seeds = Array.from({ length: totalSlots }, (_, i) => i < n ? athletes[i] : null);
        let matchCounter = 101;
        const rounds = [];
        let currentRoundAthletes = seeds;
        while (currentRoundAthletes.length >= 2) {
            const roundMatches = [];
            for (let i = 0; i < currentRoundAthletes.length; i += 2) {
                roundMatches.push({ id: Math.random().toString(36).substr(2, 9), match_number: matchCounter++, player1: currentRoundAthletes[i], player2: currentRoundAthletes[i + 1], winner: null });
            }
            rounds.push(roundMatches);
            currentRoundAthletes = Array.from({ length: roundMatches.length }, () => null);
        }
        return rounds;
    };

    const generateBracket = (catKey) => {
        const athletes = [...categories[catKey].athletes];
        if (athletes.length < 2) { alert('Mínimo 2 atletas.'); return; }
        for (let i = athletes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[athletes[i], athletes[j]] = [athletes[j], athletes[i]]; }
        const bracketData = createSingleEliminationBracket(athletes);
        setCategories(prev => ({ ...prev, [catKey]: { ...prev[catKey], bracket: bracketData } }));
        setActiveCategory(catKey);
        setShowBracketModal(true);
    };

    const generateAllBrackets = () => {
        const hasAvailable = Object.keys(categories).some(key => categories[key].athletes.length >= 2 && !categories[key].bracket);
        if (!hasAvailable) { alert('Não há novas categorias para gerar.'); return; }
        setGeneratingAll(true);
        const newCats = { ...categories };
        Object.keys(newCats).forEach(key => {
            if (newCats[key].athletes.length >= 2 && !newCats[key].bracket) {
                const athletes = [...newCats[key].athletes];
                for (let i = athletes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[athletes[i], athletes[j]] = [athletes[j], athletes[i]]; }
                newCats[key].bracket = createSingleEliminationBracket(athletes);
            }
        });
        setCategories(newCats);
        setGeneratingAll(false);
    };

    const saveBracket = async (catKey) => {
        setSaving(true);
        const cat = categories[catKey];
        try {
            const payload = { championship_id: selectedChampionship, kyorugi_classification_id: cat.classification_id || null, modality_id: cat.category_params.modality_id, age_category_id: cat.category_params.age_category_id, weight_category_id: cat.category_params.weight_category_id, belt_category_id: cat.category_params.belt_category_id, bracket_data: cat.bracket };
            if (cat.db_id) { await supabase.from('brackets').update(payload).eq('id', cat.db_id); }
            else { const { data } = await supabase.from('brackets').insert(payload).select(); setCategories(prev => ({ ...prev, [catKey]: { ...prev[catKey], db_id: data[0].id } })); }
            setMessage('Chave salva com sucesso!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) { alert('Erro ao salvar chave'); } finally { setSaving(false); }
    };

    const BracketView = ({ cat }) => {
        const rounds = cat.bracket;
        if (!rounds || rounds.length === 0) return null;
        const numRounds = rounds.length;
        const finalMatch = rounds[numRounds - 1][0];
        const leftBranch = rounds.slice(0, numRounds - 1).map(round => round.slice(0, Math.ceil(round.length / 2)));
        const rightBranch = rounds.slice(0, numRounds - 1).map(round => round.slice(Math.ceil(round.length / 2)));

        const PlayerLine = ({ player, isBlue, isRight, fallbackText }) => (
            <div style={{ borderBottom: '1.5px solid #111', padding: '6px 0', width: '200px', position: 'relative', textAlign: isRight ? 'right' : 'left', color: isBlue ? '#1782C8' : '#E71546', fontSize: '12px', minHeight: '45px' }}>
                <div style={{ fontWeight: 800, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                    <span style={{ fontSize: '10px', marginRight: '5px', color: '#111', fontWeight: 600 }}>{isBlue ? 'BLUE' : 'RED'}</span>
                    {player?.full_name || fallbackText || (player === null ? 'BYE' : '---')}
                </div>
                <div style={{ fontSize: '10px', color: '#666', fontWeight: 600 }}>{player?.organizations?.name || ''}</div>
            </div>
        );

        const MatchBox = ({ match, rIndex, isRight }) => {
            const verticalSpace = Math.pow(2, rIndex) * 50;
            return (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: `${verticalSpace * 2}px`, position: 'relative', margin: isRight ? '0 0 0 30px' : '0 30px 0 0' }}>
                    <PlayerLine player={match.player1} isBlue={true} isRight={isRight} />
                    <div style={{ position: 'absolute', [isRight ? 'left' : 'right']: '-30px', top: '25%', bottom: '25%', width: '30px', border: '2px solid #333', [isRight ? 'borderRight' : 'borderLeft']: 'none' }}>
                        <div style={{ position: 'absolute', top: '50%', [isRight ? 'right' : 'left']: '-15px', transform: 'translateY(-50%)', background: '#333', color: '#FFF', fontSize: '11px', padding: '2px 6px', fontWeight: 800, borderRadius: '4px', zIndex: 10 }}>{match.match_number}</div>
                    </div>
                    <div style={{ height: `${verticalSpace - 45}px` }} />
                    <PlayerLine player={match.player2} isBlue={false} isRight={isRight} />
                </div>
            );
        };

        return (
            <div className="bracket-container" style={{ padding: '40px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {leftBranch.map((round, rIndex) => (
                        <div key={`left-${rIndex}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                            {round.map(match => <MatchBox key={match.id} match={match} rIndex={rIndex} isRight={false} />)}
                        </div>
                    ))}
                    <div style={{ textAlign: 'center', margin: '0 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontWeight: 900, fontSize: '24px', marginBottom: '20px', color: '#10151C', textTransform: 'uppercase', letterSpacing: '2px' }}>Final</div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '40px' }}>
                            <PlayerLine player={finalMatch.player1} isBlue={true} isRight={false} fallbackText={numRounds > 1 ? "Winner A" : ""} />
                            <div style={{ background: '#10151C', color: '#FFF', fontSize: '14px', padding: '8px 12px', fontWeight: 900, borderRadius: '6px' }}>{finalMatch.match_number}</div>
                            <PlayerLine player={finalMatch.player2} isBlue={false} isRight={true} fallbackText={numRounds > 1 ? "Winner B" : ""} />
                        </div>
                        <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <Trophy size={48} color="#FBCB37" fill="#FBCB37" />
                            <div style={{ fontWeight: 900, color: '#10151C', fontSize: '18px' }}>CHAMPION</div>
                        </div>
                    </div>
                    {[...rightBranch].reverse().map((round, rIndex) => {
                        const actualRIndex = rightBranch.length - 1 - rIndex;
                        return (
                            <div key={`right-${rIndex}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                                {round.map(match => <MatchBox key={match.id} match={match} rIndex={actualRIndex} isRight={true} />)}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const BracketModal = () => {
        if (!activeCategory || !categories[activeCategory]) return null;
        const cat = categories[activeCategory];
        const champ = championships.find(c => c.id === selectedChampionship);
        return (
            <div className="modal-overlay" onClick={() => setShowBracketModal(false)} style={{ display: 'flex', padding: '20px', alignItems: 'flex-start' }}>
                <div className="modal-content" style={{ maxWidth: '100%', width: 'auto', padding: '40px', borderRadius: '0' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #10151C', paddingBottom: '24px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <Trophy size={50} color="var(--brand-blue)" />
                            <div>
                                <h1 style={{ margin: 0, fontSize: '28px', color: '#10151C', textTransform: 'uppercase', fontWeight: 900 }}>{champ?.name}</h1>
                                <p style={{ margin: 0, color: 'var(--brand-blue)', fontWeight: 700 }}>FEFEDERAÇÃO DE TAEKWONDO DO ESTADO DE MINAS GERAIS</p>
                            </div>
                        </div>
                        <div className="no-print" style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary" onClick={() => saveBracket(activeCategory)} disabled={saving}><Save size={18} /> Salvar Chave</button>
                            <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={18} /> Imprimir</button>
                            <button className="btn btn-ghost" onClick={() => setShowBracketModal(false)}><X size={24} /></button>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', textTransform: 'uppercase' }}>{cat.classification_name || `${cat.info.age} ${cat.info.gender}`}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontWeight: 700, color: '#666' }}>
                            <span>{cat.info.belt}</span>
                            <span>{cat.info.weight}</span>
                            <span>TOTAL: {cat.athletes.length} ATLETAS</span>
                        </div>
                    </div>
                    <BracketView cat={cat} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '2px solid #EEE', paddingTop: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#444' }}>
                            <strong>LEGENDA:</strong> (PTF) Points, (PTG) Gap, (GDP) Golden Point, (SUP) Superiority, (WDR) Withdrawal, (DSQ) Disqualification
                        </div>
                        <div style={{ width: '250px', border: '1.5px solid #10151C', padding: '10px' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 800 }}>RESULTADO FINAL:</p>
                            <div style={{ height: '1.5px', background: '#DDD', margin: '8px 0' }} />
                            <div style={{ height: '1.5px', background: '#DDD', margin: '8px 0' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container" style={{ backgroundColor: '#F2EFEA' }}>
            <div className="content-wrapper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                        <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary" style={{ backgroundColor: '#FFF', width: '42px', height: '42px', padding: 0 }}><ArrowLeft size={18} /></button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <GitBranch size={24} color="var(--brand-blue)" />
                                <h1 className="header-title" style={{ margin: 0, fontSize: '1.8rem' }}>Chaveamento</h1>
                            </div>
                            <p className="header-subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>Geração automática de chaves e sorteios</p>
                        </div>
                    </div>
                </div>

                <div className="content-card" style={{ marginBottom: '24px', background: 'var(--brand-blue)', color: '#FFF' }}>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>CAMPEONATO ATIVO</label>
                            <select className="select-modern" value={selectedChampionship} onChange={(e) => setSelectedChampionship(e.target.value)} style={{ background: '#FFF', color: '#10151C', border: 'none' }}>
                                {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={generateAllBrackets} style={{ background: '#FFF', height: '42px' }}><RefreshCw size={18} /> Sorteio Automático (Tudo)</button>
                        <button className="btn btn-secondary" onClick={() => window.print()} style={{ background: '#FFF', height: '42px' }}><Printer size={18} /> Imprimir Lote</button>
                    </div>
                </div>

                {loading ? (
                    <div className="content-card" style={{ textAlign: 'center', padding: '64px' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                        {Object.keys(categories).length === 0 ? (
                            <div className="content-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px' }}>
                                <Users size={48} color="var(--gray-300)" style={{ marginBottom: '16px' }} />
                                <h3 style={{ color: 'var(--gray-600)' }}>Nenhuma categoria disponível para sorteio.</h3>
                            </div>
                        ) : Object.keys(categories).map(key => (
                            <div key={key} className="content-card" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <span className="badge badge-primary" style={{ fontSize: '10px', fontWeight: 800 }}>{categories[key].classification_code || 'KV'}</span>
                                        {categories[key].bracket && <span className="badge badge-success" style={{ fontSize: '10px' }}><Check size={10} /> SORTEADO</span>}
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', color: '#10151C', margin: '0 0 4px 0' }}>{categories[key].classification_name || categories[key].info.age}</h3>
                                    <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>{categories[key].info.gender} • {categories[key].info.belt} • {categories[key].info.weight}</p>
                                </div>
                                <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '8px', marginBottom: '20px', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#444' }}>
                                        <Users size={14} /> <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{categories[key].athletes.length} ATLETAS</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {categories[key].athletes.slice(0, 2).map(a => (
                                            <div key={a.id} style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>• {a.full_name}</div>
                                        ))}
                                        {categories[key].athletes.length > 2 && <div style={{ fontSize: '0.7rem', color: 'var(--brand-blue)', fontWeight: 600 }}>+ {categories[key].athletes.length - 2} atletas</div>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {categories[key].bracket ? (
                                        <>
                                            <button onClick={() => { setActiveCategory(key); setShowBracketModal(true); }} className="btn btn-secondary" style={{ flex: 1, backgroundColor: '#FFF' }}><Eye size={16} /> Ver Chave</button>
                                            <button onClick={() => generateBracket(key)} className="btn btn-ghost" title="Refazer Sorteio"><RefreshCw size={16} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => generateBracket(key)} className="btn btn-primary btn-block"><Trophy size={16} /> Sortear Categoria</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {showBracketModal && <BracketModal />}
                {message && <div className="toast success show" style={{ zIndex: 10000 }}><Check size={18} /> {message}</div>}
                <style>{`
                    @media print {
                        .no-print, .btn, .header-title, .header-subtitle, .app-container > .content-wrapper > *:not(.modal-overlay), .navbar, .sidebar { display: none !important; }
                        .modal-overlay { background: #FFF !important; display: block !important; position: static !important; }
                        .modal-content { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
                        .bracket-container { padding: 10px 0 !important; }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Brackets;