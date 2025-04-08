import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminAuthState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  resetAuth: () => void;
}

// In a real application, this would be properly hashed and stored securely
// IMPORTANT: The admin password is 'Bergakungen2025'
const ADMIN_PASSWORD = 'Bergakungen2025';

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: (password: string) => {
        console.log('Attempting login with password:', password);
        // Trim any whitespace from the password
        const trimmedPassword = password.trim();
        const isValid = trimmedPassword === ADMIN_PASSWORD;
        console.log('Password valid:', isValid);
        
        if (isValid) {
          set({ isAuthenticated: true });
        }
        return isValid;
      },
      logout: () => set({ isAuthenticated: false }),
      resetAuth: () => {
        // Reset authentication state and clear storage
        set({ isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin-auth');
        }
      },
    }),
    {
      name: 'admin-auth',
      // Make sure we use a custom merge strategy
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
        };
      }
    }
  )
);