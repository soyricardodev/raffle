/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B7355',
        secondary: '#F5F5DC',
        accent: '#FFD700'
      }
    },
  },
  plugins: [],
}