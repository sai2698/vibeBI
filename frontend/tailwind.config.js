/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand:   { DEFAULT:"#6366F1", light:"#EEF2FF", dark:"#4338CA" },
        surface: { DEFAULT:"#FFFFFF", dark:"#1E1B4B" },
        sidebar: { bg:"#0F172A", text:"#CBD5E1", active:"#6366F1" },
      },
      fontFamily: { sans:["Inter","system-ui","sans-serif"] },
    }
  },
  plugins: [],
}
