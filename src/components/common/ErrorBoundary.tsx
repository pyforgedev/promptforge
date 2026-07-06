import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn('[ErrorBoundary] Caught error:', error.message, info.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-danger/10">
            <AlertTriangle className="h-6 w-6 text-brand-danger" />
          </div>
          <div className="text-center">
            <h3 className="text-label-ui font-semibold text-primary">Something went wrong</h3>
            <p className="mt-1 text-caption-ui text-muted">
              {import.meta.env.DEV ? this.state.error.message : 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
          <Button variant="default" size="sm" onClick={this.handleReset} className="cursor-pointer">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
