"use client"

import { useState } from "react"
import Image from "next/image"
import * as Dialog from "@radix-ui/react-dialog"
import { BedDouble, ChevronLeft, ChevronRight, X } from "lucide-react"

interface RoomPhotoGalleryProps {
  photos: { url: string; position: number }[]
}

export function RoomPhotoGallery({ photos }: RoomPhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  function openLightbox(i: number) {
    setActiveIndex(i)
    setLightboxOpen(true)
  }

  return (
    <div>
      {/* Hero photo */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
        {photos.length === 0 ? (
          <div className="flex items-center justify-center w-full h-full">
            <BedDouble className="text-gray-400" size={48} />
          </div>
        ) : (
          <button
            className="relative w-full h-full block"
            onClick={() => openLightbox(0)}
            aria-label="Open photo gallery"
          >
            <Image
              src={photos[0].url}
              alt=""
              fill
              className="object-cover"
              priority
            />
          </button>
        )}
      </div>

      {/* Scroll strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
          {photos.slice(1).map((photo, index) => (
            <button
              key={photo.url}
              className="flex-none relative w-32 h-24 rounded overflow-hidden"
              onClick={() => openLightbox(index + 1)}
              aria-label={`View photo ${index + 2}`}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {photos.length > 0 && (
        <Dialog.Root open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
            <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50">
              <Dialog.Title className="sr-only">Photo gallery</Dialog.Title>

              {/* Current image */}
              <div className="relative max-w-4xl w-full max-h-screen flex items-center justify-center px-12">
                <Image
                  src={photos[activeIndex].url}
                  alt=""
                  width={1200}
                  height={900}
                  className="max-w-full max-h-screen object-contain"
                />
              </div>

              {/* Prev button */}
              {activeIndex > 0 && (
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
                  onClick={() => setActiveIndex((i) => i - 1)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Next button */}
              {activeIndex < photos.length - 1 && (
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
                  onClick={() => setActiveIndex((i) => i + 1)}
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Close button */}
              <Dialog.Close
                className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2"
                aria-label="Close gallery"
              >
                <X size={20} />
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}
