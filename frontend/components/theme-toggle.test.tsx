import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './theme-toggle'

// ── Mocks ──────────────────────────────────────────────────────────────────

const themeState: {
  resolvedTheme: 'light' | 'dark' | undefined
  setTheme: ReturnType<typeof vi.fn>
} = {
  resolvedTheme: 'light',
  setTheme: vi.fn(),
}

vi.mock('next-themes', () => ({
  useTheme: () => themeState,
}))

let mounted = true
vi.mock('@/hooks/use-mounted', () => ({
  useMounted: () => mounted,
}))

beforeEach(() => {
  themeState.resolvedTheme = 'light'
  themeState.setTheme = vi.fn()
  mounted = true
})

describe('ThemeToggle', () => {
  it('shows the moon icon and the "switch to dark mode" label when the theme is light', () => {
    themeState.resolvedTheme = 'light'
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeTruthy()
  })

  it('shows the sun icon and the "switch to light mode" label when the theme is dark', () => {
    themeState.resolvedTheme = 'dark'
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeTruthy()
  })

  it('flips the theme on click', () => {
    themeState.resolvedTheme = 'light'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }))
    expect(themeState.setTheme).toHaveBeenCalledWith('dark')

    themeState.resolvedTheme = 'dark'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }))
    expect(themeState.setTheme).toHaveBeenLastCalledWith('light')
  })

  it('renders a disabled placeholder before hydration so the icon does not flash', () => {
    mounted = false
    render(<ThemeToggle />)
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })
})
