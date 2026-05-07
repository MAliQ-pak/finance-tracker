export interface ChartColors {
  need: string
  want: string
  savings: string
  warn: string
  tick: string
  grid: string
  tooltip: { bg: string; border: string; text: string; label: string }
  cursor: string
  ringBg: string
  pace: string
  fgHigh: string
  fgMid: string
  fgLow: string
}

export function getChartColors(theme: 'dark' | 'light'): ChartColors {
  const dk = theme === 'dark'
  return {
    need:    dk ? '#60a5fa' : '#3b82f6',
    want:    dk ? '#a78bfa' : '#8b5cf6',
    savings: dk ? '#4ade80' : '#22c55e',
    warn:    dk ? '#f87171' : '#ef4444',
    tick:    dk ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
    grid:    dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    tooltip: {
      bg:     dk ? '#111113' : '#ffffff',
      border: dk ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      text:   dk ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.70)',
      label:  dk ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)',
    },
    cursor:  dk ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    ringBg:  dk ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    pace:    dk ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
    fgHigh:  dk ? 'rgba(255,255,255,0.82)' : 'rgba(0,0,0,0.82)',
    fgMid:   dk ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
    fgLow:   dk ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
  }
}
