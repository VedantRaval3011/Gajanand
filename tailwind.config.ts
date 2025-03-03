import type { Config } from "tailwindcss";

export default {
  darkMode: ['class'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
		colors: {
			yellow: {
			  100: '#fff7ed',
			  300: '#e8b903', // Rich yellow
			  400: '#FFD700', // Gold
			  500: '#FFD700', // Gold
			  600: '#e8b903', // Slightly darker gold
			  700: '#d4a602', // Darker gold
			},
			orange: {
			  100: '#ffedd5',
			  600: '#ea580c', // Vibrant orange
			  700: '#c2410c', // Darker orange
			  800: '#9a3412', // Even darker orange
			},
			gray: {
			  100: '#f3f4f6',
			  200: '#e5e7eb',
			  300: '#d1d5db',
			  500: '#6b7280',
			  600: '#4b5563',
			  700: '#374151',
			  800: '#1f2937',
			},
		  },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require('@tailwindcss/forms'), require("tailwindcss-animate")],
} satisfies Config;
