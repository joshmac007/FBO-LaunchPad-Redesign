"use client"

import Link from "next/link"

import Header from "@/components/header"
import Footer from "@/components/footer"
import { useEffect, useState } from "react"
import { Shield, FileText, AlertCircle, Scale } from "lucide-react"

export default function TermsOfService() {
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
                <Scale className="h-6 w-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tighter md:text-4xl">Terms of Service</h1>
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
              <p className="font-bold">
                PLEASE READ THESE TERMS OF SERVICE CAREFULLY. THIS IS A BINDING LEGAL AGREEMENT.
              </p>

              <p>
                This Terms of Service agreement (the "Terms" or "ToS") governs your access to and use of the website
                located at fbolaunchpad.com (the "Website") and the software-as-a-service platform, including any
                associated applications or features, offered by FBO LaunchPad ("FBO LaunchPad," "we," "us," or "our")
                (collectively, the "Services").
              </p>

              <p>
                By accessing or using the Website, clicking "I accept," signing up for or using the Services, or
                executing a Subscription Agreement that references these Terms, you ("User," "you," or "your," which
                refers to Website Visitors, Customers, and Authorized Users, as applicable) agree to be bound by these
                Terms and our Privacy Policy, which is incorporated herein by reference.
              </p>

              <p>
                If you are entering into these Terms on behalf of a company or other legal entity (an "FBO Customer" or
                "Customer"), you represent that you have the authority to bind such entity and its affiliates to these
                Terms, in which case the terms "User," "you," or "your" shall refer to such entity and its affiliates.
                If you do not have such authority, or if you do not agree with these Terms, you must not accept these
                Terms and may not use the Services.
              </p>

              <section className="mb-10" id="definitions">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  1. Definitions
                </h2>
                <p>
                  <strong>"Authorized User"</strong> means an individual employee, agent, or contractor of a Customer
                  who is authorized by that Customer to access and use the SaaS Platform pursuant to the Customer's
                  Subscription Agreement and these Terms.
                </p>
                <p>
                  <strong>"Customer" or "FBO Customer"</strong> means the Fixed-Base Operator entity that has subscribed
                  to the SaaS Platform via a Subscription Agreement.
                </p>
                <p>
                  <strong>"Customer Data"</strong> means all electronic data or information submitted by or for Customer
                  or its Authorized Users to the SaaS Platform, concerning Customer's operations, clients (pilots,
                  aircraft owners/operators), aircraft, services rendered, etc.
                </p>
                <p>
                  <strong>"SaaS Platform"</strong> means the FBO LaunchPad subscription-based software-as-a-service
                  application, including web interfaces and mobile applications, designed for FBO operations management.
                </p>
                <p>
                  <strong>"Subscription Agreement"</strong> means the separate agreement (such as a Master Services
                  Agreement or Order Form) entered into between FBO LaunchPad and the Customer governing the
                  subscription to, and use of, the SaaS Platform.
                </p>
                <p>
                  <strong>"Website"</strong> means the public-facing website located at fbolaunchpad.com.
                </p>
                <p>
                  <strong>"Website Visitor"</strong> means any individual Browse the Website who is not accessing the
                  SaaS Platform as a Customer or Authorized User.
                </p>
              </section>

              <section className="mb-10" id="description-of-services">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  2. Description of Services
                </h2>
                <p>FBO LaunchPad provides:</p>
                <p>
                  <strong>(a) Website:</strong> An informational resource describing our company, the SaaS Platform, and
                  related services, which may include blogs, articles, and contact forms.
                </p>
                <p>
                  <strong>(b) SaaS Platform:</strong> A subscription-based platform designed to modernize and streamline
                  FBO operations. Features include tools for communication and workflow between FBO Fuelers/Line Service
                  Technicians (LSTs) and Customer Service Representatives (CSRs), digital dispatch, automated digital
                  fuel receipt transmission, and potentially future modules for tenant leasing, customer profiles,
                  billing/POS integration, and AI-powered features (e.g., aircraft ownership verification via
                  third-party APIs).
                </p>
                <p>
                  We reserve the right to modify, enhance, suspend, or discontinue the Services (or any part thereof) at
                  any time, with or without notice, provided that material adverse changes to the core functionality of
                  the SaaS Platform for existing Customers will be subject to the terms of their Subscription Agreement.
                </p>
              </section>

              <section className="mb-10" id="use-of-website">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  3. Use of the Website
                </h2>
                <p>
                  Subject to these Terms, FBO LaunchPad grants Website Visitors a limited, non-exclusive,
                  non-transferable, revocable license to access and use the Website for informational purposes only. You
                  agree not to use the Website for any unlawful purpose or in any way that could damage, disable,
                  overburden, or impair the Website or interfere with any other party's use and enjoyment of it. You may
                  not attempt to gain unauthorized access to any part of the Website or any systems or networks
                  connected to the Website. Copying, distributing, or modifying Website content without our express
                  written permission is prohibited.
                </p>
              </section>

              <section className="mb-10" id="saas-platform-access">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  4. SaaS Platform Access and Use
                </h2>
                <p>
                  <strong>(a) Subscription:</strong> Access to and use of the SaaS Platform requires a valid, active
                  Subscription Agreement between FBO LaunchPad and the FBO Customer. These Terms supplement, and are
                  incorporated into, the Subscription Agreement. In the event of a direct conflict between these Terms
                  and a specific Subscription Agreement, the terms of the Subscription Agreement shall prevail with
                  respect to that Customer.
                </p>
                <p>
                  <strong>(b) License Grant:</strong> Subject to the terms of the applicable Subscription Agreement and
                  these Terms, FBO LaunchPad grants the Customer, during the subscription term, a limited,
                  non-exclusive, non-transferable (except as permitted in the Subscription Agreement), revocable license
                  for its Authorized Users to access and use the SaaS Platform solely for the Customer's internal FBO
                  business operations.
                </p>
                <p>
                  <strong>(c) User Accounts:</strong> Customers are responsible for identifying and authenticating all
                  Authorized Users, for approving access by such Authorized Users to the SaaS Platform, and for
                  maintaining the confidentiality of usernames, passwords, and account information. The Customer is
                  responsible for all activities that occur under its and its Authorized Users' accounts. The Customer
                  agrees to notify FBO LaunchPad immediately of any unauthorized use of any password or account or any
                  other known or suspected breach of security. FBO LaunchPad is not responsible for any loss or damage
                  arising from Customer's failure to comply with these obligations. The Customer is responsible for
                  ensuring its Authorized Users comply with these Terms and the terms of the Subscription Agreement.
                </p>
              </section>

              <section className="mb-10" id="fees-and-payment">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  5. Fees and Payment (SaaS Platform)
                </h2>
                <p>
                  Use of the SaaS Platform is subject to the payment of subscription fees as set forth in the Customer's
                  Subscription Agreement or applicable Order Form. The Customer agrees to pay all applicable fees in
                  accordance with the payment terms specified therein. Failure to pay fees when due may result in
                  suspension or termination of access to the SaaS Platform. All fees are non-refundable except as
                  expressly stated in the Subscription Agreement.
                </p>
              </section>

              <section className="mb-10" id="intellectual-property">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  6. Intellectual Property Rights
                </h2>
                <p>
                  <strong>(a) FBO LaunchPad IP:</strong> FBO LaunchPad owns and retains all right, title, and interest,
                  including all related intellectual property rights, in and to the Website, the SaaS Platform, its
                  underlying technology, software, documentation, content (excluding Customer Data), designs, branding,
                  trade names, logos, and any aggregated, anonymized, or statistical data derived from the operation of
                  the Services (provided such data does not identify Customer or any individual). These Terms do not
                  grant Customer or any User any rights to FBO LaunchPad's intellectual property except for the limited
                  license expressly granted herein or in the Subscription Agreement.
                </p>
                <p>
                  <strong>(b) Customer Data:</strong> As between FBO LaunchPad and Customer, the Customer owns and
                  retains all right, title, and interest in and to the Customer Data. The Customer grants FBO LaunchPad
                  and its necessary service providers a worldwide, non-exclusive, royalty-free license during the
                  subscription term to use, process, store, transmit, display, modify, and reproduce Customer Data
                  solely to the extent necessary to provide, maintain, secure, and improve the Services, provide
                  support, and as otherwise described in our Privacy Policy or permitted by the Customer in writing.
                  Customer represents and warrants that it has all necessary rights, consents, and permissions to
                  collect, share, and use Customer Data as contemplated herein and in compliance with all applicable
                  laws.
                </p>
              </section>

              <section className="mb-10" id="acceptable-use">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  7. Acceptable Use Policy / Restrictions
                </h2>
                <p>
                  Users agree not to, and not to permit Authorized Users or third parties to, do any of the following:
                </p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>
                    license, sublicense, sell, resell, rent, lease, transfer, assign, distribute, or otherwise
                    commercially exploit or make the Services available to any third party, other than Authorized Users;
                  </li>
                  <li>modify, copy, or create derivative works based on the Services or any part thereof;</li>
                  <li>
                    reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code, object
                    code, or underlying structure, ideas, or algorithms of the Services;
                  </li>
                  <li>
                    access the Services to build a competitive product or service, or copy any features, functions, or
                    graphics of the Services;
                  </li>
                  <li>
                    use the Services to store or transmit infringing, libelous, or otherwise unlawful or tortious
                    material, or to store or transmit material in violation of third-party privacy or intellectual
                    property rights;
                  </li>
                  <li>
                    use the Services to store or transmit malicious code (e.g., viruses, worms, time bombs, Trojan
                    horses);
                  </li>
                  <li>
                    interfere with or disrupt the integrity or performance of the Services or third-party data contained
                    therein;
                  </li>
                  <li>attempt to gain unauthorized access to the Services or their related systems or networks;</li>
                  <li>conduct security or vulnerability testing without prior written consent;</li>
                  <li>impose an unreasonable or disproportionately large load on FBO LaunchPad's infrastructure; or</li>
                  <li>use the Services in violation of any applicable laws or regulations.</li>
                </ol>
              </section>

              <section className="mb-10" id="third-party-services">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  8. Third-Party Services & APIs
                </h2>
                <p>
                  The Services may integrate with or provide links to third-party websites, services, or APIs (e.g.,
                  FlightAware, cloud hosting providers). FBO LaunchPad does not control and is not responsible for the
                  availability, accuracy, content, products, or services of such third parties. Use of third-party
                  services may be subject to the terms and privacy policies of those third parties, and Customer agrees
                  to comply with such terms when using integrated features. FBO LaunchPad disclaims all liability
                  arising from your use of any third-party services.
                </p>
              </section>

              <section className="mb-10" id="confidentiality">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  9. Confidentiality
                </h2>
                <p>
                  "Confidential Information" means any non-public information disclosed by one party ("Discloser") to
                  the other party ("Recipient"), whether orally or in writing, that is designated as confidential or
                  that reasonably should be understood to be confidential given the nature of the information and the
                  circumstances of disclosure. FBO LaunchPad's Confidential Information includes the non-public aspects
                  of the Services and its technology. Customer's Confidential Information includes Customer Data.
                  Confidential Information does not include information that (i) is or becomes generally known to the
                  public without breach of any obligation owed to the Discloser, (ii) was known to the Recipient prior
                  to its disclosure by the Discloser without breach of any obligation owed to the Discloser, (iii) is
                  received from a third party without breach of any obligation owed to the Discloser, or (iv) was
                  independently developed by the Recipient.
                </p>
                <p>
                  The Recipient agrees to: (i) use the same degree of care that it uses to protect the confidentiality
                  of its own confidential information of like kind (but not less than reasonable care), (ii) not use any
                  Confidential Information of the Discloser for any purpose outside the scope of these Terms or the
                  Subscription Agreement, and (iii) except as otherwise authorized by the Discloser in writing, limit
                  access to Confidential Information of the Discloser to those of its and its affiliates' employees and
                  contractors who need that access for purposes consistent with this Agreement and who have signed
                  confidentiality agreements with the Recipient containing protections no less stringent than those
                  herein. The Recipient may disclose Confidential Information if required by law, provided the Recipient
                  gives the Discloser prior notice (to the extent legally permitted) and reasonable assistance, at the
                  Discloser's cost, if the Discloser wishes to contest the disclosure.
                </p>
              </section>

              <section className="mb-10" id="privacy">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  10. Privacy
                </h2>
                <p>
                  Your privacy is important to us. Our collection, use, and disclosure of Personal Data in connection
                  with the Website and Services are governed by our{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  , which is available on our Website and incorporated into these Terms by reference. By using the
                  Services, you agree to the terms of the Privacy Policy.
                </p>
              </section>

              <section className="mb-10" id="disclaimers">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  11. Disclaimers of Warranties
                </h2>
                <p className="uppercase">
                  THE WEBSITE AND THE SERVICES, INCLUDING ALL SERVER AND NETWORK COMPONENTS, ARE PROVIDED ON AN "AS IS"
                  AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND TO THE FULLEST EXTENT PERMITTED BY LAW.
                  FBO LAUNCHPAD EXPRESSLY DISCLAIMS ANY AND ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT
                  NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, TITLE, FITNESS FOR A PARTICULAR PURPOSE,
                  AND NON-INFRINGEMENT.
                </p>
                <p className="uppercase">
                  FBO LAUNCHPAD DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, TIMELY, SECURE, ERROR-FREE, OR
                  FREE FROM VIRUSES OR OTHER MALICIOUS CODE, OR THAT ANY DEFECTS WILL BE CORRECTED. FBO LAUNCHPAD DOES
                  NOT WARRANT THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE SERVICES OR THE ACCURACY OR
                  RELIABILITY OF ANY INFORMATION OBTAINED THROUGH THE SERVICES. NO INFORMATION OR ADVICE OBTAINED BY YOU
                  FROM FBO LAUNCHPAD OR THROUGH THE SERVICES SHALL CREATE ANY WARRANTY NOT EXPRESSLY STATED IN THESE
                  TERMS.
                </p>
              </section>

              <section className="mb-10" id="limitation-of-liability">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  12. Limitation of Liability
                </h2>
                <p className="uppercase">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FBO LAUNCHPAD, ITS AFFILIATES,
                  DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS,
                  GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR
                  INABILITY TO USE, THE SERVICES.
                </p>
                <p className="uppercase">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL FBO LAUNCHPAD'S TOTAL CUMULATIVE
                  LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICES EXCEED THE AMOUNT OF FEES ACTUALLY
                  PAID BY THE CUSTOMER TO FBO LAUNCHPAD FOR THE SERVICES DURING THE TWELVE (12) MONTHS PRECEDING THE
                  EVENT GIVING RISE TO THE CLAIM. FOR WEBSITE VISITORS WHERE NO FEES ARE PAID, FBO LAUNCHPAD'S TOTAL
                  LIABILITY SHALL BE LIMITED TO ONE HUNDRED U.S. DOLLARS ($100.00).
                </p>
                <p className="uppercase">
                  THE LIMITATIONS IN THIS SECTION APPLY WHETHER THE ALLEGED LIABILITY IS BASED ON CONTRACT, TORT,
                  NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER BASIS, EVEN IF FBO LAUNCHPAD HAS BEEN ADVISED OF THE
                  POSSIBILITY OF SUCH DAMAGE. THE FOREGOING LIMITATIONS OF LIABILITY SHALL APPLY TO THE FULLEST EXTENT
                  PERMITTED BY LAW IN THE APPLICABLE JURISDICTION.
                </p>
              </section>

              <section className="mb-10" id="indemnification">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  13. Indemnification
                </h2>
                <p>
                  Customer agrees to defend, indemnify, and hold harmless FBO LaunchPad, its affiliates, licensors, and
                  their respective officers, directors, employees, contractors, and agents from and against any and all
                  claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not
                  limited to attorney's fees) arising from: (i) Customer's or its Authorized Users' use of and access to
                  the Services in violation of these Terms or the Subscription Agreement; (ii) Customer's or its
                  Authorized Users' violation of any applicable law or regulation; (iii) Customer's or its Authorized
                  Users' violation of any third-party right, including without limitation any intellectual property or
                  privacy right; or (iv) Customer Data, including any claim that Customer Data caused damage to a third
                  party.
                </p>
              </section>

              <section className="mb-10" id="term-and-termination">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  14. Term and Termination
                </h2>
                <p>
                  <strong>(a) Website:</strong> These Terms are effective for Website Visitors upon accessing the
                  Website and continue until they cease using the Website.
                </p>
                <p>
                  <strong>(b) SaaS Platform:</strong> For Customers and Authorized Users, these Terms commence upon
                  acceptance (e.g., signing a Subscription Agreement or accessing the platform) and continue for the
                  duration of the active subscription term specified in the Subscription Agreement.
                </p>
                <p>
                  <strong>(c) Termination:</strong> Termination rights and conditions for the SaaS Platform are
                  primarily governed by the Subscription Agreement. Either party may terminate the Subscription
                  Agreement and these Terms for material breach by the other party if such breach is not cured within a
                  specified notice period (as defined in the Subscription Agreement), or immediately if the other party
                  becomes insolvent or subject to bankruptcy proceedings. FBO LaunchPad may suspend or terminate access
                  for non-payment as outlined in the Subscription Agreement.
                </p>
                <p>
                  <strong>(d) Effect of Termination:</strong> Upon termination or expiration of a Subscription
                  Agreement, all rights and licenses granted to the Customer and its Authorized Users will immediately
                  cease. Customer shall cease all use of the SaaS Platform. FBO LaunchPad will make Customer Data
                  available for export or download for a limited period as specified in the Subscription Agreement,
                  after which FBO LaunchPad may delete Customer Data in accordance with its data retention policies and
                  applicable law. Sections governing Confidentiality, Intellectual Property Ownership, Disclaimers,
                  Limitation of Liability, Indemnification, Governing Law, and Miscellaneous shall survive termination.
                </p>
              </section>

              <section className="mb-10" id="governing-law">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  15. Governing Law and Dispute Resolution
                </h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the State of Texas, USA,
                  without regard to its conflict of law principles. The parties agree that the United Nations Convention
                  on Contracts for the International Sale of Goods does not apply to these Terms.
                </p>
                <p>
                  Any dispute arising out of or relating to these Terms or the Services shall be subject to the
                  exclusive jurisdiction of the state and federal courts located in Dallas County, Texas, USA, and the
                  parties hereby consent to the personal jurisdiction and venue of these courts.
                </p>
              </section>

              <section className="mb-10" id="changes-to-terms">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  16. Changes to Terms
                </h2>
                <p>
                  FBO LaunchPad reserves the right, at its sole discretion, to modify or replace these Terms at any
                  time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking
                  effect, which may be provided via email to the Customer's primary contact, by posting on our Website,
                  or through the Services interface. What constitutes a material change will be determined at our sole
                  discretion. By continuing to access or use our Services after those revisions become effective, you
                  agree to be bound by the revised terms. If you do not agree to the new terms, you must stop using the
                  Services.
                </p>
              </section>

              <section className="mb-10" id="miscellaneous">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  17. Miscellaneous
                </h2>
                <p>
                  <strong>(a) Severability:</strong> If any provision of these Terms is found to be unenforceable or
                  invalid, that provision will be limited or eliminated to the minimum extent necessary so that these
                  Terms will otherwise remain in full force and effect and enforceable.
                </p>
                <p>
                  <strong>(b) Waiver:</strong> The failure of FBO LaunchPad to exercise or enforce any right or
                  provision of these Terms shall not constitute a waiver of such right or provision.
                </p>
                <p>
                  <strong>(c) Entire Agreement:</strong> These Terms, together with the Privacy Policy and any
                  applicable Subscription Agreement (for Customers), constitute the entire agreement between you and FBO
                  LaunchPad regarding the subject matter hereof and supersede all prior or contemporaneous agreements,
                  understandings, or representations, whether written or oral.
                </p>
                <p>
                  <strong>(d) Assignment:</strong> These Terms, and any rights and licenses granted hereunder, may not
                  be transferred or assigned by you (whether by operation of law or otherwise) without FBO LaunchPad's
                  prior written consent, but may be assigned by FBO LaunchPad without restriction. Any attempted
                  assignment in violation hereof shall be null and void.
                </p>
                <p>
                  <strong>(e) Force Majeure:</strong> FBO LaunchPad shall not be liable for any failure to perform its
                  obligations hereunder where such failure results from any cause beyond FBO LaunchPad's reasonable
                  control, including, without limitation, mechanical, electronic or communications failure or
                  degradation, acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities,
                  fire, floods, accidents, pandemics, or strikes.
                </p>
                <p>
                  <strong>(f) Notices:</strong> All notices under these Terms will be in writing. Notices to FBO
                  LaunchPad should be sent to the contact information below. Notices to Customers will be sent to the
                  primary contact email address associated with their account.
                </p>
                <p>
                  <strong>(g) Contact Information:</strong> If you have any questions about these Terms, please contact
                  us at:
                </p>
                <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                  <p>
                    <strong>FBO LaunchPad</strong>
                  </p>
                  <p>Attn: Legal Department</p>
                  <p>Email: legal@fbolaunchpad.com</p>
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
