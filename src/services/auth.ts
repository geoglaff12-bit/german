import { User } from '../types';

export interface StoredUser extends User {
  passwordHash: string;
}

const USERS_STORAGE_KEY = 'preflop_registered_users';
const CURRENT_USER_KEY = 'preflop_current_active_user';

// Password hashing function
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash)}_${password.length * 31}`;
}

const AVATAR_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ef4444', // red
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// Initialize initial system users if needed
export function initializeAuthStore(): void {
  const defaultOwner: StoredUser = {
    id: 'user_stpatrick_main',
    username: 'stPatrick',
    email: 'stpatrick@preflop.app',
    avatarColor: '#10b981',
    passwordHash: hashPassword('A01109856a'),
    createdAt: new Date().toISOString(),
  };

  const existingRaw = localStorage.getItem(USERS_STORAGE_KEY);
  if (!existingRaw) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([defaultOwner]));
  } else {
    try {
      const users: StoredUser[] = JSON.parse(existingRaw);
      const userIndex = users.findIndex(
        (u) => u.username.toLowerCase() === 'stpatrick'
      );
      if (userIndex >= 0) {
        users[userIndex].passwordHash = hashPassword('A01109856a');
      } else {
        users.push(defaultOwner);
      }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([defaultOwner]));
    }
  }
}

export function getAllUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function registerUser(username: string, email: string, password: string): { success: boolean; user?: User; error?: string } {
  const cleanUsername = username.trim();
  const cleanEmail = email.trim();

  if (!cleanUsername) {
    return { success: false, error: 'Пожалуйста, введите логин.' };
  }

  if (cleanUsername.length < 3) {
    return { success: false, error: 'Логин должен содержать минимум 3 символа.' };
  }

  if (!password || password.length < 4) {
    return { success: false, error: 'Пароль должен содержать минимум 4 символа.' };
  }

  const users = getAllUsers();

  const userExists = users.some(
    (u) => u.username.toLowerCase() === cleanUsername.toLowerCase() ||
           (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail.toLowerCase())
  );

  if (userExists) {
    return { success: false, error: 'Пользователь с таким логином или email уже существует.' };
  }

  const newUser: StoredUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
    email: cleanEmail || undefined,
    avatarColor: getRandomColor(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  // Save as current user
  const { passwordHash: _, ...publicUser } = newUser;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));

  return { success: true, user: publicUser };
}

export function loginUser(usernameOrEmail: string, password: string): { success: boolean; user?: User; error?: string } {
  const cleanQuery = usernameOrEmail.trim().toLowerCase();

  if (!cleanQuery) {
    return { success: false, error: 'Введите логин или email.' };
  }

  if (!password) {
    return { success: false, error: 'Введите пароль.' };
  }

  const users = getAllUsers();
  const targetUser = users.find(
    (u) => u.username.toLowerCase() === cleanQuery ||
           (u.email && u.email.toLowerCase() === cleanQuery)
  );

  if (!targetUser) {
    return { success: false, error: 'Неверный логин или пароль. Доступ ограничен.' };
  }

  const inputHash = hashPassword(password);
  if (targetUser.passwordHash !== inputHash) {
    return { success: false, error: 'Неверный логин или пароль.' };
  }

  const { passwordHash: _, ...publicUser } = targetUser;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(publicUser));

  return { success: true, user: publicUser };
}

export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}
