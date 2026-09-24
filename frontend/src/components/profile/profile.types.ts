export interface CompleteProfileProps {
    onSubmit: (data: CompleteProfile) => void;
    loading?: boolean;
    error?: string;
}

export interface CompleteProfile{
    username: string;
    image: File | null;
    interests: string[];
    languages: string[];
}