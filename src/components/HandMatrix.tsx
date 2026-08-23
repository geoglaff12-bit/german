import React, { useRef, useState, useEffect } from 'react';
import { generateComboMatrix, getComboType } from '../utils/poker';
import { RangeAction, RangeGrid } from '../types';
import { RotateCcw } from 'lucide-react';

interface HandMatrixProps {
  grid: RangeGrid;
  actions: RangeAction[];
  activeActionId: string | null; // active brush action, null means "Eraser"
  activeWeight: number; // brush weight e.g. 100, 50, 25
  isViewMode?: boolean;
  onGridChange: (newGrid: RangeGrid) => void;
  onClearGrid?: () => void;
}

export default function HandMatrix({
  grid,
  actions,
  activeActionId,
  activeWeight,
  isViewMode = false,
  onGridChange,
  onClearGrid,
}: HandMatrixProps) {
  const comboMatrix = generateComboMatrix();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'paint' | 'erase'>('paint'); // paint = add action, erase = clear cell
  const [inspectedCombo, setInspectedCombo] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Fast Grid Helpers
  const handleClearGrid = () => {
    if (onClearGrid) {
      onClearGrid();
    } else {
      onGridChange({});
    }
  };

  const handleFillGrid = () => {
    if (!activeActionId) return;
    const newGrid: RangeGrid = {};
    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const combo = comboMatrix[r][c];
        newGrid[combo] = { [activeActionId]: activeWeight };
      }
    }
    onGridChange(newGrid);
  };

  const handleQuickSelect = (type: 'pairs' | 'suited' | 'offsuit' | 'broadway') => {
    if (!activeActionId) return;
    const newGrid = { ...grid };
    
    const broadwayRanks = ['A', 'K', 'Q', 'J', 'T'];

    for (let r = 0; r < 13; r++) {
      for (let c = 0; c < 13; c++) {
        const combo = comboMatrix[r][c];
        const cType = getComboType(combo);
        
        let shouldSelect = false;
        if (type === 'pairs' && cType === 'pair') shouldSelect = true;
        if (type === 'suited' && cType === 'suited') shouldSelect = true;
        if (type === 'offsuit' && cType === 'offsuit') shouldSelect = true;
        if (type === 'broadway') {
          const r1 = combo[0];
          const r2 = combo[1];
          if (broadwayRanks.includes(r1) && broadwayRanks.includes(r2)) {
            shouldSelect = true;
          }
        }

        if (shouldSelect) {
          newGrid[combo] = {
            ...(newGrid[combo] || {}),
            [activeActionId]: activeWeight,
          };
        }
      }
    }
    onGridChange(newGrid);
  };

  // Mouse drag drawing implementation
  const handleMouseDown = (combo: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (isViewMode) {
      setInspectedCombo((prev) => (prev === combo ? null : combo));
      return;
    }

    setIsDrawing(true);
    const isErasing = !activeActionId || e.button === 2; // eraser active OR right click
    const mode = isErasing ? 'erase' : 'paint';
    setDrawMode(mode);

    updateCell(combo, mode);
  };

  const handleMouseEnter = (combo: string) => {
    if (!isViewMode && isDrawing) {
      updateCell(combo, drawMode);
    }
  };

  const updateCell = (combo: string, mode: 'paint' | 'erase') => {
    const newGrid = { ...grid };
    if (mode === 'erase') {
      // Clear all actions or specifically active action? Usually in preflop builders,
      // eraser clears the entire cell, while painting overwrites/appends. Let's clear entire cell.
      newGrid[combo] = {};
    } else {
      if (activeActionId) {
        // Overwrite or blend? Preflop builders either replace or add weighted strategy.
        // If activeWeight is 100, we overwrite other actions.
        // If it's a mixed strategy (e.g. 50%), we can adjust or just override. Let's overwrite
        // to make drawing simple, or if they draw multiple actions, it can divide.
        // Let's replace the whole cell with this single action at activeWeight, OR
        // allow compounding if they have different action IDs.
        // To be highly intuitive, let's make it so painting a 100% action clears other actions.
        // If painting a <100% action, we can either split or replace. Let's replace the action value.
        const currentCell = newGrid[combo] || {};
        
        if (activeWeight === 100) {
          // Absolute action - replaces everything
          newGrid[combo] = { [activeActionId]: 100 };
        } else {
          // Mixed strategy: set this action's weight, cap other actions' weights if sum exceeds 100
          const updatedCell = { ...currentCell, [activeActionId]: activeWeight };
          
          // Calculate sum
          let sum = Object.values(updatedCell).reduce((a, b) => a + b, 0);
          if (sum > 100) {
            // Adjust other actions proportionally or just clear them to make it exact
            // Let's clear others to avoid complex splits unless they add up.
            // Actually, keeping exactly what they painted is best. Let's just adjust other items
            // so sum doesn't exceed 100.
            const otherActionId = Object.keys(updatedCell).find(k => k !== activeActionId);
            if (otherActionId) {
              updatedCell[otherActionId] = 100 - activeWeight;
            }
          }
          newGrid[combo] = updatedCell;
        }
      }
    }
    onGridChange(newGrid);
  };

  const handleGlobalMouseUp = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Prevent right-click context menu on the grid to allow right-click erasing
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Helper to determine cell background styles
  const getCellBackground = (combo: string) => {
    const cellData = grid[combo];
    if (!cellData) return 'bg-zinc-900 hover:bg-zinc-800';

    const activeActions = Object.entries(cellData)
      .filter(([_, weight]) => weight > 0)
      .map(([actionId, weight]) => {
        const actionObj = actions.find((a) => a.id === actionId);
        return {
          color: actionObj ? actionObj.color : '#3f3f46',
          weight,
        };
      });

    if (activeActions.length === 0) return 'bg-zinc-900 hover:bg-zinc-800';
    if (activeActions.length === 1) {
      const act = activeActions[0];
      if (act.weight < 100) {
        // Render mixed action as percentage filled overlay or standard linear-gradient
        return `linear-gradient(to top, ${act.color} ${act.weight}%, #18181b ${act.weight}%)`;
      }
      return act.color;
    }

    // Two or more active actions (mixed strategy) - render beautiful linear gradient
    let gradientParts: string[] = [];
    let accumulatedPercent = 0;
    activeActions.forEach((item) => {
      const start = accumulatedPercent;
      accumulatedPercent += item.weight;
      gradientParts.push(`${item.color} ${start}%`, `${item.color} ${accumulatedPercent}%`);
    });
    return `linear-gradient(135deg, ${gradientParts.join(', ')})`;
  };

  // Helper to get text color contrast
  const getCellTextColor = (combo: string) => {
    const cellData = grid[combo];
    if (!cellData) return 'text-zinc-500';
    const hasAnyAction = Object.values(cellData).some((val) => val > 0);
    return hasAnyAction ? 'text-white font-medium text-shadow-sm' : 'text-zinc-500 hover:text-zinc-300';
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-5 bg-zinc-950 rounded-2xl border border-zinc-900 shadow-xl w-full max-w-[780px]">
      
      {/* 13x13 Interactive Grid */}
      <div 
        ref={gridRef}
        onContextMenu={handleContextMenu}
        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
        className="grid gap-0.5 w-full max-w-[740px] aspect-square bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 select-none shadow-2xl"
      >
        {comboMatrix.map((row, r) =>
          row.map((combo) => {
            const bgStyle = getCellBackground(combo);
            const isGradient = bgStyle.includes('linear-gradient');
            const isHex = bgStyle.startsWith('#');

            const isInspected = inspectedCombo === combo;

            return (
              <div
                key={combo}
                onMouseDown={(e) => handleMouseDown(combo, e)}
                onMouseEnter={() => handleMouseEnter(combo)}
                style={
                  isGradient
                    ? { background: bgStyle }
                    : isHex
                    ? { backgroundColor: bgStyle }
                    : undefined
                }
                className={`flex items-center justify-center aspect-square text-[10px] sm:text-xs md:text-[13px] font-semibold cursor-pointer rounded transition-all duration-75 relative group border ${
                  isInspected
                    ? 'border-white ring-2 ring-emerald-400 z-20 scale-105 shadow-lg'
                    : 'border-zinc-950'
                } ${
                  (!isGradient && !isHex) ? bgStyle : ''
                } ${getCellTextColor(combo)}`}
              >
                {/* Hand combo label */}
                <span className="z-10">{combo}</span>

                {/* Hover weight mini-indicator */}
                {grid[combo] && Object.keys(grid[combo]).length > 0 && (
                  <div className="absolute hidden group-hover:block bg-black text-[9px] text-zinc-300 px-1 py-0.5 rounded -top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none whitespace-nowrap shadow-md">
                    {Object.entries(grid[combo])
                      .map(([actId, weight]) => {
                        const actName = actions.find(a => a.id === actId)?.name || 'Action';
                        return `${actName}: ${weight}%`;
                      })
                      .join(' | ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Control / Inspector Toolbar */}
      {isViewMode ? (
        <div className="w-full max-w-[740px] flex items-center justify-between text-xs px-1">
          {inspectedCombo ? (
            <div className="flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{inspectedCombo}</span>
                <span className="text-[11px] text-zinc-400">
                  {inspectedCombo.length === 2
                    ? 'Пара (6 комбинаций)'
                    : inspectedCombo.endsWith('s')
                    ? 'Одномастная (4 комбинации)'
                    : 'Разномастная (12 комбинаций)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {grid[inspectedCombo] && Object.keys(grid[inspectedCombo]).length > 0 ? (
                  Object.entries(grid[inspectedCombo])
                    .filter(([_, w]) => w > 0)
                    .map(([actId, weight]) => {
                      const act = actions.find((a) => a.id === actId);
                      return (
                        <div
                          key={actId}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 text-[11px]"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: act?.color || '#10b981' }}
                          />
                          <span className="text-zinc-300 font-medium">{act?.name || 'Action'}:</span>
                          <span className="text-white font-mono font-bold">{weight}%</span>
                        </div>
                      );
                    })
                ) : (
                  <span className="text-zinc-500 italic text-[11px]">Действие: 100% Fold</span>
                )}

                <button
                  onClick={() => setInspectedCombo(null)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-0.5 rounded hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="text-zinc-500 text-[11px] italic flex items-center justify-between w-full">
              <span>💡 Нажмите на любую руку в матрице для детального просмотра весов действий</span>
              <span className="text-zinc-600">Стрелки ← → для переключения чартов</span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-[740px] flex flex-wrap gap-2 justify-between items-center text-xs">
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickSelect('pairs')}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg cursor-pointer transition-all"
            >
              Все пары
            </button>
            <button
              onClick={() => handleQuickSelect('suited')}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg cursor-pointer transition-all"
            >
              Все одномастные
            </button>
            <button
              onClick={() => handleQuickSelect('offsuit')}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg cursor-pointer transition-all"
            >
              Все разномастные
            </button>
            <button
              onClick={() => handleQuickSelect('broadway')}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg cursor-pointer transition-all"
            >
              Бродвей
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFillGrid}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-emerald-900/30 hover:text-emerald-300 border border-zinc-800 hover:border-emerald-800/40 text-zinc-300 rounded-lg cursor-pointer transition-all"
            >
              Заполнить 100%
            </button>
            <button
              onClick={handleClearGrid}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-red-950/30 hover:text-red-400 border border-zinc-800 hover:border-red-900/40 text-zinc-300 rounded-lg cursor-pointer transition-all flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Очистить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
