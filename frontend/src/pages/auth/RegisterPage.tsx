import { useState } from "react";
import type { Authdata } from "../../components/auth/auth.types";
import { AuthForm } from "../../components/auth/AuthForm";
import { register } from "../../services/auth.service";

export function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleRegister(data: Authdata) {
        setLoading(true);
        setError("");

        try {
            await register(data.email, data.password);
        } catch (err) {
            setError("Invalid email or password.");
            console.error();
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthForm
            mode="register"
            onSubmit={handleRegister}
            loading = {loading}
            error = {error}
        />
    );
}