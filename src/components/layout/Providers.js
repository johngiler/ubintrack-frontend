"use client";

import { AuthProvider } from "@/context/AuthContext";
import { AppUpdateProvider } from "@/context/AppUpdateContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { WmsDocumentTitle } from "@/components/layout/WmsDocumentTitle";
import { WmsFavicon } from "@/components/layout/WmsFavicon";
import { WorkspaceTheme } from "@/components/layout/WorkspaceTheme";
import { WmsShell } from "@/components/layout/WmsShell";
import { SwrProvider } from "@/lib/swr";

export function Providers({ children, initialTenantSlug, initialWorkspace = null }) {
  return (
    <ThemeProvider>
      <SwrProvider>
        <WorkspaceProvider initialTenantSlug={initialTenantSlug} initialWorkspace={initialWorkspace}>
          <WorkspaceTheme />
          <AuthProvider>
            <AppUpdateProvider>
              <NotificationProvider>
                <WmsDocumentTitle />
                <WmsFavicon />
                <WmsShell>{children}</WmsShell>
              </NotificationProvider>
            </AppUpdateProvider>
          </AuthProvider>
        </WorkspaceProvider>
      </SwrProvider>
    </ThemeProvider>
  );
}
