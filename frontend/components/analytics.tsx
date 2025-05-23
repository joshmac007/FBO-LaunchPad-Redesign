"use client"

export function Analytics() {
  return (
    <>
      {/* Flight path animation elements */}
      <div className="fixed top-[10%] left-0 w-full h-0 z-0 pointer-events-none overflow-hidden">
        <div className="flight-path absolute w-16 h-8 opacity-30">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16L12 7L3 16H5L12 9L19 16H21Z" fill="currentColor" className="text-primary" />
            <path d="M19 19L12 12L5 19H7L12 14L17 19H19Z" fill="currentColor" className="text-primary" />
          </svg>
        </div>
      </div>
      <div className="fixed top-[30%] left-0 w-full h-0 z-0 pointer-events-none overflow-hidden">
        <div className="flight-path absolute w-16 h-8 opacity-30" style={{ animationDelay: "5s" }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16L12 7L3 16H5L12 9L19 16H21Z" fill="currentColor" className="text-accent" />
            <path d="M19 19L12 12L5 19H7L12 14L17 19H19Z" fill="currentColor" className="text-accent" />
          </svg>
        </div>
      </div>
      <div className="fixed top-[50%] left-0 w-full h-0 z-0 pointer-events-none overflow-hidden">
        <div className="flight-path absolute w-16 h-8 opacity-30" style={{ animationDelay: "8s" }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16L12 7L3 16H5L12 9L19 16H21Z" fill="currentColor" className="text-primary" />
            <path d="M19 19L12 12L5 19H7L12 14L17 19H19Z" fill="currentColor" className="text-primary" />
          </svg>
        </div>
      </div>
    </>
  )
}
