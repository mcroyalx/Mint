import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'mint — Web3 Media Equity Platform',
  description: 'Launch Telegram Channel TDAs and trade media equity inside the TON ecosystem.',
  keywords: ['TON', 'Web3', 'Telegram', 'Media Equity', 'DeFi', 'TDA'],
  openGraph: {
    title: 'mint — Web3 Media Equity Platform',
    description: 'Launch Telegram Channel TDAs and trade media equity inside the TON ecosystem.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'mint — Web3 Media Equity Platform',
    description: 'Launch Telegram Channel TDAs and trade media equity inside the TON ecosystem.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="bg-[#141414] text-white font-sans antialiased selection:bg-neutral-800 selection:text-white" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
