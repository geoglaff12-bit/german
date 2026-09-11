import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronDown,
  Plus,
  FolderPlus,
  FilePlus,
  Palette,
  Copy,
  Trash,
  Check,
  X
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
  onAddFolder?: (parentId: string | null) => void;
  onAddRange?: (parentId: string | null) => void;
  onDeleteNode?: (id: string) => void;
  onRenameNode?: (id: string, newName: string) => void;
  onDuplicateNode?: (id: string) => void;
  onUpdateNodeColor?: (id: string, color: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

const colorsList = [
  { hex: '', label: 'Стандартный' },
  { hex: '#ef4444', label: 'Красный' },
  { hex: '#f97316', label: 'Оранжевый' },
  { hex: '#eab308', label: 'Желтый' },
  { hex: '#22c55e', label: 'Зеленый' },
  { hex: '#06b6d4', label: 'Бирюзовый' },
  { hex: '#3b82f6', label: 'Синий' },
  { hex: '#a855f7', label: 'Фиолетовый' },
  { hex: '#ec4899', label: 'Розовый' }
];

export default function BottomFolderNav({
  tree,
  activeId,
  grid,
  actions,
  isViewMode,
  onSelectRange,
  onToggleViewMode,
  onAddFolder,
  onAddRange,
  onDeleteNode,
  onRenameNode,
  onDuplicateNode,
  onUpdateNodeColor,
}: BottomFolderNavProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  // Close context menu on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setEditingId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const handleOpenContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 340);
    setContextMenu({ x, y, nodeId });
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim() && onRenameNode) {
      onRenameNode(id, editName.trim());
    }
    setEditingId(null);
  };

  // Helper to render folder ranges & subfolders
  const renderFolderItems = (folderId: string) => {
    const node = tree[folderId];
    if (!node || !node.childrenIds || node.childrenIds.length === 0) {
      return (
        <div className="flex items-center justify-between py-2 px-3 w-full text-xs text-zinc-500 italic">
          <span>В этой папке пока нет чартов</span>
          {onAddRange && (
            <button
              onClick={() => onAddRange(folderId)}
              className="not-italic flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Добавить чарт</span>
            </button>
          )}
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
                <div 
                  className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-2 px-1 cursor-pointer"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(child.id);
                    setEditName(child.name);
                  }}
                  onContextMenu={(e) => handleOpenContextMenu(e, child.id)}
                  title="ПКМ: меню папки | Двойной клик: переименовать"
                >
                  <div className="flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5" style={{ color: child.color || '#10b981' }} />
                    {editingId === child.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(child.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="bg-zinc-950 text-white text-xs px-1.5 py-0.5 rounded border border-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(child.id)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span>{child.name}</span>
                    )}
                    <span className="text-[10px] text-zinc-500 font-normal">
                      ({child.childrenIds?.length || 0})
                    </span>
                  </div>

                  {onAddRange && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddRange(child.id);
                      }}
                      className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer"
                      title="Добавить чарт в подпапку"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+Чарт</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {child.childrenIds && child.childrenIds.length > 0 ? (
                    child.childrenIds.map((subChildId) => {
                      const subChild = tree[subChildId];
                      if (!subChild || subChild.type !== 'range') return null;
                      const isSelected = activeId === subChild.id;

                      if (editingId === subChild.id) {
                        return (
                          <div key={subChild.id} className="flex items-center gap-1 bg-zinc-900 border border-emerald-500 rounded-lg px-2 py-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(subChild.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="bg-transparent text-xs text-white outline-none w-24"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(subChild.id)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-zinc-400 hover:text-zinc-200"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={subChild.id}
                          onClick={() => onSelectRange(subChild.id)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingId(subChild.id);
                            setEditName(subChild.name);
                          }}
                          onContextMenu={(e) => handleOpenContextMenu(e, subChild.id)}
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
                          title="Клик: выбрать | ПКМ: меню | Двойной клик: переименовать"
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

          if (editingId === child.id) {
            return (
              <div key={child.id} className="flex items-center gap-1 bg-zinc-900 border border-emerald-500 rounded-lg px-2 py-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(child.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="bg-transparent text-xs text-white outline-none w-24"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(child.id)}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={child.id}
              onClick={() => onSelectRange(child.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId(child.id);
                setEditName(child.name);
              }}
              onContextMenu={(e) => handleOpenContextMenu(e, child.id)}
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
              title="Клик: выбрать | ПКМ: меню | Двойной клик: переименовать"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: child.color || '#34d399' }}
              />
              <span className="truncate max-w-[200px]">{child.name}</span>
            </button>
          );
        })}

        {/* Quick add chart button inside folder */}
        {onAddRange && (
          <button
            onClick={() => onAddRange(folderId)}
            title="Добавить чарт в эту папку"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>+Чарт</span>
          </button>
        )}
      </div>
    );
  };

  const contextNode = contextMenu ? tree[contextMenu.nodeId] : null;

  return (
    <div className="w-full max-w-[780px] flex flex-col gap-4 bg-zinc-950 rounded-2xl border border-zinc-900 shadow-xl p-4 sm:p-5 select-none">
      {/* Row 1: Folder Selection Tabs (Wrapped into clean multi-row layout) */}
      <div className="flex flex-wrap items-center gap-2">
        {rootFolders.map((folder) => {
          const isFolderSelected = selectedFolderId === folder.id;
          const rangeCount = folder.childrenIds?.length || 0;

          if (editingId === folder.id) {
            return (
              <div key={folder.id} className="flex items-center gap-1 bg-zinc-900 border border-emerald-500 rounded-xl px-2 py-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(folder.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="bg-transparent text-xs text-white outline-none w-28"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(folder.id)}
                  className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-zinc-400 hover:text-zinc-200 p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }

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
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingId(folder.id);
                setEditName(folder.name);
              }}
              onContextMenu={(e) => handleOpenContextMenu(e, folder.id)}
              style={
                isFolderSelected && folder.color
                  ? { borderColor: folder.color, color: '#ffffff' }
                  : undefined
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                isFolderSelected
                  ? 'bg-zinc-900 text-white border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-400 border-zinc-850 hover:text-zinc-200'
              }`}
              title="Клик: открыть | ПКМ: меню папки | Двойной клик: переименовать"
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

        {/* Add Folder button */}
        {onAddFolder && (
          <button
            onClick={() => onAddFolder(null)}
            title="Создать новую папку"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-emerald-300 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>+Папка</span>
          </button>
        )}

        {/* Root level ranges if any exist */}
        {rootRanges.length > 0 && (
          <button
            onClick={() => setSelectedFolderId('__root__')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
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

              if (editingId === r.id) {
                return (
                  <div key={r.id} className="flex items-center gap-1 bg-zinc-900 border border-emerald-500 rounded-lg px-2 py-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(r.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="bg-transparent text-xs text-white outline-none w-24"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(r.id)}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRange(r.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(r.id);
                    setEditName(r.name);
                  }}
                  onContextMenu={(e) => handleOpenContextMenu(e, r.id)}
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
                  title="Клик: выбрать | ПКМ: меню | Двойной клик: переименовать"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.color || '#34d399' }}
                  />
                  <span className="truncate max-w-[200px]">{r.name}</span>
                </button>
              );
            })}

            {onAddRange && (
              <button
                onClick={() => onAddRange(null)}
                title="Добавить новый чарт в корень"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer"
              >
                <FilePlus className="h-3 w-3" />
                <span>+Чарт</span>
              </button>
            )}
          </div>
        ) : selectedFolderId ? (
          renderFolderItems(selectedFolderId)
        ) : (
          <div className="text-xs text-zinc-500 italic py-2 text-center">
            Выберите папку сверху для отображения чартов
          </div>
        )}
      </div>

      {/* Action Legend & Range Statistics (Hidden in View Mode as requested) */}
      {!isViewMode && (
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
        </div>
      )}

      {/* Notes if present on the active range */}
      {activeNode?.notes && (
        <div className="p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-lg text-xs text-zinc-400 leading-relaxed">
          <span className="text-zinc-300 font-medium block mb-0.5">Заметки к диапазону:</span>
          {activeNode.notes}
        </div>
      )}

      {/* Context Menu (ПКМ) for Folders and Charts */}
      {contextMenu && contextNode && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 bg-zinc-900/95 backdrop-blur-md border border-zinc-750 rounded-xl shadow-2xl p-1.5 flex flex-col text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header of Context Menu */}
          <div className="px-2.5 py-1.5 border-b border-zinc-800 flex items-center gap-2 mb-1">
            {contextNode.type === 'folder' ? (
              <Folder className="h-3.5 w-3.5" style={{ color: contextNode.color || '#10b981' }} />
            ) : (
              <FileText className="h-3.5 w-3.5" style={{ color: contextNode.color || '#34d399' }} />
            )}
            <span className="font-bold truncate text-white">{contextNode.name}</span>
          </div>

          {/* Action: Rename */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu(null);
              setEditingId(contextNode.id);
              setEditName(contextNode.name);
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Переименовать</span>
          </button>

          {/* Action: Color Palette Swatches */}
          <div className="px-2.5 py-1.5 flex flex-col gap-1 border-t border-zinc-800/60 my-0.5">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-3 w-3 text-amber-400" />
              <span>Выбрать цвет</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {colorsList.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    onUpdateNodeColor?.(contextNode.id, c.hex);
                    setContextMenu(null);
                  }}
                  className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                    contextNode.color === c.hex || (!contextNode.color && c.hex === '')
                      ? 'border-white scale-125 ring-2 ring-emerald-500 shadow-md'
                      : 'border-zinc-700 hover:scale-115'
                  }`}
                  style={{ backgroundColor: c.hex || '#71717a' }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Action: Add Chart inside folder */}
          {contextNode.type === 'folder' && onAddRange && (
            <button
              onClick={() => {
                setContextMenu(null);
                onAddRange(contextNode.id);
              }}
              className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer border-t border-zinc-800/60 mt-0.5"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span>Добавить чарт в папку</span>
            </button>
          )}

          {/* Action: Add Subfolder */}
          {contextNode.type === 'folder' && onAddFolder && (
            <button
              onClick={() => {
                setContextMenu(null);
                onAddFolder(contextNode.id);
              }}
              className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
              <span>Добавить подпапку</span>
            </button>
          )}

          {/* Action: Duplicate (Folder with all charts or Single Range) */}
          {onDuplicateNode && (
            <button
              onClick={() => {
                setContextMenu(null);
                onDuplicateNode(contextNode.id);
              }}
              className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer border-t border-zinc-800/60 mt-0.5"
            >
              <Copy className="h-3.5 w-3.5 text-sky-400" />
              <span>{contextNode.type === 'folder' ? 'Дублировать папку (со всеми чартами)' : 'Создать копию чарта'}</span>
            </button>
          )}

          {/* Action: Delete */}
          {onDeleteNode && (
            <button
              onClick={() => {
                setContextMenu(null);
                onDeleteNode(contextNode.id);
              }}
              className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg transition-colors text-left cursor-pointer border-t border-zinc-800/60 mt-0.5"
            >
              <Trash className="h-3.5 w-3.5" />
              <span>Удалить {contextNode.type === 'folder' ? 'папку' : 'чарт'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
