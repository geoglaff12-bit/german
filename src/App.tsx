import React, { useState, useEffect } from 'react';
import RangeTree from './components/RangeTree';
import HandMatrix from './components/HandMatrix';
import ActionPalette from './components/ActionPalette';
import BottomFolderNav from './components/BottomFolderNav';
import AuthModal from './components/AuthModal';
import UserMenu from './components/UserMenu';
import { RangeTree as TreeType, RangeAction, RangeGrid, TreeNode, User } from './types';
import { parseRangeNotation } from './utils/poker';
import { 
  getCurrentUser, 
  initializeAuthStore, 
  logoutUser 
} from './services/auth';
import { 
  FileText, 
  Layers, 
  Paintbrush, 
  Eye, 
  Edit3, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Folder,
  Download,
  Upload,
  RefreshCw,
  FolderTree
} from 'lucide-react';

// Seeding default professional preflop poker charts
const DEFAULT_ACTIONS: RangeAction[] = [
  { id: 'act-raise', name: 'Raise (Повысить)', color: '#EF4444' }, // Red
  { id: 'act-call', name: 'Call (Колл)', color: '#10B981' },   // Green
  { id: 'act-3bet', name: '3-Bet (Ре-рейз)', color: '#F59E0B' },  // Orange
];

const seedDefaultTree = (): TreeType => {
  const rootFolderId = 'folder-cash-6max';
  const utgRangeId = 'range-utg-rfi';
  const btnRangeId = 'range-btn-rfi';

  // Seed UTG RFI (15% GTO cash range)
  const utgCombos = parseRangeNotation('77+, A2s+, K9s+, QTs+, JTs, T9s, 98s, 87s, ATo+, KJo+, QJo');
  const utgGrid: RangeGrid = {};
  utgCombos.forEach((combo) => {
    utgGrid[combo] = { 'act-raise': 100 };
  });

  // Seed BTN RFI (40% GTO cash range)
  const btnCombos = parseRangeNotation('22+, A2s+, K2s+, Q2s+, J5s+, T7s+, 97s+, 86s+, 76s, 65s, 54s, A2o+, K8o+, Q9o+, J9o+, T9o');
  const btnGrid: RangeGrid = {};
  btnCombos.forEach((combo) => {
    btnGrid[combo] = { 'act-raise': 100 };
  });

  return {
    [rootFolderId]: {
      id: rootFolderId,
      name: 'Кэш 6-Max (GTO)',
      type: 'folder',
      parentId: null,
      childrenIds: [utgRangeId, btnRangeId],
      isOpen: true,
    },
    [utgRangeId]: {
      id: utgRangeId,
      name: 'UTG - RFI (Опенрейз)',
      type: 'range',
      parentId: rootFolderId,
      grid: utgGrid,
      actions: [...DEFAULT_ACTIONS],
      notes: 'Диапазон открытия из ранней позиции (UTG) за 6-max столом. Играем аккуратно, так как за нами еще 5 игроков.',
    },
    [btnRangeId]: {
      id: btnRangeId,
      name: 'BTN - RFI (Опенрейз)',
      type: 'range',
      parentId: rootFolderId,
      grid: btnGrid,
      actions: [...DEFAULT_ACTIONS],
      notes: 'Широкий диапазон открытия с баттона (BTN). Используем преимущество позиции на постфлопе.',
    },
  };
};

export interface CustomModalState {
  type: 'add_folder' | 'add_range' | 'delete_node' | 'delete_action' | 'clear_grid' | 'reset_all' | 'backup_import' | 'alert' | null;
  title: string;
  message?: string;
  inputValue?: string;
  placeholder?: string;
  nodeId?: string | null;
  actionId?: string;
  alertType?: 'success' | 'error' | 'info';
}

export default function App() {
  // Initialize Auth store
  useEffect(() => {
    initializeAuthStore();
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !getCurrentUser());

  const [tree, setTree] = useState<TreeType>({});
  const [actions, setActions] = useState<RangeAction[]>(DEFAULT_ACTIONS);
  const [modal, setModal] = useState<CustomModalState>({ type: null, title: '' });
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>('act-raise');
  const [activeWeight, setActiveWeight] = useState<number>(100);
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isViewMode, setIsViewMode] = useState<boolean>(() => {
    return localStorage.getItem('preflop_view_mode') === 'true';
  });
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    const stored = localStorage.getItem('preflop_show_sidebar');
    if (stored !== null) return stored === 'true';
    return localStorage.getItem('preflop_view_mode') !== 'true';
  });
  const [showBottomFolders, setShowBottomFolders] = useState<boolean>(() => {
    return localStorage.getItem('preflop_show_bottom_folders') !== 'false';
  });
  const [showPalette, setShowPalette] = useState<boolean>(() => {
    return localStorage.getItem('preflop_show_palette') !== 'false';
  });

  // User-specific storage keys
  const userTreeKey = currentUser ? `preflop_range_tree_${currentUser.id}` : 'preflop_range_tree';
  const userActionsKey = currentUser ? `preflop_range_actions_${currentUser.id}` : 'preflop_range_actions';
  const userActiveIdKey = currentUser ? `preflop_active_range_id_${currentUser.id}` : 'preflop_active_range_id';

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('preflop_view_mode', String(isViewMode));
  }, [isViewMode]);

  useEffect(() => {
    localStorage.setItem('preflop_show_sidebar', String(showSidebar));
  }, [showSidebar]);

  useEffect(() => {
    localStorage.setItem('preflop_show_bottom_folders', String(showBottomFolders));
  }, [showBottomFolders]);

  useEffect(() => {
    localStorage.setItem('preflop_show_palette', String(showPalette));
  }, [showPalette]);

  // Load tree and settings when currentUser changes
  useEffect(() => {
    const storedTree = localStorage.getItem(userTreeKey) || localStorage.getItem('preflop_range_tree');
    const storedActions = localStorage.getItem(userActionsKey) || localStorage.getItem('preflop_range_actions');
    const storedActiveId = localStorage.getItem(userActiveIdKey) || localStorage.getItem('preflop_active_range_id');
    const storedSidebarWidth = localStorage.getItem('preflop_sidebar_width');

    if (storedTree) {
      try {
        setTree(JSON.parse(storedTree));
      } catch (e) {
        setTree(seedDefaultTree());
      }
    } else {
      setTree(seedDefaultTree());
    }

    if (storedActions) {
      try {
        setActions(JSON.parse(storedActions));
      } catch (e) {
        setActions(DEFAULT_ACTIONS);
      }
    } else {
      setActions(DEFAULT_ACTIONS);
    }

    if (storedActiveId) {
      setActiveRangeId(storedActiveId);
    } else {
      setActiveRangeId('range-utg-rfi');
    }

    if (storedSidebarWidth) {
      const parsedWidth = parseInt(storedSidebarWidth, 10);
      if (!isNaN(parsedWidth)) {
        setSidebarWidth(parsedWidth);
      }
    }
  }, [currentUser?.id]);

  // Save to localStorage on changes
  useEffect(() => {
    if (Object.keys(tree).length > 0) {
      localStorage.setItem(userTreeKey, JSON.stringify(tree));
      // Also sync to global key for backup
      localStorage.setItem('preflop_range_tree', JSON.stringify(tree));
    }
  }, [tree, userTreeKey]);

  useEffect(() => {
    localStorage.setItem(userActionsKey, JSON.stringify(actions));
  }, [actions, userActionsKey]);

  useEffect(() => {
    if (activeRangeId) {
      localStorage.setItem(userActiveIdKey, activeRangeId);
    }
  }, [activeRangeId, userActiveIdKey]);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  // Save sidebar width to localStorage on change
  useEffect(() => {
    localStorage.setItem('preflop_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle sidebar resize dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      // enforce min width of 120 and max width of 600
      const newWidth = Math.max(120, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Tree Handlers
  const handleSelectRange = (id: string) => {
    setActiveRangeId(id);
    // Reset active action to something available if switching charts
    const rangeObj = tree[id];
    if (rangeObj && rangeObj.actions && rangeObj.actions.length > 0) {
      setActiveActionId(rangeObj.actions[0].id);
    }
  };

  const handleAddFolder = (parentId: string | null) => {
    setModal({
      type: 'add_folder',
      title: 'Создать новую папку',
      inputValue: '',
      placeholder: 'Имя папки (например, 3-бет Поты)',
      nodeId: parentId,
    });
  };

  const handleAddRange = (parentId: string | null) => {
    setModal({
      type: 'add_range',
      title: 'Создать новый диапазон',
      inputValue: '',
      placeholder: 'Имя диапазона (например, UTG vs 3-Bet)',
      nodeId: parentId,
    });
  };

  const handleDeleteNode = (id: string) => {
    const node = tree[id];
    if (!node) return;
    setModal({
      type: 'delete_node',
      title: node.type === 'folder' ? 'Удалить папку' : 'Удалить чарт',
      message: node.type === 'folder'
        ? `Вы уверены, что хотите удалить папку "${node.name}" и всё её содержимое? Это действие сотрет все внутренние чарты.`
        : `Вы уверены, что хотите удалить диапазон "${node.name}"?`,
      nodeId: id,
    });
  };

  const handleRenameNode = (id: string, newName: string) => {
    setTree((prev) => {
      const next = { ...prev };
      if (next[id]) {
        next[id] = { ...next[id], name: newName };
      }
      return next;
    });
  };

  const handleDuplicateRange = (id: string) => {
    const sourceNode = tree[id];
    if (!sourceNode || sourceNode.type !== 'range') return;

    const newId = 'range-' + Math.random().toString(36).substr(2, 9);
    const duplicatedNode: TreeNode = {
      ...sourceNode,
      id: newId,
      name: `${sourceNode.name} (Копия)`,
      // Deep copy grid
      grid: JSON.parse(JSON.stringify(sourceNode.grid || {})),
    };

    setTree((prev) => {
      const next = { ...prev, [newId]: duplicatedNode };
      const parentId = sourceNode.parentId;
      if (parentId && next[parentId]) {
        next[parentId] = {
          ...next[parentId],
          childrenIds: [...(next[parentId].childrenIds || []), newId],
        };
      }
      return next;
    });
    setActiveRangeId(newId);
  };

  const handleToggleFolderOpen = (id: string) => {
    setTree((prev) => {
      const next = { ...prev };
      if (next[id]) {
        next[id] = { ...next[id], isOpen: !next[id].isOpen };
      }
      return next;
    });
  };

  // Matrix and Palette Actions
  const handleGridChange = (newGrid: RangeGrid) => {
    if (!activeRangeId) return;
    setTree((prev) => {
      const next = { ...prev };
      if (next[activeRangeId]) {
        next[activeRangeId] = { ...next[activeRangeId], grid: newGrid };
      }
      return next;
    });
  };

  const handleAddAction = (name: string, color: string) => {
    const actionId = 'act-' + Math.random().toString(36).substr(2, 9);
    const newAction: RangeAction = { id: actionId, name, color };

    // Update global state and update active chart actions
    const updatedActions = [...actions, newAction];
    setActions(updatedActions);

    if (activeRangeId) {
      setTree((prev) => {
        const next = { ...prev };
        if (next[activeRangeId]) {
          next[activeRangeId] = {
            ...next[activeRangeId],
            actions: [...(next[activeRangeId].actions || actions), newAction],
          };
        }
        return next;
      });
    }
    setActiveActionId(actionId);
  };

  const handleDeleteAction = (actionId: string) => {
    const act = actions.find((a) => a.id === actionId);
    if (!act) return;
    setModal({
      type: 'delete_action',
      title: 'Удалить действие',
      message: `Вы уверены, что хотите удалить действие "${act.name}"? Это полностью очистит его с ваших чартов.`,
      actionId,
    });
  };

  const handleUpdateAction = (id: string, name: string, color: string) => {
    const updatedActions = actions.map((a) => (a.id === id ? { ...a, name, color } : a));
    setActions(updatedActions);

    if (activeRangeId) {
      setTree((prev) => {
        const next = { ...prev };
        if (next[activeRangeId]) {
          next[activeRangeId] = {
            ...next[activeRangeId],
            actions: (next[activeRangeId].actions || actions).map((a) =>
              a.id === id ? { ...a, name, color } : a
            ),
          };
        }
        return next;
      });
    }
  };

  // Import / Export backups
  const handleExportBackup = () => {
    const backup = { tree, actions };
    navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
    setModal({
      type: 'alert',
      title: 'Экспорт резервной копии',
      message: 'Полная резервная копия ваших чартов успешно скопирована в буфер обмена в виде JSON!',
      alertType: 'success',
    });
  };

  const handleImportBackup = () => {
    setModal({
      type: 'backup_import',
      title: 'Импортировать бекап',
      placeholder: 'Вставьте JSON-строку резервной копии...',
      inputValue: '',
    });
  };

  const handleResetAll = () => {
    setModal({
      type: 'reset_all',
      title: 'Сбросить все данные',
      message: 'Вы уверены, что хотите сбросить все папки, чарты и действия до стандартных шаблонов Cash 6-Max? Ваши текущие изменения будут потеряны.',
    });
  };

  const handleClearGridModal = () => {
    setModal({
      type: 'clear_grid',
      title: 'Очистить диапазон',
      message: 'Вы уверены, что хотите полностью стереть закрашенные комбинации на этом чарте?',
    });
  };

  const handleModalSubmit = () => {
    const { type, inputValue, nodeId, actionId } = modal;

    if (type === 'add_folder') {
      const name = inputValue?.trim() || 'Новая папка';
      const folderId = 'folder-' + Math.random().toString(36).substr(2, 9);
      const newFolder: TreeNode = {
        id: folderId,
        name,
        type: 'folder',
        parentId: nodeId || null,
        childrenIds: [],
        isOpen: true,
      };

      setTree((prev) => {
        const next = { ...prev, [folderId]: newFolder };
        if (nodeId && next[nodeId]) {
          next[nodeId] = {
            ...next[nodeId],
            childrenIds: [...(next[nodeId].childrenIds || []), folderId],
          };
        }
        return next;
      });
    }

    else if (type === 'add_range') {
      const name = inputValue?.trim() || 'Новый диапазон';
      const rangeId = 'range-' + Math.random().toString(36).substr(2, 9);
      const newRange: TreeNode = {
        id: rangeId,
        name,
        type: 'range',
        parentId: nodeId || null,
        grid: {},
        actions: [...actions],
        notes: '',
      };

      setTree((prev) => {
        const next = { ...prev, [rangeId]: newRange };
        if (nodeId && next[nodeId]) {
          next[nodeId] = {
            ...next[nodeId],
            childrenIds: [...(next[nodeId].childrenIds || []), rangeId],
          };
        }
        return next;
      });
      setActiveRangeId(rangeId);
    }

    else if (type === 'delete_node') {
      if (nodeId) {
        setTree((prev) => {
          const next = { ...prev };
          const node = next[nodeId];
          if (!node) return prev;

          // Unlink from parent
          if (node.parentId && next[node.parentId]) {
            next[node.parentId] = {
              ...next[node.parentId],
              childrenIds: (next[node.parentId].childrenIds || []).filter((cid) => cid !== nodeId),
            };
          }

          // Recursive delete helper for children
          const deleteRecursive = (targetId: string) => {
            const targetNode = next[targetId];
            if (!targetNode) return;
            if (targetNode.type === 'folder' && targetNode.childrenIds) {
              targetNode.childrenIds.forEach((cid) => deleteRecursive(cid));
            }
            delete next[targetId];
          };

          deleteRecursive(nodeId);

          // Reset active ID if we deleted the current active range
          if (activeRangeId === nodeId) {
            const remainingRanges = (Object.values(next) as TreeNode[]).filter((n) => n.type === 'range');
            setActiveRangeId(remainingRanges.length > 0 ? remainingRanges[0].id : null);
          }

          return next;
        });
      }
    }

    else if (type === 'delete_action') {
      if (actionId) {
        const updatedActions = actions.filter((a) => a.id !== actionId);
        setActions(updatedActions);

        // Update active chart and clean cells painted with this action
        if (activeRangeId) {
          setTree((prev) => {
            const next = { ...prev };
            const activeNode = next[activeRangeId];
            if (activeNode) {
              const newGrid = { ...activeNode.grid };
              // Clean actionId from all cell dictionaries
              for (const hand of Object.keys(newGrid)) {
                if (newGrid[hand]) {
                  const cell = { ...newGrid[hand] };
                  delete cell[actionId];
                  newGrid[hand] = cell;
                }
              }
              next[activeRangeId] = {
                ...activeNode,
                grid: newGrid,
                actions: (activeNode.actions || actions).filter((a) => a.id !== actionId),
              };
            }
            return next;
          });
        }

        if (activeActionId === actionId) {
          setActiveActionId(updatedActions.length > 0 ? updatedActions[0].id : null);
        }
      }
    }

    else if (type === 'clear_grid') {
      if (activeRangeId) {
        setTree((prev) => {
          const next = { ...prev };
          if (next[activeRangeId]) {
            next[activeRangeId] = { ...next[activeRangeId], grid: {} };
          }
          return next;
        });
      }
    }

    else if (type === 'reset_all') {
      localStorage.clear();
      setTree(seedDefaultTree());
      setActions(DEFAULT_ACTIONS);
      setActiveRangeId('range-utg-rfi');
      setActiveActionId('act-raise');
    }

    else if (type === 'backup_import') {
      if (inputValue) {
        try {
          const parsed = JSON.parse(inputValue);
          if (parsed.tree && parsed.actions) {
            setTree(parsed.tree);
            setActions(parsed.actions);
            const rangeKeys = Object.keys(parsed.tree).filter((k) => parsed.tree[k].type === 'range');
            if (rangeKeys.length > 0) {
              setActiveRangeId(rangeKeys[0]);
            }
            setModal({
              type: 'alert',
              title: 'Импорт завершен',
              message: 'Ваша резервная копия успешно импортирована!',
              alertType: 'success'
            });
            return;
          } else {
            setModal({
              type: 'alert',
              title: 'Ошибка импорта',
              message: 'Некорректный формат файла резервной копии. Отсутствует дерево или действия.',
              alertType: 'error'
            });
            return;
          }
        } catch (e) {
          setModal({
            type: 'alert',
            title: 'Ошибка разбора JSON',
            message: 'Введен некорректный JSON. Пожалуйста, убедитесь, что скопировали данные без ошибок.',
            alertType: 'error'
          });
          return;
        }
      }
    }

    // Close the modal
    setModal({ type: null, title: '' });
  };

  // Move nodes (folders or ranges) up and down
  const handleMoveNode = (id: string, direction: 'up' | 'down') => {
    setTree((prev) => {
      const next = { ...prev };
      const node = next[id];
      if (!node) return prev;

      if (node.parentId !== null) {
        // Parent folder context
        const parent = next[node.parentId];
        if (!parent || !parent.childrenIds) return prev;

        const children = [...parent.childrenIds];
        const idx = children.indexOf(id);
        if (idx === -1) return prev;

        if (direction === 'up' && idx > 0) {
          // Swap with previous
          children[idx] = children[idx - 1];
          children[idx - 1] = id;
        } else if (direction === 'down' && idx < children.length - 1) {
          // Swap with next
          children[idx] = children[idx + 1];
          children[idx + 1] = id;
        } else {
          return prev; // No swap possible
        }

        next[node.parentId] = {
          ...parent,
          childrenIds: children,
        };
      } else {
        // Root-level context
        const rootNodes = Object.keys(next)
          .filter((key) => next[key].parentId === null)
          .sort((a, b) => {
            const orderA = next[a].order ?? 0;
            const orderB = next[b].order ?? 0;
            return orderA - orderB;
          });

        // Re-assign consecutive indices to avoid duplicates or gaps
        rootNodes.forEach((key, index) => {
          next[key] = { ...next[key], order: index };
        });

        const idx = rootNodes.indexOf(id);
        if (idx === -1) return prev;

        if (direction === 'up' && idx > 0) {
          const prevId = rootNodes[idx - 1];
          next[id] = { ...next[id], order: idx - 1 };
          next[prevId] = { ...next[prevId], order: idx };
        } else if (direction === 'down' && idx < rootNodes.length - 1) {
          const nextId = rootNodes[idx + 1];
          next[id] = { ...next[id], order: idx + 1 };
          next[nextId] = { ...next[nextId], order: idx };
        } else {
          return prev; // No swap possible
        }
      }

      return next;
    });
  };

  const handleUpdateNodeColor = (id: string, color: string) => {
    setTree((prev) => {
      const next = { ...prev };
      if (next[id]) {
        next[id] = {
          ...next[id],
          color,
        };
      }
      return next;
    });
  };

  const activeRangeNode = activeRangeId ? tree[activeRangeId] : null;
  const activeActionObj = actions.find((a) => a.id === activeActionId);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* Top Application Navigation Bar */}
      <header className="h-12 bg-zinc-950 border-b border-zinc-900 px-4 flex items-center justify-between flex-shrink-0 z-20">
        {/* Left branding & sidebar toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? "Скрыть сайдбар" : "Показать сайдбар"}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 transition-all cursor-pointer"
          >
            {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4 text-emerald-400" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
              PreflopRange
            </span>
          </div>

          {activeRangeNode && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 border-l border-zinc-850 pl-3">
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium text-zinc-200 truncate max-w-[200px]">{activeRangeNode.name}</span>
            </div>
          )}
        </div>

        {/* Center/Right: Mode Switcher & Quick Tools */}
        <div className="flex items-center gap-2.5">
          {/* Mode Switcher: View vs Edit */}
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 shadow-inner">
            <button
              onClick={() => {
                setIsViewMode(true);
                setShowSidebar(false);
              }}
              title="Перейти в режим удобного просмотра чартов"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isViewMode
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Просмотр</span>
            </button>

            <button
              onClick={() => {
                setIsViewMode(false);
                setShowSidebar(true);
              }}
              title="Перейти в режим редактирования и рисования"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isViewMode
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Редактор</span>
            </button>
          </div>

          {/* Edit mode toggles */}
          {!isViewMode && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => setShowPalette(!showPalette)}
                title={showPalette ? "Скрыть палитру" : "Показать палитру"}
                className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  showPalette
                    ? 'bg-zinc-900 text-zinc-300 border-zinc-800'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <Paintbrush className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setShowBottomFolders(!showBottomFolders)}
                title={showBottomFolders ? "Скрыть папки под матрицей" : "Показать папки под матрицей"}
                className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  showBottomFolders
                    ? 'bg-zinc-900 text-zinc-300 border-zinc-800'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <FolderTree className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* User Menu & Profile */}
          <div className="border-l border-zinc-850 pl-2">
            <UserMenu
              user={currentUser}
              totalChartsCount={(Object.values(tree) as TreeNode[]).filter((n) => n.type === 'range').length}
              onLogout={handleLogout}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Trees (Optional in View Mode) */}
        {showSidebar && (
          <>
            <RangeTree
              tree={tree}
              activeId={activeRangeId}
              sidebarWidth={sidebarWidth}
              onSelectRange={handleSelectRange}
              onAddFolder={handleAddFolder}
              onAddRange={handleAddRange}
              onDeleteNode={handleDeleteNode}
              onRenameNode={handleRenameNode}
              onDuplicateRange={handleDuplicateRange}
              onToggleFolderOpen={handleToggleFolderOpen}
              onMoveNode={handleMoveNode}
              onUpdateNodeColor={handleUpdateNodeColor}
              onImportBackup={handleImportBackup}
              onExportBackup={handleExportBackup}
              onResetAll={handleResetAll}
            />

            {/* Vertical Resize Splitter Bar */}
            <div
              onMouseDown={handleMouseDownResize}
              className={`w-[4px] hover:w-[6px] bg-zinc-900 hover:bg-emerald-500/40 cursor-col-resize transition-all duration-150 flex-shrink-0 relative group h-full ${
                isResizing ? 'bg-emerald-500/60 w-[6px]' : ''
              }`}
              title="Перетащите для изменения размера"
            >
              <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize z-50" />
            </div>
          </>
        )}

        {/* Middle Grid & Bottom Folder Navigation Panel */}
        <div
          className={`flex-1 overflow-y-auto ${
            isViewMode ? 'p-2 sm:p-3 gap-2 sm:gap-3' : 'p-4 sm:p-6 gap-6'
          } flex flex-col items-center bg-zinc-950 scrollbar-thin`}
        >
          {activeRangeNode ? (
            <>
              {/* Active Chart Header Bar (Hidden in View Mode) */}
              {!isViewMode && (
                <div className="w-full max-w-[780px] flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
                      <FileText className="h-4.5 w-4.5 text-emerald-400" />
                      {activeRangeNode.name}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Редактирование чарта рук
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPalette(!showPalette)}
                      title={showPalette ? "Скрыть панель палитры" : "Показать панель палитры"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        showPalette
                          ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      }`}
                    >
                      <Paintbrush className="h-3.5 w-3.5" />
                      <span>{showPalette ? 'Скрыть палитру' : 'Показать палитру'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 13x13 Grid */}
              <HandMatrix
                grid={activeRangeNode.grid || {}}
                actions={activeRangeNode.actions || actions}
                activeActionId={activeActionId}
                activeWeight={activeWeight}
                isViewMode={isViewMode}
                onGridChange={handleGridChange}
                onClearGrid={handleClearGridModal}
              />

              {/* Bottom Folder & Range Navigator (Placed under the matrix) */}
              {(isViewMode || showBottomFolders) && (
                <BottomFolderNav
                  tree={tree}
                  activeId={activeRangeId}
                  grid={activeRangeNode.grid || {}}
                  actions={activeRangeNode.actions || actions}
                  isViewMode={isViewMode}
                  onSelectRange={handleSelectRange}
                  onToggleViewMode={() => setIsViewMode(!isViewMode)}
                />
              )}

              {/* Action Palette (In edit mode when visible) */}
              {!isViewMode && showPalette && (
                <ActionPalette
                  actions={activeRangeNode.actions || actions}
                  activeActionId={activeActionId}
                  activeWeight={activeWeight}
                  onSelectAction={setActiveActionId}
                  onSelectWeight={setActiveWeight}
                  onAddAction={handleAddAction}
                  onDeleteAction={handleDeleteAction}
                  onUpdateAction={handleUpdateAction}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-850 rounded-2xl w-full max-w-lg my-12">
              <Layers className="h-12 w-12 text-zinc-700 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-white">Добро пожаловать в PreflopRange</h3>
              <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">
                Выберите существующий чарт или создайте новый. В режиме просмотра папки и чарты доступны прямо под матрицей, а стрелками клавиатуры можно быстро переключаться между ними.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Custom Modal Dialog Overlay */}
      {modal.type !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Title */}
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">{modal.title}</h3>
              {modal.message && <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{modal.message}</p>}
            </div>

            {/* Modal Input if applicable */}
            {(modal.type === 'add_folder' || modal.type === 'add_range' || modal.type === 'backup_import') && (
              <div className="space-y-1.5">
                {modal.type === 'backup_import' ? (
                  <textarea
                    required
                    placeholder={modal.placeholder}
                    value={modal.inputValue || ''}
                    onChange={(e) => setModal({ ...modal, inputValue: e.target.value })}
                    className="w-full h-32 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-lg p-3 text-xs text-zinc-200 font-mono focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <input
                    type="text"
                    required
                    placeholder={modal.placeholder}
                    value={modal.inputValue || ''}
                    onChange={(e) => setModal({ ...modal, inputValue: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleModalSubmit();
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              {modal.type !== 'alert' && (
                <button
                  type="button"
                  onClick={() => setModal({ type: null, title: '' })}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-all cursor-pointer"
                >
                  Отмена
                </button>
              )}
              
              <button
                type="button"
                onClick={handleModalSubmit}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shadow-md ${
                  modal.type === 'delete_node' || modal.type === 'delete_action' || modal.type === 'reset_all' || modal.type === 'clear_grid'
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-950/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20'
                }`}
              >
                {modal.type === 'alert' ? 'Ок' : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login & Registration Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onSuccess={handleAuthSuccess}
        onClose={() => setIsAuthModalOpen(false)}
        canClose={currentUser !== null}
      />

    </div>
  );
}
