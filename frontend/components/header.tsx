"use client"

import { Button } from "@/components/ui/button"
import { Plane, Menu, X, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [btnClicked, setBtnClicked] = useState(false)
  const demoButtonRef = useRef(null)
  const mobileDemoButtonRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  const scrollToSection = (e, sectionId) => {
    e.preventDefault()
    setMobileMenuOpen(false)

    const section = document.getElementById(sectionId)
    if (section) {
      // Add a small delay to make the transition feel more natural
      setTimeout(() => {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }, 100)
    }
  }

  const handleHomeClick = (e) => {
    e.preventDefault()
    setMobileMenuOpen(false)

    // Always navigate to the home page
    router.push("/")

    // If already on home page, scroll to top
    if (pathname === "/") {
      setTimeout(() => {
        scrollToTop()
      }, 100)
    }
  }

  const handleDemoClick = (e, isMobile = false) => {
    e.preventDefault()
    setIsTransitioning(true)
    setBtnClicked(true)

    // Reference to the correct button based on mobile or desktop
    const buttonRef = isMobile ? mobileDemoButtonRef : demoButtonRef

    // Wait for the animation to complete before navigating
    setTimeout(() => {
      router.push("/request-demo")
      setIsTransitioning(false)
      setBtnClicked(false)
    }, 800)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md bg-background/80 dark:bg-background/80">
      <div className="container flex h-16 items-center justify-between space-x-4">
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Link href="/" className="flex items-center gap-2" onClick={handleHomeClick}>
            <Plane className="h-5 w-5 md:h-6 md:w-6 text-primary rotate-45" />
            <span className="text-lg md:text-xl font-bold">FBO LaunchPad</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center gap-6 flex-1 mx-4">
          <Link
            href="/"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
            onClick={handleHomeClick}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 22V12H15V22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Home
          </Link>
          <Link
            href="/#features"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
            onClick={(e) => scrollToSection(e, "features")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22 12H18L15 21L9 3L6 12H2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Features
          </Link>
          <Link
            href="/#benefits"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
            onClick={(e) => scrollToSection(e, "benefits")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M12 8H12.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Benefits
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
            onClick={(e) => scrollToSection(e, "how-it-works")}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 16V12L14 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            How It Works
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors theme-toggle"
            aria-label="Toggle theme"
          >
            {mounted && (
              <span className="theme-toggle-icon inline-block">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <Button
            ref={demoButtonRef}
            className={`bg-primary hover:bg-primary/90 glow-effect hidden md:flex transition-all duration-300 demo-btn ${
              btnClicked ? "clicked" : ""
            } ${isTransitioning ? "scale-95 opacity-80" : ""}`}
            onClick={(e) => handleDemoClick(e, false)}
          >
            <span className="demo-btn-icon mr-2">
              <Plane className="h-4 w-4 rotate-45" />
            </span>
            Request a Demo
          </Button>

          <Button
            variant="outline"
            className="hidden md:flex border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            onClick={() => router.push("/login")}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 17L15 12L10 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Member Log In
          </Button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-50 mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background/95 backdrop-blur-md border-b shadow-lg">
            <Link
              href="/"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              onClick={handleHomeClick}
            >
              Home
            </Link>
            <Link
              href="/#features"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              onClick={(e) => scrollToSection(e, "features")}
            >
              Features
            </Link>
            <Link
              href="/#benefits"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              onClick={(e) => scrollToSection(e, "benefits")}
            >
              Benefits
            </Link>
            <Link
              href="/#how-it-works"
              className="block px-3 py-3 rounded-md text-base font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              onClick={(e) => scrollToSection(e, "how-it-works")}
            >
              How It Works
            </Link>
            <div className="flex flex-col gap-3 px-3 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors theme-toggle"
                  aria-label="Toggle theme"
                >
                  {mounted && (
                    <span className="theme-toggle-icon inline-block">
                      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </span>
                  )}
                </button>
                <Button
                  ref={mobileDemoButtonRef}
                  className={`bg-primary hover:bg-primary/90 transition-all duration-300 demo-btn ${
                    btnClicked ? "clicked" : ""
                  } ${isTransitioning ? "scale-95 opacity-80" : ""}`}
                  onClick={(e) => handleDemoClick(e, true)}
                >
                  <span className="demo-btn-icon mr-2">
                    <Plane className="h-4 w-4 rotate-45" />
                  </span>
                  Request a Demo
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                onClick={() => router.push("/login")}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 17L15 12L10 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 12H3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Member Log In
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
