import { create } from "zustand";
import { me, type AuthUser } from "../api/client";

type AuthState = {
  user: AuthUser | null;
  hydrating: boolean;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrating: false,
  hydrated: false,
  setUser: (user) => set({ user }),
  hydrate: async () => {
    set({ hydrating: true });
    try {
      const user = await me();
      set({ user, hydrated: true, hydrating: false });
    } catch {
      set({ user: null, hydrated: true, hydrating: false });
    }
  }
}));

