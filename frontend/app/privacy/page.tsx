"use client"

import Header from "@/components/header"
import Footer from "@/components/footer"
import { useEffect, useState } from "react"
import { Shield, FileText, AlertCircle } from "lucide-react"

export default function PrivacyPolicy() {
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
        <div className="relative py-12 md:py-16 bg-primary/10 dark:bg-primary/5 border-b">
          <div className="absolute inset-0 tech-pattern opacity-10"></div>
          <div className="container px-4 md:px-6 relative">
            <div
              className={`max-w-3xl mx-auto transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tighter md:text-4xl">Privacy Policy</h1>
              </div>
              <p className="text-muted-foreground md:text-lg">
                Effective Date: April 24, 2025
                <br />
                Last Updated: April 24, 2025
              </p>
            </div>
          </div>
        </div>

        <div className="container px-4 md:px-6 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <div className="prose dark:prose-invert max-w-none">
              <section className="mb-10" id="introduction">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  1. Introduction
                </h2>
                <p>
                  Welcome to FBO LaunchPad ("FBO LaunchPad," "we," "us," or "our"). We provide a Software-as-a-Service
                  (SaaS) platform and related services (collectively, the "Services") designed specifically to modernize
                  and streamline operations for Fixed-Base Operators (FBOs).
                </p>
                <p>
                  This Privacy Policy describes how FBO LaunchPad collects, uses, discloses, and protects Personal Data
                  obtained through:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Our public-facing marketing and informational website (the "Website").</li>
                  <li>
                    Our SaaS platform and associated applications used by our FBO customers and their authorized
                    employees (the "Application").
                  </li>
                </ul>
                <p>"Personal Data" means any information relating to an identified or identifiable natural person.</p>
                <p>
                  This Privacy Policy applies to visitors of our Website and to the FBOs who subscribe to our Services
                  ("Customers") and their authorized users (e.g., Customer Service Representatives (CSRs), Line Service
                  Technicians (LSTs), Managers).
                </p>
                <p className="font-medium">
                  Important Note Regarding FBO Customer Data: Our Customers use our Services to process information
                  relating to their own clients (e.g., pilots, aircraft owners/operators). In this context, FBO
                  LaunchPad acts as a "data processor" or "service provider" on behalf of our Customers, who are the
                  "data controllers" or "businesses." This means our Customers determine the purposes and means of
                  processing their clients' Personal Data within our Services, and their privacy policies govern that
                  data. Individuals seeking to exercise rights regarding Personal Data controlled by our Customers
                  should direct their requests to the respective FBO.
                </p>
                <p>
                  Please read this Privacy Policy carefully. By accessing or using our Website or Services, you
                  acknowledge that you have read, understood, and agree to the practices described in this Privacy
                  Policy.
                </p>
              </section>

              <section className="mb-10" id="information-we-collect">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  2. Information We Collect
                </h2>
                <p>We collect different types of information depending on your interaction with us:</p>
                <h3 className="text-xl font-semibold mt-6 mb-3">
                  (a) Information You Provide Directly (Website & Communication)
                </h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Contact Form Submissions:</strong> When you request a demo, ask questions, or contact us
                    through forms on our Website, we collect information such as your Name, Email Address, Phone Number,
                    Company Name, Job Title, and the content of your message.
                  </li>
                  <li>
                    <strong>Direct Communications:</strong> If you communicate with us via email or other channels, we
                    may collect your contact information and the content of those communications.
                  </li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">(b) Information Collected Automatically (Website)</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Log Data:</strong> Like most websites, our servers automatically record information ("Log
                    Data") created by your use of the Website. Log Data may include information such as your IP address,
                    browser type, operating system, the referring web page, pages visited, location (depending on
                    browser settings), mobile carrier, device identifiers, search terms, and cookie information.
                  </li>
                  <li>
                    <strong>Cookies and Tracking Technologies:</strong> We use cookies and similar technologies (e.g.,
                    web beacons, pixels) to operate and improve the Website, analyze usage, and potentially for
                    marketing purposes. This may include information about your Browse behavior, device type, and
                    interaction with our Website. For more details, see Section 9 ("Cookies and Tracking Technologies").
                  </li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">
                  (c) Information Collected or Processed via the Services (Application)
                </h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>FBO User Account Data:</strong> When our Customers set up accounts for their employees to
                    use the Application, we collect information necessary to create and manage these accounts, such as
                    Full Name, Work Email Address, Job Role/Title, and assigned permissions.
                  </li>
                  <li>
                    <strong>Operational Data:</strong> Information generated or inputted through the use of the
                    Application by our Customers and their authorized users. This includes, but is not limited to:
                    <ul className="list-disc pl-6 space-y-1 mt-2">
                      <li>Aircraft identifiers (e.g., tail numbers)</li>
                      <li>Fuel types and quantities dispensed</li>
                      <li>Service details and timestamps</li>
                      <li>Communication logs between authorized users (e.g., CSRs and LSTs)</li>
                      <li>Status updates related to FBO services</li>
                      <li>Digitally generated fuel receipts</li>
                      <li>
                        Potentially, location data of LSTs during active service tasks (if this feature is implemented
                        and enabled by the Customer).
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>FBO Customer Data (Processed on Behalf of our Customers):</strong> Our Customers input
                    information about their own clients into our Application as part of their business operations. This
                    data, which we process as a service provider, may include names, contact details, aircraft
                    information, service history, and potentially billing information required by the FBO.
                  </li>
                  <li>
                    <strong>Third-Party Integration Data:</strong> If Customers utilize features integrating with
                    third-party services (e.g., FlightAware for automated aircraft ownership verification), we may
                    receive data from those services via APIs as authorized by the Customer. This data is processed
                    according to the terms of this policy and the relevant API provider's terms.
                  </li>
                  <li>
                    <strong>Usage Data:</strong> We may collect information about how authorized users interact with the
                    Application, such as features used, clicks, performance metrics, and session duration, to maintain
                    and improve the Services.
                  </li>
                </ul>
              </section>

              <section className="mb-10" id="how-we-collect">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  3. How We Collect Information
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    <strong>Directly From You:</strong> When you fill out forms, register for an account (as an
                    authorized user of a Customer), or communicate with us.
                  </li>
                  <li>
                    <strong>Automatically:</strong> Through cookies, Log Data, and other tracking technologies when you
                    interact with our Website or Application.
                  </li>
                  <li>
                    <strong>From Our Customers:</strong> FBOs provide user account information for their employees and
                    input their own customer data into the Application.
                  </li>
                  <li>
                    <strong>From Third Parties:</strong> Through integrations authorized by our Customers (e.g., API
                    providers like FlightAware).
                  </li>
                </ul>
              </section>

              <section className="mb-10" id="how-we-use">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  4. How We Use Information
                </h2>
                <p>We use the information we collect for various purposes:</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">(a) Website Data Usage:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To respond to your inquiries, provide information, and schedule demos.</li>
                  <li>To operate, maintain, and improve the Website and its functionality.</li>
                  <li>To analyze website traffic and user engagement patterns (e.g., using Google Analytics).</li>
                  <li>To personalize your experience on the Website.</li>
                  <li>
                    For marketing and promotional purposes (where permitted by law and with appropriate consent, e.g.,
                    sending relevant emails about our Services).
                  </li>
                  <li>To prevent fraud and ensure the security of our Website.</li>
                  <li>To comply with legal obligations.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">(b) Application Data Usage:</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    To provide, operate, maintain, and improve the core functionality of the FBO LaunchPad Services as
                    contracted by our Customers.
                  </li>
                  <li>To authenticate users and manage user accounts and permissions.</li>
                  <li>To facilitate communication and workflow management between FBO personnel (CSRs, LSTs).</li>
                  <li>To generate digital fuel receipts and other operational documentation.</li>
                  <li>To enable reporting and analytics features for our Customers regarding their operations.</li>
                  <li>To facilitate integrations with third-party services as directed by our Customers.</li>
                  <li>To provide customer support and troubleshooting.</li>
                  <li>To ensure the security and integrity of the Services.</li>
                  <li>To develop new features and functionalities (often using aggregated or anonymized data).</li>
                  <li>
                    To generate aggregated and anonymized data for statistical analysis, research, and business
                    intelligence (this data does not identify individuals or specific Customers).
                  </li>
                  <li>To enforce our terms of service and comply with legal obligations.</li>
                </ul>
              </section>

              <section className="mb-10" id="legal-basis">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  5. Legal Basis for Processing Personal Data
                </h2>
                <p>
                  While specific requirements vary by jurisdiction (primarily relevant for users/customers in regions
                  like the European Economic Area), our legal bases for processing Personal Data include:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Performance of a Contract:</strong> Processing necessary to provide the Services to our
                    Customers and their authorized users according to our agreements.
                  </li>
                  <li>
                    <strong>Legitimate Interests:</strong> Processing for our legitimate business interests, such as
                    improving our Website and Services, security, analytics, and limited direct marketing, provided
                    these interests are not overridden by your data protection rights.
                  </li>
                  <li>
                    <strong>Consent:</strong> Where required by law (e.g., for certain cookies or direct marketing
                    emails), we will obtain your consent before processing your Personal Data. You can withdraw your
                    consent at any time.
                  </li>
                  <li>
                    <strong>Legal Obligation:</strong> Processing necessary to comply with applicable laws and
                    regulations.
                  </li>
                </ul>
              </section>

              <section className="mb-10" id="data-sharing">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  6. Data Sharing and Disclosure
                </h2>
                <p>
                  FBO LaunchPad does not sell your Personal Data. We may share information under the following
                  circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Service Providers:</strong> We engage third-party companies and individuals to perform
                    services on our behalf (e.g., cloud hosting providers [such as AWS, Google Cloud, or Azure], data
                    analytics providers [Google Analytics], CRM systems, communication tools, customer support
                    software). These providers only have access to the Personal Data necessary to perform their
                    functions and are obligated to protect it.
                  </li>
                  <li>
                    <strong>API Partners:</strong> If Customers use integrations (e.g., FlightAware), data may be shared
                    with those partners as necessary to provide the integrated functionality, based on the Customer's
                    authorization.
                  </li>
                  <li>
                    <strong>With Our Customers (FBOs):</strong> We share data related to the use of the Services by
                    their authorized employees and the FBO Customer Data they input, as necessary for them to use and
                    manage the Services.
                  </li>
                  <li>
                    <strong>Legal Compliance and Protection:</strong> We may disclose information if required to do so
                    by law or in the good faith belief that such action is necessary to (i) comply with a legal
                    obligation, (ii) protect and defend the rights or property of FBO LaunchPad, (iii) prevent or
                    investigate possible wrongdoing in connection with the Services, (iv) protect the personal safety of
                    users of the Services or the public, or (v) protect against legal liability.
                  </li>
                  <li>
                    <strong>Business Transfers:</strong> In the event of a merger, acquisition, reorganization,
                    bankruptcy, or sale of all or a portion of our assets, your Personal Data may be transferred as part
                    of that transaction. We will notify you via email and/or a prominent notice on our Website of any
                    change in ownership or uses of your Personal Data.
                  </li>
                  <li>
                    <strong>Aggregated or Anonymized Data:</strong> We may share aggregated or anonymized data, which
                    cannot reasonably be used to identify you, for various purposes, including analytics and reporting.
                  </li>
                </ul>
              </section>

              <section className="mb-10" id="data-security">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  7. Data Security
                </h2>
                <p>
                  FBO LaunchPad takes reasonable technical and organizational measures to protect the Personal Data we
                  process from loss, misuse, unauthorized access, disclosure, alteration, and destruction. These
                  measures may include encryption, access controls, secure cloud hosting environments, and regular
                  security assessments.
                </p>
                <p className="mt-4">
                  However, no internet or email transmission is ever fully secure or error-free. While we strive to
                  protect your Personal Data, we cannot guarantee its absolute security. Customers and their authorized
                  users are responsible for maintaining the security of their account credentials.
                </p>
              </section>

              <section className="mb-10" id="data-retention">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  8. Data Retention
                </h2>
                <p>
                  We retain Personal Data for as long as necessary to fulfill the purposes outlined in this Privacy
                  Policy, unless a longer retention period is required or permitted by law. This includes retaining
                  data:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    For website visitors: As long as necessary to respond to inquiries or for analytics/marketing
                    purposes (subject to consent/opt-outs).
                  </li>
                  <li>
                    For Application users/data: For the duration of the Customer's subscription and as required to
                    fulfill our contractual obligations, provide support, and comply with legal requirements or resolve
                    disputes. Data processed on behalf of our Customers is retained according to our agreement with the
                    Customer.
                  </li>
                </ul>
                <p className="mt-4">
                  We will delete or anonymize Personal Data when it is no longer needed for its identified purposes.
                </p>
              </section>

              <section className="mb-10" id="cookies">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  9. Cookies and Tracking Technologies
                </h2>
                <p>
                  We use cookies (small text files placed on your device) and similar technologies on our Website and
                  potentially within our Services. These help us operate the site, understand usage, remember
                  preferences, and potentially deliver relevant advertising.
                </p>
                <p className="mt-4">We use the following types of cookies:</p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Essential Cookies:</strong> Necessary for the Website and Services to function properly
                    (e.g., session management, security).
                  </li>
                  <li>
                    <strong>Performance/Analytics Cookies:</strong> Help us understand how visitors interact with our
                    Website (e.g., Google Analytics) by collecting information anonymously.
                  </li>
                  <li>
                    <strong>Functional Cookies:</strong> Enable enhanced functionality and personalization (e.g.,
                    remembering your preferences).
                  </li>
                  <li>
                    <strong>Marketing Cookies:</strong> Used to track visitors across websites to display relevant ads
                    (we will specify if/when these are used and seek consent where required).
                  </li>
                </ul>
                <p className="mt-4">
                  You can control cookies through your browser settings. Most browsers allow you to block or delete
                  cookies. However, blocking essential cookies may affect the functionality of our Website or Services.
                  For more information on managing cookies, consult your browser's help documentation. You can opt-out
                  of Google Analytics by installing the Google Analytics Opt-out Browser Add-on.
                </p>
              </section>

              <section className="mb-10" id="data-protection-rights">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  10. Your Data Protection Rights
                </h2>
                <p>
                  Depending on your location (e.g., California residents under CCPA), you may have certain rights
                  regarding your Personal Data. These rights may include:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>
                    <strong>Right to Access:</strong> Request access to the Personal Data we hold about you.
                  </li>
                  <li>
                    <strong>Right to Correction:</strong> Request correction of inaccurate Personal Data.
                  </li>
                  <li>
                    <strong>Right to Deletion:</strong> Request deletion of your Personal Data, subject to certain
                    exceptions.
                  </li>
                  <li>
                    <strong>Right to Restrict Processing:</strong> Request restriction of processing under certain
                    circumstances.
                  </li>
                  <li>
                    <strong>Right to Object:</strong> Object to processing based on legitimate interests or for direct
                    marketing.
                  </li>
                  <li>
                    <strong>Right to Data Portability:</strong> Request a copy of your data in a portable format (where
                    applicable).
                  </li>
                  <li>
                    <strong>Right to Withdraw Consent:</strong> Withdraw consent where processing is based on consent.
                  </li>
                </ul>
                <p className="mt-4 font-medium">Exercising Your Rights:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>
                    <strong>Website Visitors & Direct Communications:</strong> If you wish to exercise rights regarding
                    Personal Data collected via our Website or direct communications (where FBO LaunchPad is the
                    controller), please contact us using the details in Section 14.
                  </li>
                  <li>
                    <strong>Authorized Users of FBO Customers:</strong> If you are an employee of our Customer using the
                    Application, please contact us for requests related to your user account data (name, email, role).
                  </li>
                  <li>
                    <strong>Data Processed on Behalf of FBOs:</strong> If your Personal Data has been inputted into our
                    Services by one of our FBO Customers (e.g., you are a client of an FBO), FBO LaunchPad processes
                    this data on their behalf. Please direct any requests to access, correct, or delete this data
                    directly to the FBO with whom you have a relationship. We will assist our Customers in responding to
                    such requests as required by our agreements and applicable law.
                  </li>
                </ul>
                <p className="mt-4">
                  We will respond to verifiable requests within the timeframe required by applicable law. We may need to
                  verify your identity before processing your request.
                </p>
              </section>

              <section className="mb-10" id="childrens-privacy">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  11. Children's Privacy
                </h2>
                <p>
                  Our Website and Services are not directed to children under the age of 13 (or the relevant age of
                  digital consent in other jurisdictions), and we do not knowingly collect Personal Data from children.
                  If we become aware that we have inadvertently collected Personal Data from a child, we will take steps
                  to delete such information promptly. If you believe we might have any information from or about a
                  child, please contact us.
                </p>
              </section>

              <section className="mb-10" id="international-transfers">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  12. International Data Transfers
                </h2>
                <p>
                  FBO LaunchPad is based in the United States. If you access our Website or Services from outside the
                  United States, your information may be transferred to, stored, and processed in the United States or
                  other countries where our servers or service providers are located. Data protection laws in these
                  countries may differ from those in your country of residence. By using our Website or Services, you
                  consent to the transfer of your information to countries outside your residence, including the United
                  States. We will take appropriate safeguards to protect your Personal Data in accordance with this
                  Privacy Policy and applicable law when such transfers occur.
                </p>
              </section>

              <section className="mb-10" id="changes">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  13. Changes to This Privacy Policy
                </h2>
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technologies,
                  legal requirements, or other factors. If we make material changes, we will notify you by posting the
                  updated policy on our Website, updating the "Last Updated" date, and/or potentially sending an email
                  notification to our Customers or registered users prior to the change becoming effective. We encourage
                  you to review this Privacy Policy periodically. Your continued use of the Website or Services after
                  any changes constitutes your acceptance of the revised policy.
                </p>
              </section>

              <section className="mb-10" id="contact">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  14. Contact Us
                </h2>
                <p>
                  If you have any questions, comments, or concerns about this Privacy Policy or our data practices, or
                  if you wish to exercise your data protection rights (where applicable and directed to FBO LaunchPad),
                  please contact us at:
                </p>
                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <p>
                    <strong>FBO LaunchPad</strong>
                  </p>
                  <p>Attn: Privacy Officer</p>
                  <p>Email: privacy@fbolaunchpad.com</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
