/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    extend: {
      colors: {
        neumorphic: '#e0e5ec',
      },
      boxShadow: {
        'neumorphic': '20px 20px 60px #bebebe, -20px -20px 60px #ffffff',
        'neumorphic-inset': 'inset 6px 6px 12px #bebebe, inset -6px -6px 12px #ffffff',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}