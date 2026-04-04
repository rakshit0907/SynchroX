import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'SynchroX — AI Orchestrator',
  description: 'Intelligent workflow orchestration with human-in-the-loop review.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="bg-orbs" />
        <Sidebar />
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
