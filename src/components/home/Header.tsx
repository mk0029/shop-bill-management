"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between py-1">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          {/* <span className="inline-block h-6 w-6 rounded bg-primary" /> */}
          <span>Jambh Electrics</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/#home"
            className="hover:text-foreground text-base text-muted-foreground"
          >
            Home
          </Link>
          <Link
            href="/#about"
            className="hover:text-foreground text-base text-muted-foreground"
          >
            About
          </Link>
          <Link
            href="/#request"
            className="hover:text-foreground text-base text-muted-foreground"
          >
            Request Account
          </Link>
        </nav>

        <div className="hidden md:block">
          <Link href="/login">
            <Button size="sm">Login</Button>
          </Link>
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded border"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            <Link
              href="#home"
              className="text-sm text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
            <Link
              href="#about"
              className="text-sm text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              About
            </Link>
            <Link
              href="#request"
              className="text-sm text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Request Account
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="mt-2">
              <Button size="sm" className="w-full">
                Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
