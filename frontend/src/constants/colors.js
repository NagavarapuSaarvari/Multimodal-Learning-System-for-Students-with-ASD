// Professional Color Palette - ASD Learning Platform
// Uses calming, accessible colors suitable for students with autism

const colors = {
  // Primary Color: Professional Blue (calm, focused)
  primary: {
    50: '#EFF6FF',
    100: '#E0EDFF',
    200: '#BAD9FF',
    300: '#7EBFFF',
    400: '#3B82F6',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554'
  },

  // Secondary Color: Professional Teal (trust, calm)
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#134E4A',
    900: '#0F3F3A'
  },

  // Accent Color: Warm Green (positive, growth)
  accent: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#145231'
  },

  // Neutral Colors (backgrounds, text)
  neutral: {
    white: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },

  // Semantic Colors
  success: '#22C55E',
  warning: '#FBBF24',
  error: '#EF4444',
  info: '#3B82F6'
}

// Export as CSS variables for Tailwind
const cssVariables = `
:root {
  --color-primary-600: ${colors.primary[600]};
  --color-primary-500: ${colors.primary[500]};
  --color-primary-400: ${colors.primary[400]};
  
  --color-secondary-600: ${colors.secondary[600]};
  --color-secondary-500: ${colors.secondary[500]};
  
  --color-accent-500: ${colors.accent[500]};
  --color-accent-600: ${colors.accent[600]};
  
  --color-text-primary: ${colors.neutral[900]};
  --color-text-secondary: ${colors.neutral[600]};
  --color-text-light: ${colors.neutral[500]};
  
  --color-bg-primary: ${colors.neutral.white};
  --color-bg-secondary: ${colors.neutral[50]};
  --color-bg-tertiary: ${colors.neutral[100]};
  
  --color-border: ${colors.neutral[200]};
  --color-border-light: ${colors.neutral[100]};
}`

export { colors, cssVariables }
