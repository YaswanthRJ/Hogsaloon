function parseOptions(value: string | undefined): string[] {
    return (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export const PROFILE_INTERESTS = parseOptions(
    import.meta.env.VITE_PROFILE_INTERESTS
);

export const PROFILE_LANGUAGES = parseOptions(
    import.meta.env.VITE_PROFILE_LANGUAGES
);