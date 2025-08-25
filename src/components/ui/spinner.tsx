'use client'

import React from "react";
import { LoaderCircle } from "lucide-react";

export const Spinner = () => {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center">
      <div className="container mx-auto p-6 flex items-center justify-center">
        <LoaderCircle className="animate-spin h-8 w-8" />
      </div>
    </section>
  )
}

