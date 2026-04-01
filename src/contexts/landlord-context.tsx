"use client"

import { createContext, useContext } from "react"

export type LandlordInfo = {
  id: string
  slug: string
  name: string
  ownerName: string
  address: string
  email: string
  phone: string | null
  bgColor: string
  textColor: string
  accentColor: string
}

const LandlordContext = createContext<LandlordInfo | null>(null)

export function LandlordProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: LandlordInfo
}) {
  return (
    <LandlordContext.Provider value={value}>
      {children}
    </LandlordContext.Provider>
  )
}

export function useLandlord() {
  const ctx = useContext(LandlordContext)
  if (!ctx) throw new Error("useLandlord must be used within a LandlordProvider")
  return ctx
}
