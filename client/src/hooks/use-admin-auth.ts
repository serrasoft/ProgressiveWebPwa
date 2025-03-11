import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminAuthState {
  isAuthenticated: boolean;
  password: string;
  login: (password: string) => boolean;
  logout: () => void;
}

// In a real application, this would be properly hashed and stored securely
const ADMIN_PASSWORD = 'brf-admin-2024';

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      password: '',
      login: (password: string) => {
        const isValid = password === ADMIN_PASSWORD;
        if (isValid) {
          set({ isAuthenticated: true, password });
        }
        return isValid;
      },
      logout: () => set({ isAuthenticated: false, password: '' }),
    }),
    {
      name: 'admin-auth',
    }
  )
);
