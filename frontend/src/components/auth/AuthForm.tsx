import { useState } from "react";
import type { AuthProps, Authdata } from "./auth.types";
import { Link } from "react-router-dom";

export function AuthForm(props: AuthProps) {

    const [authData, setAuthData] = useState<Authdata>({
        email: "",
        password: ""
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        props.onSubmit(authData);
    }

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={authData.email}
                onChange={(e) => {
                    setAuthData({
                        ...authData,
                        email: e.target.value
                    });
                }}
            />

            <input
                type="password"
                value={authData.password}
                onChange={(e) => {
                    setAuthData({
                        ...authData,
                        password: e.target.value
                    });
                }}
            />

            {props.error && (
                <p>{props.error}</p>
            )}

            <button type="submit" disabled={props.loading}>
                {props.loading
                    ? "Loading..."
                    : props.mode === "login"
                        ? "Login"
                        : "Register"}
            </button>
            <Link
                to={props.mode === "login" ? "/register" : "/login"}
            >
                {props.mode === "login" ? "Register" : "Login"}
            </Link>

        </form>
    );
}