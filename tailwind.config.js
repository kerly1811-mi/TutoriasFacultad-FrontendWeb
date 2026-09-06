/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta institucional Universidad Técnica de Ambato (azules + blanco).
        paper: '#EDF3FA', // blanco frío: fondo de página
        ink: '#0F243A', // azul muy oscuro: texto principal
        azul: {
          // Azul institucional UTA (color primario: botones, enlaces, barra lateral)
          DEFAULT: '#00529B',
          dark: '#003B72',
          light: '#2E7FC1',
        },
        celeste: {
          // Azul de apoyo (acentos: kickers, chips de rol, badges informativos)
          DEFAULT: '#2E86C1',
          dark: '#1B5E92',
          light: '#7FB9E3',
        },
        line: '#D3E2F0', // borde suave azulado
        success: '#1B7A5B',
        danger: '#B3261E',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
