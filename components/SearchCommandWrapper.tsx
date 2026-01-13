"use client"

import { useState } from "react"
import { SearchCommand } from "./SearchCommand"

export function SearchCommandWrapper() {
  const [open, setOpen] = useState(false)

  return <SearchCommand open={open} onOpenChange={setOpen} />
}
