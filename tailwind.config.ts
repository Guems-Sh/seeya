import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lime: '#CCFF00',
        dark: '#000000',
        surface: '#1A1A1A',
        border: '#333333',
        textSecondary: '#999999',
      },
      spacing: {
        'gap-standard': '16px',
        'gap-sm': '12px',
      },
      borderWidth: {
        'thick': '2px',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
