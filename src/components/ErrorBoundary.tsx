import React, { type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">!</div>
            <h1 className="text-2xl font-bold text-white mb-3">Algo deu errado</h1>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              {import.meta.env.DEV
                ? this.state.error?.message
                : 'Ocorreu um erro inesperado. Nossa equipe foi notificada.'}
            </p>
            <button
              onClick={() => window.location.replace('/')}
              className="bg-[#F5C400] text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
            >
              Recarregar plataforma
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


