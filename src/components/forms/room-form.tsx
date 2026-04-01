"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { RoomPhoto } from "@prisma/client"
import { Trash2, Plus } from "lucide-react"
import { PhotoUploader } from "@/components/admin/photo-uploader"

import { roomSchema, RoomFormData } from "@/lib/validations/room"
import { createRoom, updateRoom, deleteRoom } from "@/actions/room"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface SerializedAddOn {
  id: string
  name: string
  price: number
  roomId: string
}

interface SerializedRoom {
  id: string
  name: string
  description: string
  location: string
  baseNightlyRate: number
  cleaningFee: number
  extraGuestFee: number
  baseGuests: number
  maxGuests: number
  isActive: boolean
  minStayNights: number
  maxStayNights: number
  bookingWindowMonths: number
  createdAt: Date
  updatedAt: Date
  addOns: SerializedAddOn[]
  photos: RoomPhoto[]
}

interface RoomFormProps {
  room?: SerializedRoom
}

export function RoomForm({ room }: RoomFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: room
      ? {
          name: room.name,
          description: room.description,
          location: room.location,
          baseNightlyRate: Number(room.baseNightlyRate),
          cleaningFee: Number(room.cleaningFee),
          extraGuestFee: Number(room.extraGuestFee),
          baseGuests: room.baseGuests,
          maxGuests: room.maxGuests,
          isActive: room.isActive,
          addOns: room.addOns.map((a) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price),
          })),
        }
      : {
          name: "",
          description: "",
          location: "",
          baseNightlyRate: 0,
          cleaningFee: 0,
          extraGuestFee: 0,
          baseGuests: 1,
          maxGuests: 1,
          isActive: true,
          addOns: [],
        },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "addOns",
  })

  async function onSubmit(data: RoomFormData) {
    setServerError(null)
    const result = room
      ? await updateRoom(room.id, data)
      : await createRoom(data)

    if (result && "error" in result) {
      setServerError("Please correct the errors and try again.")
      return
    }

    router.push("/admin/rooms")
  }

  async function handleDelete() {
    if (!room) return
    if (!confirm("Are you sure you want to delete this room? This cannot be undone.")) return
    setIsDeleting(true)
    const result = await deleteRoom(room.id)
    if (result && "error" in result) {
      setServerError(result.error ?? null)
      setIsDeleting(false)
      return
    }
    router.push("/admin/rooms")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {serverError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Room Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Ocean View Suite" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the room..." rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Block B, Unit 3" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="baseNightlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Nightly Rate ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Active (visible to guests)</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Fees */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Fees</h2>

          <FormField
            control={form.control}
            name="cleaningFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cleaning Fee ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="baseGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Guests (included in base rate)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Guests</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="extraGuestFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Per Extra Guest Nightly Fee ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Add-ons */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Add-ons</h2>

          {fields.length === 0 && (
            <p className="text-sm text-gray-500">No add-ons yet. Add optional extras guests can select.</p>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3">
              <FormField
                control={form.control}
                name={`addOns.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className={index === 0 ? undefined : "sr-only"}>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Late checkout" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`addOns.${index}.price`}
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel className={index === 0 ? undefined : "sr-only"}>Price ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-8"
                onClick={() => remove(index)}
                aria-label="Remove add-on"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", price: 0 })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Add-on
          </Button>
        </div>

        {/* Photos */}
        {room?.id && (
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-gray-900">Photos</h2>
            <p className="text-sm text-gray-500">
              Drag to reorder. First photo is the cover image.
            </p>
            <PhotoUploader
              roomId={room.id}
              initialPhotos={room.photos ?? []}
            />
          </div>
        )}
        {!room?.id && (
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-gray-900">Photos</h2>
            <div className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-400 text-center">
              Save the room first, then add photos on the edit page.
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Room"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/rooms")}>
              Cancel
            </Button>
          </div>

          {room && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Room"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
