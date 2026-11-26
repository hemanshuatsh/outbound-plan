/* ==========================================================================
   API layer. Every function returns a Promise so the UI does not change when
   these are swapped for live Saleshandy endpoints.

   LIVE-API TODOs (search "TODO(api)"):
     analyzeWebsite   → Saleshandy AI Sequence Copilot website scan
     getMarketSize    → Lead Finder search (count only, no credits spent)
     getSampleLeads   → Lead Finder search, first page, masked
     draftFirstEmail  → AI Sequence Copilot step generation
     submitBoothLead  → CRM / webhook (n8n, HubSpot, Sheets)
   ========================================================================== */
window.SH_API = (function () {
  const D = window.SH_DATA;
  const C = window.SH_CONFIG;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Deterministic pseudo-random generator, so the same input → same numbers.
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

  function industryById(id) { return D.industries.find((i) => i.id === id) || D.industries[0]; }

  function cleanDomain(input) {
    let s = String(input || "").trim().toLowerCase();
    s = s.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
    return s;
  }

  // "acmeinfotech" → "Acme Infotech", "shreeji-textiles" → "Shreeji Textiles"
  const NAME_SUFFIXES = ["infotech", "technologies", "technology", "solutions", "softwares", "software", "systems", "infosys", "textiles", "ceramics", "industries", "pharma", "chemicals", "exports", "logistics", "solar", "energy", "foods", "digital", "media", "labs", "tech", "global", "group", "consulting", "ventures"];
  function prettyCompanyName(domain) {
    let base = domain.split(".")[0].replace(/[-_]+/g, " ");
    if (!base.includes(" ")) {
      const suf = NAME_SUFFIXES.find((s) => base.length > s.length + 1 && base.endsWith(s));
      if (suf) base = base.slice(0, -suf.length) + " " + suf;
    }
    return base.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function looksLikeDomain(input) {
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(cleanDomain(input));
  }

  // ---- Website analysis ----------------------------------------------------
  // TODO(api): call Saleshandy AI Copilot website scan; it returns industry,
  // offer, tone and suggested ICP. Mock: keyword match on the domain.
  async function analyzeWebsite(url) {
    await wait(300);
    const domain = cleanDomain(url);
    const name = domain.split(".")[0];
    const tld = domain.split(".").slice(1).join(".");
    let best = null, bestScore = 0;
    for (const ind of D.industries) {
      let score = 0;
      for (const k of ind.keywords) {
        if (k.length <= 3 ? name === k || name.endsWith(k) || name.startsWith(k) : name.includes(k)) score += k.length;
      }
      if (score > bestScore) { bestScore = score; best = ind; }
    }
    if (!best && (tld === "io" || tld === "ai")) best = industryById("saas");
    const industry = best || industryById("it-services");
    return {
      domain,
      companyName: prettyCompanyName(domain),
      industryId: industry.id,
      confidence: best ? "high" : "low", // low → UI asks the visitor to confirm
      offering: industry.offering,
      geos: industry.defaultGeos.slice(),
      sizes: D.defaultSizes.slice(),
      titles: industry.titles.slice(),
    };
  }

  // ---- Market size -----------------------------------------------------------
  // TODO(api): Lead Finder search with filters → total companies / contacts.
  async function getMarketSize(profile) {
    await wait(150);
    const ind = industryById(profile.industryId);
    // Seed only on who the visitor is, so narrowing filters always shrinks the count.
    const rnd = seeded(`${profile.domain || ""}|${ind.id}`);
    const geoShare = profile.geos.reduce((s, g) => s + (D.geos.find((x) => x.id === g)?.share || 0), 0);
    const sizeShare = profile.sizes.reduce((s, z) => s + (D.sizes.find((x) => x.id === z)?.share || 0), 0);
    const titleShare = Math.max(0.35, profile.titles.length / ind.titles.length);
    const jitter = 0.92 + rnd() * 0.16;
    const companies = Math.round(ind.companiesGlobal * geoShare * sizeShare * jitter);
    // Larger companies have more decision makers per company.
    const sizeBoost = profile.sizes.includes("201-1000") || profile.sizes.includes("1000+") ? 1.25 : 1;
    const contacts = Math.round(companies * ind.dmPerCompany * titleShare * sizeBoost * (0.95 + rnd() * 0.1));
    return {
      companies,
      contacts,
      withEmail: Math.round(contacts * D.coverage.email),
      withPhone: Math.round(contacts * D.coverage.phone),
      withLinkedin: Math.round(contacts * D.coverage.linkedin),
    };
  }

  // ---- Sample leads ----------------------------------------------------------
  // TODO(api): Lead Finder first page. Keep emails/phones masked on screen.
  async function getSampleLeads(profile, count = 10) {
    await wait(100);
    const ind = industryById(profile.industryId);
    const rnd = seeded(`leads|${profile.domain || ""}|${ind.id}|${profile.geos.join()}`);
    const geos = profile.geos.length ? profile.geos : ind.defaultGeos;
    const out = [];
    const used = new Set();
    for (let i = 0; i < count; i++) {
      const geo = D.geos.find((g) => g.id === geos[i % geos.length]);
      const pool = D.names[geo.names];
      const prefixes = D.companyPrefixes[geo.names] || D.companyPrefixes.default;
      let company, tries = 0;
      do {
        const pool = tries++ < 10 ? prefixes : prefixes.concat(D.companyPrefixes.default);
        company = `${pick(rnd, pool)} ${pick(rnd, ind.suffixes)}`;
        if (tries > 60) company += ` ${geo.cities[i % geo.cities.length].split(",")[0]}`;
      } while (used.has(company) && tries < 80);
      used.add(company);
      const first = pick(rnd, pool.first), last = pick(rnd, pool.last);
      const size = pick(rnd, profile.sizes.length ? profile.sizes : D.defaultSizes);
      const domain = company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 24) + ".com";
      out.push({
        name: `${first} ${last}`,
        first,
        title: pick(rnd, profile.titles.length ? profile.titles : ind.titles),
        company,
        location: pick(rnd, geo.cities),
        region: geo.name,
        size: D.sizes.find((s) => s.id === size)?.name || size,
        domain,
        emailMasked: `${first[0].toLowerCase()}•••••@${domain}`,
        phoneMasked: "+•• ••••• •••••",
        hasPhone: rnd() < D.coverage.phone + 0.1,
        hasLinkedin: rnd() < D.coverage.linkedin + 0.05,
        signal: pick(rnd, ["Hiring now", "Recently funded", "Growing team", "New office", "Tech stack match", "Expanding abroad"]),
      });
    }
    return out;
  }

  // ---- Forecast (pure maths, stays client-side) ---------------------------
  function forecast({ prospects, emailReplyRate, channels, winRate, dealValue }) {
    const B = C.benchmarks;
    const scale = emailReplyRate / B.emailReplyRate; // apply scenario to every channel
    const rEmail = emailReplyRate;
    const rLinkedin = channels.linkedin ? B.linkedinReplyRate * B.linkedinCoverage * scale : 0;
    const rCall = channels.calls ? B.callConversationRate * B.phoneCoverage * scale : 0;
    const replyRate = 1 - (1 - rEmail) * (1 - rLinkedin) * (1 - rCall);
    const perProspectWin = replyRate * B.positiveReplyShare * B.meetingFromPositive * winRate;
    const replies = prospects * replyRate;
    const interested = replies * B.positiveReplyShare;
    const meetings = interested * B.meetingFromPositive;
    const customers = meetings * winRate;
    return {
      replyRate, replies, interested, meetings, customers,
      revenue: customers * dealValue,
      prospectsFor10: Math.ceil(10 / perProspectWin),
      byChannel: { email: rEmail, linkedin: rLinkedin, call: rCall },
    };
  }

  // ---- Outreach infrastructure plan --------------------------------------
  function infraPlan({ prospects, channels }) {
    const B = C.benchmarks;
    const emailsPerMonth = prospects * B.emailsPerProspect;
    const emailsPerDay = Math.ceil(emailsPerMonth / B.workingDaysPerMonth);
    const mailboxes = Math.max(2, Math.ceil(emailsPerDay / B.emailsPerMailboxPerDay));
    const domains = Math.ceil(mailboxes / B.mailboxesPerDomain);
    const infraUsdMonth = mailboxes * B.mailboxCostUsd + (domains * B.domainCostUsdYear) / 12;
    const emailCredits = prospects;                                   // 1 credit per verified email
    const phoneCredits = channels.calls ? Math.round(prospects * B.phoneCoverage) * 6 : 0; // 6 credits per phone
    const credits = emailCredits + phoneCredits;
    let plan = "Starter";
    if (credits > 1500 || emailsPerMonth > 6000 || prospects > 2000) plan = "Pro";
    if (credits > 4000 || emailsPerMonth > 100000 || prospects > 30000) plan = "Scale";
    return { emailsPerMonth, emailsPerDay, prospectsPerDay: Math.ceil(prospects / B.workingDaysPerMonth), mailboxes, domains, infraUsdMonth, emailCredits, phoneCredits, credits, plan };
  }

  // ---- First email draft ---------------------------------------------------
  // TODO(api): replace with AI Sequence Copilot generation.
  async function draftFirstEmail(profile, lead) {
    await wait(100);
    const ind = industryById(profile.industryId);
    const fill = (s) => s.replace(/{{buyer}}/g, lead.company);
    return {
      subject: `Quick question about ${lead.company}'s ${ind.email.topic}`,
      body: [
        `Hi ${lead.first},`,
        fill(ind.email.hook),
        `I'm with ${profile.companyName || "our team"} — we provide ${profile.offering}. ${ind.email.proof}`,
        `Would a 15-minute call next week be worth it to see if we can do the same for ${lead.company}?`,
        `Best,\n[Your name]${profile.companyName ? "\n" + profile.companyName : ""}`,
      ],
    };
  }

  // ---- Booth lead capture --------------------------------------------------
  const LEADS_KEY = "sh_teg_booth_leads";
  function loadLeads() { try { return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]"); } catch (e) { return []; } }
  function saveLeads(list) { try { localStorage.setItem(LEADS_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ } }

  async function submitBoothLead(lead) {
    const record = { ...lead, capturedAt: new Date().toISOString(), synced: false };
    if (C.leadWebhookUrl) {
      try {
        const res = await fetch(C.leadWebhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
        record.synced = res.ok;
      } catch (e) { record.synced = false; } // offline → kept locally, export later
    }
    const list = loadLeads(); list.push(record); saveLeads(list);
    return record;
  }

  // ---- Deep link: the visitor's list, opened in Saleshandy Lead Finder -----
  function leadFinderUrl(profile) {
    const LF = D.leadFinder;
    const q = new URLSearchParams();
    profile.geos.forEach((g) => (LF.locations[g] || []).forEach((v) => q.append("location", v)));
    (LF.industries[profile.industryId] || []).forEach((v) => q.append("company_industry", v));
    profile.sizes.forEach((s) => (LF.sizes[s] || []).forEach((v) => q.append("company_size", v)));
    profile.titles.flatMap((t) => t.split("/").map((x) => x.trim())).forEach((v) => q.append("job_title", v));
    q.append("utm_source", "techexpo_gujarat");
    q.append("utm_medium", "booth_share");
    return `${LF.baseUrl}?${q.toString().replace(/\+/g, "%20")}`;
  }

  // Simple, honest email funnel: emails sent → 3–4% replies → 1–2% interested/meetings.
  // Value is shown in meetings and time saved; pipeline only if the visitor picks a deal size.
  function outreach({ prospects }) {
    const B = C.benchmarks;
    const emails = prospects * B.emailsPerProspect;
    const range = ([lo, hi]) => [Math.round(emails * lo), Math.round(emails * hi)];
    const hours = Math.round((emails * B.minutesPerEmail) / 60);
    const infra = infraPlan({ prospects, channels: {} });
    return {
      prospects, emails,
      replies: range(B.replyRateRange),
      positive: range(B.positiveRateRange),
      hours,
      sdrs: hours / B.sdrHoursPerMonth,
      emailsPerDay: infra.emailsPerDay,
      prospectsPerDay: infra.prospectsPerDay,
      mailboxes: infra.mailboxes,
      domains: infra.domains,
    };
  }

  // ---- Multichannel plan (shared by the booth screen and plan.html) -------
  const SEQUENCE = [
    { day: 1, ch: "email", what: "Personalised intro" },
    { day: 2, ch: "linkedin", what: "Connection request" },
    { day: 4, ch: "email", what: "Follow-up with proof" },
    { day: 6, ch: "call", what: "Intro call" },
    { day: 8, ch: "linkedin", what: "LinkedIn message" },
    { day: 11, ch: "email", what: "Quick-question nudge" },
    { day: 14, ch: "whatsapp", what: "WhatsApp check-in" },
  ];
  function channelPlan(o) {
    const linkedin = Math.min(o.prospects, 400);
    const calls = Math.round(o.prospects * 0.15);
    return {
      linkedin, linkedinWeek: Math.round(linkedin / 4),
      calls, callsDay: Math.max(1, Math.round(calls / C.benchmarks.workingDaysPerMonth)),
    };
  }

  // ---- Shareable plan link: everything needed to rebuild the plan, kept short.
  function encodePlan({ profile, prospects, market }) {
    const ind = industryById(profile.industryId);
    const q = new URLSearchParams();
    if (profile.companyName) q.set("c", profile.companyName);
    if (profile.domain) q.set("d", profile.domain);
    q.set("i", profile.industryId);
    q.set("g", profile.geos.join("."));
    q.set("s", profile.sizes.join("."));
    q.set("t", profile.titles.map((t) => ind.titles.indexOf(t)).filter((x) => x >= 0).join("."));
    q.set("p", String(prospects));
    if (market) q.set("m", `${market.contacts}.${market.companies}`);
    return q.toString();
  }
  function decodePlan(str) {
    const q = new URLSearchParams(str.replace(/^[#?]/, ""));
    const ind = D.industries.find((x) => x.id === q.get("i"));
    if (!ind) return null;
    const pickList = (v, valid) => (v || "").split(".").filter((x) => valid.includes(x));
    const geos = pickList(q.get("g"), D.geos.map((g) => g.id));
    const sizes = pickList(q.get("s"), D.sizes.map((s) => s.id));
    const titles = (q.get("t") || "").split(".").map(Number).filter((n) => ind.titles[n]).map((n) => ind.titles[n]);
    const [contacts, companies] = (q.get("m") || "").split(".").map(Number);
    return {
      profile: {
        companyName: q.get("c") || "", domain: q.get("d") || "", industryId: ind.id, offering: ind.offering,
        geos: geos.length ? geos : ind.defaultGeos.slice(), sizes: sizes.length ? sizes : D.defaultSizes.slice(),
        titles: titles.length ? titles : ind.titles.slice(),
      },
      prospects: Number(q.get("p")) || C.benchmarks.defaultProspects,
      market: contacts ? { contacts, companies } : null,
    };
  }

  return {
    SEQUENCE, channelPlan, encodePlan, decodePlan,
    leadFinderUrl, outreach,
    looksLikeDomain, cleanDomain, industryById,
    analyzeWebsite, getMarketSize, getSampleLeads, forecast, infraPlan, draftFirstEmail,
    submitBoothLead, loadLeads, clearLeads: () => saveLeads([]),
  };
})();
