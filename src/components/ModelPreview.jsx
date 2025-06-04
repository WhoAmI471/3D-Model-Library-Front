'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

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

  useEffect(() => {
    setLocalIndex(currentImageIndex)
  }, [currentImageIndex])

  if (!model || !model.images?.length) return null

  const handleNextImage = (e) => {
    e.stopPropagation()
    const newIndex = localIndex === model.images.length - 1 ? 0 : localIndex + 1
    setLocalIndex(newIndex)
    onNextImage?.()
  }

  const handlePrevImage = (e) => {
    e.stopPropagation()
    const newIndex = localIndex === 0 ? model.images.length - 1 : localIndex - 1
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
        left: `${position.x / 2}px`,
        top: `${position.y}px`,
        width: '320px',
        height: '240px'
      }}
      onWheel={onWheel}
      onMouseEnter={() => {setIsMouseOver(true); setIsHovering(true)}}
      onMouseLeave={() => setIsMouseOver(false)}
    >
      <div className="relative w-full h-full">
        <Image
          src={model.images[localIndex]}
          alt={`Превью ${model.title}`}
          fill
          className="object-cover"
          priority
          sizes="320px"
        />
        
        {isMouseOver && (
          <>
            <button 
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-10"
            >
              &lt;
            </button>
            <button 
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full z-10"
            >
              &gt;
            </button>
          </>
        )}
        
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {model.images.map((_, index) => (
            <button 
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                setLocalIndex(index)
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === localIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <p className="text-white text-sm font-medium truncate">
            {model.title} ({localIndex + 1}/{model.images.length})
          </p>
        </div>
      </div>
    </motion.div>
  )
}