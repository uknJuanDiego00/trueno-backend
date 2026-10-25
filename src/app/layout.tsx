import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trueno 219 API',
  description: 'Backend REST API con Next.js y Supabase para Trueno 219',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, backgroundColor: '#ffffff' }}>{children}</body>
    </html>
  );
}
