import React, { useState, useEffect, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  PieChart, 
  Eye, 
  Edit3,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { RangeTree as TreeType, RangeAction, RangeGrid, TreeNode } from '../types';

interface BottomFolderNavProps {
  tree: TreeType;
  activeId: string | null;
  grid: RangeGrid;
  actions: RangeAction[];
  isViewMode: boolean;
  onSelectRange: (id: string) => void;
  onToggleViewMode?: () => void;
}

export default function BottomFolderNav({
  tree,
  activeId,
  grid,
  actions,
  isViewMode,
  onSelectRange,
  onToggleViewMode,
}: BottomFolderNavProps) {
  // Find which folder the current activeId belongs to
  const activeNode = activeId ? tree[activeId] : null;

  // Find root folders and root ranges
  const rootFolders = useMemo(() => {
    return Object.values(tree)
      .filter((n) => n.type === 'folder' && n.parentId === null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tree]);

  const rootRanges = useMemo(() => {
    return Object.values(tree)
      .filter((n) => n.type === 'range' && n.parentId === null)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tree]);

  // Find parent folder ID of current active range
  const parentFolderId = useMemo(() => {
    if (!activeNode) return rootFolders[0]?.id || null;
    if (activeNode.parentId) {
      // Find top-level ancestor folder or immediate parent
      let curr: TreeNode | undefined = tree[activeNode.parentId];
      while (curr && curr.parentId && tree[curr.parentId]) {
        curr = tree[curr.parentId];
      }
      return curr?.id || activeNode.parentId;
    }
    return null;
  }, [activeNode, tree, rootFolders]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(parentFolderId || (rootFolders[0]?.id ?? null));

  // Sync selected folder with activeRangeId when it changes
  useEffect(() => {
    if (parentFolderId && parentFolderId !== selectedFolderId) {
      setSelectedFolderId(parentFolderId);
    }
  }, [parentFolderId]);

  // If no folder is selected, fallback to first available
  useEffect(() => {
    if (!selectedFolderId && rootFolders.length > 0) {
      setSelectedFolderId(rootFolders[0].id);
    }
  }, [rootFolders, selectedFolderId]);

  // Get items inside currently selected folder (including nested subfolders and ranges)
  const currentFolder = selectedFolderId ? tree[selectedFolderId] : null;

  // Flattened list of all ranges inside the current folder for quick Prev / Next
  const folderRanges = useMemo(() => {
    if (!currentFolder || !currentFolder.childrenIds) return [];
    
    const ranges: TreeNode[] = [];
    const collectRanges = (nodeId: string) => {
      const node = tree[nodeId];
      if (!node) return;
      if (node.type === 'range') {
        ranges.push(node);
      } else if (node.type === 'folder' && node.childrenIds) {
        node.childrenIds.forEach(collectRanges);
      }
    };

    currentFolder.childrenIds.forEach(collectRanges);
    return ranges;
  }, [currentFolder, tree]);

  // Flattened list of ALL ranges in entire tree
  const allTreeRanges = useMemo(() => {
    const ranges: TreeNode[] = [];
    const collect = (node: TreeNode) => {
      if (node.type === 'range') {
        ranges.push(node);
      }
    };
    Object.values(tree).forEach(collect);
    return ranges;
  }, [tree]);

  // Prev / Next range handlers
  const currentRangeIndex = folderRanges.findIndex((r) => r.id === activeId);
  
  const handlePrevRange = () => {
    if (folderRanges.length === 0) return;
    if (currentRangeIndex > 0) {
      onSelectRange(folderRanges[currentRangeIndex - 1].id);
    } else {
      // Loop to last range in folder
      onSelectRange(folderRanges[folderRanges.length - 1].id);
    }
  };

  const handleNextRange = () => {
    if (folderRanges.length === 0) return;
    if (currentRangeIndex >= 0 && currentRangeIndex < folderRanges.length - 1) {
      onSelectRange(folderRanges[currentRangeIndex + 1].id);
    } else {
      // Loop to first range in folder
      onSelectRange(folderRanges[0].id);
    }
  };

  // Keyboard navigation for view mode
  useEffect(() => {
    if (!isViewMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevRange();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextRange();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewMode, currentRangeIndex, folderRanges]);

  // Calculate statistics for current range (combos and percentages)
  const stats = useMemo(() => {
    let totalCombos = 0;
    const actionCombos: { [actionId: string]: number } = {};
    actions.forEach((a) => { actionCombos[a.id] = 0; });

    const getMultiplier = (combo: string) => {
      if (combo.length === 2) return 6; // Pair (e.g. AA)
      if (combo.endsWith('s')) return 4; // Suited (e.g. AKs)
      return 12; // Offsuit (e.g. AKo)
    };

    Object.entries(grid || {}).forEach(([combo, cellActions]) => {
      const mult = getMultiplier(combo);
      Object.entries(cellActions).forEach(([actionId, weight]) => {
        if (weight > 0) {
          const effective = (weight / 100) * mult;
          totalCombos += effective;
          actionCombos[actionId] = (actionCombos[actionId] || 0) + effective;
        }
      });
    });

    const totalPercent = (totalCombos / 1326) * 100;
    const foldCombos = Math.max(0, 1326 - totalCombos);
    const foldPercent = (foldCombos / 1326) * 100;

    return {
      totalCombos: Math.round(totalCombos * 10) / 10,
      totalPercent: Math.round(totalPercent * 10) / 10,
      foldCombos: Math.round(foldCombos * 10) / 10,
      foldPercent: Math.round(foldPercent * 10) / 10,
      actionStats: actions
        .filter((act) => (actionCombos[act.id] || 0) > 0)
        .map((act) => {
          const combos = actionCombos[act.id] || 0;
          return {
            ...act,
            combos: Math.round(combos * 10) / 10,
            percent: Math.round((combos / 1326) * 100 * 10) / 10,
          };
        }),
    };
  }, [grid, actions]);

  // Helper to render folder ranges & subfolders
  const renderFolderItems = (folderId: string) => {
    const node = tree[folderId];
    if (!node || !node.childrenIds || node.childrenIds.length === 0) {
      return (
        <div className="text-xs text-zinc-500 italic py-3 text-center w-full">
          В этой папке пока нет чартов
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 w-full">
        {node.childrenIds.map((childId) => {
          const child = tree[childId];
          if (!child) return null;

          if (child.type === 'folder') {
            // Subfolder group
            return (
              <div 
                key={child.id} 
                className="w-full bg-zinc-900/40 rounded-xl p-2.5 my-1 border border-zinc-850/60"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-2 px-1">
                  <Folder className="h-3.5 w-3.5" style={{ color: child.color || '#10b981' }} />
                  <span>{child.name}</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    ({child.childrenIds?.length || 0})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {child.childrenIds && child.childrenIds.length > 0 ? (
                    child.childrenIds.map((subChildId) => {
                      const subChild = tree[subChildId];
                      if (!subChild || subChild.type !== 'range') return null;
                      const isSelected = activeId === subChild.id;

                      return (
                        <button
                          key={subChild.id}
                          onClick={() => onSelectRange(subChild.id)}
                          style={
                            isSelected && subChild.color
                              ? { borderColor: subChild.color, backgroundColor: `${subChild.color}20` }
                              : undefined
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm font-semibold scale-[1.02]'
                              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: subChild.color || '#34d399' }}
                          />
                          <span className="truncate max-w-[180px]">{subChild.name}</span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic px-2">Пустая подпапка</span>
                  )}
                </div>
              </div>
            );
          }

          // Direct range child
          const isSelected = activeId === child.id;
          return (
            <button
              key={child.id}
              onClick={() => onSelectRange(child.id)}
              style={
                isSelected && child.color
                  ? { borderColor: child.color, backgroundColor: `${child.color}20` }
                  : undefined
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm font-semibold scale-[1.02]'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: child.color || '#34d399' }}
              />
              <span className="truncate max-w-[200px]">{child.name}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[780px] flex flex-col gap-4 bg-zinc-950 rounded-2xl border border-zinc-900 shadow-xl p-4 sm:p-5 select-none">
      {/* Row 1: Folder Selection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {rootFolders.map((folder) => {
          const isFolderSelected = selectedFolderId === folder.id;
          const rangeCount = folder.childrenIds?.length || 0;

          return (
            <button
              key={folder.id}
              onClick={() => {
                setSelectedFolderId(folder.id);
                // If the folder has ranges, automatically pick the first one if current active is not in it
                if (folder.childrenIds && folder.childrenIds.length > 0) {
                  const firstRangeId = folder.childrenIds.find((id) => tree[id]?.type === 'range');
                  if (firstRangeId && !folder.childrenIds.includes(activeId || '')) {
                    onSelectRange(firstRangeId);
                  }
                }
              }}
              style={
                isFolderSelected && folder.color
                  ? { borderColor: folder.color, color: '#ffffff' }
                  : undefined
              }
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                isFolderSelected
                  ? 'bg-zinc-900 text-white border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border-zinc-850 hover:text-zinc-200'
              }`}
            >
              {isFolderSelected ? (
                <FolderOpen className="h-4 w-4" style={{ color: folder.color || '#10b981' }} />
              ) : (
                <Folder className="h-4 w-4" style={{ color: folder.color || '#71717a' }} />
              )}
              <span>{folder.name}</span>
              <span className="text-[10px] bg-zinc-800/80 text-zinc-400 px-1.5 py-0.2 rounded-full font-mono">
                {rangeCount}
              </span>
            </button>
          );
        })}

        {/* Root level ranges if any exist */}
        {rootRanges.length > 0 && (
          <button
            onClick={() => setSelectedFolderId('__root__')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              selectedFolderId === '__root__'
                ? 'bg-zinc-900 text-white border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border-zinc-850 hover:text-zinc-200'
            }`}
          >
            <FileText className="h-4 w-4 text-zinc-400" />
            <span>Без папки</span>
            <span className="text-[10px] bg-zinc-800/80 text-zinc-400 px-1.5 py-0.2 rounded-full font-mono">
              {rootRanges.length}
            </span>
          </button>
        )}
      </div>

      {/* Row 2: Range Cards / Pills of the Selected Folder */}
      <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-900/80">
        {selectedFolderId === '__root__' ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {rootRanges.map((r) => {
              const isSelected = activeId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRange(r.id)}
                  style={
                    isSelected && r.color
                      ? { borderColor: r.color, backgroundColor: `${r.color}20` }
                      : undefined
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm font-semibold'
                      : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.color || '#34d399' }}
                  />
                  <span className="truncate max-w-[200px]">{r.name}</span>
                </button>
              );
            })}
          </div>
        ) : selectedFolderId ? (
          renderFolderItems(selectedFolderId)
        ) : (
          <div className="text-xs text-zinc-500 italic py-2 text-center">
            Выберите папку сверху для отображения чартов
          </div>
        )}
      </div>

      {/* Action Legend & Range Statistics (Especially prominent in View Mode) */}
      <div className="pt-2 border-t border-zinc-900/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <PieChart className="h-3.5 w-3.5 text-zinc-400" />
            <span>Легенда действий и охват</span>
          </div>

          <div className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            Всего: {stats.totalCombos} комб ({stats.totalPercent}%)
          </div>
        </div>

        {/* Legend Chips with color & percentage */}
        <div className="flex flex-wrap items-center gap-2">
          {stats.actionStats.length > 0 ? (
            stats.actionStats.map((act) => (
              <div
                key={act.id}
                className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: act.color }}
                />
                <span className="text-zinc-200 font-medium">{act.name}</span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  {act.combos} комб ({act.percent}%)
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-zinc-500 italic">
              В данном диапазоне пока нет активных действий
            </div>
          )}

          {/* Fold info */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900/40 border border-zinc-900 rounded-lg text-xs text-zinc-500">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 flex-shrink-0" />
            <span>Fold</span>
            <span className="font-mono text-[11px]">
              {stats.foldCombos} комб ({stats.foldPercent}%)
            </span>
          </div>
        </div>

        {/* Notes if present on the active range */}
        {activeNode?.notes && (
          <div className="mt-1 p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-lg text-xs text-zinc-400 leading-relaxed">
            <span className="text-zinc-300 font-medium block mb-0.5">Заметки к диапазону:</span>
            {activeNode.notes}
          </div>
        )}
      </div>

    </div>
  );
}
