import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { bg: '#282828', deep: '#202020', s1: '#303030', s2: '#383838', accent: '#F15534', soft: '#FF7659', tx: '#F4F2EF', t2: '#B4B0AC', t3: '#85817E', ok: '#79C6A3', warn: '#E7B768' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'ui-monospace', 'monospace'] },
  } },
  plugins: [],
};
export default config;
