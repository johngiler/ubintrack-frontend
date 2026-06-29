"use client";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { WmsDocumentTitle } from "@/components/layout/WmsDocumentTitle";
import { WmsFavicon } from "@/components/layout/WmsFavicon";
import { WorkspaceTheme } from "@/components/layout/WorkspaceTheme";
import { WmsShell } from "@/components/layout/WmsShell";

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <WorkspaceTheme />
        <AuthProvider>
          <WmsDocumentTitle />
          <WmsFavicon />
          <WmsShell>{children}</WmsShell>
        </AuthProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
