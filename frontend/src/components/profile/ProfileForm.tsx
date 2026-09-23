import { useState } from "react";
import {
    PROFILE_INTERESTS,
    PROFILE_LANGUAGES
} from "./profile.options";
import type { CompleteProfileProps, CompleteProfile } from "./profile.types";
import { CheckboxOption } from "./CheckBoxOptions";

export function CompleteProfileForm(props: CompleteProfileProps) {
    const [profileData, setProfileData] = useState<CompleteProfile>({
        username: "",
        imageUrl: "",
        interests: [],
        languages: []
    });

    function toggleInterest(interest: string) {
        setProfileData((current) => ({
            ...current,
            interests: current.interests.includes(interest)
                ? current.interests.filter((item) => item !== interest)
                : [...current.interests, interest]
        }));
    }

    function toggleLanguage(language: string) {
        setProfileData((current) => ({
            ...current,
            languages: current.languages.includes(language)
                ? current.languages.filter((item) => item !== language)
                : [...current.languages, language]
        }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        props.onSubmit(profileData);
    }

    return (
        <div className="flex min-h-full items-center justify-center bg-hog-bg px-4 py-8">
            <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-hog-border bg-hog-surface p-8 shadow-2xl"
            >
                {/* Header */}
                <div className="flex flex-col gap-2 text-center">
                    <p className="text-hog-text">
                        Complete your profile
                    </p>
                </div>

                {/* Basic information */}
                <div className="flex flex-col gap-4">
                    {/* Username */}
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="username"
                            className="text-sm font-medium text-hog-text"
                        >
                            Username
                        </label>

                        <input
                            id="username"
                            type="text"
                            placeholder="your_username"
                            value={profileData.username}
                            onChange={(e) =>
                                setProfileData({
                                    ...profileData,
                                    username: e.target.value
                                })
                            }
                            className="w-full rounded-lg border border-hog-border bg-hog-surface-alt px-4 py-3 text-hog-text outline-none transition placeholder:text-hog-text-muted focus:border-hog-primary focus:ring-2 focus:ring-hog-primary/20"
                            required
                        />
                    </div>

                    {/* Image URL */}
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="imageUrl"
                            className="text-sm font-medium text-hog-text"
                        >
                            Profile Image URL
                        </label>

                        <input
                            id="imageUrl"
                            type="url"
                            placeholder="https://example.com/avatar.jpg"
                            value={profileData.imageUrl}
                            onChange={(e) =>
                                setProfileData({
                                    ...profileData,
                                    imageUrl: e.target.value
                                })
                            }
                            className="w-full rounded-lg border border-hog-border bg-hog-surface-alt px-4 py-3 text-hog-text outline-none transition placeholder:text-hog-text-muted focus:border-hog-primary focus:ring-2 focus:ring-hog-primary/20"
                            required
                        />
                    </div>
                </div>

                {/* Interests */}
                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-sm font-medium text-hog-text">
                        Interests
                    </legend>

                    <div className="grid grid-cols-2 gap-2">
                        {PROFILE_INTERESTS.map((interest) => (
                            <CheckboxOption
                                key={interest}
                                label={interest}
                                checked={profileData.interests.includes(interest)}
                                onChange={() => toggleInterest(interest)}
                            />
                        ))}
                    </div>
                </fieldset>

                {/* Languages */}
                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-sm font-medium text-hog-text">
                        Languages
                    </legend>

                    <div className="grid grid-cols-2 gap-2">
                        {PROFILE_LANGUAGES.map((language) => (
                            <CheckboxOption
                                key={language}
                                label={language}
                                checked={profileData.languages.includes(language)}
                                onChange={() => toggleLanguage(language)}
                            />
                        ))}
                    </div>
                </fieldset>

                {/* Error */}
                {props.error && (
                    <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                        {props.error}
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={props.loading}
                    className="w-full rounded-lg bg-hog-primary px-4 py-3 font-semibold text-hog-bg transition hover:bg-hog-primary-hover focus:outline-none focus:ring-2 focus:ring-hog-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {props.loading ? "Saving..." : "Complete Profile"}
                </button>
            </form>
        </div>
    );
}