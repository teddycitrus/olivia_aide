/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F0F0F0',
        foreground: '#121212',
        border: '#121212',
        muted: '#E0E0E0',
        'primary-red': '#D02020',
        'primary-blue': '#1040C0',
        'primary-yellow': '#F0C020',
        pass: '#1040C0',
        fail: '#D02020'
      },
      fontFamily: {
        display: ['"Outfit"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Outfit"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'hard-sm': '3px 3px 0px 0px #121212',
        hard: '4px 4px 0px 0px #121212',
        'hard-md': '6px 6px 0px 0px #121212',
        'hard-lg': '8px 8px 0px 0px #121212',
        'hard-white': '4px 4px 0px 0px #F0F0F0'
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(#121212 2px, transparent 2px)'
      },
      backgroundSize: {
        'dot-grid': '20px 20px'
      }
    }
  },
  plugins: []
}
