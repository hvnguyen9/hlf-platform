/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        hlf: {
          green: "#10b981",
          emerald: "#059669",
          indigo: "#6366f1",
          teal: "#14b8a6",
          amber: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
