"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { settingsSchema, SettingsFormData } from "@/lib/validations/settings"
import { upsertSettings } from "@/actions/settings"
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

interface SettingsFormProps {
  defaultValues?: { serviceFeePercent: number; depositAmount: number }
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [saved, setSaved] = useState(false)
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultValues ?? { serviceFeePercent: 0, depositAmount: 0 },
  })

  async function onSubmit(data: SettingsFormData) {
    const result = await upsertSettings(data)
    if ("error" in result && result.error) {
      // field errors are handled by zodResolver but show a fallback
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Global Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="serviceFeePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Fee (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="3.00" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                  <FormDescription>
                    Added to booking total to offset Stripe processing costs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                  </FormControl>
                  <FormDescription>
                    Set to 0 to disable. Collected as part of booking payment.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
              {saved && <span className="text-sm text-green-600">Settings saved.</span>}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
