import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Direct Booking Site</h1>
      <Button asChild>
        <Link href="/login">Admin Login</Link>
      </Button>
    </div>
  )
}
