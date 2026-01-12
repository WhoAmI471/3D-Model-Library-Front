'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { proxyUrl } from '@/lib/utils'

export const ModelPreview = ({ 
  model, 
  position, 
  currentImageIndex, 
  onNextImage, 
  onPrevImage,
  onWheel,
	isHovering,
	setIsHovering
}) => {
  const [localIndex, setLocalIndex] = useState(currentImageIndex)
  const [isMouseOver, setIsMouseOver] = useState(false)
  const [validImages, setValidImages] = useState(model?.images || [])

  useEffect(() => {
    setLocalIndex(currentImageIndex)
  }, [currentImageIndex])

  useEffect(() => {
    setValidImages(model?.images || [])
  }, [model?.images])

  const handleImageError = (imageUrl) => {
    setValidImages(prev => {
      const filtered = prev.filter(img => img !== imageUrl)
      if (localIndex >= filtered.length && filtered.length > 0) {
        setLocalIndex(Math.max(0, filtered.length - 1))
      }
      return filtered
    })
  }

  if (!model || !validImages?.length) return null

  const handleNextImage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const newIndex = localIndex === validImages.length - 1 ? 0 : localIndex + 1
    setLocalIndex(newIndex)
    onNextImage?.()
  }

  const handlePrevImage = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const newIndex = localIndex === 0 ? validImages.length - 1 : localIndex - 1
    setLocalIndex(newIndex)
    onPrevImage?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[9999] bg-white shadow-xl rounded-md overflow-hidden border border-gray-300 pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        height: '240px'
      }}
      onWheel={onWheel}
      onMouseEnter={() => {
        setIsMouseOver(true)
        if (setIsHovering) setIsHovering(true)
      }}
      onMouseLeave={() => {
        setIsMouseOver(false)
        if (setIsHovering) setIsHovering(false)
      }}
    >
      <div className="relative w-full h-full">
        {validImages[localIndex] && (
          <img
            src={proxyUrl(validImages[localIndex])}
            alt={`Превью ${model.title}`}
            className="w-full h-full object-cover"
            onError={() => {
              handleImageError(validImages[localIndex])
              if (validImages.length > 1) {
                setLocalIndex(prev => Math.min(prev, validImages.length - 2))
              }
            }}
          />
        )}
        
        {isMouseOver && (
          <>
            <button 
              onClick={handlePrevImage}
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseLeave={(e) => e.stopPropagation()}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-10 cursor-pointer"
            >
              &lt;
            </button>
            <button 
              onClick={handleNextImage}
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseLeave={(e) => e.stopPropagation()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-10 cursor-pointer"
            >
              &gt;
            </button>
          </>
        )}
        
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {validImages.map((_, index) => (
            <button 
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                setLocalIndex(index)
              }}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                index === localIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <p className="text-white text-sm font-medium truncate">
            {model.title} ({localIndex + 1}/{validImages.length})
          </p>
        </div>
      </div>
    </motion.div>
  )
}