import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'SupplyChain Insight', description: 'Supply chain inventory risk and demand analysis' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
