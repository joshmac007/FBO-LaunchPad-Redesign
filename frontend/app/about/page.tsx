"use client"

import Header from "@/components/header"
import Footer from "@/components/footer"
import { useEffect, useState } from "react"
import { Plane, Users, Lightbulb, Target, Award, BarChart2, Code } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 night-sky-gradient overflow-hidden">
          <div className="absolute inset-0 tech-pattern-dark opacity-30"></div>
          <div className="container px-4 md:px-6 relative">
            <div
              className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary mb-4">
                <Users className="h-4 w-4 mr-1" />
                <span>Our Story</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-white mb-6">
                Driven by Experience, Built for Efficiency
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed">
                Transforming FBO operations with innovative technology and deep aviation expertise.
              </p>
            </div>
          </div>

          {/* Animated flight path */}
          <div className="absolute bottom-0 left-0 w-full h-12 overflow-hidden">
            <div className="flight-line w-full h-full"></div>
          </div>
        </section>

        {/* Founders Story Section */}
        <section className="py-16 md:py-24 bg-background relative">
          <div className="absolute inset-0 tech-pattern opacity-10"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-12 md:grid-cols-2 items-center">
                <div
                  className={`relative transition-all duration-1000 delay-300 ${
                    isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
                  }`}
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-25"></div>
                  <div className="relative rounded-lg overflow-hidden">
                    <Image
                      src="/aviation-planning.png"
                      alt="FBO LaunchPad founders"
                      width={800}
                      height={600}
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                </div>
                <div
                  className={`space-y-6 transition-all duration-1000 delay-500 ${
                    isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
                  }`}
                >
                  <h2 className="text-3xl font-bold tracking-tighter">Our Founding Story</h2>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      The story of FBO LaunchPad begins with Josh and Tyler and a shared frustration. As a professional
                      pilot, Josh witnessed firsthand the disconnect within the aviation world: incredible innovation in
                      the skies often met with surprisingly outdated processes on the ground, particularly within
                      Fixed-Base Operators (FBOs).
                    </p>
                    <p className="text-muted-foreground">
                      They saw dedicated FBO teams juggling radio calls, deciphering handwritten notes, and manually
                      inputting data – processes ripe for error and inefficiency. Witnessing the daily challenges of
                      coordinating fuel orders, tracking services, and ensuring accurate billing through often
                      cumbersome, decades-old methods sparked a commitment. Josh and Tyler knew there had to be a better
                      way.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 md:py-24 twilight-gradient relative">
          <div className="absolute inset-0 hexagon-pattern opacity-20"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary mb-4">
                <Target className="h-4 w-4 mr-1" />
                <span>Our Mission</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-white mb-6">
                Revolutionizing FBO Operations
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed">
                Combining Josh's aviation expertise with Tyler's business acumen, FBO LaunchPad was founded with a
                simple purpose: To solve the persistent problems of outdated infrastructure and inefficient operations
                by creating smart, user-friendly software tailored specifically for FBOs.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10 card-futuristic">
                <div className="rounded-full bg-primary/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Innovation</h3>
                <p className="text-gray-300">
                  We're committed to replacing frustrating workarounds and fragmented systems with a seamless,
                  integrated platform that leverages the latest in AI and machine learning technology.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10 card-futuristic">
                <div className="rounded-full bg-primary/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Plane className="h-6 w-6 text-primary rotate-45" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Aviation Expertise</h3>
                <p className="text-gray-300">
                  Our team brings real-world aviation experience and technical knowledge to create solutions that
                  address the unique challenges faced by Fixed-Base Operators.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/10 card-futuristic">
                <div className="rounded-full bg-primary/20 p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Customer Focus</h3>
                <p className="text-gray-300">
                  We prioritize understanding the real-world challenges FBOs face and building solutions that deliver
                  tangible improvements in efficiency, accuracy, and customer satisfaction.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do Section */}
        <section className="py-16 md:py-24 bg-background relative">
          <div className="absolute inset-0 tech-pattern opacity-10"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl mb-4">What We Do</h2>
                <p className="text-xl text-muted-foreground">
                  FBO LaunchPad isn't just about software; it's about understanding the challenges FBOs face and
                  building the solutions they deserve.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="border rounded-xl p-6 bg-card">
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <span className="text-primary mr-2">01.</span> Aircraft Ownership Monitoring
                  </h3>
                  <p className="text-muted-foreground">
                    Our AI-powered system continuously monitors aircraft registration databases to detect ownership
                    changes, providing real-time alerts to FBOs when aircraft in their fleet change hands.
                  </p>
                </div>

                <div className="border rounded-xl p-6 bg-card">
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <span className="text-primary mr-2">02.</span> Comprehensive Alert System
                  </h3>
                  <p className="text-muted-foreground">
                    Our platform delivers a range of critical notifications beyond ownership changes, including
                    fuel transaction monitoring, and customizable updates—all customizable to your FBO's specific needs.
                  </p>
                </div>

                <div className="border rounded-xl p-6 bg-card">
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <span className="text-primary mr-2">03.</span> Streamlined Operations
                  </h3>
                  <p className="text-muted-foreground">
                    Our initial focus targets the critical communication and workflow between fuelers and CSRs,
                    automating tasks and eliminating paper trails to improve efficiency and reduce errors.
                  </p>
                </div>

                <div className="border rounded-xl p-6 bg-card">
                  <h3 className="text-xl font-bold mb-3 flex items-center">
                    <span className="text-primary mr-2">04.</span> Comprehensive FBO Platform
                  </h3>
                  <p className="text-muted-foreground">
                    Ultimately, we aim to provide a comprehensive digital hub for all key FBO functions, helping your
                    operation run smoother, faster, and more accurately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 md:py-24 twilight-gradient relative">
          <div className="absolute inset-0 hexagon-pattern opacity-20"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary mb-4">
                <Users className="h-4 w-4 mr-1" />
                <span>Our Team</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-white mb-6">
                Meet the Minds Behind FBO LaunchPad
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed">
                Our founders bring complementary skills and expertise to create innovative solutions for the aviation
                industry.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden card-futuristic">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/josh2.jpg"
                    alt="Josh - Co-founder"
                    fill
                    style={{ objectFit: "cover" }}
                    className="transition-all duration-500 hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white">Josh</h3>
                  <p className="text-primary mb-3">Co-founder & Technical Lead</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Plane className="h-5 w-5 text-primary mt-0.5 rotate-45" />
                      <p className="text-gray-300">
                        Professional pilot with firsthand experience of FBO operational challenges
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Award className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-gray-300">Former aviation instructor at Baylor University</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Code className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-gray-300">
                        Technical expertise driving our innovative aircraft monitoring solutions
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden card-futuristic">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/tyler4.jpg"
                    alt="Tyler - Co-founder"
                    fill
                    style={{ objectFit: "cover" }}
                    className="transition-all duration-500 hover:scale-105"
                    priority
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white">Tyler</h3>
                  <p className="text-primary mb-3">Co-founder & Business Lead</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <BarChart2 className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-gray-300">
                        Business strategist with expertise in project management and finance
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Target className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-gray-300">Drives company growth, partnerships, and customer relationships</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-gray-300">
                        Passionate about transforming traditional industries through innovative business models
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Complementary Skills Section */}
        <section className="py-16 md:py-24 bg-background relative">
          <div className="absolute inset-0 tech-pattern opacity-10"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl mb-4">The Perfect Partnership</h2>
                <p className="text-xl text-muted-foreground">
                  Josh and Tyler bring complementary skills that create a powerful foundation for FBO LaunchPad's
                  success.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="border rounded-xl p-6 bg-card">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary rotate-45" />
                    Aviation Expertise
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Josh's experience as a pilot at Baylor University and his current role flying for a private company
                    gives him unique insight into the daily challenges faced by FBOs and aircraft operators.
                  </p>
                  <p className="text-muted-foreground">
                    His time teaching aviation further deepened his understanding of the industry's needs and pain
                    points, informing the development of our solutions.
                  </p>
                </div>

                <div className="border rounded-xl p-6 bg-card">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-primary" />
                    Business Acumen
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Tyler's background in project management, finance, and sales provides the business foundation needed
                    to transform innovative ideas into viable products and services.
                  </p>
                  <p className="text-muted-foreground">
                    His drive and strategic vision guide FBO LaunchPad's growth, ensuring we deliver exceptional value
                    to our customers while building a sustainable business.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 night-sky-gradient relative">
          <div className="absolute inset-0 tech-pattern-dark opacity-30"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl mb-6 text-white">
                Join the FBO LaunchPad Journey
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Ready to transform your FBO operations with cutting-edge technology? Get in touch with our team to learn
                more about how FBO LaunchPad can help your business thrive.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/request-demo">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 glow-effect">
                    <Plane className="h-4 w-4 mr-2 rotate-45" />
                    Request a Demo
                  </Button>
                </Link>
                <Link href="/request-demo">
                  <Button size="lg" variant="outline" className="border-gray-500 text-white hover:bg-white/10">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Animated flight path */}
          <div className="absolute bottom-0 left-0 w-full h-12 overflow-hidden">
            <div className="flight-line w-full h-full"></div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
