"use client";

import { useEffect } from "react";
import { prehydrateAuth } from "@/store/auth-store";

export default function AuthPrehydrate() {
  useEffect(() => {
    prehydrateAuth();
  }, []);
  return null;
}
