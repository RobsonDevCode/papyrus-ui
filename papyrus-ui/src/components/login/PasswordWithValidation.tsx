import { useState } from "react";
import LoginChecklist from "./Checklist";

interface PasswordWithValidationProps {
  passwordCheck?: boolean;
  onPasswordChange: (password: string, isValid: boolean) => void;
}

const PasswordWithValidation: React.FC<PasswordWithValidationProps> = ({
  passwordCheck = false,
  onPasswordChange,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [checks, setChecks] = useState({
    hasUpperCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    minLength: false,
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);

    const newChecks = {
      hasUpperCase: /[A-Z]/.test(value),
      hasNumber: /[0-9]/.test(value),
      hasSpecialChar: /[!@#$%^&*]/.test(value),
      minLength: value.length >= 12,
    };

    setChecks(newChecks);

    // Check if passwords match when passwordCheck is enabled
    if (passwordCheck) {
      const match = value === confirmPassword;
      setPasswordsMatch(match);
      
      // Password is valid only if it meets criteria AND matches confirmation
      const isValid = Object.values(newChecks).every(Boolean) && match && confirmPassword.length > 0;
      onPasswordChange(value, isValid);
    } else {
      // Just check password criteria
      const isValid = Object.values(newChecks).every(Boolean);
      onPasswordChange(value, isValid);
    }
  };

  const handlePasswordConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!passwordCheck) return;

    const value = e.target.value;
    setConfirmPassword(value);

    // Check if it matches the original password
    const match = password === value;
    setPasswordsMatch(match);

    // Password is valid only if it meets criteria AND matches
    const isValid = Object.values(checks).every(Boolean) && match && value.length > 0;
    onPasswordChange(password, isValid);
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          type="password"
          className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white/60 text-amber-900 font-medium"
          value={password}
          onChange={handlePasswordChange}
          placeholder="Enter password"
        />
      </div>

      {passwordCheck && (
        <div>
          <input
            type="password"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 bg-white/60 text-amber-900 font-medium ${
              confirmPassword.length > 0 && !passwordsMatch
                ? 'border-red-400 focus:ring-red-500/50'
                : 'border-amber-200 focus:ring-amber-500/50'
            }`}
            value={confirmPassword}
            onChange={handlePasswordConfirmChange}
            placeholder="Re-enter password"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-red-600 text-sm mt-1">Passwords don't match</p>
          )}
          {confirmPassword.length > 0 && passwordsMatch && (
            <p className="text-green-600 text-sm mt-1">Passwords match ✓</p>
          )}
        </div>
      )}

      <LoginChecklist checks={checks} />
    </div>
  );
};

export default PasswordWithValidation;