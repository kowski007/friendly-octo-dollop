"use client";

import { createContext, useContext } from "react";

const PrivyRuntimeContext = createContext<{ enabled: boolean }>({ enabled: false });

export function PrivyRuntimeProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <PrivyRuntimeContext.Provider value={{ enabled }}>
      {children}
    </PrivyRuntimeContext.Provider>
  );
}

export function usePrivyRuntime() {
  return useContext(PrivyRuntimeContext);
}
