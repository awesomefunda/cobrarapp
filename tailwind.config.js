/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        lime: { 400: '#c6f135' },
        surface: {
          DEFAULT: '#0a0a0a',
          1: '#111111',
          2: '#161616',
          3: '#1e1e1e',
          4: '#2a2a2a',
        }
      },
      fontFamily: {
        display: ['"DM Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: { '2xl': '16px', '3xl': '22px' }
    }
  },
  plugins: []
}
