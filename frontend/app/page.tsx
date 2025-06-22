"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertCircle,
  Clock,
  Database,
  DollarSign,
  Bell,
  Shield,
  ClipboardList,
  UserPlus,
  Zap,
  CheckCircle2,
  ArrowRight,
  Plane,
  BarChart2,
  Cloud,
  Cpu,
  Wifi,
  Star,
  Users,
  TrendingUp,
  Award,
} from "lucide-react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"

export default function Home() {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [btnClicked, setBtnClicked] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const demoButtonRef = useRef(null)

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
    setIsVisible(true)
  }, [])

  // Testimonial rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDemoClick = (e) => {
    e.preventDefault()
    setBtnClicked(true)

    // Wait for the animation to complete before navigating
    setTimeout(() => {
      router.push("/request-demo")
      setBtnClicked(false)
    }, 800)
  }

  const testimonials = [
    {
      name: "Marcus Thompson",
      title: "General Manager",
      company: "City Executive Airport",
      content:
        "FBO LaunchPad has transformed our fueling operations. We've eliminated radio miscommunications and our line technicians love the mobile interface. Customer satisfaction is at an all-time high.",
      rating: 5,
    },
    {
      name: "Sarah Rodriguez",
      title: "Operations Director",
      company: "Atlantic Aviation Services",
      content:
        "The real-time visibility into our fueling operations has been a game-changer. Management can now see exactly what's happening on the line and address issues before they become problems.",
      rating: 5,
    },
    {
      name: "Jennifer Chen",
      title: "Customer Service Manager",
      company: "Mountain View FBO",
      content:
        "Our CSRs can now create detailed fuel orders with confidence, knowing that all information reaches the line technicians accurately. No more lost paper tickets or miscommunications.",
      rating: 5,
    },
  ]

  const stats = [
    { label: "FBOs Trust Us", value: "150+", icon: Users },
    { label: "Fuel Orders Processed", value: "25K+", icon: Plane },
    { label: "Time Saved Daily", value: "4hrs", icon: TrendingUp },
    { label: "Error Reduction", value: "95%", icon: Award },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div
                className={`space-y-6 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              >
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
                  From Fuel Request to <span className="text-primary">Fulfillment, Seamlessly</span>
                </h1>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl">
                  The all-in-one platform connecting CSRs, Line Technicians, and management for faster, safer, and more accurate fueling operations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    ref={demoButtonRef}
                    size="lg"
                    className={`bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 ${btnClicked ? "scale-95" : "hover:scale-105"}`}
                    onClick={handleDemoClick}
                  >
                    <Plane className="h-5 w-5 mr-2 rotate-45" />
                    Request a Live Demo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 hover:bg-primary/5 transition-all duration-300"
                    onClick={() => {
                      document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
                    }}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    See How It Works
                  </Button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <stat.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className={`mx-auto lg:ml-auto relative transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              >
                <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-3xl"></div>
                <div className="relative bg-card border rounded-2xl p-6 shadow-2xl">
                  <img
                    alt="FBO LaunchPad Fueling Operations Dashboard"
                    className="relative z-10 w-full rounded-xl object-cover"
                    src="/images/tablet-interface.png"
                  />
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-accent/20 rounded-full blur-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-16 md:py-24 bg-muted/30" id="features">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-4 max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
                  Tired of Radio Chatter and Paper Tickets?
                </h2>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
                  Manual coordination creates chaos, delays, and costly errors in your fueling operations.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 mt-16">
              <Card className="border-2 hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="rounded-full bg-destructive/10 p-4 w-fit mx-auto group-hover:bg-destructive/20 transition-colors">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Lost in Translation</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Radio miscommunications and handwritten notes lead to fuel type errors and incomplete services.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg group">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4 w-fit mx-auto group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                    <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">No Real-Time Visibility</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Management can't see what's happening on the line until it's too late to prevent problems.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg group md:col-span-2 lg:col-span-1">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4 w-fit mx-auto group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Audit Trail Gaps</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Paper tickets get lost, damaged, or incomplete, leaving you vulnerable during audits and disputes.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Animated Diagram */}
            <div className="flex justify-center mt-16">
              <div className="relative">
                <img
                  src="/images/workflow-diagram.png"
                  alt="Chaotic radio and paper workflow transforming into streamlined digital process"
                  className="max-w-2xl w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
                  Introducing FBO LaunchPad
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  The digital command center that connects your entire fueling operation from request to completion, eliminating miscommunication and manual errors.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground leading-relaxed">
                      CSRs create detailed fuel orders with aircraft info, fuel type, and special instructions
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground leading-relaxed">
                      Line Technicians receive orders on mobile devices with real-time updates and photo capture
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-foreground leading-relaxed">
                      Management gets complete visibility with digital audit trails and performance analytics
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mx-auto lg:ml-auto">
                <div className="grid grid-cols-3 gap-6 items-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="rounded-full bg-primary/10 p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                      <ClipboardList className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-center text-foreground">Create Order</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground justify-self-center" />
                  <div className="flex flex-col items-center space-y-4">
                    <div className="rounded-full bg-primary/10 p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-center text-foreground">Execute Service</p>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="rounded-full bg-primary/10 p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-center text-foreground">Complete & Verify</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-background" id="benefits">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-accent/10 text-accent border border-accent/20">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  <span>Benefits</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
                  Why FBOs Choose FBO LaunchPad
                </h2>
                <p className="max-w-3xl text-muted-foreground text-lg md:text-xl leading-relaxed">
                  Our solution delivers tangible operational improvements for Fixed Base Operators of all sizes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-card border rounded-2xl p-2 shadow-xl">
                  <img
                    src="/images/aircraft-data-flow.png"
                    alt="Aircraft data flow visualization"
                    className="rounded-xl w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  {
                    icon: Clock,
                    title: "Save Flight Time",
                    description: "Reduce manual lookups and administrative overhead with AI-powered monitoring.",
                    color: "primary",
                  },
                  {
                    icon: DollarSign,
                    title: "Clear Financial Skies",
                    description:
                      "Invoice the correct owner the first time, improving cash flow and customer satisfaction.",
                    color: "green",
                  },
                  {
                    icon: Shield,
                    title: "Enhanced Security",
                    description:
                      "Always know the current responsible party for based aircraft, improving facility security.",
                    color: "blue",
                  },
                  {
                    icon: ClipboardList,
                    title: "Accurate Flight Logs",
                    description: "Keep your hangar manifests and client lists effortlessly up-to-date.",
                    color: "purple",
                  },
                ].map((benefit, index) => (
                  <Card
                    key={index}
                    className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
                  >
                    <CardContent className="p-6 space-y-4">
                      <div
                        className={`rounded-full bg-${benefit.color === "primary" ? "primary" : benefit.color === "green" ? "green-100 dark:bg-green-900/30" : benefit.color === "blue" ? "blue-100 dark:bg-blue-900/30" : "purple-100 dark:bg-purple-900/30"} p-3 w-fit group-hover:scale-110 transition-transform`}
                      >
                        <benefit.icon
                          className={`h-6 w-6 ${benefit.color === "primary" ? "text-primary-foreground" : benefit.color === "green" ? "text-green-600 dark:text-green-400" : benefit.color === "blue" ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}`}
                        />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">{benefit.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardContent className="p-8 space-y-4">
                  <div className="rounded-full bg-primary/10 p-4 w-fit group-hover:scale-110 transition-transform">
                    <UserPlus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Smooth Onboarding</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Be the first to welcome new aircraft owners to your FBO and establish relationships.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardContent className="p-8 space-y-4">
                  <div className="rounded-full bg-primary/10 p-4 w-fit group-hover:scale-110 transition-transform">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Reduce Turbulence</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Smooth out processes related to billing, fuel accounts, and communication.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
                  Trusted by FBO Professionals
                </h2>
                <p className="max-w-3xl text-muted-foreground text-lg leading-relaxed">
                  See what industry leaders are saying about FBO LaunchPad.
                </p>
              </div>
            </div>

            <div className="max-w-4xl mx-auto">
              <Card className="border-2 shadow-xl">
                <CardContent className="p-8 md:p-12 text-center space-y-6">
                  <div className="flex justify-center space-x-1 mb-4">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                    "{testimonials[currentTestimonial].content}"
                  </blockquote>
                  <div className="space-y-2">
                    <div className="font-semibold text-foreground text-lg">{testimonials[currentTestimonial].name}</div>
                    <div className="text-muted-foreground">
                      {testimonials[currentTestimonial].title} at {testimonials[currentTestimonial].company}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center space-x-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentTestimonial ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                    onClick={() => setCurrentTestimonial(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-accent/5" id="how-it-works">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
                  How It Works: Three Simple Steps
                </h2>
                <p className="max-w-3xl text-muted-foreground text-lg md:text-xl leading-relaxed">
                  From fuel request to completion, FBO LaunchPad streamlines your entire workflow.
                </p>
              </div>
            </div>

            <div className="max-w-6xl mx-auto space-y-16">
              {[
                {
                  step: "1",
                  title: "Create & Dispatch",
                  description:
                    "CSRs create detailed fuel orders with aircraft information, fuel type, quantity, and special instructions. Orders are instantly dispatched to available Line Service Technicians with all necessary details.",
                  image: "/images/tablet-interface.png",
                  alt: "CSR creating fuel order on tablet interface",
                },
                {
                  step: "2",
                  title: "Execute & Update",
                  description:
                    "Line Technicians receive orders on their mobile devices, update status in real-time, capture photos for verification, and communicate any issues instantly back to the CSR team.",
                  image: "/images/tablet-interface.png",
                  alt: "Line technician using mobile device during fueling",
                },
                {
                  step: "3",
                  title: "Review & Complete",
                  description:
                    "Management reviews completed orders with full digital audit trails, photos, timestamps, and performance metrics. All data is automatically stored for billing, compliance, and analysis.",
                  image: "/images/tablet-interface.png",
                  alt: "Management reviewing completed fuel orders and analytics",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                >
                  <div className={index % 2 === 1 ? "md:order-2" : ""}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-lg">
                        {item.step}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">{item.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-lg leading-relaxed">{item.description}</p>
                  </div>
                  <div className={`relative ${index % 2 === 1 ? "md:order-1" : ""}`}>
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl"></div>
                    <div className="relative bg-card border rounded-2xl p-4 shadow-xl">
                      <img src={item.image || "/placeholder.svg"} alt={item.alt} className="rounded-xl w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
                  Powered by Advanced Aviation Tech
                </h2>
                <p className="max-w-3xl text-muted-foreground text-lg md:text-xl leading-relaxed">
                  Our platform leverages cutting-edge technology to deliver unparalleled accuracy and reliability.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Cpu,
                  title: "AI-Powered Analysis",
                  description:
                    "Our neural networks continuously learn and improve, providing increasingly accurate ownership detection.",
                },
                {
                  icon: Cloud,
                  title: "Cloud Infrastructure",
                  description:
                    "Secure, scalable cloud architecture ensures 99.9% uptime and real-time data processing.",
                },
                {
                  icon: Wifi,
                  title: "API Integrations",
                  description: "Seamlessly connect with your existing FBO management software through our robust API.",
                },
              ].map((feature, index) => (
                <Card
                  key={index}
                  className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
                >
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto group-hover:scale-110 transition-transform">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-4xl mx-auto">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">Ready for Takeoff?</h2>
                <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
                  Join hundreds of FBOs already using FBO LaunchPad to streamline their operations and improve customer
                  relationships.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className={`bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 ${btnClicked ? "scale-95" : "hover:scale-105"}`}
                  onClick={handleDemoClick}
                >
                  <Plane className="h-5 w-5 mr-2 rotate-45" />
                  Get Started Today
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 hover:bg-primary/5 transition-all duration-300"
                  onClick={() => {
                    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
                  }}
                >
                  Learn More
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">No setup fees • 30-day free trial • Cancel anytime</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
