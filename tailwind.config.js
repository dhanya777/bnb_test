/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#4CAF50',
        'secondary': '#8BC34A',
        'accent': '#CDDC39',
        'dark-green': '#388E3C',
        'light-green': '#A5D6A7',
      },
    },
  },
  plugins: [],
}