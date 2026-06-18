'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';

export function Providers({ children }: { readonly children: React.ReactNode }) {
  const manifestUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/tonconnect-manifest.json` : 'https://mint-web3.app/tonconnect-manifest.json';
  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
