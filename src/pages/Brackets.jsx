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
    const [weightCategories, setWeightCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [showBracketModal, setShowBracketModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadBaseData();
    }, []);

    useEffect(() => {
        if (selectedChampionship) {
            loadRegistrations(selectedChampionship);
        }
    }, [selectedChampionship, kyorugiClassifications]);

    const loadBaseData = async () => {
        setLoading(true);
        try {
            // Load championships
            const { data: champs, error: cErr } = await supabase.from('championships').select('*').order('date', { ascending: false });
            if (cErr) throw cErr;
            setChampionships(champs || []);
            if (champs && champs.length > 0) setSelectedChampionship(champs[0].id);

            // Load classifications and weight categories separately to avoid join errors
            const [classData, weightData] = await Promise.all([
                supabase.from('kyorugi_classifications').select('*').order('created_at', { ascending: false }),
                supabase.from('weight_categories').select('*').order('min_weight', { ascending: true })
            ]);

            if (classData.error) throw classData.error;
            if (weightData.error) throw weightData.error;

            setKyorugiClassifications(classData.data || []);
            setWeightCategories(weightData.data || []);
        } catch (error) {
            console.error('Error loading base data:', error);
            setErrorMsg('Erro ao carregar dados básicos');
        } finally {
            setLoading(false);
        }
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

        // 1. Precise Match by classification params
        let matching = kyorugiClassifications.find(c =>
            c.age_category === ageGroup &&
            c.gender === reg.gender &&
            c.belt_group === beltGroup &&
            c.weight_category_id === reg.weight_category_id
        );

        // 2. Fallback by weight range if ID match fails
        if (!matching && reg.weight) {
            matching = kyorugiClassifications.find(c =>
                c.age_category === ageGroup &&
                c.gender === reg.gender &&
                c.belt_group === beltGroup &&
                parseFloat(reg.weight) >= parseFloat(c.min_weight) &&
                parseFloat(reg.weight) <= parseFloat(c.max_weight)
            );
        }

        return matching;
    };

    const loadRegistrations = async (champId) => {
        setLoading(true);
        setErrorMsg('');
        try {
            // Fetch registrations and organizations separately to avoid join errors
            const [regRes, orgRes] = await Promise.all([
                supabase.from('registrations').select('*').eq('championship_id', champId),
                supabase.from('organizations').select('id, name')
            ]);

            if (regRes.error) throw regRes.error;
            if (orgRes.error) throw orgRes.error;

            const orgMap = {};
            orgRes.data.forEach(o => orgMap[o.id] = o);

            const regData = regRes.data.map(r => ({
                ...r,
                organizations: orgMap[r.organization_id] || { name: '---' }
            }));

            const grouped = {};
            const unmapped = [];

            regData.forEach(reg => {
                const classification = findMatchingClassification(reg);
                if (classification) {
                    const catKey = `classification_${classification.id}`;
                    if (!grouped[catKey]) {
                        const wc = weightCategories.find(w => w.id === classification.weight_category_id);
                        grouped[catKey] = {
                            id: catKey,
                            classification_id: classification.id,
                            classification_code: classification.code,
                            classification_name: classification.name,
                            info: {
                                age: classification.age_category,
                                gender: classification.gender === 'M' ? 'Masculino' : 'Feminino',
                                belt: `Grupo ${classification.belt_group}`,
                                weight: wc ? wc.name : '---'
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

            // Load existing brackets for this championship
            const { data: bracketData, error: bErr } = await supabase
                .from('brackets')
                .eq('championship_id', champId)
                .select('*');

            if (bErr) console.error('Error fetching brackets:', bErr);

            if (bracketData) {
                bracketData.forEach(b => {
                    const key = `classification_${b.kyorugi_classification_id}`;
                    if (grouped[key]) {
                        grouped[key].bracket = b.bracket_data;
                        grouped[key].db_id = b.id;
                    }
                });
            }

            setCategories(grouped);
            setUnclassifiedAthletes(unmapped);
        } catch (error) {
            console.error('Error loading registrations:', error);
            setErrorMsg('Erro: ' + (error.message || 'Falha ao carregar atletas'));
        } finally {
            setLoading(false);
        }
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
            console.error('Error saving bracket:', e);
            alert('Erro ao salvar no banco de dados.');
        } finally {
            setSaving(false);
        }
    };

    const BracketView = ({ cat }) => {
        const rounds = cat.bracket;
        if (!rounds || rounds.length === 0) return null;
        const numRounds = rounds.length;
        const finalMatch = rounds[numRounds - 1][0];
        const leftBranch = rounds.slice(0, numRounds - 1).map(round => round.slice(0, Math.ceil(round.length / 2)));
        const rightBranch = rounds.slice(0, numRounds - 1).map(round => round.slice(Math.ceil(round.length / 2)));

        const PlayerLine = ({ player, isBlue, isRight }) => (
            <div style={{ borderBottom: '2.5px solid #111', padding: '6px 0', width: '200px', textAlign: isRight ? 'right' : 'left', color: isBlue ? '#1782C8' : '#E71546', minHeight: '50px' }}>
                <div style={{ fontWeight: 900, whiteSpace: 'nowrap', textTransform: 'uppercase', fontSize: '13px' }}>
                    <span style={{ fontSize: '10px', marginRight: '5px', color: '#111', fontWeight: 700 }}>{isBlue ? 'BLUE' : 'RED'}</span>
                    {player?.full_name || (player === null ? 'BYE' : '---')}
                </div>
                <div style={{ fontSize: '10px', color: '#666', fontWeight: 800 }}>{player?.organizations?.name || ''}</div>
            </div>
        );

        const MatchBox = ({ match, rIndex, isRight }) => {
            const verticalSpace = Math.pow(2, rIndex) * 55;
            return (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: `${verticalSpace * 2}px`, position: 'relative', margin: isRight ? '0 0 0 35px' : '0 35px 0 0' }}>
                    <PlayerLine player={match.player1} isBlue={true} isRight={isRight} />
                    <div style={{ position: 'absolute', [isRight ? 'left' : 'right']: '-35px', top: '25%', bottom: '25%', width: '35px', border: '3.5px solid #222', [isRight ? 'borderRight' : 'borderLeft']: 'none' }}>
                        <div style={{ position: 'absolute', top: '50%', [isRight ? 'right' : 'left']: '-18px', transform: 'translateY(-50%)', background: '#222', color: '#FFF', fontSize: '11px', padding: '4px 8px', fontWeight: 900, borderRadius: '4px', zIndex: 10 }}>{match.match_number}</div>
                    </div>
                    <div style={{ height: `${verticalSpace - 50}px` }} />
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
                        <div style={{ fontWeight: 950, fontSize: '32px', marginBottom: '40px', color: '#10151C', textTransform: 'uppercase', letterSpacing: '4px' }}>GRAND FINAL</div>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '60px' }}>
                            <PlayerLine player={finalMatch.player1} isBlue={true} isRight={false} />
                            <div style={{ background: '#10151C', color: '#FFF', fontSize: '20px', padding: '12px 20px', fontWeight: 950, borderRadius: '8px', boxShadow: '0 6px 15px rgba(0,0,0,0.3)' }}>{finalMatch.match_number}</div>
                            <PlayerLine player={finalMatch.player2} isBlue={false} isRight={true} />
                        </div>
                        <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                            <Trophy size={80} color="#FBCB37" fill="#FBCB37" strokeWidth={1} />
                            <div style={{ fontWeight: 950, color: '#10151C', fontSize: '24px', letterSpacing: '2px' }}>CHAMPION</div>
                        </div>
                    </div>
                    {[...rightBranch].reverse().map((reqIndex) => {
                        const rIndex = rightBranch.length - 1 - reqIndex;
                        return (
                            <div key={`r-${reqIndex}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                                {rightBranch[rIndex].map(m => <MatchBox key={m.id} match={m} rIndex={rIndex} isRight={true} />)}
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
            <div className="modal-overlay" style={{ display: 'flex', padding: '20px', alignItems: 'flex-start', overflowY: 'auto' }}>
                <div className="modal-content" style={{ maxWidth: '100%', width: 'auto', padding: '60px', borderRadius: '0', background: '#FFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '5px solid #10151C', paddingBottom: '32px', marginBottom: '48px' }}>
                        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                            <Trophy size={72} color="var(--brand-blue)" />
                            <div>
                                <h1 style={{ margin: 0, fontSize: '36px', color: '#10151C', textTransform: 'uppercase', fontWeight: 950, letterSpacing: '2px' }}>{champ?.name}</h1>
                                <p style={{ margin: '8px 0 0 0', color: 'var(--brand-blue)', fontWeight: 900, fontSize: '1.4rem' }}>FEDERAÇÃO DE TAEKWONDO DO ESTADO DE MINAS GERAIS</p>
                            </div>
                        </div>
                        <div className="no-print" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <button className="btn btn-primary" onClick={() => saveBracket(activeCategory)} disabled={saving}><Save size={24} /> SALVAR</button>
                            <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={24} /> IMPRIMIR</button>
                            <button className="btn btn-ghost" onClick={() => setShowBracketModal(false)}><X size={40} /></button>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '3rem', fontWeight: 950, margin: '0 0 16px 0', textTransform: 'uppercase', color: '#10151C' }}>{cat.classification_name}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', fontWeight: 800, color: '#333', fontSize: '1.2rem' }}>
                            <span className="badge badge-primary" style={{ padding: '10px 24px', fontSize: '1.1rem', borderRadius: '6px' }}>{cat.classification_code}</span>
                            <span style={{ textTransform: 'uppercase' }}>{cat.info.gender}</span>
                            <span>•</span>
                            <span style={{ textTransform: 'uppercase' }}>{cat.info.weight}</span>
                            <span>•</span>
                            <span style={{ color: 'var(--brand-blue)' }}>{cat.athletes.length} ATLETAS</span>
                        </div>
                    </div>
                    <BracketView cat={cat} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', borderTop: '2px solid #EEE', paddingTop: '40px' }}>
                        <div style={{ fontSize: '13px', color: '#444', maxWidth: '700px', lineHeight: '1.8' }}>
                            <strong style={{ color: '#10151C' }}>LEGENDA TÉCNICA OFICIAL:</strong><br />
                            (PTF) Vitória por Pontos, (PTG) Vitória por Superioridade Técnica (12 pontos de diferença),<br />
                            (GDP) Golden Point (Ponto de Ouro), (SUP) Superioridade por Decisão dos Árbitros,<br />
                            (WDR) Desistência (Withdrawal), (DSQ) Desclassificação, (PUN) Punição Acumulada,<br />
                            (RSC) Interrupção pelo Árbitro (Referee Stop Contest)
                        </div>
                        <div style={{ width: '350px', border: '3px solid #10151C', padding: '24px', background: '#F9F9F9' }}>
                            <p style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 950, textTransform: 'uppercase', color: '#10151C' }}>VENCEDOR DA CATEGORIA:</p>
                            <div style={{ height: '3px', background: '#BBB', margin: '15px 0' }} />
                            <div style={{ height: '3px', background: '#BBB', margin: '15px 0' }} />
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
                        <button onClick={() => window.location.href = '/dashboard'} className="btn btn-secondary" style={{ backgroundColor: '#FFF', width: '56px', height: '56px', padding: 0, boxShadow: 'var(--shadow-sm)' }}><ArrowLeft size={24} /></button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <GitBranch size={32} color="var(--brand-blue)" />
                                <h1 className="header-title" style={{ margin: 0, fontSize: '2.4rem' }}>Chaveamento</h1>
                            </div>
                            <p className="header-subtitle" style={{ fontSize: '1.1rem' }}>Sorteio oficial e geração de chaves competitivas</p>
                        </div>
                    </div>
                </div>

                <div className="content-card" style={{ marginBottom: '40px', background: 'var(--brand-blue)', color: '#FFF', padding: '32px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '12px', display: 'block', letterSpacing: '1px' }}>Selecione o Campeonato</label>
                            <select className="select-modern" value={selectedChampionship} onChange={(e) => setSelectedChampionship(e.target.value)} style={{ background: '#FFF', color: '#10151C', border: 'none', fontWeight: 800, height: '52px', fontSize: '1.1rem' }}>
                                {championships.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={generateAllBrackets} style={{ background: '#FFF', height: '52px', fontWeight: 800, padding: '0 24px', fontSize: '0.9rem' }}><RefreshCw size={20} /> SORTEIO AUTOMÁTICO GERAL</button>
                    </div>
                </div>

                {loading ? (
                    <div className="content-card" style={{ textAlign: 'center', padding: '120px' }}><div className="loading-spinner" style={{ width: '60px', height: '60px', borderSize: '4px', margin: '0 auto' }} /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                        {errorMsg && (
                            <div style={{ backgroundColor: '#FEF2F2', border: '2px solid #FEE2E2', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <AlertCircle color="#B91C1C" size={32} />
                                <h4 style={{ margin: 0, color: '#991B1B', fontWeight: 900, fontSize: '1.2rem' }}>{errorMsg}</h4>
                            </div>
                        )}

                        {/* Unmapped Athletes Section */}
                        {unclassifiedAthletes.length > 0 && (
                            <div style={{ backgroundColor: '#FFFBEB', border: '2px solid #FEF3C7', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'start', gap: '20px' }}>
                                <AlertCircle color="#D97706" size={28} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 6px 0', color: '#92400E', fontWeight: 900, fontSize: '1.1rem' }}>{unclassifiedAthletes.length} Atletas Fora de Classificação</h4>
                                    <p style={{ margin: 0, color: '#B45309', fontSize: '0.95rem', fontWeight: 600 }}>Estes atletas estão inscritos mas os dados (peso/faixa/idade) não coincidem com nenhuma categoria técnica oficial cadastrada.</p>
                                </div>
                            </div>
                        )}

                        {Object.keys(categories).length === 0 && !loading && (
                            <div className="content-card" style={{ textAlign: 'center', padding: '100px', border: '3px dashed #EEE', background: 'transparent' }}>
                                <Users size={80} color="#DDD" style={{ marginBottom: '24px' }} />
                                <h3 style={{ color: '#AAA', fontSize: '1.5rem', fontWeight: 700 }}>Nenhuma inscrição encontrada para este campeonato.</h3>
                            </div>
                        )}

                        <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                            {Object.keys(categories).map(key => (
                                <div key={key} className="content-card shadow-sm hover-lift" style={{ display: 'flex', flexDirection: 'column', border: '1px solid #E5E7EB', padding: '32px' }}>
                                    <div style={{ marginBottom: '28px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <span className="badge badge-primary" style={{ fontWeight: 950, fontSize: '0.9rem', padding: '6px 14px' }}>{categories[key].classification_code}</span>
                                            {categories[key].bracket && <span className="badge badge-success" style={{ fontWeight: 900, fontSize: '0.8rem' }}><Check size={14} /> CHAVE SORTEADA</span>}
                                        </div>
                                        <h3 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#10151C', margin: '0 0 8px 0', lineHeight: '1.2' }}>{categories[key].classification_name}</h3>
                                        <div style={{ fontSize: '1rem', color: '#666', fontWeight: 800, display: 'flex', gap: '16px', textTransform: 'uppercase' }}>
                                            <span>{categories[key].info.gender}</span>
                                            <span>•</span>
                                            <span>{categories[key].info.weight}</span>
                                        </div>
                                    </div>

                                    <div style={{ background: '#F9FAFB', padding: '20px', borderRadius: '12px', marginBottom: '32px', flex: 1, border: '1px solid #F3F4F6' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                            <Users size={20} color="var(--brand-blue)" strokeWidth={2.5} />
                                            <span style={{ fontWeight: 900, fontSize: '1rem', color: '#10151C' }}>{categories[key].athletes.length} ATLETAS CONFIRMADOS</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {categories[key].athletes.slice(0, 4).map(a => (
                                                <div key={a.id} style={{ fontSize: '0.9rem', color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 800 }}>• {a.full_name}</span>
                                                    <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 700 }}>{a.organizations?.name?.substring(0, 20)}</span>
                                                </div>
                                            ))}
                                            {categories[key].athletes.length > 4 && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--brand-blue)', fontWeight: 900, marginTop: '8px', textAlign: 'center', background: 'var(--primary-50)', padding: '4px', borderRadius: '4px' }}>+ {categories[key].athletes.length - 4} outros competidores</div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        {categories[key].bracket ? (
                                            <>
                                                <button onClick={() => { setActiveCategory(key); setShowBracketModal(true); }} className="btn btn-secondary shadow-sm" style={{ flex: 1, backgroundColor: '#FFF', fontWeight: 800, border: '1px solid #D1D5DB' }}><Eye size={20} /> VISUALIZAR CHAVE</button>
                                                <button onClick={() => generateBracket(key)} className="btn btn-ghost" title="REFAZER SORTEIO" style={{ width: '50px' }}><RefreshCw size={20} /></button>
                                            </>
                                        ) : (
                                            <button onClick={() => generateBracket(key)} className="btn btn-primary btn-block shadow-md" style={{ fontWeight: 900, height: '52px', fontSize: '1rem' }}><Trophy size={20} /> REALIZAR SORTEIO</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {showBracketModal && <BracketModal />}
                {message && <div className="toast success show" style={{ zIndex: 10000, padding: '20px 32px' }}><Check size={24} /> <span style={{ fontWeight: 800 }}>{message}</span></div>}

                <style>{`
                    @media print {
                        .no-print, .btn, .header-title, .header-subtitle, .app-container > .content-wrapper > *:not(.modal-overlay), .navbar, .sidebar, .toast { display: none !important; }
                        body, .app-container { background: #FFF !important; padding: 0 !important; margin: 0 !important; }
                        .modal-overlay { background: #FFF !important; display: block !important; position: static !important; padding: 0 !important; overflow: visible !important; }
                        .modal-content { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; }
                        .bracket-container { padding: 40px 0 !important; width: 100% !important; }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Brackets;