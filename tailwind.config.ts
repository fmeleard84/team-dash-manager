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
				// Système de couleurs premium
				black: '#0D0D0F',
				'near-black': '#111113',
				white: '#FFFFFF',
				gray: {
					900: '#1B1B1F',
					800: '#232327',
					700: '#2B2B30',
					600: '#3A3A40',
					500: '#52525B',
					400: '#8A8A93',
					300: '#C9C9CF',
					200: '#E7E7EA',
					100: '#F3F3F5',
				},
				accent: {
					DEFAULT: '#7C3AED', // Violet premium
					dark: '#6D28D9',
					light: '#8B5CF6',
					ink: '#5B21B6',
				},
				// Gardons les anciennes couleurs pour compatibilité
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
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
				'md': '12px',
				'lg': '16px',
				'xl': '20px',
				'2xl': '24px',
			},
			boxShadow: {
				'card': '0 8px 24px rgba(0,0,0,.06)',
				'card-hover': '0 12px 32px rgba(0,0,0,.08)',
				'button': '0 1px 2px rgba(0,0,0,.08)',
				'focus': '0 0 0 2px rgba(124,58,237,.35)',
			},
			backgroundImage: {
				'hero-gradient': 'linear-gradient(90deg, #38E1E1 0%, #21A7F0 35%, #FDB952 70%, #F26A4D 100%)',
				'accent-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				'dark-gradient': 'linear-gradient(180deg, #0D0D0F 0%, #1B1B1F 100%)',
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
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				"reveal": "reveal 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
				"fade": "fade 0.3s ease-in-out",
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;