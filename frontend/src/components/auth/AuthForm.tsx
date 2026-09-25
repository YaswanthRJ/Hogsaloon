import { useState } from "react";
import type { AuthProps, Authdata } from "./auth.types";
import { Link } from "react-router-dom";

export function AuthForm(props: AuthProps) {
    const [authData, setAuthData] = useState<Authdata>({
        email: "",
        password: "",
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        props.onSubmit(authData);
    }

    const isLogin = props.mode === "login";

    return (
        <div className="flex min-h-full items-center justify-center bg-hog-bg px-4 py-8">
            <div className="flex w-full max-w-5xl items-center justify-center gap-8">
                <div className="hidden aspect-square w-full max-w-md overflow-hidden rounded-2xl lg:block">
                    <img
                        src={isLogin ? "/images/bar.jpg" : "/images/saloon.jpg"}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-md rounded-2xl border border-hog-border bg-hog-surface p-8 shadow-2xl"
                >
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-hog-text">
                            {isLogin ? "Welcome Back" : "Create Account"}
                        </h1>

                        <p className="mt-2 text-sm text-hog-text-muted">
                            {isLogin
                                ? "Login to start the fun"
                                : "Register to get started"}
                        </p>
                    </div>

                    <div className="mb-5">
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-hog-text"
                        >
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={authData.email}
                            onChange={(e) =>
                                setAuthData({
                                    ...authData,
                                    email: e.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-hog-border bg-hog-surface-alt px-4 py-3 text-hog-text outline-none transition placeholder:text-hog-text-muted focus:border-hog-primary focus:ring-2 focus:ring-hog-primary/20"
                            required
                        />
                    </div>

                    <div className="mb-5">
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-hog-text"
                        >
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={authData.password}
                            onChange={(e) =>
                                setAuthData({
                                    ...authData,
                                    password: e.target.value,
                                })
                            }
                            className="w-full rounded-lg border border-hog-border bg-hog-surface-alt px-4 py-3 text-hog-text outline-none transition placeholder:text-hog-text-muted focus:border-hog-primary focus:ring-2 focus:ring-hog-primary/20"
                            required
                        />
                    </div>

                    {props.error && (
                        <div className="mb-5 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                            {props.error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={props.loading}
                        className="w-full rounded-lg bg-hog-primary px-4 py-3 font-semibold text-hog-bg transition hover:bg-hog-primary-hover focus:outline-none focus:ring-2 focus:ring-hog-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {props.loading
                            ? "Loading..."
                            : isLogin
                              ? "Login"
                              : "Register"}
                    </button>

                    <div className="mt-6 text-center text-sm text-hog-text-muted">
                        {isLogin
                            ? "Don't have an account?"
                            : "Already have an account?"}{" "}

                        <Link
                            to={isLogin ? "/register" : "/login"}
                            className="font-medium text-hog-primary transition hover:text-hog-primary-hover hover:underline"
                        >
                            {isLogin ? "Register" : "Login"}
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}