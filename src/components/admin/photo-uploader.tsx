"use client"

import { useRef, useState } from "react"
import imageCompression from "browser-image-compression"
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useUploadThing } from "@/lib/uploadthing"
import { addPhoto, savePhotoOrder, deletePhoto } from "@/actions/room-photos"
import { X, Upload } from "lucide-react"
import Image from "next/image"

interface Photo {
  id: string
  url: string
  key: string
}

interface PhotoUploaderProps {
  roomId: string
  initialPhotos: { id: string; url: string; key: string; position: number }[]
}

function SortablePhoto({
  photo,
  onDelete,
  isCover,
}: {
  photo: Photo
  onDelete: (photo: Photo) => void
  isCover: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: photo.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative group">
      <div
        {...listeners}
        className="w-24 h-24 rounded-md overflow-hidden border-2 border-gray-200 cursor-grab active:cursor-grabbing"
      >
        <Image
          src={photo.url}
          alt="Room photo"
          width={96}
          height={96}
          className="object-cover w-full h-full"
        />
      </div>
      {isCover && (
        <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1 rounded">
          Cover
        </span>
      )}
      <button
        type="button"
        onClick={() => onDelete(photo)}
        className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
        aria-label="Delete photo"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function PhotoUploader({ roomId, initialPhotos }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<Photo[]>(
    [...initialPhotos].sort((a, b) => a.position - b.position)
  )
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { startUpload } = useUploadThing("roomPhotoUploader", {
    onClientUploadComplete: async (res) => {
      for (const file of res) {
        const result = await addPhoto(roomId, file.ufsUrl ?? file.url, file.key)
        if ("photo" in result && result.photo) {
          setPhotos((prev) => [
            ...prev,
            { id: result.photo.id, url: result.photo.url, key: result.photo.key },
          ])
        }
      }
      setIsUploading(false)
      setUploadStatus(null)
    },
    onUploadError: (error: Error) => {
      console.error("Upload error:", error)
      setIsUploading(false)
      setUploadStatus("Upload failed. Please try again.")
    },
  })

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsUploading(true)
    setUploadStatus("Compressing...")

    const compressed = await Promise.all(
      Array.from(files).map((file) =>
        imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
      )
    )

    setUploadStatus("Uploading...")
    await startUpload(compressed)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex)
    setPhotos(reordered)
    await savePhotoOrder(roomId, reordered.map((p) => p.id))
  }

  async function handleDelete(photo: Photo) {
    setIsDeleting(photo.id)
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    await deletePhoto(photo.id, photo.key, roomId)
    setIsDeleting(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={horizontalListSortingStrategy}
          >
            {photos.map((photo, index) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                onDelete={handleDelete}
                isCover={index === 0}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-sm transition-colors ${isUploading ? "cursor-not-allowed border-gray-200 text-gray-300" : "cursor-pointer border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600"}`}
      >
        <Upload className="h-5 w-5" />
        {isUploading ? (
          <span>{uploadStatus}</span>
        ) : (
          <span>Click or drag photos here (compressed to 1 MB before upload)</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {isDeleting && (
        <p className="text-xs text-gray-400">Deleting photo...</p>
      )}
    </div>
  )
}
