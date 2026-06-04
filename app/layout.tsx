import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'PageAlign CRO — E-commerce Copy Personalization',
  description: 'Iteratively optimize and adapt e-commerce landing pages for custom core audiences using Gemini 3.5 Flash.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased text-gray-950 bg-gray-50/50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
