const BracketView = ({ cat }) => {
        const rounds = cat.bracket;
        if (!rounds || rounds.length === 0) return null;
        const numRounds = rounds.length;
        
        // Função para renderizar uma luta
        const renderMatch = (match, roundIndex, matchIndex, totalMatches) => {
            const position = { x: 0, y: 0 }; // Posição simplificada para layout horizontal
            const isFinal = roundIndex === numRounds - 1;
            
            return (
                <div key={match.id} style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: '100%',
                    height: '100%',
                    zIndex: 10,
                    background: '#fff',
                    border: '2px solid #111',
                    borderRadius: '4px'
                }}>
                    {/* Número da luta */}
                    <div style={{
                        position: 'absolute',
                        top: '-30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#000',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '4px 8px',
                        borderRadius: '3px',
                        minWidth: '35px',
                        textAlign: 'center',
                        zIndex: 20
                    }}>
                        {match.match_number}
                    </div>
                    
                    {/* Container dos jogadores */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        position: 'relative'
                    }}>
                        {/* Linha vertical central */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '0',
                            bottom: '0',
                            width: '2px',
                            background: '#111',
                            transform: 'translateX(-50%)',
                            zIndex: 1
                        }} />
                        
                        {/* Jogador 1 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: '2px solid #111',
                            minHeight: '40px',
                            background: '#fff',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontSize: '9px', 
                                    color: '#1782C8', 
                                    fontWeight: 800, 
                                    marginBottom: '2px'
                                }}>AZUL</div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 900, 
                                    textTransform: 'uppercase',
                                    lineHeight: '1.2'
                                }}>
                                    {match.player1?.full_name || '---'}
                                </div>
                                <div style={{ 
                                    fontSize: '8px', 
                                    color: '#666', 
                                    fontWeight: 700,
                                    marginTop: '2px'
                                }}>
                                    {match.player1?.organizations?.name || ''}
                                </div>
                            </div>
                        </div>

                        {/* Jogador 2 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            minHeight: '40px',
                            background: '#fff',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontSize: '9px', 
                                    color: '#E71546', 
                                    fontWeight: 800,
                                    marginBottom: '2px'
                                }}>VERMELHO</div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 900, 
                                    textTransform: 'uppercase',
                                    lineHeight: '1.2'
                                }}>
                                    {match.player2?.full_name || '---'}
                                </div>
                                <div style={{ 
                                    fontSize: '8px', 
                                    color: '#666', 
                                    fontWeight: 700,
                                    marginTop: '2px'
                                }}>
                                    {match.player2?.organizations?.name || ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };
        
        // Verificar se é exatamente 4 atletas (2 semifinais + 1 final)
        const isExactly4Athletes = rounds.length === 2 && rounds[0].length === 2 && rounds[1].length === 1;
        
        if (isExactly4Athletes) {
            // Layout horizontal linear para 4 atletas
            const MATCH_WIDTH = 220;
            const MATCH_HEIGHT = 90;
            const CONTAINER_WIDTH = 1200;
            const CONTAINER_HEIGHT = 400;
            
            return (
                <div style={{
                    position: 'relative',
                    width: `${CONTAINER_WIDTH}px`,
                    height: `${CONTAINER_HEIGHT}px`,
                    background: '#fff',
                    fontFamily: 'Arial, sans-serif',
                    margin: '20px auto',
                    padding: '40px',
                    minWidth: '800px'
                }}>
                    {/* Semifinal 1 - 25% da largura */}
                    <div style={{
                        position: 'absolute',
                        left: '0%',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '25%',
                        height: `${MATCH_HEIGHT}px`
                    }}>
                        {renderMatch(rounds[0][0], 0, 0, 2)}
                    </div>
                    
                    {/* Semifinal 2 - 25% da largura */}
                    <div style={{
                        position: 'absolute',
                        left: '25%',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '25%',
                        height: `${MATCH_HEIGHT}px`
                    }}>
                        {renderMatch(rounds[0][1], 0, 1, 2)}
                    </div>
                    
                    {/* Final - 50% da largura */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '25%',
                        height: `${MATCH_HEIGHT}px`
                    }}>
                        {renderMatch(rounds[1][0], 1, 0, 1)}
                    </div>
                    
                    {/* Conexões horizontais contínuas */}
                    {/* Da semifinal 1 para a final */}
                    <div style={{
                        position: 'absolute',
                        left: '25%',
                        top: '50%',
                        width: '25%',
                        height: '2px',
                        background: '#111',
                        transform: 'translateY(-50%)'
                    }} />
                    
                    {/* Da semifinal 2 para a final */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: '25%',
                        height: '2px',
                        background: '#111',
                        transform: 'translateY(-50%)'
                    }} />
                    
                    {/* Troféu abaixo da final */}
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: '60px',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Trophy size={50} color="#FBCB37" fill="#FBCB37" />
                        <div style={{ 
                            fontWeight: 900, 
                            fontSize: '14px', 
                            letterSpacing: '1px',
                            textTransform: 'uppercase' 
                        }}>Campeão</div>
                    </div>
                </div>
            );
        }
        
        // Layout original para outros casos
        const MATCH_WIDTH = 220;
        const MATCH_HEIGHT = 90;
        const COLUMN_SPACING = 80;
        const VERTICAL_SPACING = 40;
        
        // Função para calcular posição na árvore binária
        const calculateTreePosition = (roundIndex, matchIndex, totalMatches) => {
            const level = numRounds - 1 - roundIndex;
            const positionInLevel = matchIndex;
            
            // Calcular posição X baseada na coluna (nível)
            const x = level * (MATCH_WIDTH + COLUMN_SPACING);
            
            // Calcular posição Y baseada na posição na coluna
            // Distribuir verticalmente com espaçamento proporcional
            const availableHeight = (totalMatches - 1) * (MATCH_HEIGHT + VERTICAL_SPACING);
            const y = positionInLevel * (MATCH_HEIGHT + VERTICAL_SPACING);
            
            return { x, y, level, positionInLevel };
        };

        // Função para renderizar conexões contínuas
        const renderConnections = () => {
            const connections = [];
            
            rounds.forEach((round, roundIndex) => {
                if (roundIndex >= rounds.length - 1) return; // Última rodada não tem conexões para frente
                
                const nextRound = rounds[roundIndex + 1];
                round.forEach((match, matchIndex) => {
                    const nextMatchIndex = Math.floor(matchIndex / 2);
                    
                    if (nextRound && nextMatchIndex < nextRound.length) {
                        const currentPos = calculateTreePosition(roundIndex, matchIndex, round.length);
                        const nextPos = calculateTreePosition(roundIndex + 1, nextMatchIndex, nextRound.length);
                        
                        // Ponto de saída da luta atual (centro da direita)
                        const exitPoint = {
                            x: currentPos.x + MATCH_WIDTH,
                            y: currentPos.y + MATCH_HEIGHT / 2
                        };
                        
                        // Ponto de entrada da próxima luta (centro da esquerda)
                        const entryPoint = {
                            x: nextPos.x,
                            y: nextPos.y + MATCH_HEIGHT / 2
                        };
                        
                        // Linha horizontal saindo da luta atual
                        connections.push({
                            type: 'horizontal',
                            from: exitPoint,
                            to: { x: exitPoint.x + COLUMN_SPACING / 2, y: exitPoint.y }
                        });
                        
                        // Linha vertical até o nível da próxima luta
                        connections.push({
                            type: 'vertical',
                            from: { x: exitPoint.x + COLUMN_SPACING / 2, y: exitPoint.y },
                            to: { x: exitPoint.x + COLUMN_SPACING / 2, y: entryPoint.y }
                        });
                        
                        // Linha horizontal entrando na próxima luta
                        connections.push({
                            type: 'horizontal',
                            from: { x: exitPoint.x + COLUMN_SPACING / 2, y: entryPoint.y },
                            to: entryPoint
                        });
                    }
                });
            });
            
            return connections;
        };

        // Função para renderizar uma luta
        const renderMatchOriginal = (match, roundIndex, matchIndex, totalMatches) => {
            const position = calculateTreePosition(roundIndex, matchIndex, totalMatches);
            const isFinal = roundIndex === numRounds - 1;
            
            return (
                <div key={match.id} style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${MATCH_WIDTH}px`,
                    height: `${MATCH_HEIGHT}px`,
                    zIndex: 10,
                    background: '#fff',
                    border: '2px solid #111',
                    borderRadius: '4px'
                }}>
                    {/* Número da luta */}
                    <div style={{
                        position: 'absolute',
                        top: '-30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#000',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '4px 8px',
                        borderRadius: '3px',
                        minWidth: '35px',
                        textAlign: 'center',
                        zIndex: 20
                    }}>
                        {match.match_number}
                    </div>
                    
                    {/* Container dos jogadores */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        position: 'relative'
                    }}>
                        {/* Linha vertical central */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '0',
                            bottom: '0',
                            width: '2px',
                            background: '#111',
                            transform: 'translateX(-50%)',
                            zIndex: 1
                        }} />
                        
                        {/* Jogador 1 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: '2px solid #111',
                            minHeight: '40px',
                            background: '#fff',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontSize: '9px', 
                                    color: '#1782C8', 
                                    fontWeight: 800, 
                                    marginBottom: '2px'
                                }}>AZUL</div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 900, 
                                    textTransform: 'uppercase',
                                    lineHeight: '1.2'
                                }}>
                                    {match.player1?.full_name || '---'}
                                </div>
                                <div style={{ 
                                    fontSize: '8px', 
                                    color: '#666', 
                                    fontWeight: 700,
                                    marginTop: '2px'
                                }}>
                                    {match.player1?.organizations?.name || ''}
                                </div>
                            </div>
                        </div>

                        {/* Jogador 2 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            minHeight: '40px',
                            background: '#fff',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontSize: '9px', 
                                    color: '#E71546', 
                                    fontWeight: 800,
                                    marginBottom: '2px'
                                }}>VERMELHO</div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 900, 
                                    textTransform: 'uppercase',
                                    lineHeight: '1.2'
                                }}>
                                    {match.player2?.full_name || '---'}
                                </div>
                                <div style={{ 
                                    fontSize: '8px', 
                                    color: '#666', 
                                    fontWeight: 700,
                                    marginTop: '2px'
                                }}>
                                    {match.player2?.organizations?.name || ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        // Renderizar todas as lutas e conexões
        const allMatches = [];
        const allConnections = [];
        
        rounds.forEach((round, roundIndex) => {
            round.forEach((match, matchIndex) => {
                const position = calculateTreePosition(roundIndex, matchIndex, round.length);
                allMatches.push({ match, position, roundIndex, matchIndex });
            });
        });

        // Gerar conexões
        const connections = renderConnections();

        // Calcular dimensões do container
        const totalWidth = numRounds * (MATCH_WIDTH + COLUMN_SPACING) + 100;
        const maxMatchesInRound = Math.max(...rounds.map(r => r.length));
        const totalHeight = maxMatchesInRound * (MATCH_HEIGHT + VERTICAL_SPACING) + 200;
        
        return (
            <div style={{
                position: 'relative',
                width: `${totalWidth}px`,
                height: `${totalHeight}px`,
                background: '#fff',
                fontFamily: 'Arial, sans-serif',
                margin: '20px auto',
                padding: '40px',
                minWidth: '800px'
            }}>
                {/* Renderizar conexões primeiro (para ficar atrás dos nós) */}
                {connections.map((conn, index) => {
                    if (conn.type === 'horizontal') {
                        return (
                            <div key={`conn-h-${index}`} style={{
                                position: 'absolute',
                                left: `${Math.min(conn.from.x, conn.to.x)}px`,
                                top: `${conn.from.y}px`,
                                width: `${Math.abs(conn.to.x - conn.from.x)}px`,
                                height: '2px',
                                background: '#111',
                                zIndex: 1
                            }} />
                        );
                    } else {
                        return (
                            <div key={`conn-v-${index}`} style={{
                                position: 'absolute',
                                left: `${conn.from.x}px`,
                                top: `${Math.min(conn.from.y, conn.to.y)}px`,
                                width: '2px',
                                height: `${Math.abs(conn.to.y - conn.from.y)}px`,
                                background: '#111',
                                zIndex: 1
                            }} />
                        );
                    }
                })}
                
                {/* Renderizar todos os nós (lutas) */}
                {allMatches.map(({ match, position, roundIndex, matchIndex }) => 
                    renderMatchOriginal(match, roundIndex, matchIndex, rounds[roundIndex].length)
                )}
                
                {/* Renderizar troféu abaixo da final */}
                {rounds.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        left: `${(numRounds - 1) * (MATCH_WIDTH + COLUMN_SPACING) + MATCH_WIDTH/2 - 40}px`,
                        top: `${totalHeight - 120}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Trophy size={50} color="#FBCB37" fill="#FBCB37" />
                        <div style={{ 
                            fontWeight: 900, 
                            fontSize: '14px', 
                            letterSpacing: '1px',
                            textTransform: 'uppercase' 
                        }}>Campeão</div>
                    </div>
                )}
            </div>
        );
    };

export default BracketView;
