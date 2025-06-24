"use client"

import Header from "@/components/header"
import Footer from "@/components/footer"
import { useEffect, useState } from "react"
import { HelpCircle, ChevronDown, ChevronUp, Plane, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Input } from "@/components/ui/input"

export default function FAQPage() {
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [isVisible, setIsVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const faqCategories = [
    {
      title: "General Questions",
      questions: [
        {
          id: "what-is-fbo-launchpad",
          question: "What is FBO LaunchPad?",
          answer:
            "FBO LaunchPad is an AI-powered platform designed specifically for Fixed-Base Operators (FBOs) to monitor aircraft ownership changes in real-time. Our system continuously tracks aircraft registration data and alerts FBOs when ownership changes are detected, helping to streamline operations, improve billing accuracy, and enhance customer service.",
        },
        {
          id: "how-does-it-work",
          question: "How does FBO LaunchPad work?",
          answer:
            "Our platform uses advanced AI and machine learning algorithms to monitor official aircraft registration databases. When you add aircraft tail numbers to your account, our system continuously checks for ownership changes. When a change is detected, you receive instant notifications through your dashboard and email, allowing you to update your records immediately.",
        },
        {
          id: "who-is-it-for",
          question: "Who is FBO LaunchPad designed for?",
          answer:
            "FBO LaunchPad is specifically designed for Fixed-Base Operators (FBOs) of all sizes. Whether you're a small regional FBO or a large multi-location operation, our platform helps you maintain accurate aircraft ownership records, improve billing efficiency, and enhance your operational workflow.",
        },
      ],
    },
    {
      title: "Features & Benefits",
      questions: [
        {
          id: "key-features",
          question: "What are the key features of FBO LaunchPad?",
          answer: (
            <>
              <p className="mb-2">FBO LaunchPad offers several key features designed to streamline FBO operations:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Real-time aircraft ownership monitoring and alerts</li>
                <li>Automated verification of aircraft registration data</li>
                <li>Instant notifications when ownership changes are detected</li>
                <li>User-friendly dashboard for tracking all monitored aircraft</li>
                <li>Secure cloud-based platform accessible from anywhere</li>
                <li>Integration capabilities with existing FBO management software</li>
              </ul>
            </>
          ),
        },
        {
          id: "main-benefits",
          question: "What are the main benefits of using FBO LaunchPad?",
          answer: (
            <>
              <p className="mb-2">Using FBO LaunchPad provides numerous benefits for FBOs:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Reduced billing errors by ensuring invoices go to the current aircraft owner</li>
                <li>Saved time by eliminating manual ownership verification processes</li>
                <li>Improved cash flow through more accurate and timely billing</li>
                <li>Enhanced security by always knowing the current responsible party</li>
                <li>Better customer relationships through proactive communication with new owners</li>
                <li>Streamlined operations with accurate, up-to-date aircraft information</li>
              </ul>
            </>
          ),
        },
        {
          id: "aircraft-types",
          question: "What types of aircraft can be monitored?",
          answer:
            "FBO LaunchPad can monitor any aircraft with a valid registration number (tail number) in the FAA registry or other supported international aircraft registries. This includes private jets, turboprops, piston aircraft, helicopters, and commercial aircraft.",
        },
      ],
    },
    {
      title: "Technical & Implementation",
      questions: [
        {
          id: "implementation-time",
          question: "How long does it take to implement FBO LaunchPad?",
          answer:
            "Implementation is quick and straightforward. Most FBOs are up and running within 1-2 business days. The process involves setting up your account, adding your aircraft tail numbers to the monitoring system, and brief training for your team members. Our support team is available to assist throughout the implementation process.",
        },
        {
          id: "technical-requirements",
          question: "What are the technical requirements for using FBO LaunchPad?",
          answer:
            "FBO LaunchPad is a cloud-based solution that works on any modern web browser. There's no need for special hardware or software installation. You simply need a computer, tablet, or smartphone with internet access. We also offer mobile apps for iOS and Android for on-the-go access.",
        },
        {
          id: "integration-capabilities",
          question: "Can FBO LaunchPad integrate with our existing FBO management software?",
          answer:
            "Yes, FBO LaunchPad is designed with integration capabilities in mind. We offer API access that allows for seamless integration with most popular FBO management systems. Our team can work with you to determine the best integration approach for your specific software environment.",
        },
      ],
    },
    {
      title: "Pricing & Subscription",
      questions: [
        {
          id: "pricing-model",
          question: "How is FBO LaunchPad priced?",
          answer:
            "FBO LaunchPad uses a subscription-based pricing model based on the number of aircraft you need to monitor. We offer tiered plans to accommodate FBOs of all sizes, from small operations to large multi-location businesses. Contact our sales team for a customized quote based on your specific needs.",
        },
        {
          id: "contract-length",
          question: "Is there a long-term contract requirement?",
          answer:
            "We offer flexible subscription options. While we do provide discounts for annual commitments, we also offer month-to-month plans for FBOs who prefer that flexibility. There are no hidden fees or long-term obligations unless you choose an annual plan.",
        },
        {
          id: "free-trial",
          question: "Do you offer a free trial?",
          answer:
            "Yes, we offer a 14-day free trial that allows you to experience the full functionality of FBO LaunchPad. During the trial, you can monitor up to 10 aircraft and receive real-time alerts. This gives you a hands-on opportunity to see how our platform can benefit your operation before making a commitment.",
        },
      ],
    },
    {
      title: "Data Security & Privacy",
      questions: [
        {
          id: "data-security",
          question: "How secure is my data with FBO LaunchPad?",
          answer:
            "Data security is a top priority at FBO LaunchPad. We use industry-standard encryption protocols, secure cloud infrastructure, and regular security audits to protect your data. All information is transmitted using secure HTTPS connections, and our databases are protected by multiple layers of security measures.",
        },
        {
          id: "data-ownership",
          question: "Who owns the data in the FBO LaunchPad system?",
          answer:
            "You maintain ownership of all your data within the FBO LaunchPad system. We act as a data processor, not a data controller. We do not sell or share your data with third parties. Our role is simply to provide the service that helps you monitor aircraft ownership changes.",
        },
        {
          id: "privacy-compliance",
          question: "Is FBO LaunchPad compliant with privacy regulations?",
          answer:
            "Yes, FBO LaunchPad is designed with privacy compliance in mind. We adhere to relevant data protection regulations including GDPR and CCPA where applicable. Our privacy practices are transparent and detailed in our Privacy Policy, which you can review at any time.",
        },
      ],
    },
    {
      title: "Support & Training",
      questions: [
        {
          id: "support-options",
          question: "What support options are available?",
          answer: (
            <>
              <p className="mb-2">We offer comprehensive support through multiple channels:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Email support with guaranteed response times</li>
                <li>Live chat support during business hours</li>
                <li>Phone support for urgent issues</li>
                <li>Comprehensive knowledge base and video tutorials</li>
                <li>Regular webinars and training sessions</li>
              </ul>
              <p className="mt-2">
                Premium support plans with dedicated account managers are available for larger FBOs.
              </p>
            </>
          ),
        },
        {
          id: "training-provided",
          question: "What training is provided for new users?",
          answer:
            "All new customers receive complimentary onboarding training for their team members. This includes live demonstration sessions, access to our video tutorial library, and personalized guidance from our customer success team. We also provide detailed documentation and regular webinars to help you maximize the value of FBO LaunchPad.",
        },
        {
          id: "system-updates",
          question: "How often is the system updated?",
          answer:
            "FBO LaunchPad is continuously improved with regular updates. Minor enhancements and bug fixes are deployed seamlessly without service interruption. Major feature updates are typically released quarterly, with advance notice and documentation provided to all customers. We value customer feedback and many of our updates are based on suggestions from our user community.",
        },
      ],
    },
  ]

  const filteredFAQs = searchQuery
    ? faqCategories
        .map((category) => ({
          ...category,
          questions: category.questions.filter(
            (q) =>
              q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (typeof q.answer === "string" && q.answer.toLowerCase().includes(searchQuery.toLowerCase())),
          ),
        }))
        .filter((category) => category.questions.length > 0)
    : faqCategories

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background">
        <div className="relative py-12 md:py-16 bg-primary/10 dark:bg-primary/5 border-b">
          <div className="absolute inset-0 tech-pattern opacity-10"></div>
          <div className="container px-4 md:px-6 relative">
            <div
              className={`max-w-3xl mx-auto transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tighter md:text-4xl">Frequently Asked Questions</h1>
              </div>
              <p className="text-muted-foreground md:text-lg">
                Find answers to common questions about FBO LaunchPad and how it can help your FBO operations.
              </p>
            </div>
          </div>
        </div>

        <div className="container px-4 md:px-6 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search for questions..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* FAQ Content */}
            <div className="space-y-10">
              {filteredFAQs.map((category) =>
                category.questions.length > 0 ? (
                  <div key={category.title} className="space-y-4">
                    <h2 className="text-2xl font-bold">{category.title}</h2>
                    <div className="space-y-4">
                      {category.questions.map((item) => (
                        <div
                          key={item.id}
                          className="border rounded-lg overflow-hidden transition-all duration-200 hover:border-primary/50"
                        >
                          <button
                            className="flex justify-between items-center w-full p-4 text-left"
                            onClick={() => toggleQuestion(item.id)}
                            aria-expanded={expandedQuestions[item.id]}
                          >
                            <span className="font-medium text-lg">{item.question}</span>
                            {expandedQuestions[item.id] ? (
                              <ChevronUp className="h-5 w-5 text-primary shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                          </button>
                          {expandedQuestions[item.id] && (
                            <div className="p-4 pt-0 border-t">
                              <div className="prose dark:prose-invert max-w-none">
                                {typeof item.answer === "string" ? <p>{item.answer}</p> : item.answer}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}

              {filteredFAQs.length === 0 && (
                <div className="text-center py-10">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">No matching questions found</h3>
                  <p className="text-muted-foreground mb-6">
                    We couldn't find any questions matching your search. Try different keywords or browse all
                    categories.
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                </div>
              )}
            </div>

            {/* Still Have Questions Section */}
            <div className="mt-16 p-6 border rounded-xl bg-primary/5 text-center">
              <h2 className="text-xl font-bold mb-2">Still Have Questions?</h2>
              <p className="text-muted-foreground mb-4">
                We're here to help. Contact our team for personalized assistance with any questions about FBO LaunchPad.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/request-demo">
                  <Button className="w-full sm:w-auto">
                    <Plane className="h-4 w-4 mr-2 rotate-45" />
                    Request a Demo
                  </Button>
                </Link>
                <Link href="/request-demo">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
