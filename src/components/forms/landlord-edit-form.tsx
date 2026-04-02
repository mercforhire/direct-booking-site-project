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

import { Shuffle } from "lucide-react"

interface LandlordEditFormProps {
  landlordId: string
  defaultValues: LandlordFormData
}

// ── Accessible random color generation ──────────────────────────

/** Convert hex (#rrggbb) to [r, g, b] 0-255 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Convert [r, g, b] 0-255 to hex */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")
}

/** Relative luminance per WCAG 2.1 */
function luminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/** WCAG contrast ratio between two colors */
function contrastRatio(c1: [number, number, number], c2: [number, number, number]): number {
  const l1 = luminance(c1)
  const l2 = luminance(c2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** HSL to RGB conversion */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r1: number, g1: number, b1: number
  if (h < 60) { r1 = c; g1 = x; b1 = 0 }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0 }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c }
  else { r1 = c; g1 = 0; b1 = x }
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)]
}

/**
 * Generate an accessible color palette:
 * - Background: light or dark base
 * - Text: guaranteed ≥4.5:1 contrast with background (WCAG AA)
 * - Accent: guaranteed ≥3:1 contrast with background (WCAG AA for large text/UI)
 */
function generateAccessiblePalette(): { bgColor: string; textColor: string; accentColor: string } {
  const hue = Math.random() * 360
  const isDark = Math.random() > 0.5

  // Background: very light or very dark
  const bgSat = 0.15 + Math.random() * 0.35 // 15-50%
  const bgLit = isDark ? 0.08 + Math.random() * 0.1 : 0.88 + Math.random() * 0.1 // dark: 8-18%, light: 88-98%
  const bgRgb = hslToRgb(hue, bgSat, bgLit)

  // Text: high contrast against background
  const textLit = isDark ? 0.85 + Math.random() * 0.1 : 0.05 + Math.random() * 0.1
  let textRgb = hslToRgb(hue, 0.05 + Math.random() * 0.15, textLit)

  // Ensure ≥4.5:1 contrast — adjust lightness if needed
  let attempts = 0
  while (contrastRatio(bgRgb, textRgb) < 4.5 && attempts < 20) {
    const adjustedLit = isDark ? textLit + 0.03 * attempts : textLit - 0.03 * attempts
    textRgb = hslToRgb(hue, 0.05, Math.max(0, Math.min(1, adjustedLit)))
    attempts++
  }

  // Accent: complementary or analogous hue, vivid
  const accentHue = (hue + 120 + Math.random() * 120) % 360
  const accentSat = 0.55 + Math.random() * 0.35 // 55-90%
  const accentLit = isDark ? 0.5 + Math.random() * 0.15 : 0.4 + Math.random() * 0.15
  let accentRgb = hslToRgb(accentHue, accentSat, accentLit)

  // Ensure accent has ≥3:1 contrast with background
  attempts = 0
  while (contrastRatio(bgRgb, accentRgb) < 3 && attempts < 20) {
    const adjustedLit = isDark ? accentLit + 0.03 * attempts : accentLit - 0.03 * attempts
    accentRgb = hslToRgb(accentHue, accentSat, Math.max(0, Math.min(1, adjustedLit)))
    attempts++
  }

  return {
    bgColor: rgbToHex(...bgRgb),
    textColor: rgbToHex(...textRgb),
    accentColor: rgbToHex(...accentRgb),
  }
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Theme Colors</h3>
                  <p className="text-xs text-gray-500">Customize the look of your guest-facing pages.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    const palette = generateAccessiblePalette()
                    form.setValue("bgColor", palette.bgColor, { shouldDirty: true })
                    form.setValue("textColor", palette.textColor, { shouldDirty: true })
                    form.setValue("accentColor", palette.accentColor, { shouldDirty: true })
                  }}
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Randomize
                </Button>
              </div>
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
