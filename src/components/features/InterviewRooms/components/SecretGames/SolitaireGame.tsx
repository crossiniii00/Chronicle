import React, { useState, useEffect } from 'react';

// Simplified Solitaire for lightweight fun
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Card = { suit: Suit; value: number; faceUp: boolean; id: string };

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export function SolitaireGame() {
    const [deck, setDeck] = useState<Card[]>([]);
    const [waste, setWaste] = useState<Card[]>([]);
    const [foundation, setFoundation] = useState<{ [key in Suit]: Card[] }>({
        hearts: [], diamonds: [], clubs: [], spades: []
    });
    const [tableau, setTableau] = useState<Card[][]>(Array(7).fill([]));
    
    // Drag state
    const [draggedCard, setDraggedCard] = useState<{ card: Card; source: string; colIndex?: number; cardIndex?: number } | null>(null);

    const initializeGame = () => {
        let newDeck: Card[] = [];
        SUITS.forEach(suit => {
            for (let i = 1; i <= 13; i++) {
                newDeck.push({ suit, value: i, faceUp: false, id: `${suit}-${i}` });
            }
        });
        
        // Shuffle
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }

        // Deal to tableau
        const newTableau: Card[][] = [[], [], [], [], [], [], []];
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = newDeck.pop()!;
                if (j === i) card.faceUp = true;
                newTableau[i].push(card);
            }
        }

        setDeck(newDeck);
        setWaste([]);
        setFoundation({ hearts: [], diamonds: [], clubs: [], spades: [] });
        setTableau(newTableau);
    };

    useEffect(() => {
        initializeGame();
    }, []);

    const drawCard = () => {
        if (deck.length > 0) {
            const card = deck[deck.length - 1];
            setDeck(deck.slice(0, -1));
            setWaste([...waste, { ...card, faceUp: true }]);
        } else if (waste.length > 0) {
            // reset waste to deck
            setDeck([...waste].reverse().map(c => ({ ...c, faceUp: false })));
            setWaste([]);
        }
    };

    const isBlack = (suit: Suit) => suit === 'clubs' || suit === 'spades';
    const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

    const canMoveToFoundation = (card: Card, targetFoundation: Card[]) => {
        if (targetFoundation.length === 0) return card.value === 1; // Ace
        const topCard = targetFoundation[targetFoundation.length - 1];
        return topCard.suit === card.suit && topCard.value + 1 === card.value;
    };

    const canMoveToTableau = (card: Card, targetColumn: Card[]) => {
        if (targetColumn.length === 0) return card.value === 13; // King
        const topCard = targetColumn[targetColumn.length - 1];
        if (!topCard.faceUp) return false;
        return (isBlack(topCard.suit) !== isBlack(card.suit)) && (topCard.value - 1 === card.value);
    };

    const handleDragStart = (e: React.DragEvent, card: Card, source: string, colIndex?: number, cardIndex?: number) => {
        setDraggedCard({ card, source, colIndex, cardIndex });
    };

    const handleDropOnFoundation = (suit: Suit) => {
        if (!draggedCard) return;
        
        // Cannot move multiple cards to foundation
        if (draggedCard.source === 'tableau' && draggedCard.cardIndex !== tableau[draggedCard.colIndex!].length - 1) {
            return;
        }

        if (canMoveToFoundation(draggedCard.card, foundation[suit])) {
            setFoundation(prev => ({
                ...prev,
                [suit]: [...prev[suit], draggedCard.card]
            }));
            removeCardFromSource();
        }
        setDraggedCard(null);
    };

    const handleDropOnTableau = (targetColIndex: number) => {
        if (!draggedCard) return;

        if (canMoveToTableau(draggedCard.card, tableau[targetColIndex])) {
            let cardsToMove: Card[] = [];
            
            if (draggedCard.source === 'waste') {
                cardsToMove = [draggedCard.card];
            } else if (draggedCard.source === 'tableau') {
                cardsToMove = tableau[draggedCard.colIndex!].slice(draggedCard.cardIndex!);
            }

            const newTableau = [...tableau];
            newTableau[targetColIndex] = [...newTableau[targetColIndex], ...cardsToMove];
            
            // Remove from source
            if (draggedCard.source === 'waste') {
                setWaste(waste.slice(0, -1));
            } else if (draggedCard.source === 'tableau') {
                const sourceCol = newTableau[draggedCard.colIndex!];
                newTableau[draggedCard.colIndex!] = sourceCol.slice(0, draggedCard.cardIndex!);
                // Flip top card if needed
                const newTopCard = newTableau[draggedCard.colIndex!][newTableau[draggedCard.colIndex!].length - 1];
                if (newTopCard && !newTopCard.faceUp) {
                    newTopCard.faceUp = true;
                }
            }
            
            setTableau(newTableau);
        }
        setDraggedCard(null);
    };

    const removeCardFromSource = () => {
        if (draggedCard?.source === 'waste') {
            setWaste(waste.slice(0, -1));
        } else if (draggedCard?.source === 'tableau') {
            const newTableau = [...tableau];
            const sourceCol = newTableau[draggedCard.colIndex!];
            newTableau[draggedCard.colIndex!] = sourceCol.slice(0, draggedCard.cardIndex!);
            // Flip top card if needed
            const newTopCard = newTableau[draggedCard.colIndex!][newTableau[draggedCard.colIndex!].length - 1];
            if (newTopCard && !newTopCard.faceUp) {
                newTopCard.faceUp = true;
            }
            setTableau(newTableau);
        }
    };

    const getSymbol = (suit: Suit) => {
        switch (suit) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
        }
    };

    const getValStr = (val: number) => {
        if (val === 1) return 'A';
        if (val === 11) return 'J';
        if (val === 12) return 'Q';
        if (val === 13) return 'K';
        return val.toString();
    };

    const renderCard = (card: Card, draggable = false, onDragStart?: (e: React.DragEvent) => void) => {
        if (!card.faceUp) {
            return (
                <div className="w-16 h-24 bg-blue-800 border-2 border-white rounded-md flex items-center justify-center shadow-md">
                    <div className="w-12 h-20 border border-blue-400 rounded-sm" />
                </div>
            );
        }

        const isRedCard = isRed(card.suit);
        return (
            <div 
                draggable={draggable}
                onDragStart={onDragStart}
                className="w-16 h-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-md flex flex-col p-1 cursor-grab active:cursor-grabbing select-none"
            >
                <div className={`text-sm font-bold ${isRedCard ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                    {getValStr(card.value)}
                </div>
                <div className={`text-2xl flex-1 flex items-center justify-center ${isRedCard ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                    {getSymbol(card.suit)}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl bg-emerald-50/50 border border-emerald-100 p-6 rounded-lg text-slate-900 dark:text-white relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-emerald-700">Solitaire</h3>
                <button onClick={initializeGame} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-sm font-bold shadow-sm transition-colors">
                    New Game
                </button>
            </div>

            {/* Top row (Deck, Waste, Foundation) */}
            <div className="flex justify-between mb-8">
                <div className="flex gap-4">
                    {/* Deck */}
                    <div onClick={drawCard} className="cursor-pointer">
                        {deck.length > 0 ? (
                            <div className="w-16 h-24 bg-blue-800 border-2 border-white rounded-md shadow-md" />
                        ) : (
                            <div className="w-16 h-24 border-2 border-emerald-300 border-dashed rounded-md flex items-center justify-center opacity-50">
                                ↺
                            </div>
                        )}
                    </div>
                    
                    {/* Waste */}
                    <div>
                        {waste.length > 0 ? (
                            renderCard(
                                waste[waste.length - 1], 
                                true, 
                                (e) => handleDragStart(e, waste[waste.length - 1], 'waste')
                            )
                        ) : (
                            <div className="w-16 h-24 border-2 border-emerald-300 border-dashed rounded-md opacity-50" />
                        )}
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Foundation */}
                    {SUITS.map(suit => (
                        <div 
                            key={suit}
                            className="w-16 h-24 border-2 border-emerald-300 rounded-md flex items-center justify-center text-3xl opacity-50 text-emerald-900"
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDropOnFoundation(suit)}
                        >
                            {foundation[suit].length > 0 ? (
                                <div className="absolute opacity-100">
                                    {renderCard(foundation[suit][foundation[suit].length - 1])}
                                </div>
                            ) : (
                                <span className={isRed(suit) ? 'text-red-500' : 'text-slate-900 dark:text-white'}>{getSymbol(suit)}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tableau */}
            <div className="flex justify-between gap-4 flex-1">
                {tableau.map((col, colIndex) => (
                    <div 
                        key={colIndex} 
                        className="flex-1 min-w-[64px] relative"
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => handleDropOnTableau(colIndex)}
                    >
                        {col.length === 0 ? (
                            <div className="w-16 h-24 border-2 border-emerald-300 border-dashed rounded-md opacity-50" />
                        ) : (
                            col.map((card, cardIndex) => (
                                <div 
                                    key={card.id} 
                                    className="absolute w-16"
                                    style={{ top: `${cardIndex * 24}px` }}
                                >
                                    {renderCard(
                                        card, 
                                        card.faceUp, 
                                        (e) => handleDragStart(e, card, 'tableau', colIndex, cardIndex)
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
// refresh
