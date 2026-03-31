import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold">Welcome</h1>
      <p className="text-gray-500 max-w-sm">
        Browse available rooms and book directly — no third-party fees.
      </p>
      <Button asChild size="lg">
        <Link href="/rooms">View Rooms</Link>
      </Button>
      <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600">
        Admin Login
      </Link>
    </div>
  )
}
