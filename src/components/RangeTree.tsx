import React, { useState, useEffect, useRef } from 'react';
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
  Upload, 
  Download, 
  RefreshCw,
  MoreVertical,
  Palette,
  Check,
  X
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

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
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
  const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const sWidth = sidebarWidth ?? 320;

  // Close context menu & color picker on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      setColorPickerNodeId(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setColorPickerNodeId(null);
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

  const handleStartRename = (node: TreeNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu(null);
    setColorPickerNodeId(null);
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

  const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
    setColorPickerNodeId(null);

    // Adjust position to stay inside viewport
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 300);
    setContextMenu({ x, y, nodeId });
  };

  // Render inline color picker popup
  const renderInlineColorPicker = (node: TreeNode) => {
    return (
      <div 
        className="flex items-center gap-1 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-zinc-400 mr-1 font-medium">Цвет:</span>
        {colorsList.map((c) => (
          <button
            key={c.hex}
            type="button"
            onClick={() => {
              onUpdateNodeColor?.(node.id, c.hex);
              setColorPickerNodeId(null);
            }}
            className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
              node.color === c.hex || (!node.color && c.hex === '')
                ? 'border-white scale-125 ring-2 ring-emerald-400'
                : 'border-zinc-700 hover:scale-110'
            }`}
            style={{ backgroundColor: c.hex || '#71717a' }}
            title={c.label}
          />
        ))}
        <button
          type="button"
          onClick={() => setColorPickerNodeId(null)}
          className="ml-1 p-0.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  // Render a single node and its children recursively
  const renderNode = (nodeId: string, level: number = 0) => {
    const node = tree[nodeId];
    if (!node) return null;

    const isEditing = editingId === node.id;
    const isSelected = activeId === node.id;
    const isColorPickerOpen = colorPickerNodeId === node.id;

    if (node.type === 'folder') {
      const isOpen = !!node.isOpen;
      return (
        <div key={node.id} className="flex flex-col select-none">
          {/* Folder Row */}
          <div
            className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg text-sm cursor-pointer transition-all ${
              isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900/80'
            }`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => onToggleFolderOpen(node.id)}
            onDoubleClick={(e) => handleStartRename(node, e)}
            onContextMenu={(e) => handleContextMenu(e, node.id)}
            title="Клик: открыть/закрыть | Двойной клик: переименовать | ПКМ: меню действий"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Expand / Collapse icon */}
              <span className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded flex-shrink-0">
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </span>

              {/* Folder Icon */}
              <span 
                className="flex-shrink-0 transition-colors"
                style={{ color: node.color || '#10b981' }}
              >
                {isOpen ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
              </span>

              {/* Folder Name / Input */}
              {isEditing ? (
                <div className="flex flex-col gap-1.5 w-full py-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(node.id, e)}
                      className="bg-zinc-950 text-white text-xs px-2 py-1 rounded border border-emerald-500 focus:outline-none flex-1"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(node.id)}
                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                      title="Сохранить"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                      title="Отмена"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-zinc-400">Цвет:</span>
                    {colorsList.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          onUpdateNodeColor?.(node.id, c.hex);
                        }}
                        className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                          node.color === c.hex || (!node.color && c.hex === '')
                            ? 'border-white scale-125 ring-1 ring-emerald-500'
                            : 'border-zinc-700 hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.hex || '#71717a' }}
                        title={c.label}
                      />
                    ))}
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

            {/* Inline Color Picker Popover if triggered */}
            {isColorPickerOpen && (
              <div className="absolute right-2 top-8 z-30">
                {renderInlineColorPicker(node)}
              </div>
            )}

            {/* Folder Actions (Visible on hover and on selected) */}
            {!isEditing && (
              <div className={`flex items-center gap-0.5 transition-opacity ml-1.5 flex-shrink-0 ${
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                {/* Add Range */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddRange(node.id);
                  }}
                  title="Добавить чарт в эту папку"
                  className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                {/* Add Subfolder */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddFolder(node.id);
                  }}
                  title="Добавить подпапку"
                  className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800 transition-colors"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>

                {/* Color Picker */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerNodeId(colorPickerNodeId === node.id ? null : node.id);
                  }}
                  title="Изменить цвет"
                  className="p-1 text-zinc-400 hover:text-amber-400 rounded hover:bg-zinc-800 transition-colors"
                >
                  <Palette className="h-3.5 w-3.5" />
                </button>

                {/* Duplicate Folder */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateRange(node.id);
                  }}
                  title="Дублировать папку (со всеми чартами)"
                  className="p-1 text-zinc-400 hover:text-sky-400 rounded hover:bg-zinc-800 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>

                {/* Rename */}
                <button
                  onClick={(e) => handleStartRename(node, e)}
                  title="Переименовать папку"
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id);
                  }}
                  title="Удалить папку"
                  className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>

                {/* More / Context Menu trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, node.id);
                  }}
                  title="Все действия (ПКМ)"
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
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
          className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg text-sm cursor-pointer transition-all select-none ${
            isSelected
              ? 'bg-emerald-600/20 text-emerald-300 border-l-2 border-emerald-500 font-medium'
              : 'text-zinc-300 hover:bg-zinc-900/80'
          }`}
          style={{ paddingLeft: `${level * 12 + 16}px` }}
          onClick={() => onSelectRange(node.id)}
          onDoubleClick={(e) => handleStartRename(node, e)}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
          title="Клик: выбрать чарт | Двойной клик: переименовать | ПКМ: меню действий"
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span 
              className="flex-shrink-0 transition-colors"
              style={{ color: node.color || (isSelected ? '#34d399' : '#a1a1aa') }}
            >
              <FileText className="h-3.5 w-3.5" />
            </span>

            {isEditing ? (
              <div className="flex flex-col gap-1.5 w-full py-1" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(node.id, e)}
                    className="bg-zinc-950 text-white text-xs px-2 py-1 rounded border border-emerald-500 focus:outline-none flex-1"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRename(node.id)}
                    className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                    title="Сохранить"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded cursor-pointer"
                    title="Отмена"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-zinc-400">Цвет:</span>
                  {colorsList.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        onUpdateNodeColor?.(node.id, c.hex);
                      }}
                      className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                        node.color === c.hex || (!node.color && c.hex === '')
                          ? 'border-white scale-125 ring-1 ring-emerald-500'
                          : 'border-zinc-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex || '#71717a' }}
                      title={c.label}
                    />
                  ))}
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

          {/* Inline Color Picker Popover if triggered */}
          {isColorPickerOpen && (
            <div className="absolute right-2 top-8 z-30">
              {renderInlineColorPicker(node)}
            </div>
          )}

          {/* Range Actions (Visible on hover and on selected) */}
          {!isEditing && (
            <div className={`flex items-center gap-0.5 transition-opacity ml-1.5 flex-shrink-0 ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              {/* Color Picker */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setColorPickerNodeId(colorPickerNodeId === node.id ? null : node.id);
                }}
                title="Изменить цвет"
                className="p-1 text-zinc-400 hover:text-amber-400 rounded hover:bg-zinc-800 transition-colors"
              >
                <Palette className="h-3.5 w-3.5" />
              </button>

              {/* Duplicate */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateRange(node.id);
                }}
                title="Дублировать чарт"
                className="p-1 text-zinc-400 hover:text-emerald-400 rounded hover:bg-zinc-800 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              {/* Rename */}
              <button
                onClick={(e) => handleStartRename(node, e)}
                title="Переименовать чарт"
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id);
                }}
                title="Удалить чарт"
                className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>

              {/* More / Context Menu trigger */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, node.id);
                }}
                title="Все действия (ПКМ)"
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
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

  // Selected context menu node details
  const contextNode = contextMenu ? tree[contextMenu.nodeId] : null;

  return (
    <div 
      style={{ width: sidebarWidth ? `${sidebarWidth}px` : undefined }}
      className={`flex flex-col h-full bg-zinc-950 border-r border-zinc-900 flex-shrink-0 select-none ${sidebarWidth ? '' : 'w-full md:w-80'}`}
    >
      {/* Sticky Header: Root Add buttons (+Чарт, +Папка) */}
      <div className="sticky top-0 z-20 bg-zinc-950 p-3.5 border-b border-zinc-900 flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ваши диапазоны
          </span>
          <span className="text-[10px] text-zinc-500">
            ПКМ для меню
          </span>
        </div>

        {/* Action buttons: +Чарт and +Папка */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddRange(null)}
            title="Создать новый чарт в корне"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 rounded-lg border border-emerald-800/50 hover:border-emerald-600/70 transition-all cursor-pointer shadow-sm"
          >
            <FilePlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>+Чарт</span>
          </button>
          <button
            onClick={() => onAddFolder(null)}
            title="Создать новую папку в корне"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-850 hover:text-white rounded-lg border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer shadow-sm"
          >
            <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>+Папка</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
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
      <div className="p-2.5 border-t border-zinc-900 flex items-center gap-1.5 bg-zinc-950/90 backdrop-blur-sm">
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

      {/* Global Context Menu (ПКМ / клик по More) */}
      {contextMenu && contextNode && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 bg-zinc-900/95 backdrop-blur-md border border-zinc-750 rounded-xl shadow-2xl p-1.5 flex flex-col text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header of Context Menu: Node title */}
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
            onClick={(e) => handleStartRename(contextNode, e)}
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

          {/* Action: Add Chart inside folder or next to it */}
          <button
            onClick={() => {
              setContextMenu(null);
              onAddRange(contextNode.type === 'folder' ? contextNode.id : contextNode.parentId);
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer border-t border-zinc-800/60 mt-0.5"
          >
            <Plus className="h-3.5 w-3.5 text-emerald-400" />
            <span>{contextNode.type === 'folder' ? 'Добавить чарт в папку' : 'Создать чарт рядом'}</span>
          </button>

          {/* Action: Add Folder inside folder or next to it */}
          <button
            onClick={() => {
              setContextMenu(null);
              onAddFolder(contextNode.type === 'folder' ? contextNode.id : contextNode.parentId);
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>{contextNode.type === 'folder' ? 'Добавить подпапку' : 'Создать папку рядом'}</span>
          </button>

          {/* Action: Duplicate */}
          <button
            onClick={() => {
              setContextMenu(null);
              onDuplicateRange(contextNode.id);
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-left cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-sky-400" />
            <span>{contextNode.type === 'folder' ? 'Дублировать папку (со всеми чартами)' : 'Создать копию чарта'}</span>
          </button>

          {/* Move Up / Move Down */}
          {onMoveNode && (
            <div className="flex items-center gap-1 px-1 py-1 border-t border-zinc-800/60 my-0.5">
              <button
                onClick={() => {
                  onMoveNode(contextNode.id, 'up');
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 hover:bg-zinc-800 rounded text-[11px] text-zinc-300"
                title="Переместить вверх"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Вверх</span>
              </button>
              <button
                onClick={() => {
                  onMoveNode(contextNode.id, 'down');
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 hover:bg-zinc-800 rounded text-[11px] text-zinc-300"
                title="Переместить вниз"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Вниз</span>
              </button>
            </div>
          )}

          {/* Action: Delete */}
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
        </div>
      )}
    </div>
  );
}
