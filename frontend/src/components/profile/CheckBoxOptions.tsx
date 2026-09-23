interface CheckboxOptionProps {
    label: string;
    checked: boolean;
    onChange: () => void;
}

export function CheckboxOption({
    label,
    checked,
    onChange
}: CheckboxOptionProps) {
    return (
        <label
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                checked
                    ? "border-hog-primary bg-hog-primary/10"
                    : "border-hog-border bg-hog-surface-alt hover:border-hog-secondary"
            }`}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="h-4 w-4 accent-hog-primary"
            />

            <span
                className={`text-sm ${
                    checked ? "text-hog-primary" : "text-hog-text"
                }`}
            >
                {label}
            </span>
        </label>
    );
}