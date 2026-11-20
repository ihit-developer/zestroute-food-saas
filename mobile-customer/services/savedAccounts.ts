import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_ACCOUNTS_KEY = 'zr_saved_login_accounts_v1';

export interface SavedAccount {
  identifier: string;
  password: string;
  fullName: string;
  role: 'customer' | 'rider';
  lastUsedAt: string;
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

export async function saveAccount(account: Omit<SavedAccount, 'lastUsedAt'>): Promise<SavedAccount[]> {
  const existing = await getSavedAccounts();
  const normalized = account.identifier.trim().toLowerCase();
  const filtered = existing.filter((a) => a.identifier.trim().toLowerCase() !== normalized);
  const next: SavedAccount[] = [
    {
      ...account,
      identifier: account.identifier.trim(),
      lastUsedAt: new Date().toISOString(),
    },
    ...filtered,
  ].slice(0, 5);
  await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
  return next;
}

export async function removeSavedAccount(identifier: string): Promise<SavedAccount[]> {
  const existing = await getSavedAccounts();
  const normalized = identifier.trim().toLowerCase();
  const next = existing.filter((a) => a.identifier.trim().toLowerCase() !== normalized);
  await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
  return next;
}
