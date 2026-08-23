import React, { useState, useEffect } from 'react';
import { drawRandomHand, getComboType } from '../utils/poker';
import { RangeTree, RangeAction, TrainerSession, TrainerLog } from '../types';
import { Brain, Award, Flame, RotateCcw, ThumbsUp, ThumbsDown, CheckCircle, XCircle } from 'lucide-react';

interface TrainerProps {
  tree: RangeTree;
}

export default function Trainer({ tree }: TrainerProps) {
  // Find all range nodes in the tree to select for training
  const rangeNodes = Object.values(tree).filter((n) => n.type === 'range');

  const [selectedRangeId, setSelectedRangeId] = useState<string>('');
  const [session, setSession] = useState<TrainerSession | null>(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    userAction: string;
    correctAction: string;
    weightsText?: string;
  } | null>(null);

  // Initialize selected range ID when range nodes are loaded
  useEffect(() => {
    if (rangeNodes.length > 0 && !selectedRangeId) {
      setSelectedRangeId(rangeNodes[0].id);
    }
  }, [rangeNodes, selectedRangeId]);

  // Start a new session or switch ranges
  const handleStartSession = (rangeId: string) => {
    const rangeNode = tree[rangeId];
    if (!rangeNode || !rangeNode.grid || !rangeNode.actions) return;

    // Find all combos in the grid that have at least one action defined (weight > 0)
    const activeCombos = Object.entries(rangeNode.grid)
      .filter(([_, cellActions]) => Object.values(cellActions).some((w) => w > 0))
      .map(([combo]) => combo);

    if (activeCombos.length === 0) {
      alert('В этом чарте не закрашена ни одна рука! Сначала нарисуйте диапазон в редакторе.');
      return;
    }

    const firstCardHand = drawRandomHand(activeCombos);

    // Prepare defined actions for this first combo
    const comboActions = rangeNode.grid[firstCardHand.combo] || {};

    setSession({
      rangeId: rangeNode.id,
      rangeName: rangeNode.name,
      correctCount: 0,
      totalCount: 0,
      streak: 0,
      maxStreak: 0,
      history: [],
      currentCardCombo: {
        hand: firstCardHand.hand,
        combo: firstCardHand.combo,
        suits: firstCardHand.suits,
        definedActions: comboActions,
      },
    });
    setFeedback(null);
  };

  // Process selected action
  const handleSelectAction = (actionId: string | null) => {
    if (!session || !session.currentCardCombo) return;
    const rangeNode = tree[session.rangeId];
    if (!rangeNode || !rangeNode.actions) return;

    const current = session.currentCardCombo;
    const defined = current.definedActions; // actionId -> weight %

    // Find the defined action with the highest weight (primary action)
    let bestActionId: string | null = null;
    let maxWeight = 0;

    Object.entries(defined).forEach(([actId, weight]) => {
      const w = weight as number;
      if (w > maxWeight) {
        maxWeight = w;
        bestActionId = actId;
      }
    });

    // If sum of weights is 0, then the hand is technically Fold / No action
    const isFoldHand = maxWeight === 0;

    // Check if user is correct
    // User selected actionId.
    // Correct if:
    // 1. User selected the exact primary action (bestActionId).
    // 2. Or, if it's a mixed strategy, they picked any action that has > 0 weight (we are generous here, or check if it matches the best). Let's check against the primary action to encourage optimal play!
    let isCorrect = false;
    if (isFoldHand) {
      isCorrect = actionId === null; // Fold is represented as null / Eraser
    } else {
      isCorrect = actionId === bestActionId;
    }

    // Get Action names
    const userActionName = actionId
      ? rangeNode.actions.find((a) => a.id === actionId)?.name || 'Action'
      : 'Fold / Пасс';

    const correctActionName = isFoldHand
      ? 'Fold / Пасс'
      : rangeNode.actions.find((a) => a.id === bestActionId)?.name || 'Fold';

    // Weights string description
    let weightsText = '';
    if (!isFoldHand) {
      weightsText = Object.entries(defined)
        .map(([id, w]) => {
          const actName = rangeNode.actions?.find((a) => a.id === id)?.name || 'Action';
          return `${actName}: ${w}%`;
        })
        .join(', ');
    } else {
      weightsText = 'Пасс: 100%';
    }

    // Update statistics
    const newCorrect = isCorrect ? session.correctCount + 1 : session.correctCount;
    const newTotal = session.totalCount + 1;
    const newStreak = isCorrect ? session.streak + 1 : 0;
    const newMaxStreak = Math.max(session.maxStreak, newStreak);

    // Create a historical log record
    const logRecord: TrainerLog = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      hand: current.hand,
      combo: current.combo,
      userActionId: actionId || 'fold',
      userActionName,
      correctActionName,
      isCorrect,
    };

    setFeedback({
      isCorrect,
      userAction: userActionName,
      correctAction: correctActionName,
      weightsText,
    });

    setSession({
      ...session,
      correctCount: newCorrect,
      totalCount: newTotal,
      streak: newStreak,
      maxStreak: newMaxStreak,
      history: [logRecord, ...session.history],
    });
  };

  // Move to next card hand
  const handleNextHand = () => {
    if (!session) return;
    const rangeNode = tree[session.rangeId];
    if (!rangeNode || !rangeNode.grid) return;

    // Redraw range active combos
    const activeCombos = Object.entries(rangeNode.grid)
      .filter(([_, cellActions]) => Object.values(cellActions).some((w) => w > 0))
      .map(([combo]) => combo);

    if (activeCombos.length === 0) return;

    const nextHand = drawRandomHand(activeCombos);
    const comboActions = rangeNode.grid[nextHand.combo] || {};

    setSession({
      ...session,
      currentCardCombo: {
        hand: nextHand.hand,
        combo: nextHand.combo,
        suits: nextHand.suits,
        definedActions: comboActions,
      },
    });
    setFeedback(null);
  };

  // Suit helpers for CSS coloring
  const getSuitColor = (suitSymbol: string) => {
    if (suitSymbol === '♥' || suitSymbol === '♦') return 'text-red-500';
    if (suitSymbol === '♣') return 'text-emerald-500';
    return 'text-zinc-300'; // Spades
  };

  const getSuitBg = (suitSymbol: string) => {
    if (suitSymbol === '♥' || suitSymbol === '♦') return 'bg-red-500/10 border-red-500/20';
    if (suitSymbol === '♣') return 'bg-emerald-500/10 border-emerald-500/20';
    return 'bg-zinc-800/50 border-zinc-700/50';
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 overflow-y-auto bg-zinc-950">
      
      {/* Selection / Sidebar */}
      <div className="w-full md:w-80 shrink-0 bg-zinc-900/50 border border-zinc-900 rounded-2xl p-5 space-y-4 h-fit">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            <Brain className="h-4 w-4 text-emerald-500" />
            Выбор диапазона
          </h3>
          <p className="text-xs text-zinc-400">Выберите чарт, который хотите натренировать</p>
        </div>

        {rangeNodes.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">Сначала создайте хотя бы один чарт в редакторе.</p>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedRangeId}
              onChange={(e) => setSelectedRangeId(e.target.value)}
              className="w-full bg-zinc-950 text-xs border border-zinc-850 hover:border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none"
            >
              {rangeNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleStartSession(selectedRangeId)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs transition-all shadow shadow-emerald-950/20 cursor-pointer"
            >
              Запустить тренировку
            </button>
          </div>
        )}

        {/* Current Session Stats */}
        {session && (
          <div className="pt-4 border-t border-zinc-900 space-y-3 text-xs">
            <h4 className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Статистика сессии</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl flex flex-col items-center">
                <span className="text-zinc-500 text-[10px]">Accuracy</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5">
                  {session.totalCount === 0 ? '0' : Math.round((session.correctCount / session.totalCount) * 100)}%
                </span>
                <span className="text-[9px] text-zinc-500 mt-0.5">
                  {session.correctCount} / {session.totalCount}
                </span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl flex flex-col items-center">
                <span className="text-zinc-500 text-[10px]">Streak</span>
                <span className="text-lg font-bold text-orange-400 font-mono mt-0.5 flex items-center gap-0.5">
                  <Flame className="h-4 w-4 fill-orange-500/20 text-orange-500 shrink-0" />
                  {session.streak}
                </span>
                <span className="text-[9px] text-zinc-500 mt-0.5">
                  Max: {session.maxStreak}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Testing Screen */}
      <div className="flex-1 flex flex-col gap-6 items-center">
        {!session ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-900/10 border border-dashed border-zinc-850 rounded-2xl w-full min-h-[400px]">
            <Brain className="h-12 w-12 text-zinc-700 mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-white">Готовы оттачивать решения?</h3>
            <p className="text-sm text-zinc-500 mt-1.5 max-w-sm">
              Выберите чарт слева и нажмите «Запустить тренировку». Мы будем показывать случайные руки, а вы должны кликать по верным действиям.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[620px] bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 flex flex-col items-center space-y-6">
            {/* Context situation label */}
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-3 py-1 rounded-full">
                Ситуация: {session.rangeName}
              </span>
            </div>

            {/* Stunning Visual Poker Cards Stage */}
            {session.currentCardCombo && (
              <div className="flex gap-4 items-center justify-center py-4">
                {session.currentCardCombo.hand.split(' ').map((card, idx) => {
                  const cardRank = card.slice(0, -1);
                  const cardSuit = card.slice(-1);
                  const colorClass = getSuitColor(cardSuit);
                  const bgClass = getSuitBg(cardSuit);

                  return (
                    <div
                      key={idx}
                      className={`h-40 w-28 rounded-2xl border ${bgClass} bg-zinc-950/80 shadow-2xl flex flex-col justify-between p-4 relative overflow-hidden transition-all duration-300 hover:scale-105`}
                    >
                      {/* Top left corner label */}
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-2xl font-bold font-mono text-zinc-100">{cardRank}</span>
                        <span className={`text-xl ${colorClass} mt-0.5`}>{cardSuit}</span>
                      </div>

                      {/* Giant background suit stencil */}
                      <div className={`absolute right-1 bottom-1 text-8xl leading-none font-bold opacity-[0.03] select-none ${colorClass}`}>
                        {cardSuit}
                      </div>

                      {/* Bottom right corner label (flipped) */}
                      <div className="flex flex-col items-end leading-none self-end rotate-180">
                        <span className="text-2xl font-bold font-mono text-zinc-100">{cardRank}</span>
                        <span className={`text-xl ${colorClass} mt-0.5`}>{cardSuit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions Palette for Quiz */}
            {!feedback ? (
              <div className="w-full flex flex-col gap-3">
                <div className="text-center text-xs text-zinc-500 font-medium">Какое действие вы выберете?</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {/* Render Fold action */}
                  <button
                    onClick={() => handleSelectAction(null)}
                    className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-all shadow cursor-pointer min-w-[100px]"
                  >
                    Fold / Пасс
                  </button>

                  {/* Render range custom actions */}
                  {tree[session.rangeId]?.actions?.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => handleSelectAction(act.id)}
                      style={{ borderLeftColor: act.color, borderLeftWidth: '4px' }}
                      className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold rounded-xl text-xs transition-all shadow cursor-pointer min-w-[110px]"
                    >
                      {act.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* feedback screen */
              <div className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2">
                  {feedback.isCorrect ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm bg-emerald-950/20 border border-emerald-900/30 px-3 py-1.5 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                      Верное решение! (+1)
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-sm bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-full">
                      <XCircle className="h-4 w-4" />
                      Ошибка!
                    </div>
                  )}
                </div>

                <div className="text-xs text-zinc-400 space-y-1 text-center">
                  <p>
                    Ваше решение: <span className="font-bold text-zinc-200">{feedback.userAction}</span>
                  </p>
                  <p>
                    Правильный диапазон: <span className="font-bold text-emerald-400">{feedback.correctAction}</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono mt-2">
                    Чартовая стратегия: ({feedback.weightsText})
                  </p>
                </div>

                <button
                  onClick={handleNextHand}
                  className="w-full max-w-[200px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/10 cursor-pointer"
                >
                  Следующая рука
                </button>
              </div>
            )}

            {/* Error History Logs list */}
            {session.history.length > 0 && (
              <div className="w-full pt-4 border-t border-zinc-900 space-y-2.5">
                <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">История решений</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent">
                  {session.history.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-[11px] ${
                        log.isCorrect
                          ? 'bg-emerald-950/5 border-emerald-950 text-emerald-400'
                          : 'bg-red-950/5 border-red-950 text-red-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
                          {log.hand}
                        </span>
                        <span>{log.combo}</span>
                      </div>
                      <div className="text-right">
                        <span>Вы выбрали: <strong className="font-medium text-zinc-300">{log.userActionName}</strong></span>
                        {!log.isCorrect && (
                          <span className="block text-[10px] text-zinc-500">
                            Верно: {log.correctActionName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
