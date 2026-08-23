export type NodeType = 'folder' | 'range';

export interface RangeAction {
  id: string;
  name: string; // e.g., "Raise", "Call", "Fold", "3Bet"
  color: string; // Hex color code, e.g. "#EF4444"
}

// Hand grid mapping: hand name (e.g. "AA") -> actionId -> weight percentage (0-100)
// e.g. { "AQs": { "raise-id": 50, "call-id": 50 } }
export interface RangeGrid {
  [hand: string]: {
    [actionId: string]: number; // percentage (0 to 100)
  };
}

export interface TreeNode {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  order?: number;
  color?: string;
  // Folder specific
  childrenIds?: string[];
  isOpen?: boolean;
  // Range specific
  grid?: RangeGrid;
  actions?: RangeAction[];
  notes?: string;
}

export interface RangeTree {
  [id: string]: TreeNode;
}

export interface TrainerLog {
  id: string;
  timestamp: string;
  hand: string; // e.g. "As Ks"
  combo: string; // e.g. "AKs"
  userActionId: string;
  userActionName: string;
  correctActionName: string;
  isCorrect: boolean;
}

export interface TrainerSession {
  rangeId: string;
  rangeName: string;
  correctCount: number;
  totalCount: number;
  streak: number;
  maxStreak: number;
  history: TrainerLog[];
  currentCardCombo: {
    hand: string;
    combo: string;
    suits: string[];
    definedActions: { [actionId: string]: number };
  } | null;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  avatarColor?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
