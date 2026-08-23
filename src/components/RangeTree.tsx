import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash, 
  Edit3, 
  Copy, 
  FolderPlus, 
  FilePlus,
  Eye,
  EyeOff,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { RangeTree as TreeType, TreeNode } from '../types';

interface RangeTreeProps {
  tree: TreeType;
  activeId: string | null;
  sidebarWidth?: number;
  onSelectRange: (id: string) => void;
  onAddFolder: (parentId: string | null) => void;
  onAddRange: (parentId: string | null) => void;
  onDeleteNode: (id: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDuplicateRange: (id: string) => void;
  onToggleFolderOpen: (id: string) => void;
  onMoveNode?: (id: string, direction: 'up' | 'down') => void;
  onUpdateNodeColor?: (id: string, color: string) => void;
  onImportBackup?: () => void;
  onExportBackup?: () => void;
  onResetAll?: () => void;
}

export default function RangeTree({
  tree,
  activeId,
  sidebarWidth,
  onSelectRange,
  onAddFolder,
  onAddRange,
  onDeleteNode,
  onRenameNode,
  onDuplicateRange,
  onToggleFolderOpen,
  onMoveNode,
  onUpdateNodeColor,
  onImportBackup,
  onExportBackup,
  onResetAll,
}: RangeTreeProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showControls, setShowControls] = useState(() => {
    return localStorage.getItem('preflop_show_tree_controls') !== 'false';
  });

  const sWidth = sidebarWidth ?? 320;

  useEffect(() => {
    localStorage.setItem('preflop_show_tree_controls', String(showControls));
  }, [showControls]);

  const handleStartRename = (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(node.id);
    setEditName(node.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRenameNode(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  // Color options palette
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

  // Render a single node and its children recursively
  const renderNode = (nodeId: string, level: number = 0) => {
    const node = tree[nodeId];
    if (!node) return null;

    const isEditing = editingId === node.id;
    const isSelected = activeId === node.id;

    if (node.type === 'folder') {
      const isOpen = !!node.isOpen;
      return (
        <div key={node.id} className="flex flex-col select-none">
          {/* Folder Row */}
          <div
            className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-sm cursor-pointer transition-all ${
              isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900/60'
            }`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => onToggleFolderOpen(node.id)}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Expand / Collapse icon */}
              <span className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded flex-shrink-0">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </span>

              {/* Folder Icon */}
              <span 
                className="flex-shrink-0 transition-colors"
                style={{ color: node.color || '#10b981' }} // default emerald-500 if empty
              >
                {isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              </span>

              {/* Folder Name / Input */}
              {isEditing ? (
                <div className="flex flex-col gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(node.id, e)}
                    className="bg-zinc-950 text-white text-xs px-1.5 py-1 rounded border border-emerald-500 focus:outline-none w-full"
                    autoFocus
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="text-[10px] text-zinc-400">Цвет:</span>
                    {colorsList.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          onUpdateNodeColor?.(node.id, c.hex);
                        }}
                        className={`w-3 h-3 rounded-full border transition-all cursor-pointer ${
                          node.color === c.hex || (!node.color && c.hex === '')
                            ? 'border-white scale-110 ring-1 ring-emerald-500'
                            : 'border-zinc-700 hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.hex || '#71717a' }}
                        title={c.label}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => handleSaveRename(node.id)}
                      className="ml-auto px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-semibold text-white rounded cursor-pointer"
                    >
                      Ок
                    </button>
                  </div>
                </div>
              ) : (
                <span 
                  className="font-medium truncate transition-colors"
                  style={node.color ? { color: node.color } : undefined}
                >
                  {node.name}
                </span>
              )}
            </div>

            {/* Folder Actions */}
            {showControls && !isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                {sWidth >= 160 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddRange(node.id);
                    }}
                    title="Добавить диапазон в эту папку"
                    className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                {sWidth >= 180 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddFolder(node.id);
                    }}
                    title="Добавить подпапку"
                    className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                )}
                {sWidth >= 250 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveNode?.(node.id, 'up');
                      }}
                      title="Переместить вверх"
                      className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveNode?.(node.id, 'down');
                      }}
                      title="Переместить вниз"
                      className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {sWidth >= 210 && (
                  <button
                    onClick={(e) => handleStartRename(node, e)}
                    title="Переименовать папку"
                    className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}
                {sWidth >= 160 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                    title="Удалить папку"
                    className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Children Items */}
          {isOpen && node.childrenIds && (
            <div className="flex flex-col">
              {node.childrenIds.length === 0 ? (
                <div
                  className="text-[11px] text-zinc-500 italic py-1"
                  style={{ paddingLeft: `${(level + 1) * 12 + 20}px` }}
                >
                  Папка пуста
                </div>
              ) : (
                node.childrenIds.map((childId) => renderNode(childId, level + 1))
              )}
            </div>
          )}
        </div>
      );
    } else {
      // Range Row
      return (
        <div
          key={node.id}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-sm cursor-pointer transition-all select-none ${
            isSelected
              ? 'bg-emerald-600/20 text-emerald-300 border-l-2 border-emerald-500 font-medium'
              : 'text-zinc-300 hover:bg-zinc-900/60'
          }`}
          style={{ paddingLeft: `${level * 12 + 16}px` }}
          onClick={() => onSelectRange(node.id)}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span 
              className="flex-shrink-0 transition-colors"
              style={{ color: node.color || (isSelected ? '#34d399' : '#a1a1aa') }} // default green or zinc if empty
            >
              <FileText className="h-3.5 w-3.5" />
            </span>

            {isEditing ? (
              <div className="flex flex-col gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(node.id, e)}
                  className="bg-zinc-950 text-white text-xs px-1.5 py-1 rounded border border-emerald-500 focus:outline-none w-full"
                  autoFocus
                />
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="text-[10px] text-zinc-400">Цвет:</span>
                  {colorsList.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        onUpdateNodeColor?.(node.id, c.hex);
                      }}
                      className={`w-3 h-3 rounded-full border transition-all cursor-pointer ${
                        node.color === c.hex || (!node.color && c.hex === '')
                          ? 'border-white scale-110 ring-1 ring-emerald-500'
                          : 'border-zinc-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex || '#71717a' }}
                      title={c.label}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => handleSaveRename(node.id)}
                    className="ml-auto px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-semibold text-white rounded cursor-pointer"
                  >
                    Ок
                  </button>
                </div>
              </div>
            ) : (
              <span 
                className="truncate font-medium transition-colors"
                style={node.color ? { color: node.color } : undefined}
              >
                {node.name}
              </span>
            )}
          </div>

          {/* Range Actions */}
          {showControls && !isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
              {sWidth >= 180 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateRange(node.id);
                  }}
                  title="Дублировать диапазон"
                  className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              {sWidth >= 250 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveNode?.(node.id, 'up');
                    }}
                    title="Переместить вверх"
                    className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveNode?.(node.id, 'down');
                    }}
                    title="Переместить вниз"
                    className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {sWidth >= 210 && (
                <button
                  onClick={(e) => handleStartRename(node, e)}
                  title="Переименовать диапазон"
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
              {sWidth >= 160 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  title="Удалить диапазон"
                  className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
  };

  // Find root level nodes (those with parentId = null) and sort by order
  const rootIds = Object.keys(tree)
    .filter((id) => tree[id].parentId === null)
    .sort((a, b) => {
      const orderA = tree[a].order ?? 0;
      const orderB = tree[b].order ?? 0;
      return orderA - orderB;
    });

  return (
    <div 
      style={{ width: sidebarWidth ? `${sidebarWidth}px` : undefined }}
      className={`flex flex-col h-full bg-zinc-950 border-r border-zinc-900 flex-shrink-0 ${sidebarWidth ? '' : 'w-full md:w-80'}`}
    >
      {/* Title / Root Add buttons / Controls Toggle */}
      <div className="p-4 border-b border-zinc-900 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ваши диапазоны
          </span>
          
          {/* Controls toggle (Eye) */}
          <button
            onClick={() => setShowControls(!showControls)}
            title={showControls ? "Скрыть кнопки управления" : "Показать кнопки управления"}
            className={`p-1 text-[11px] rounded border transition-all cursor-pointer px-1.5 flex items-center gap-1 ${
              showControls 
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'text-zinc-400 bg-zinc-900 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {showControls ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {sWidth >= 180 && <span>Действия</span>}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAddRange(null)}
            title="Создать диапазон в корне"
            className="flex-1 flex items-center justify-center gap-1 p-1 text-xs text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 rounded border border-zinc-800/80 transition-all cursor-pointer py-1"
          >
            <FilePlus className="h-3 w-3" />
            <span>+Чарт</span>
          </button>
          <button
            onClick={() => onAddFolder(null)}
            title="Создать папку в корне"
            className="flex-1 flex items-center justify-center gap-1 p-1 text-xs text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 rounded border border-zinc-800/80 transition-all cursor-pointer py-1"
          >
            <FolderPlus className="h-3 w-3" />
            <span>+Папка</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {rootIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <p className="text-xs text-zinc-500 mb-3">У вас пока нет диапазонов.</p>
            <button
              onClick={() => onAddRange(null)}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-1.5 px-3 rounded-lg shadow transition-all cursor-pointer"
            >
              Создать первый диапазон
            </button>
          </div>
        ) : (
          rootIds.map((id) => renderNode(id))
        )}
      </div>

      {/* Sidebar Footer with Import, Export, Reset */}
      <div className="p-3 border-t border-zinc-900 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-sm">
        <button
          onClick={onImportBackup}
          title="Импортировать резервную копию"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-300 rounded-lg text-[11px] transition-all cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5 text-zinc-400" />
          {sWidth >= 160 && <span>Импорт</span>}
        </button>
        <button
          onClick={onExportBackup}
          title="Экспортировать резервную копию"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-300 rounded-lg text-[11px] transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-zinc-400" />
          {sWidth >= 160 && <span>Экспорт</span>}
        </button>
        <button
          onClick={onResetAll}
          title="Сбросить все чарты до исходных"
          className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-800/40 text-red-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
