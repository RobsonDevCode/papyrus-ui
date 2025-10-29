/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        dropAndInsert: {
          "0%": {
            transform: "translateY(-500px) rotate(-10deg)",
            opacity: "0",
          },
          "40%": {
            transform: "translateY(0) rotate(0deg)",
            opacity: "1",
          },
          "60%": {
            transform: "translateY(0) rotate(0deg) scale(1)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(0) rotate(0deg) scale(0.8)",
            opacity: "0.3",
          },
        },
        shine: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        scaleIn: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeInUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        dropAndInsert: "dropAndInsert 1.5s ease-out forwards",
        shine: "shine 1s ease-in-out 0.3s",
        scaleIn: "scaleIn 0.3s ease-out 0.8s forwards",
        fadeInUp: "fadeInUp 0.4s ease-out 0.9s forwards",
      },
    },
  },
  plugins: [],
};
