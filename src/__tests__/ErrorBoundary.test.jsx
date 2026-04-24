import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

function Kaboom() { throw new Error('boom-xyz') }

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><p>hello</p></ErrorBoundary>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders fallback with the error message and recovery buttons', () => {
    render(<ErrorBoundary><Kaboom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/boom-xyz/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /full reset/i })).toBeInTheDocument()
  })
})
