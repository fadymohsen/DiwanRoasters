import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../globals.css";
import { fontVars } from "@/lib/fonts";
import { AdminLangProvider } from "@/lib/lang";
import AppProviders from "@/components/providers/AppProviders";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: { absolute: "Admin | DIWAN" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={fontVars}>
      <body suppressHydrationWarning className="font-sans antialiased">
        <AdminLangProvider>
          <AppProviders>
            <AdminShell>{children}</AdminShell>
          </AppProviders>
        </AdminLangProvider>
      </body>
    </html>
  );
}
