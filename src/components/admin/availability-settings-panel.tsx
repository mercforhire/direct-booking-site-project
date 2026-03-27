"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  roomAvailabilitySettingsSchema,
  RoomAvailabilitySettingsFormData,
} from "@/lib/validations/availability"
import { updateRoomAvailabilitySettings } from "@/actions/availability"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RoomForAvailability = {
  id: string
  name: string
  minStayNights: number
  maxStayNights: number
  bookingWindowMonths: number
}

interface AvailabilitySettingsPanelProps {
  room: RoomForAvailability
  onRoomUpdated?: () => void
}

const BOOKING_WINDOW_OPTIONS = [3, 4, 5, 6, 7, 8, 9]

export function AvailabilitySettingsPanel({
  room,
  onRoomUpdated,
}: AvailabilitySettingsPanelProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<RoomAvailabilitySettingsFormData>({
    resolver: zodResolver(roomAvailabilitySettingsSchema),
    defaultValues: {
      minStayNights: room.minStayNights,
      maxStayNights: room.maxStayNights,
      bookingWindowMonths: room.bookingWindowMonths,
    },
  })

  async function onSubmit(data: RoomAvailabilitySettingsFormData) {
    setServerError(null)
    setSaved(false)

    const result = await updateRoomAvailabilitySettings(room.id, data)

    if ("error" in result) {
      setServerError("Failed to save settings. Please try again.")
      return
    }

    setSaved(true)
    form.reset(data)
    router.refresh()
    onRoomUpdated?.()

    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stay Requirements</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="minStayNights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Stay (nights)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxStayNights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Stay (nights)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bookingWindowMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Window</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(parseInt(v, 10))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select months" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BOOKING_WINDOW_OPTIONS.map((months) => (
                        <SelectItem key={months} value={String(months)}>
                          {months} months
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {serverError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">
                  Saved
                </span>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
