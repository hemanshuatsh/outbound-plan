/* ==========================================================================
   Saleshandy × Tech Expo Gujarat 2026 — booth tool configuration
   Everything a booth owner may want to tweak lives here.
   ========================================================================== */
window.SH_CONFIG = {
  event: {
    name: "Tech Expo Gujarat 2026",
    dates: "27–29 Nov 2026",
    venue: "GUCEC, Ahmedabad",
  },

  // ---- Call-to-action -----------------------------------------------------
  // QR image is pre-generated from signupUrl (see tools/make-qr.py). If you
  // change the URL, re-run that script so the QR matches.
  cta: {
    signupUrl:
      "https://my.saleshandy.com/signup?utm_source=techexpo_gujarat&utm_medium=booth&utm_campaign=teg2026",
    freeLeadCredits: 50,               // "Redeem your first 50 verified leads"
    promoCode: "TEG2026",              // TODO: confirm with growth team before the event
    trialDays: 7,
    qrImage: "assets/qr-signup.svg",
    // Public address where plan.html is hosted (e.g. "https://plan.saleshandy.com/plan.html").
    // Visitors' phones open this from the QR, so it must be reachable on the internet.
    // Leave empty to use the address this page is served from (fine for local testing only).
    planBaseUrl: "https://hemanshuatsh.github.io/outbound-plan/plan.html",
  },

  // Optional: POST captured booth leads to a webhook (n8n / Zapier / Sheets).
  // Leave empty to only store them on this device (export via admin panel).
  leadWebhookUrl: "",

  // ---- Kiosk behaviour ----------------------------------------------------
  kiosk: {
    idleResetSeconds: 120,             // return to welcome screen after inactivity
    currency: "INR",                   // "INR" or "USD" — toggle on screen too
    usdToInr: 84,
  },

  // ---- Outreach benchmarks (sourced) ---------------------------------------
  // Keep these conservative and cite them on screen; they drive the forecast.
  benchmarks: {
    // ---- Results screen (simple email funnel, shown as ranges) ----
    replyRateRange: [0.03, 0.04],      // replies as a share of emails sent
    positiveRateRange: [0.01, 0.02],   // interested replies / meetings as a share of emails sent
    volumeOptions: [500, 1000, 2000, 5000], // prospects per month the visitor can pick
    defaultProspects: 2000,
    minutesPerEmail: 4,                // manual research + writing + sending per personalised email
    sdrHoursPerMonth: 160,             // one full-time SDR
    closeRate: 0.1,                    // share of interested conversations that become a deal (for 'what it's worth')
    // ---- Older multichannel model (kept for reference) ----
    emailReplyRate: 0.045,    // Hunter "State of Cold Email 2025" & Saleshandy 30M-email study: ~4.5% avg
    linkedinReplyRate: 0.082,  // Belkins LinkedIn study: 8.2% reply on connection requests with a note
    linkedinCoverage: 0.8,     // share of prospects with a findable LinkedIn profile
    callConversationRate: 0.06,// Belkins: 24.5% per-prospect connect over multiple dials × ~25% become a real conversation
    phoneCoverage: 0.5,        // share of prospects with a verified direct/mobile number
    positiveReplyShare: 0.35,  // share of replies that are interested / positive
    meetingFromPositive: 0.6,  // positive replies that turn into a booked meeting
    emailsPerProspect: 3,      // email touches per prospect in the sequence
    emailsPerMailboxPerDay: 40,// safe daily send per warmed mailbox
    mailboxesPerDomain: 3,     // Saleshandy recommendation
    workingDaysPerMonth: 22,
    warmupDays: 14,
    mailboxCostUsd: 3.49,      // Saleshandy email infrastructure, annual flexi
    domainCostUsdYear: 14,
    sources: [
      { label: "Hunter — State of Cold Email 2025 (4.5% avg reply)", url: "https://hunter.io/the-state-of-cold-email-2025" },
      { label: "Saleshandy — 30.31M cold emails analysed", url: "https://saleshandy.com/blog/cold-email-statistics/" },
      { label: "Belkins — LinkedIn outreach study (8.2% reply with note)", url: "https://belkins.io/blog/linkedin-outreach-study" },
      { label: "Belkins — Cold calling benchmarks (24.5% per-prospect connect)", url: "https://belkins.io/blog/cold-calling-benchmarks" },
    ],
  },

  // ---- Proof points (from saleshandy.com, Nov 2026) ------------------------
  proof: {
    stats: [
      { value: "25,000+", label: "businesses use Saleshandy" },
      { value: "852M+", label: "verified B2B contacts" },
      { value: "42M+", label: "companies in Lead Finder" },
      { value: "4.6/5", label: "on G2 · 773 reviews" },
    ],
    trust: ["SOC 2", "ISO 27001", "GDPR"],
    ratings: [
      { name: "G2", score: "4.6/5", count: "773", color: "#ff492c" },
      { name: "Trustpilot", score: "4.7/5", count: "743", color: "#00b67a" },
      { name: "Google", score: "4.3/5", count: "197", color: "#4285f4" },
    ],
    servedSegments: ["Sales teams & SDRs", "Lead-gen agencies", "Founders & solopreneurs", "Recruiters"],
    servedIndustries: [
      "IT Services", "SaaS", "Marketing Agencies", "Staffing & HR", "Manufacturing",
      "Logistics", "Healthcare", "Education", "Real Estate", "Financial Services",
      "Consulting", "E-commerce",
    ],
    capabilities: [
      { title: "Lead Finder", text: "852M+ contacts, 75+ filters, pay only for verified data" },
      { title: "AI Sequence Copilot", text: "Reads your website, writes the full campaign" },
      { title: "Multichannel sequences", text: "Email, LinkedIn, calls & WhatsApp in one flow" },
      { title: "Inbox, not spam", text: "Unlimited warm-up, Bounce Guard, placement tests" },
      { title: "Mailboxes in 10 min", text: "Domains + DNS set up for you" },
      { title: "Unified inbox + CRM", text: "Every reply and deal in one place" },
    ],
  },
};
