import React, { useState } from "react";
import Navbar from "../components/common/Navigation";
import Button from "../components/common/Button";
import PasswordWithValidation from "../components/login/PasswordWithValidation";
import type { LoginRequest } from "../services/models/LoginRequest";
import { userApi } from "../services/LoginService";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/common/LoadingSpinner";

const Login: React.FC = () => {
    const [password, setPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handlePasswordChange = (password: string, isValid: boolean) => {
        setPassword(password);
        setIsPasswordValid(isValid);
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        setError(null);
        
        if (!email) {
            setError("Please enter your email address");
            return;
        }
        
        if (!isPasswordValid) {
            setError("Please enter a valid password");
            return;
        }

        setIsLoading(true);
        
        const request: LoginRequest = {
            email: email,
            password: password
        };

        try {
            const response = await userApi.login(request);
            const userId = response.id;
            localStorage.setItem('userId', userId);
            navigate("/library", { state: { userId } });
        } catch (error) {
            setIsLoading(false);
            setError("Failed to login. Please check your credentials and try again.");
        }
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col">
            {isLoading && (
                <LoadingSpinner 
                    fullScreen 
                    size="lg" 
                    message="Signing you in..." 
                />
            )}
            
            <Navbar
                rightContent={
                    <div className="flex items-center gap-3">
                        <Button variant="primary" size="sm" to="/">
                            Home
                        </Button>
                        <Button variant="primary" size="sm" to="/dashboard">
                            Get Started
                        </Button>
                        <Button variant="primary" size="sm" to="/library">
                            Library
                        </Button>
                    </div>
                }
            />

            {/* Login Section */}
            <main className="flex-grow flex items-center justify-center px-4 py-16">
                <div className="bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-2xl shadow-lg max-w-md w-full p-8">
                    <h1 className="text-3xl font-bold text-amber-950 text-center mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-center text-amber-800/80 mb-8">
                        Sign in to your AI-powered library
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-amber-900 font-medium mb-1"
                            >
                                Email Address
                            </label>
                            <input
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                placeholder="you@example.com"
                                disabled={isLoading}
                                className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <PasswordWithValidation 
                                onPasswordChange={handlePasswordChange}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-amber-700">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    disabled={isLoading}
                                    className="accent-amber-600 rounded-md hover:accent-amber-750 disabled:opacity-50"
                                />
                                Remember me
                            </label>
                            <a href="#" className="hover:underline">
                                Forgot password?
                            </a>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full mt-6 flex items-center justify-center gap-2"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="sm" color="white" />
                                    <span>Logging in...</span>
                                </>
                            ) : (
                                'Login'
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-amber-800/70 mt-8">
                        Don't have an account?{" "}
                        <a
                            href="/register"
                            className="text-amber-700 font-semibold hover:underline"
                        >
                            Sign up
                        </a>
                    </p>
                </div>
            </main>

            {/* Bottom Accent Section */}
            <footer className="py-6 text-center text-amber-800/60 text-sm">
                © {new Date().getFullYear()} Papyrus Library. All rights reserved.
            </footer>
        </div>
    );
};

export default Login;