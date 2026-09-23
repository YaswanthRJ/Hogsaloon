import { useState } from "react";
import type { Authdata } from "../../components/auth/auth.types";
import { AuthForm } from "../../components/auth/AuthForm";
import { authComplete, login } from "../../services/auth.service";

export function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    async function handleLogin(data: Authdata) {
        setLoading(true);
        setError("");

        try {
            await login(data.email, data.password);
            await authComplete();
        } catch (err) {
            setError("Invalid email or password.");
            console.error();
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthForm
            mode="login"
            onSubmit={handleLogin}
            loading = {loading}
            error = {error}
        />
    );
}