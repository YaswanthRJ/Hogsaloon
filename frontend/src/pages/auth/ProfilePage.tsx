import type { CompleteProfile } from "../../components/profile/profile.types";
import { CompleteProfileForm } from "../../components/profile/ProfileForm";
import { completeProfile } from "../../services/auth.service";

export function ProfilePage() {
	async function handleSubmit(data: CompleteProfile) {
        await completeProfile(data);
    }

    return (
        <CompleteProfileForm
            onSubmit={handleSubmit}
        />
    );
}