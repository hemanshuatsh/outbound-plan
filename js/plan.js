/* ==========================================================================
   Public, shareable outbound plan (plan.html#…)
   Mirrors the booth screens (market → leads → results → 30-day plan) so a
   visitor can open it on their phone and forward it to their team.
   Rebuilt entirely from the short link: no server or database needed.
   ========================================================================== */
(function () {
  const C = window.SH_CONFIG, D = window.SH_DATA, API = window.SH_API, I = window.SH_ICON;
  const B = C.benchmarks;
  const $ = (s, r = document) => r.querySelector(s);
  const root = $("#plan");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtInt = (n) => Math.round(n).toLocaleString("en-IN");
  const fmtCompact = (n) => (n >= 1e7 ? (n / 1e7).toFixed(1).replace(/\.0$/, "") + " crore" : n >= 1e5 ? (n / 1e5).toFixed(1).replace(/\.0$/, "") + " lakh" : fmtInt(n));
  const rng = ([a, b]) => `${fmtInt(a)}–${fmtInt(b)}`;
  const oneDp = (x) => x.toFixed(1).replace(/\.0$/, "");
  const listJoin = (a) => (a.length <= 1 ? a[0] || "" : a.slice(0, -1).join(", ") + " & " + a[a.length - 1]);
  const pct = (x) => (x * 100).toFixed(1).replace(/\.0$/, "") + "%";
  const initials = (n) => n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
  const AV = [["#f1f5ff", "#275df5"], ["#ecf8f0", "#1b7f3b"], ["#fff1e6", "#c2410c"], ["#f4efff", "#7c3aed"], ["#fff8d6", "#8a6d00"]];
  const CH_ICON = { email: "mail", linkedin: "linkedinFill", call: "phone", whatsapp: "whatsappFill" };

  const decoded = API.decodePlan(location.hash);
  $("#top-cta").href = C.cta.signupUrl;
  if (!decoded) {
    root.innerHTML = `<section class="screen narrow" style="text-align:center;padding-top:80px">
      <h1>Let's build your outbound plan</h1>
      <p class="sub" style="margin:0 auto 24px">This link doesn't include a plan. Start free to build yours in Saleshandy.</p>
      <a class="btn btn-primary btn-lg" href="${esc(C.cta.signupUrl)}">Start free ${I("arrowRight", 18)}</a></section>`;
    return;
  }

  const S = { ...decoded, leads: [], emailOpen: false };
  const p = S.profile, ind = API.industryById(p.industryId);
  const geoNames = p.geos.map((g) => D.geos.find((x) => x.id === g)?.name);
  const lfUrl = API.leadFinderUrl(p);
  const title = p.companyName ? `${/s$/i.test(p.companyName) ? p.companyName + "'" : p.companyName + "'s"} 30-day outbound plan` : `30-day outbound plan for ${ind.name}`;
  if (p.brandColor) document.documentElement.style.setProperty("--brand", p.brandColor);
  const logoSrc = p.domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(p.domain)}&sz=128` : "";
  function brandMark() {
    const mono = `<span class="brand-mark mono" style="width:56px;height:56px;${p.brandColor ? `background:${p.brandColor}` : ""}">${esc(initials(p.companyName || "Your"))}</span>`;
    if (!logoSrc) return mono;
    return `<span class="brand-mark" style="width:56px;height:56px"><img src="${esc(logoSrc)}" alt="${esc(p.companyName)} logo" onload="if(this.naturalWidth<32)this.parentNode.outerHTML=this.parentNode.dataset.mono" onerror="this.parentNode.outerHTML=this.parentNode.dataset.mono" /></span>`.replace('class="brand-mark"', `class="brand-mark" data-mono='${mono.replace(/'/g, "&#39;")}'`);
  }
  document.title = title;
  function sizeRange() {
    const order = D.sizes.map((s) => s.id).filter((id) => p.sizes.includes(id));
    const a = D.sizes.find((s) => s.id === order[0]), b = D.sizes.find((s) => s.id === order[order.length - 1]);
    if (!a) return "";
    return order.length === 1 ? a.name : `${a.name.split("–")[0]}–${b.name.includes("–") ? b.name.split("–")[1] : b.name}`;
  }

  // The visitor's AI-written ICP, saved as a secret gist by the booth.
  async function loadAiIcp() {
    if (!S.gist) return null;
    const owner = C.cta.gistOwner || "hemanshuatsh";
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(`https://gist.githubusercontent.com/${owner}/${S.gist}/raw/plan.json`, { signal: ctrl.signal });
      const d = await r.json();
      return d && d.icp && Array.isArray(d.icp.segments) && d.icp.segments.length ? d.icp : null;
    } catch (e) { return null; }
  }
  function currentIcp() {
    const base = API.buildIcp(p);
    const ai = S.aiIcp;
    if (!ai) return base;
    const pick = (x, y) => (x && (!Array.isArray(x) || x.length) ? x : y);
    return { ...base, segments: pick(ai.segments, base?.segments), notFor: pick(ai.notFor, base?.notFor), triggers: pick(ai.triggers, base?.triggers),
      champion: ai.champion || base?.champion, approver: ai.approver || base?.approver, pains: pick(ai.pains, base?.pains),
      outcome: ai.outcome || base?.outcome, objections: pick(ai.objections, base?.objections), ai: true };
  }

  async function init() {
    root.innerHTML = `<section class="screen" style="text-align:center;padding-top:80px"><span class="spin" style="display:inline-block"></span><p class="muted">Loading your plan…</p></section>`;
    S.aiIcp = await loadAiIcp();
    const full = await API.getMarketSize(p);
    S.market = S.market ? { ...full, ...S.market, withEmail: Math.round(S.market.contacts * D.coverage.email), withPhone: Math.round(S.market.contacts * D.coverage.phone), withLinkedin: Math.round(S.market.contacts * D.coverage.linkedin) } : full;
    S.leads = await API.getSampleLeads(p, 50);
    render();
  }

  function render() {
    const o = API.outreach({ prospects: S.prospects }), m = S.market, st = API.buildStrategy(p, o), V = window.SH_VIEWS;
    const ci = currentIcp(); const lf = (x) => (x ? x.charAt(0).toLowerCase() + x.slice(1) : x);
    if (ci && ci.ai && ci.segments[0]) st.angle = { lead: lf(ci.segments[0][2] || st.angle.lead), proof: lf(ci.outcome || st.angle.proof), cta: "a 15-minute call" };
    const chan = (key, name, role, text, when, volume) => `
      <div class="card chan">
        <div class="chan-head"><span class="chan-ic c-${key}">${I(CH_ICON[key], 18)}</span><div><small>${role}</small><b>${name}</b></div></div>
        <p>${text}</p>
        <div class="meta"><span>When: <b>${when}</b></span><span>Volume: <b>${volume}</b></span></div>
      </div>`;
    root.innerHTML = `
      <section class="screen plan-wrap">
        <div class="pl-hero ${p.brandColor ? "branded" : ""}">
          <div class="pl-lockup">${brandMark()}<span class="x">×</span><span class="brand-mark sh" style="width:56px;height:56px"><img src="assets/favicon.svg" alt="Saleshandy" /></span></div>
          <h1>${esc(title)}</h1>
          <p class="sub">A multichannel outbound plan for ${esc(ind.name)}: who to reach, what it can bring in, and how it runs.</p>
          <div class="row pl-actions-top">
            <button class="btn btn-primary" data-act="share">${I("users", 16)} Share with your team</button>
            <button class="btn btn-outline" data-act="pdf">${I("file", 16)} Save as PDF</button>
          </div>
        </div>

        <div class="pl-section">
          <div class="pl-title-row">
            <div><span class="eyebrow">1 · The value</span><h2 class="pl-h2">What this can bring in every month</h2></div>
            <div class="pl-reach"><small>People reached a month</small><div class="pills" id="volume">${B.volumeOptions.map((v) => `<button data-v="${v}" class="${S.prospects === v ? "on" : ""}">${fmtInt(v)}</button>`).join("")}</div></div>
          </div>
          <div class="pl-value">
            ${V.estimate(o, { who: "you" })}
            <p class="est-day">${I("clock", 15)} <span>Saleshandy automates about <b>${fmtInt(o.hours)} hours</b> of manual prospecting a month, the work of ~${oneDp(o.sdrs)} full-time reps.</span></p>
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">2 · Who to target</span>
          <h2 class="pl-h2">Who ${p.companyName ? esc(p.companyName) + " should" : "to"} target, and who not</h2>
          <div class="pl-market">
            <div class="pl-kpi blue"><span>${I("users", 16)} Decision makers</span><b class="num">${fmtCompact(m.contacts)}</b></div>
            <div class="pl-kpi"><span>${I("building", 16)} Companies</span><b class="num">${fmtCompact(m.companies)}</b></div>
            <div class="pl-icp">
              <div><small>Roles</small><b>${esc(currentIcp()?.ai ? currentIcp().champion : listJoin(p.titles))}</b></div>
              <div><small>Markets</small><b>${esc(listJoin(geoNames))}</b></div>
              <div><small>Company size</small><b>${esc(sizeRange())} employees</b></div>
              <div><small>${currentIcp()?.ai ? "Buyers" : "Industry"}</small><b>${esc(currentIcp()?.ai ? listJoin(currentIcp().segments.map((x) => x[0])) : ind.name)}</b></div>
            </div>
          </div>
          ${currentIcp() && currentIcp().ai ? `<div class="ai-made" style="margin-top:14px">${I("sparkles", 13)} Written for ${esc(p.companyName || "your business")} by Saleshandy AI</div>` : ""}
          <div style="margin-top:14px">${V.icp(currentIcp())}</div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">3 · How to reach them</span>
          <h2 class="pl-h2">Your outbound strategy</h2>
          ${V.strategy(st)}
          <div class="card disclosure ${S.emailOpen ? "open" : ""}" style="margin-top:14px">
            <button data-act="email"><span class="ai-tag">${I("sparkles", 13)} AI Copilot</span> See a sample first email<span class="chev">${I("chevronDown", 18)}</span></button>
            ${S.emailOpen ? `<div class="body" id="email-body">Writing…</div>` : ""}
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">4 · The first 30 days</span>
          <h2 class="pl-h2">How the first <mark>30 days</mark> run</h2>
          ${V.timeline(o, st)}
        </div>

        <div class="pl-final">
          <h2>Ready to start?</h2>
          <p>The first 50 leads are already picked in Saleshandy. Emails and phones are looked up when you request them.</p>
          <div class="row" style="justify-content:center">
            <a class="btn btn-primary btn-lg" href="${esc(C.cta.signupUrl)}" target="_blank" rel="noopener">Start free trial ${I("arrowRight", 18)}</a>
            <a class="btn btn-outline btn-lg" href="${esc(lfUrl)}" target="_blank" rel="noopener">Open the first 50 leads ${I("external", 16)}</a>
          </div>
          <div class="muted small" style="margin-top:16px">${C.cta.trialDays}-day free trial · no credit card · trusted by 25,000+ businesses</div>
        </div>
      </section>`;
    bind();
    if (S.emailOpen) fillEmail();
  }

  async function fillEmail() {
    const lead = S.leads[0], mail = await API.draftFirstEmail(p, lead), box = $("#email-body");
    if (box) box.innerHTML = `<div class="email-head">To: <b>${esc(lead.name)}</b> · ${esc(lead.title)}, ${esc(lead.company)}<br/>Subject: <b>${esc(mail.subject)}</b></div><div class="email-body">${mail.body.map((x) => `<p>${esc(x)}</p>`).join("")}</div>`;
  }
  function bind() {
    $("#volume").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.prospects = +b.dataset.v; keepScroll(render); });
    $("[data-act=email]").addEventListener("click", () => { S.emailOpen = !S.emailOpen; keepScroll(render); });
    $("[data-act=pdf]").addEventListener("click", () => window.print());
    $("[data-act=share]").addEventListener("click", async () => {
      if (navigator.share) { try { await navigator.share({ title, text: `${title}, built with Saleshandy`, url: location.href }); } catch (e) { /* cancelled */ } }
      else { await copy(location.href); toast("Link copied. Send it to your team"); }
    });
  }
  function keepScroll(fn) { const y = window.scrollY; fn(); window.scrollTo(0, y); }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (_) {} ta.remove(); }
  }
  function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2400); }

  init();
})();
