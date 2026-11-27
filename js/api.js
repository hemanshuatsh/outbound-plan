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

  // Funnel: prospects reached → ~1.5–2.5% reply → ~20% positive → ~80% meet → ~50% become clients.
  // Value is shown in meetings and time saved; pipeline only if the visitor picks a deal size.
  function outreach({ prospects }) {
    const B = C.benchmarks;
    const emails = prospects * B.emailsPerProspect;
    const repliesRaw = B.replyRateRange.map((r) => prospects * r);
    const positiveRaw = repliesRaw.map((x) => x * B.positiveShare);
    const meetingsRaw = positiveRaw.map((x) => x * B.meetingShare);
    const clientsRaw = meetingsRaw.map((x) => x * B.clientShare);
    const round = (pair) => pair.map((x) => Math.max(1, Math.round(x)));
    const hours = Math.round((emails * B.minutesPerEmail) / 60);
    const infra = infraPlan({ prospects, channels: {} });
    const meetings = round(meetingsRaw);
    return {
      prospects, emails,
      replies: round(repliesRaw),
      positiveReplies: round(positiveRaw),
      meetings,
      clients: round(clientsRaw),
      positive: meetings, // kept for older callers: meetings booked
      hours,
      sdrs: hours / B.sdrHoursPerMonth,
      emailsPerDay: infra.emailsPerDay,
      prospectsPerDay: infra.prospectsPerDay,
      mailboxes: infra.mailboxes,
      domains: infra.domains,
    };
  }

  // ---- Outbound strategy engine ------------------------------------------
  // Rules from the Saleshandy outbound playbook (outreach-superpower skill):
  //  • B2B base = Email + LinkedIn: connect (no pitch) → pain opener → case-study
  //    proof → LinkedIn message (new angle) → peer movement → breakup, ~2 weeks.
  //  • High-value deals add a call task for prospects with 2+ opens.
  //  • WhatsApp as a cold touch only where it's a normal business channel
  //    (India, Middle East); elsewhere only after a positive reply.
  //  • Guardrails: email 1 is 60–100 words with no links; one question CTA;
  //    Tue–Thu 9–11am prospect time; stop on reply. Pre-warmed mailboxes, so sending starts on day 1.
  const ANGLES = {
    saas: { lead: "operational pain, not features", proof: "specific metrics, like 'cut onboarding time by 40%'", cta: "a short walkthrough" },
    "marketing-agency": { lead: "a quick audit or tip, value first", proof: "a specific issue you spotted on their site", cta: "'Want me to share what I found?'" },
    staffing: { lead: "their growth and open roles", proof: "a conversation, not a pitch", cta: "a low-pressure, opportunity-led question" },
    "it-services": { lead: "a delivery or hiring bottleneck", proof: "named outcomes, like 'shipped 2x faster'", cta: "a 15-minute call" },
    "finance-consulting": { lead: "a compliance or growth trigger, like a funding round", proof: "named clients and outcomes", cta: "a 15-minute call" },
  };
  const DEFAULT_ANGLE = { lead: "a specific observation about their business", proof: "a named customer and result", cta: "a quick yes-or-no reply" };

  function buildStrategy(profile, o) {
    const ind = industryById(profile.industryId);
    const B = C.benchmarks;
    const domestic = profile.geos.length === 1 && profile.geos[0] === "india";
    const dealUsd = domestic ? ind.dealInr / C.kiosk.usdToInr : ind.dealUsd;
    const highValue = dealUsd >= 15000;
    const waMarkets = profile.geos.filter((g) => g === "india" || g === "middle-east").map((g) => D.geos.find((x) => x.id === g).name);
    const whatsappCold = waMarkets.length > 0;

    const steps = [
      { day: 0, ch: "linkedin", what: "Connection request", note: "No pitch, under 300 characters" },
      { day: 1, ch: "email", what: "Email 1: pain-point opener", note: "60–100 words, no links, one question" },
      { day: 4, ch: "email", what: "Email 2: case-study proof", note: "A named customer and result" },
      { day: 5, ch: "linkedin", what: "LinkedIn message", note: "A different angle from the emails" },
      { day: 8, ch: "email", what: "Email 3: peer movement", note: "What similar companies are doing" },
    ];
    if (highValue) steps.push({ day: 8, ch: "call", what: "Call engaged prospects", note: "Only people who opened 2+ times" });
    if (whatsappCold) steps.push({ day: 12, ch: "whatsapp", what: "WhatsApp check-in", note: "Short and casual, under 100 words" });
    steps.push({ day: 13, ch: "email", what: "Email 4: breakup", note: "40–60 words, close the loop politely" });

    const name = ["Email", "LinkedIn", highValue && "Calls", whatsappCold && "WhatsApp"].filter(Boolean).join(" + ");
    const why = [
      "LinkedIn warms up decision makers before and between emails.",
      highValue ? `Deals of this size justify a short call, but only to prospects who opened twice or more.` : "Deal sizes here suit a lighter, volume-friendly mix, so no cold calls.",
      whatsappCold ? `WhatsApp is a normal business channel in ${waMarkets.join(" & ")}, so it's used as a final check-in.` : "WhatsApp is kept for after someone replies, since cold WhatsApp doesn't suit these markets.",
    ];
    const linkedin = Math.min(o.prospects, 400); // ~100 connection requests a week keeps LinkedIn safe
    const calls = highValue ? Math.round(o.prospects * 0.15) : 0;
    const channels = [
      { ch: "email", name: "Email", role: "Main channel", text: `AI-personalised emails from ${o.mailboxes} pre-warmed mailboxes (${B.emailsPerMailboxPerDay} a day each), sending from day 1.`, when: "Day 1, 4, 8 & 13", volume: `${o.prospects.toLocaleString("en-IN")} prospects × ${B.emailsPerProspect} emails` },
      { ch: "linkedin", name: "LinkedIn", role: "Warm-up touch", text: "Connect without a pitch, then message with a different angle from the emails.", when: "Day 0, message on Day 5", volume: `~${linkedin.toLocaleString("en-IN")} requests a month (~${Math.round(linkedin / 4)} a week)` },
      highValue
        ? { ch: "call", name: "Calls", role: "Built-in dialer", text: "Call only the prospects who opened 2+ times. Warm calls, not cold ones.", when: "Day 8", volume: `~${calls.toLocaleString("en-IN")} calls a month (~${Math.max(1, Math.round(calls / B.workingDaysPerMonth))} a day)` }
        : { ch: "call", name: "Calls", role: "When they reply", text: "Use the dialer to call back interested prospects quickly.", when: "After a positive reply", volume: `~${o.positiveReplies[0]}–${o.positiveReplies[1]} calls a month` },
      whatsappCold
        ? { ch: "whatsapp", name: "WhatsApp", role: "Final check-in", text: `A short, friendly check-in for prospects in ${waMarkets.join(" & ")}.`, when: "Day 12", volume: "Prospects with a phone number" }
        : { ch: "whatsapp", name: "WhatsApp", role: "After they reply", text: "Confirm meetings with interested prospects, faster.", when: "After a positive reply", volume: `~${o.positiveReplies[0]}–${o.positiveReplies[1]} conversations a month` },
    ];
    const rules = [
      "First email under 100 words, no links or attachments",
      "One clear question as the call to action",
      "Send Tuesday to Thursday, 9 to 11am in their time zone",
      "Every follow-up uses a new angle; stop as soon as they reply",
    ];
    return { name, why, steps, channels, rules, angle: ANGLES[ind.id] || DEFAULT_ANGLE, highValue, whatsappCold, days: steps[steps.length - 1].day + 1 };
  }

  // ---- Ideal customer profile (personalised) ---------------------------------
  function buildIcp(profile) {
    const ind = industryById(profile.industryId);
    const base = (window.SH_ICP || {})[ind.id];
    if (!base) return null;
    const order = D.sizes.map((s) => s.id).filter((id) => profile.sizes.includes(id));
    const a = D.sizes.find((s) => s.id === order[0]), b = D.sizes.find((s) => s.id === order[order.length - 1]);
    const size = !a ? "" : order.length === 1 ? a.name : `${a.name.split("–")[0]}–${b.name.includes("–") ? b.name.split("–")[1] : b.name}`;
    const markets = profile.geos.map((g) => D.geos.find((x) => x.id === g)?.name).filter(Boolean);
    const join = (arr) => (arr.length <= 1 ? arr[0] || "" : arr.slice(0, -1).join(", ") + " & " + arr[arr.length - 1]);
    return {
      ...base,
      industry: ind.name,
      firmo: [size && `${size} employees`, join(markets)].filter(Boolean).join(" · "),
      roles: profile.titles,
    };
  }

  // Kept for older callers.
  const SEQUENCE = [];
  function channelPlan(o) {
    const linkedin = Math.min(o.prospects, 400), calls = Math.round(o.prospects * 0.15);
    return { linkedin, linkedinWeek: Math.round(linkedin / 4), calls, callsDay: Math.max(1, Math.round(calls / C.benchmarks.workingDaysPerMonth)) };
  }

  // ---- Shareable plan link -------------------------------------------------
  // Compact code so the shared link stays short:
  //   #1~Company~domain~industry~markets~sizes~roles~volume~contacts~companies~colour
  // Lists are bitmasks in base 36; numbers are base 36. Old "c=…&i=…" links still decode.
  const b36 = (n) => Math.round(n).toString(36);
  const mask = (all, picked) => b36(all.reduce((m, x, i) => (picked.includes(x) ? m | (1 << i) : m), 0));
  const unmask = (all, v) => { const n = parseInt(v || "0", 36) || 0; return all.filter((_, i) => n & (1 << i)); };
  const enc = (v) => encodeURIComponent(v || "").replace(/%20/g, "_").replace(/~/g, "%7E");
  const dec = (v) => decodeURIComponent((v || "").replace(/_/g, " "));
  function encodePlan({ profile, prospects, market, gist }) {
    const ind = industryById(profile.industryId);
    return [
      "1", enc(profile.companyName), enc(profile.domain),
      b36(D.industries.indexOf(ind)),
      mask(D.geos.map((g) => g.id), profile.geos),
      mask(D.sizes.map((s) => s.id), profile.sizes),
      mask(ind.titles, profile.titles),
      b36(Math.max(0, C.benchmarks.volumeOptions.indexOf(prospects))),
      market ? b36(market.contacts) : "", market ? b36(market.companies) : "",
      (profile.brandColor || "").replace("#", ""),
      /^[0-9a-f]{20,40}$/.test(gist || "") ? gist : "",
    ].join("~").replace(/~+$/, "");
  }
  function decodePlan(str) {
    const raw = String(str || "").replace(/^[#?]/, "");
    if (raw.startsWith("1~")) {
      const f = raw.split("~");
      const ind = D.industries[parseInt(f[3], 36)];
      if (!ind) return null;
      const geos = unmask(D.geos.map((g) => g.id), f[4]);
      const sizes = unmask(D.sizes.map((s) => s.id), f[5]);
      const titles = unmask(ind.titles, f[6]);
      const k = (f[10] || "").toLowerCase();
      return {
        profile: {
          companyName: dec(f[1]), domain: dec(f[2]), industryId: ind.id, offering: ind.offering,
          geos: geos.length ? geos : ind.defaultGeos.slice(), sizes: sizes.length ? sizes : D.defaultSizes.slice(),
          titles: titles.length ? titles : ind.titles.slice(),
          brandColor: /^[0-9a-f]{6}$/.test(k) ? "#" + k : "",
        },
        prospects: C.benchmarks.volumeOptions[parseInt(f[7] || "0", 36)] || C.benchmarks.defaultProspects,
        market: f[8] ? { contacts: parseInt(f[8], 36), companies: parseInt(f[9] || "0", 36) } : null,
        gist: /^[0-9a-f]{20,40}$/.test(f[11] || "") ? f[11] : "",
      };
    }
    // Older links: plan.html#c=…&d=…&i=…
    const q = new URLSearchParams(raw);
    const ind = D.industries.find((x) => x.id === q.get("i"));
    if (!ind) return null;
    const pickList = (v, valid) => (v || "").split(".").filter((x) => valid.includes(x));
    const geos = pickList(q.get("g"), D.geos.map((g) => g.id));
    const sizes = pickList(q.get("s"), D.sizes.map((s) => s.id));
    const titles = (q.get("t") || "").split(".").map(Number).filter((n) => ind.titles[n]).map((n) => ind.titles[n]);
    const [contacts, companies] = (q.get("m") || "").split(".").map(Number);
    const k = (q.get("k") || "").toLowerCase();
    return {
      profile: {
        companyName: q.get("c") || "", domain: q.get("d") || "", industryId: ind.id, offering: ind.offering,
        geos: geos.length ? geos : ind.defaultGeos.slice(), sizes: sizes.length ? sizes : D.defaultSizes.slice(),
        titles: titles.length ? titles : ind.titles.slice(),
        brandColor: /^[0-9a-f]{6}$/.test(k) ? "#" + k : "",
      },
      prospects: Number(q.get("p")) || C.benchmarks.defaultProspects,
      market: contacts ? { contacts, companies } : null,
    };
  }

  return {
    buildStrategy, buildIcp, SEQUENCE, channelPlan, encodePlan, decodePlan,
    prettyName: (domain) => prettyCompanyName(cleanDomain(domain)),
    leadFinderUrl, outreach,
    looksLikeDomain, cleanDomain, industryById,
    analyzeWebsite, getMarketSize, getSampleLeads, forecast, infraPlan, draftFirstEmail,
    submitBoothLead, loadLeads, clearLeads: () => saveLeads([]),
  };
})();
