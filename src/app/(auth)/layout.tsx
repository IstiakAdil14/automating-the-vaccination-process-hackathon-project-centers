// app/(auth)/layout.tsx — unauthenticated layout (no sidebar/topbar)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </main>
  );
}
