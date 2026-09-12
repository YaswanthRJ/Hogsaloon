export interface AuthProps {
    mode: "login" | "register",
    onSubmit: (data: Authdata)=>void;
    loading: boolean;
    error: string;
}

export interface Authdata{
    email: string;
    password: string;
}