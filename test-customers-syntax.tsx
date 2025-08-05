"use client";

import { useState } from "react";

export default function TestCustomers() {
  const [test, setTest] = useState("");

  return (
    <div>
      <p>Test: {test ? `Value: ${test}` : "No value"}</p>
    </div>
  );
}
