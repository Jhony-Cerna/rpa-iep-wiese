/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e40af", // blue-800
        secondary: "#1f2937", // gray-800
      }
    },
  },
  plugins: [],
}
