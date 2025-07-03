// Tailwind CSS v4 configuration
// Theme configuration is now handled in CSS using @theme directive

const config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  plugins: [require("tailwindcss-animate")],
}

export default config