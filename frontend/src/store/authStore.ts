import { create } from "zustand";

export interface User {
    _id: string;
    email: string;
    username: string;
    imageUrl: string | null;
    interests: string[];
    languages: string[];
    profileCompleted: boolean;
}

interface AuthState{
    user: User | null;
    isLoading: boolean;
    setUser: (user:User | null)=> void;
    setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set)=>({
    user: null,
    isLoading:true,
    setUser: (user)=>set({user}),
    setLoading: (v)=>set({isLoading: v})
}))