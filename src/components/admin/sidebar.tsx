"use client"

import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LayoutDashboard, BedDouble, Settings, LogOut, CalendarDays, ClipboardList, Building2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/rooms", label: "Rooms", icon: BedDouble },
  { href: "/availability", label: "Availability", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin/landlords/new", label: "Add Property", icon: Plus },
]

/** Pages that operate on a specific landlord and need the switcher visible */
const landlordScopedPaths = ["/dashboard", "/admin/rooms", "/availability", "/bookings", "/settings"]

interface LandlordOption {
  slug: string
  name: string
}

export function Sidebar({ landlords }: { landlords: LandlordOption[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const selectedSlug = searchParams.get("landlord") || landlords[0]?.slug || ""

  const isLandlordScoped = landlordScopedPaths.some((p) => pathname.startsWith(p))

  function handleLandlordChange(slug: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("landlord", slug)
    // Full page load ensures all server component state resets cleanly.
    // router.push can leave stale client component state during transition.
    window.location.href = `${pathname}?${params.toString()}`
  }

  function buildHref(basePath: string) {
    if (landlordScopedPaths.some((p) => basePath.startsWith(p)) && selectedSlug) {
      return `${basePath}?landlord=${selectedSlug}`
    }
    return basePath
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="w-56 min-h-screen border-r bg-white flex flex-col">
      {/* Admin header */}
      <div className="p-4 border-b">
        <h1 className="font-semibold text-sm text-gray-900">
          Property Manager
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {landlords.length} {landlords.length === 1 ? "property" : "properties"}
        </p>
      </div>

      {/* Landlord switcher — visible on property-scoped pages */}
      {isLandlordScoped && landlords.length > 1 && (
        <div className="px-3 py-2 border-b">
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Property
          </label>
          <Select value={selectedSlug} onValueChange={handleLandlordChange}>
            <SelectTrigger className="h-8 text-xs">
              <Building2 className="h-3 w-3 mr-1.5 shrink-0" />
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {landlords.map((l) => (
                <SelectItem key={l.slug} value={l.slug} className="text-xs">
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* If only one landlord, show its name as context on scoped pages */}
      {isLandlordScoped && landlords.length === 1 && (
        <div className="px-3 py-2 border-b">
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Property
          </label>
          <p className="text-xs text-gray-900 flex items-center gap-1.5">
            <Building2 className="h-3 w-3 shrink-0" />
            {landlords[0].name}
          </p>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={buildHref(href)}>
            <span
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </span>
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-gray-600"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
