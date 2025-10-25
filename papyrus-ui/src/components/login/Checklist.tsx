import React from "react";

interface ChecklistProps {
  checks: {
    hasUpperCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    minLength: boolean;
  };
}

const LoginChecklist: React.FC<ChecklistProps> = ({ checks }) => {
  const items = [
    { key: "hasUpperCase", label: "Contains at least 1 uppercase letter" },
    { key: "hasNumber", label: "Contains at least 1 number" },
    { key: "hasSpecialChar", label: "At least 1 special character" },
    { key: "minLength", label: "At least 12 characters long" },
  ] as const;

  return (
    <div className="mt-4">
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = checks[item.key];
          return (
            <li
              key={item.key}
              className="flex items-center gap-2 transition-all duration-300"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-white transition-all duration-300 ${
                  checked
                    ? "bg-amber-500 border-amber-500 scale-110 shadow-md"
                    : "border-amber-300 bg-transparent"
                }`}
              >
                {checked && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414L8.5 11.586l6.793-6.793a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  checked ? "text-amber-700" : "text-amber-800/70"
                }`}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LoginChecklist;
