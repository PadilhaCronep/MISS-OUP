import { useEffect } from 'react';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} - Missao Platform`;

    return () => {
      document.title = 'Missao Platform';
    };
  }, [title]);
}
