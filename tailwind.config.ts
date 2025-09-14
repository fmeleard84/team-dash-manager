import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: "1.5rem",
				sm: "1.5rem",
				lg: "2rem",
				xl: "2.5rem",
			},
			screens: {
				sm: "640px",
				md: "768px",
				lg: "1024px",
				xl: "1280px",
				"2xl": "1536px",
			},
		},
		extend: {
			colors: {
				// 🎨 Neon Design System - Primary Palette
				primary: {
					50: '#faf5ff',
					100: '#f3e8ff',
					200: '#e9d5ff',
					300: '#d8b4fe',
					400: '#c084fc',
					500: '#a855f7',  // DEFAULT
					600: '#9333ea',
					700: '#7e22ce',
					800: '#6b21a8',
					900: '#581c87',
					950: '#3b0764',
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					50: '#fdf2f8',
					100: '#fce7f3',
					200: '#fbcfe8',
					300: '#f9a8d4',
					400: '#f472b6',
					500: '#ec4899',  // DEFAULT
					600: '#db2777',
					700: '#be185d',
					800: '#9f1239',
					900: '#831843',
					950: '#500724',
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},

				// Accent colors for neon effects
				neon: {
					cyan: '#06b6d4',
					blue: '#3b82f6',
					indigo: '#6366f1',
					purple: '#a855f7',
					pink: '#ec4899',
				},

				// Neutral palette for glassmorphism
				neutral: {
					50: '#fafafa',
					100: '#f4f4f5',
					200: '#e4e4e7',
					300: '#d4d4d8',
					400: '#a1a1aa',
					500: '#71717a',
					600: '#52525b',
					700: '#3f3f46',
					800: '#27272a',
					900: '#18181b',
					950: '#0a0a0b'
				},

				// Design System Colors - From CSS Variables (Legacy)
				brand: 'hsl(var(--brand))',
				bg: 'hsl(var(--bg))',
				fg: 'hsl(var(--fg))',
				muted: 'hsl(var(--muted))',
				border: 'hsl(var(--border))',
				card: 'hsl(var(--card))',

				// Semantic Colors
				success: 'hsl(var(--success))',
				warning: 'hsl(var(--warning))',
				error: 'hsl(var(--error))',
				info: 'hsl(var(--info))',

				// Legacy Support (for existing components)
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
			},
			fontSize: {
				// Échelle typographique premium
				'display-xxl': ['clamp(3.5rem, 10vw, 9rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
				'display-xl': ['clamp(2.75rem, 7vw, 5rem)', { lineHeight: '1.06', letterSpacing: '-0.02em' }],
				'display': ['clamp(2.25rem, 6vw, 3.5rem)', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
				'h1': ['clamp(2.25rem, 5vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
				'h2': ['clamp(1.75rem, 4vw, 2.5rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
				'h3': ['clamp(1.375rem, 3vw, 1.75rem)', { lineHeight: '1.3' }],
				'lead': ['1.25rem', { lineHeight: '1.5' }],
				'body': ['1rem', { lineHeight: '1.6' }],
				'small': ['0.875rem', { lineHeight: '1.5' }],
				'eyebrow': ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.04em' }],
			},
			letterSpacing: {
				'tight-2': '-0.02em',
				'tight-1': '-0.01em',
				'wide-4': '0.04em',
			},
			borderRadius: {
				DEFAULT: 'var(--radius)',
				'xl': 'calc(var(--radius) + 4px)',
				'2xl': 'calc(var(--radius) + 8px)',
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				// Neon shadows
				'neon-purple': '0 0 15px rgba(168, 85, 247, 0.5)',
				'neon-purple-lg': '0 0 30px rgba(168, 85, 247, 0.7)',
				'neon-pink': '0 0 15px rgba(236, 72, 153, 0.5)',
				'neon-pink-lg': '0 0 30px rgba(236, 72, 153, 0.7)',
				'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.5)',
				'neon-cyan-lg': '0 0 30px rgba(6, 182, 212, 0.7)',
				'neon-blue': '0 0 15px rgba(59, 130, 246, 0.5)',
				'neon-blue-lg': '0 0 30px rgba(59, 130, 246, 0.7)',
				// Glassmorphism shadows
				'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
				'glass-lg': '0 16px 64px 0 rgba(31, 38, 135, 0.5)',
			},
			backgroundImage: {
				// Existing gradients
				'hero-gradient': 'linear-gradient(90deg, #38E1E1 0%, #21A7F0 35%, #FDB952 70%, #F26A4D 100%)',
				'accent-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				'dark-gradient': 'linear-gradient(180deg, #0D0D0F 0%, #1B1B1F 100%)',
				// Neon gradients
				'gradient-primary': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
				'gradient-secondary': 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
				'gradient-neon': 'linear-gradient(135deg, #06b6d4 0%, #a855f7 50%, #ec4899 100%)',
				'gradient-dark': 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
				'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				"reveal": {
					from: { opacity: "0", transform: "translateY(8px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				"fade": {
					from: { opacity: "0" },
					to: { opacity: "1" },
				},
				// Neon animations
				"neon-pulse": {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.5" },
				},
				"glow": {
					"0%": { boxShadow: "0 0 5px rgba(168, 85, 247, 0.5)" },
					"50%": { boxShadow: "0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.6)" },
					"100%": { boxShadow: "0 0 5px rgba(168, 85, 247, 0.5)" },
				},
				"float": {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-10px)" },
				},
				"shimmer": {
					"0%": { backgroundPosition: "-200% 0" },
					"100%": { backgroundPosition: "200% 0" },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				"reveal": "reveal 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
				"fade": "fade 0.3s ease-in-out",
				// Neon animations
				"neon-pulse": "neon-pulse 2s ease-in-out infinite",
				"glow": "glow 2s ease-in-out infinite",
				"float": "float 3s ease-in-out infinite",
				"shimmer": "shimmer 3s linear infinite",
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;