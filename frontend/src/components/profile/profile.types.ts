export interface CompleteProfileProps {
    onSubmit: (data: CompleteProfile) => void;
    loading?: boolean;
    error?: string;
}

export interface CompleteProfile{
    username: string;
    imageUrl: string;
    interests: string[];
    languages: string[];
}