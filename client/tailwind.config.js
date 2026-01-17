/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Comic Sans MS"', '"Chalkboard SE"', '"Bradley Hand"', '"Marker Felt"', '"Segoe Print"', 'cursive', 'sans-serif'],
        sans: ['"Comic Sans MS"', '"Chalkboard SE"', '"Bradley Hand"', '"Marker Felt"', '"Segoe Print"', 'cursive', 'sans-serif'],
      },
      colors: {
        paper: '#ffffff',
        'paper-aged': '#fefcf3',
        'pencil': '#374151',
        'pencil-light': '#6b7280',
        'marker-yellow': '#fef08a',
        'marker-pink': '#fbcfe8',
        'marker-blue': '#bae6fd',
        'marker-green': '#bbf7d0',
        'marker-orange': '#fed7aa',
        'marker-purple': '#ddd6fe',
        'ink-red': '#dc2626',
        'ink-blue': '#2563eb',
      },
      backgroundImage: {
        'graph-paper': "linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)",
        'graph-paper-light': "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)",
        'lined-paper': "repeating-linear-gradient(transparent, transparent 27px, #e5e7eb 28px)",
        'dotted-paper': "radial-gradient(#d1d5db 1px, transparent 1px)",
      },
      backgroundSize: {
        'graph': '24px 24px',
        'graph-sm': '16px 16px',
        'dots': '16px 16px',
      },
      boxShadow: {
        'sketch': '3px 4px 0px 0px rgba(55, 65, 81, 0.15)',
        'sketch-lg': '4px 6px 0px 0px rgba(55, 65, 81, 0.2)',
        'sketch-hover': '5px 7px 0px 0px rgba(55, 65, 81, 0.25)',
        'tape': '0 1px 3px rgba(0,0,0,0.08)',
        'paper': '0 1px 3px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.05)',
        'polaroid': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'sticker': '2px 2px 0px rgba(55, 65, 81, 0.1)',
        'inset-sketch': 'inset 2px 2px 4px rgba(0,0,0,0.05)',
      },
      rotate: {
        'slight-1': '0.8deg',
        'slight-n1': '-0.8deg',
        'slight-2': '1.5deg',
        'slight-n2': '-1.5deg',
        'slight-3': '2.5deg',
        'slight-n3': '-2.5deg',
        'wobbly': '3deg',
        'wobbly-n': '-3deg',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
      animation: {
        'wobble': 'wobble 0.3s ease-in-out',
        'float': 'float 6s ease-in-out infinite',
        'scribble': 'scribble 0.2s ease-in-out',
        'tape-stick': 'tapeStick 0.4s ease-out',
        'page-turn': 'pageTurn 0.5s ease-out',
        'stamp': 'stamp 0.3s ease-out',
      },
      keyframes: {
        wobble: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        },
        scribble: {
          '0%': { transform: 'translateX(-2px)' },
          '25%': { transform: 'translateX(2px)' },
          '50%': { transform: 'translateX(-1px)' },
          '75%': { transform: 'translateX(1px)' },
          '100%': { transform: 'translateX(0)' },
        },
        tapeStick: {
          '0%': { transform: 'translateX(-50%) translateY(-20px) rotate(-2deg)', opacity: '0' },
          '100%': { transform: 'translateX(-50%) translateY(0) rotate(-2deg)', opacity: '1' },
        },
        pageTurn: {
          '0%': { transform: 'rotateY(-90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        stamp: {
          '0%': { transform: 'scale(1.5) rotate(-5deg)', opacity: '0' },
          '50%': { transform: 'scale(0.95) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'sketch': '2px',
        'torn': '1px',
      },
      transitionTimingFunction: {
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
