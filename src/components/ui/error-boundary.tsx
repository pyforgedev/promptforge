import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sanitizeError } from '@/lib/sanitizeError'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.warn('[ErrorBoundary] Caught error:', sanitizeError(error))
      console.warn('[ErrorBoundary] Stack:', error.stack)
      console.warn('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="overlay-glass flex flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-brand-danger" />
          <h2 className="text-label-ui font-semibold text-primary">Something went wrong</h2>
          <p className="text-body-ui text-muted max-w-md">
            {'An unexpected error occurred. Please try again.'}
          </p>
          <Button variant="default" onClick={this.handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
