'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { AuthProvider } from './AuthProvider';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/auth');

  return (
    <AuthProvider>
      {isAuthPage ? (
        <>{children}</>
      ) : (
        <>
          <Sidebar />
          <main className="main-content">{children}</main>
        </>
      )}
    </AuthProvider>
  );
}
