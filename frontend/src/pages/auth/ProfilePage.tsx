import type { CompleteProfile } from "../../components/profile/profile.types";
import { CompleteProfileForm } from "../../components/profile/ProfileForm";
import {
    completeProfile,
    getProfile,
} from "../../services/auth.service";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

export function ProfilePage() {
	const navigate = useNavigate();

	async function handleSubmit(data: CompleteProfile) {
        await completeProfile(data);
        const user = await getProfile();

        useAuthStore.getState().setUser(user);
        navigate('/', { replace: true });
    }

    return (
        <CompleteProfileForm
            onSubmit={handleSubmit}
        />
    );
}