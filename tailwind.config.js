/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./layouts/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', 'sans-serif'],
    },
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        secondary: {
          500: '#f97316',
          600: '#ea580c',
        },
        psy: {
          light: '#f3e8ff',
          main: '#9333ea',
          dark: '#581c87',
          gradient: 'from-purple-500 to-indigo-600'
        },
        fono: {
          light: '#ecfeff',
          main: '#06b6d4',
          dark: '#155e75',
          gradient: 'from-cyan-400 to-blue-500'
        },
        to: {
          light: '#e0e7ff',
          main: '#4f46e5',
          dark: '#312e81',
          gradient: 'from-indigo-400 to-violet-600'
        },
        social: {
          light: '#f0f9ff',
          main: '#0ea5e9',
          dark: '#075985',
          gradient: 'from-sky-400 to-blue-600'
        },
        pp: {
          light: '#fce7f3',
          main: '#db2777',
          dark: '#831843',
          gradient: 'from-pink-400 to-rose-600'
        },
        admin: {
          light: '#f8fafc',
          main: '#334155',
          dark: '#0f172a',
          gradient: 'from-slate-700 to-slate-900'
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glow': '0 0 15px rgba(var(--color-primary-500-rgb), 0.3)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'slideUp': 'slideUp 0.5s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}
