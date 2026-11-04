/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        apple: {
          bg: '#F5F5F7',
          darkBg: '#000000',
          darkElevated: '#1C1C1E',
          darkInput: '#2C2C2E',
          blue: '#0071E3',
          blueHover: '#0077ED',
          darkBlue: '#0A84FF',
          gray: '#86868B',
          text: '#1D1D1F',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0071E3',
          600: '#0071E3',
          700: '#0062C4',
          800: '#004F9E',
          900: '#003B78',
        },
      },
      boxShadow: {
        'apple-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.03)',
        'apple-md': '0 8px 24px -4px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'apple-lg': '0 20px 48px -12px rgba(0, 0, 0, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
