import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Navbar from "../components/common/Navigation";
import Button from "../components/common/Button";
import PasswordWithValidation from "../components/login/PasswordWithValidation";
import type { SignUpRequest } from "../services/models/SignUpRequest";
import { userApi } from "../services/LoginService";

const SignUp: React.FC = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [secondPasswordCheck, setSecondPassword] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handlePasswordChange = (password: string, isValid: boolean) => {
    setPassword(password);
    setIsPasswordValid(isValid);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(null);
    if(!email){
        setError("Please enter your email address");
        return;
    }

    if(!username){
        setError("Pleae enter you username");
        return;
    }

    if(!isPasswordValid){
        setError("Please enter a valid password")
        return;
    }

    if(!secondPasswordCheck){
        setError("Please confirm password");
        return;
    }

    if(password !== secondPasswordCheck){
        setError("Passwords don't match");
        return;
    }

    if(name && name.length < 3 && name.length > 20){
        setError("Name has to be between 3 and 20 characters");
        return;
    }

    setIsLoading(true);
    console.log(name);
    const request: SignUpRequest = {
        username: username,
        email: email,
        name: name,
        password: password
    };

    try{
        const response = await userApi.signUp(request);
        const userId = response.id;

        navigate("/library", { state: { userId } });

    }catch(error){
        setIsLoading(false);
        setError("Failed to create account please check credentials and try again!");
    }
  };

  const isFormValid =
    email.trim() !== "" &&
    username.trim() !== "" &&
    password.trim() !== "" &&
    secondPasswordCheck.trim() !== "" &&
    password === secondPasswordCheck &&
    isPasswordValid;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col">
      {isLoading && (
        <LoadingSpinner
          fullScreen
          size="lg"
          message="Creating your account..."
        />
      )}

      <Navbar
        rightContent={
          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" to="/">
              Home
            </Button>
            <Button variant="primary" size="sm" to="/login">
              Login
            </Button>
          </div>
        }
      />

      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="bg-white/70 backdrop-blur-md border border-amber-200/50 rounded-2xl shadow-lg max-w-md w-full p-8">
          <h1 className="text-4xl font-extrabold text-amber-950 text-center mb-3 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-center text-amber-800/70 text-sm mb-8">
            Sign in to your AI-powered library
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
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
                className="w-full px-4 py-3 border border-amber-200 rounded-xl bg-white/70
                focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400
                shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-amber-900 font-medium mb-1">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                disabled={isLoading}
                className="w-full px-4 py-3 border border-amber-200 rounded-xl bg-white/70
                focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400
                shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Name (optional) */}
            <div>
              <label className="block text-amber-900 font-medium mb-1">
                Name (optional)
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border border-amber-200 rounded-xl bg-white/70
                focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400
                shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-amber-900 font-medium mb-1">
                Password
              </label>
              <PasswordWithValidation onPasswordChange={handlePasswordChange} />

              <div className="mt-3 bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-900/90">
                <p className="text-xs text-amber-800/70 italic">
                  Use a strong password to secure your account.
                </p>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-amber-900 font-medium mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={secondPasswordCheck}
                onChange={(e) => setSecondPassword(e.target.value)}
                placeholder="Re-enter password"
                disabled={isLoading}
                className="w-full px-4 py-3 border border-amber-200 rounded-xl bg-white/70
                focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400
                shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {secondPasswordCheck && secondPasswordCheck !== password && (
                <p className="text-sm text-red-600 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-sm text-amber-800 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isLoading}
                  className="accent-amber-600 rounded-md h-4 w-4 transition-all hover:accent-amber-700"
                />
                <span>Remember me</span>
              </label>
              <a
                href="#"
                className="text-amber-700 hover:text-amber-800 font-medium transition-colors hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              variant="primary"
              size="lg"
              className={`w-full mt-6 flex items-center justify-center gap-2 shadow-md shadow-amber-200/50 
                hover:shadow-lg hover:shadow-amber-300/60 transition-all 
                ${
                  !isFormValid
                    ? "opacity-50 cursor-not-allowed hover:shadow-none"
                    : ""
                }`}
              type="submit"
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Creating account...</span>
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <p className="text-center text-amber-800/70 mt-8">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-amber-700 font-semibold hover:underline"
            >
              Login
            </a>
          </p>
        </div>
      </main>

      <footer className="py-6 text-center text-amber-800/60 text-sm">
        © {new Date().getFullYear()} Papyrus Library. All rights reserved.
      </footer>
    </div>
  );
};

export default SignUp;
