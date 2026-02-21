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
    const [showBracketModal, setShowBracketModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [saving, setSaving] = useState(false);

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
            const { data, error } = await supabase.from('kyorugi_classifications').select('*, weight_categories(name, id)').order('created_at', { ascending: false });
            if (error) throw error;
            setKyorugiClassifications(data || []);
        } catch (error) { setMessage('Erro ao carregar classificações'); } finally { setLoading(false); }
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

        // Match by IDs if available
        let matching = kyorugiClassifications.find(c =>
            c.age_category === ageGroup &&
            c.gender === reg.gender &&
            c.belt_group === beltGroup &&
            c.weight_category_id === reg.weight_category_id
        );

        // Fallback: match by weight range if no ID match (or ID is null)
        if (!matching && reg.weight) {
            matching = kyorugiClassifications.find(c =>
                c.age_category === ageGroup &&
                c.gender === reg.gender &&
                c.belt_group === beltGroup &&
                reg.weight >= c.min_weight &&
                reg.weight <= c.max_weight
            );
        }

        return matching;
    };

    const loadRegistrations = async (champId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('registrations').select(`*, organizations(name), modalities(name)`).eq('championship_id', champId);
            if (error) throw error;

            const grouped = {};
            const unmapped = [];

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
                                weight: classification.weight_categories?.name || '---',
                                modality: reg.modalities?.name || 'Kyorugi'
                            },
                            athletes: [],
                            bracket: null
                        };
                    }
                    grouped[catKey].athletes.push(reg);
                } else {
                    unmapped.push(reg);
                }
            });

            // Load existing brackets
            const { data: bData } = await supabase.from('brackets').eq('championship_id', champId).select('*');
            if (bData) {
                bData.forEach(b => {
                    Object.keys(grouped).forEach(key => {
                        if (grouped[key].classification_id === b.kyorugi_classification_id) {
                            grouped[key].bracket = b.bracket_data;
                            grouped[key].db_id = b.id;
                        }
                    });
                });
            }

            setCategories(grouped);
            setUnclassifiedAthletes(unmapped);
        } catch (error) { console.error('Erro:', error); } finally { setLoading(false); }
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
            const payload = { championship_id: selectedChampionship, kyorugi_classification_id: cat.classification_id, bracket_data: cat.bracket };
            if (cat.db_id) { await supabase.from('brackets').update(payload).eq('id', cat.db_id); }
            else { const { data } = await supabase.from('brackets').insert(payload).select(); setCategories(prev => ({ ...prev, [key]: { ...prev[key], db_id: data[0].id } })); }
            setMessage('Chave salva com sucesso!');
        } catch (e) { alert('Erro ao salvar.'); } finally { setSaving(false); }
    };

    const BracketView = ({ cat }) => {
        const rounds = cat.bracket;
        if (!rounds || rounds.length === 0) return null;
        const numRounds = rounds.length;
        const finalMatch = rounds[numRounds - 1][0];
        const leftBranch = rounds.slice(0, numRounds - 1).map(round => round.slice(0, Math.ceil(round.length / 2)));
        const rightBranch = rounds.slice(0, numRounds - 1).map(round => round.slice(Math.ceil(round.length / 2)));

        const PlayerLine = ({ player, isBlue, isRight }) => (
            <div style={{ borderBottom: '2px solid #111', padding: '6px 0', width: '200px', textAlign: isRight ? 'right' : 'left', color: isBlue ? '#1782C8' : '#E71546', minHeight: '48px' }}>
                <div style={{ fontWeight: 900, whiteSpace: 'nowrap', textTransform: 'uppercase', fontSize: '13px' }}>
                    <span style={{ fontSize: '10px', marginRight: '5px', color: '#111', fontWeight: 600 }}>{isBlue ? 'BLUE' : 'RED'}</span>
                    {player?.full_name || (player === null ? 'BYE' : '---')}
                </div>
                <div style={{ fontSize: '10px', color: '#666', fontWeight: 700 }}>{player?.organizations?.name || ''}</div>
            </div>
        );

        const MatchBox = ({ match, rIndex, isRight }) => {
            const verticalSpace = Math.pow(2, rIndex) * 52;
            return (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: `${verticalSpace * 2}px`, position: 'relative', margin: isRight ? '0 0 0 32px' : '0 32px 0 0' }}>
                    <PlayerLine player={match.player1} isBlue={true} isRight={isRight} />
                    <div style={{ position: 'absolute', [isRight ? 'left' : 'right']: '-32px', top: '25%', bottom: '25%', width: '32px', border: '3px solid #333', [isRight ? 'borderRight' : 'borderLeft']: 'none' }}>
                        <div style={{ position: 'absolute', top: '50%', [isRight ? 'right' : 'left']: '-16px', transform: 'translateY(-50%)', background: '#333', color: '#FFF', fontSize: '11px', padding: '3px 7px', fontWeight: 900, borderRadius: '4px', zIndex: 10 }}>{match.match_number}</div>
                    </div>
                    <div style={{ height: `${verticalSpace - 48}px` }} />
                    <PlayerLine player={match.player2} isBlue={false} isRight={isRight} />
                </div>
            );
        };

        return (
            <div className="bracket-container" style={{ padding: '60px 40px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {leftBranch.map((round, rIndex) => (
                        <div key={`l-${rIndex}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                            {round.map(m => <MatchBox key={m.id} match={m} rIndex={rIndex} isRight={false} />)}
                        </div>
                    ))}
                    <div style={{ textAlign: 'center', margin: '0 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontWeight: 900, fontSize: '28px', marginBottom: '32px', color: '#10151C', textTransform: 'uppercase', letterSpacing: '3px' }}>FINAL MATCH</div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '48px' }}>
                            <PlayerLine player={finalMatch.player1} isBlue={true} isRight={false} />
                            <div style={{ background: '#10151C', color: '#FFF', fontSize: '16px', padding: '10px 16px', fontWeight: 900, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>{finalMatch.match_number}</div>
                            <PlayerLine player={finalMatch.player2} isBlue={false} isRight={true} />
                        </div>
                        <div style={{ marginTop: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <Trophy size={64} color="#FBCB37" fill="#FBCB37" strokeWidth={1} />
                            <div style={{ fontWeight: 950, color: '#10151C', fontSize: '22px', letterSpacing: '1px' }}>CHAMPION</div>
                        </div>
                    </div>
                    {[...rightBranch].reverse().map((round, reqIndex) => {
                        const rIndex = rightBranch.length - 1 - reqIndex;
                        return (
                            <div key={`r-${reqIndex}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                                {round.map(m => <MatchBox key={m.id} match={m} rIndex={rIndex} isRight={true} />)}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const BracketModal = () => {
        const cat = categories[activeCategory];
        const champ = championships.find(c => c.id === selectedChampionship);
        return (
            <div className="modal-overlay" style={{ display: 'flex', padding: '20px', alignItems: 'flex-start' }}>
                <div className="modal-content" style={{ maxWidth: '100%', width: 'auto', padding: '60px', borderRadius: '0', background: '#FFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #10151C', paddingBottom: '32px', marginBottom: '48px' }}>
                        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                            <Trophy size={64} color="var(--brand-blue)" />
                            <div>
                                <h1 style={{ margin: 0, fontSize: '32px', color: '#10151C', textTransform: 'uppercase', fontWeight: 950, letterSpacing: '1px' }}>{champ?.name}</h1>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--brand-blue)', fontWeight: 800, fontSize: '1.2rem' }}>FEDERAÇÃO DE TAEKWONDO DO ESTADO DE MINAS GERAIS</p>
                            </div>
                        </div>
                        <div className="no-print" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <button className="btn btn-primary" onClick={() => saveBracket(activeCategory)} disabled={saving}><Save size={20} /> SALVAR</button>
                            <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={20} /> IMPRIMIR</button>
                            <button className="btn btn-ghost" onClick={() => setShowBracketModal(false)}><X size={32} /></button>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '2.4rem', fontWeight: 950, margin: '0 0 12px 0', textTransform: 'uppercase' }}>{cat.classification_name}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', fontWeight: 800, color: '#444', fontSize: '1.1rem' }}>
                            <span className="badge badge-primary" style={{ padding: '8px 16px', fontSize: '1rem' }}>{cat.classification_code}</span>
                            <span>{cat.info.gender}</span>
                            <span>{cat.info.weight}</span>
                            <span>TOTAL: {cat.athletes.length} ATLETAS</span>
                        </div>
                    </div>
                    <BracketView cat={cat} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '64px', borderTop: '2px solid #EEE', paddingTop: '32px' }}>
                        <div style={{ fontSize: '12px', color: '#555', maxWidth: '600px', lineHeight: '1.5' }}>
                            <strong>LEGENDA TÉCNICA:</strong><br />
                            (PTF) Pontos, (PTG) Superioridade Técnica, (GDP) Ponto de Ouro, (SUP) Superioridade por Decisão,<br />
                            (WDR) Desistência, (DSQ) Desclassificação, (PUN) Punição, (RSC) Interrupção pelo Árbitro
                        </div>
                        <div style={{ width: '300px', border: '2px solid #10151C', padding: '16px' }}>
                            <p style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase' }}>Vencedor da Categoria:</p>
                            <div style={{ height: '2px', background: '#DDD', margin: '12px 0' }} />
                            <div style={{ height: '2px', background: '#DDD', margin: '12px 0' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container" style={{ backgroundColor: '#F2EFEA' }}>
            <div className="content-wrapper">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary" style={{ backgroundColor: '#FFF', width: '48px', height: '48px', padding: 0 }}><ArrowLeft size={20} /></button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <GitBranch size={28} color="var(--brand-blue)" />
                                <h1 className="header-title" style={{ margin: 0 }}>Chaveamento</h1>
                            </div>
                            <p className="header-subtitle">Gestão de sorteios e chaves de competição</p>
                        </div>
                    </div>
                </div>

                <div className="content-card" style={{ marginBottom: '32px', background: 'var(--brand-blue)', color: '#FFF', padding: '24px' }}>
                    <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Campeonato Selecionado</label>
                            <select className="select-modern" value={selectedChampionship} onChange={(e) => setSelectedChampionship(e.target.value)} style={{ background: '#FFF', color: '#10151C', border: 'none', fontWeight: 700 }}>
                                {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={generateAllBrackets} style={{ background: '#FFF', height: '48px', fontWeight: 700 }}><RefreshCw size={18} /> SORTEIO AUTOMÁTICO</button>
                    </div>
                </div>

                {loading ? (
                    <div className="content-card" style={{ textAlign: 'center', padding: '80px' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* Summary of Unmapped Athletes */}
                        {unclassifiedAthletes.length > 0 && (
                            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <AlertCircle color="#B91C1C" size={24} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, color: '#991B1B', fontWeight: 800 }}>{unclassifiedAthletes.length} Atletas fora de classificação</h4>
                                    <p style={{ margin: 0, color: '#B91C1C', fontSize: '0.85rem' }}>Estes atletas não possuem uma classificação correspondente (idade/peso/faixa) definida.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
                            {Object.keys(categories).map(key => (
                                <div key={key} className="content-card" style={{ display: 'flex', flexDirection: 'column', border: '1px solid #EEE' }}>
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <span className="badge badge-primary" style={{ fontWeight: 900 }}>{categories[key].classification_code}</span>
                                            {categories[key].bracket && <span className="badge badge-success" style={{ fontWeight: 800 }}><Check size={12} /> CHAVE GERADA</span>}
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10151C', margin: '0 0 6px 0' }}>{categories[key].classification_name}</h3>
                                        <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 700, display: 'flex', gap: '12px' }}>
                                            <span>{categories[key].info.gender}</span>
                                            <span>•</span>
                                            <span>{categories[key].info.weight}</span>
                                        </div>
                                    </div>

                                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', marginBottom: '24px', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <Users size={16} color="var(--brand-blue)" />
                                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{categories[key].athletes.length} ATLETAS INSCRITOS</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {categories[key].athletes.slice(0, 3).map(a => (
                                                <div key={a.id} style={{ fontSize: '0.8rem', color: '#444', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 700 }}>• {a.full_name}</span>
                                                    <span style={{ color: '#888', fontSize: '0.7rem' }}>{a.organizations?.name?.substring(0, 15)}</span>
                                                </div>
                                            ))}
                                            {categories[key].athletes.length > 3 && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', fontWeight: 800, marginTop: '4px' }}>+ {categories[key].athletes.length - 3} outros atletas</div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {categories[key].bracket ? (
                                            <>
                                                <button onClick={() => { setActiveCategory(key); setShowBracketModal(true); }} className="btn btn-secondary" style={{ flex: 1, backgroundColor: '#FFF', fontWeight: 700 }}><Eye size={18} /> VER CHAVE</button>
                                                <button onClick={() => generateBracket(key)} className="btn btn-ghost" title="REFAZER SORTEIO"><RefreshCw size={18} /></button>
                                            </>
                                        ) : (
                                            <button onClick={() => generateBracket(key)} className="btn btn-primary btn-block" style={{ fontWeight: 800 }}><Trophy size={18} /> GERAR SORTEIO</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {showBracketModal && <BracketModal />}
                {message && <div className="toast success show" style={{ zIndex: 10000 }}><Check size={18} /> {message}</div>}

                <style>{`
                    @media print {
                        .no-print, .btn, .header-title, .header-subtitle, .app-container > .content-wrapper > *:not(.modal-overlay), .navbar, .sidebar, .toast { display: none !important; }
                        body, .app-container { background: #FFF !important; padding: 0 !important; margin: 0 !important; }
                        .modal-overlay { background: #FFF !important; display: block !important; position: static !important; padding: 0 !important; }
                        .modal-content { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
                        .bracket-container { padding: 40px 0 !important; }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Brackets;