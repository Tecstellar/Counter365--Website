/**
 * Web LocalStorage wrapper matching Android storage API
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('storage setItem error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('storage removeItem error:', e);
    }
  },

  async getObject<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const raw = await this.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      await this.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('storage setObject error:', e);
    }
  },

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('storage clear error:', e);
    }
  },
};
