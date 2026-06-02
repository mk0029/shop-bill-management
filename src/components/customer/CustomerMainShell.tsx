"use client";

import React from "react";

export default function CustomerMainShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="pt-3 max-md:px-3 max-sm:px-1 xl:ml-64">
      <div className="py-1 sm:p-2">{children}</div>
    </main>
  );
}
