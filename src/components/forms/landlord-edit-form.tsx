"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { landlordSchema, LandlordFormData } from "@/lib/validations/landlord"
import { updateLandlord } from "@/actions/landlord"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LandlordEditFormProps {
  landlordId: string
  defaultValues: LandlordFormData
}

export function LandlordEditForm({ landlordId, defaultValues }: LandlordEditFormProps) {
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LandlordFormData>({
    resolver: zodResolver(landlordSchema),
    defaultValues,
  })

  async function onSubmit(data: LandlordFormData) {
    setServerError(null)
    setSaved(false)
    const result = await updateLandlord(landlordId, data)
    if ("error" in result && result.error) {
      if (typeof result.error === "object" && "fieldErrors" in result.error) {
        const fieldErrors = result.error.fieldErrors as Record<string, string[]>
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof LandlordFormData, { message: messages[0] })
          }
        }
      } else {
        setServerError(String(result.error))
      }
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sunset Villa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. sunset-villa" {...field} />
                  </FormControl>
                  <FormDescription>
                    Changing this will change the guest-facing URL.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Smith" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used in emails and messages sent to guests.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 123 Beach Rd, Victoria BC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g. info@sunsetvilla.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="e.g. +1 250 555 1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Theme colors */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Theme Colors</h3>
              <p className="text-xs text-gray-500">Customize the look of your guest-facing pages.</p>
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="bgColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Background</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-8 w-8 rounded border cursor-pointer"
                          />
                          <Input className="text-xs h-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Text</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-8 w-8 rounded border cursor-pointer"
                          />
                          <Input className="text-xs h-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Accent</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-8 w-8 rounded border cursor-pointer"
                          />
                          <Input className="text-xs h-8" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Live preview swatch */}
            <div
              className="rounded-lg p-4 text-sm"
              style={{
                backgroundColor: form.watch("bgColor"),
                color: form.watch("textColor"),
              }}
            >
              <p className="font-medium">{form.watch("name") || "Property Name"}</p>
              <p className="text-xs mt-1 opacity-80">Preview of your guest-facing colors</p>
              <span
                className="inline-block mt-2 px-3 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: form.watch("accentColor"),
                  color: form.watch("bgColor"),
                }}
              >
                Book Now
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Details"}
              </Button>
              {saved && <span className="text-sm text-green-600">Details saved.</span>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
