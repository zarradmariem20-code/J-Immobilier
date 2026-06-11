import React, { useEffect, useRef, useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement> & { showLoader?: boolean }) {
  const [didError, setDidError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const prevSrcRef = useRef(props.src)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, showLoader, ...rest } = props

  useEffect(() => {
    if (prevSrcRef.current !== src) {
      setIsLoaded(false)
      prevSrcRef.current = src
    }
  }, [src])

  useEffect(() => {
    setDidError(false)
    setIsLoaded(false)
  }, [src])

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className ?? ''}`} style={style}>
      {showLoader && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse rounded-[inherit]">
          <svg className="h-8 w-8 text-slate-300 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className ?? ''} ${showLoader && !isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        loading="lazy"
        decoding="async"
        {...rest}
        onError={handleError}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  )
}
