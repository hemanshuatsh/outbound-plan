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
  const title = `${p.companyName ? p.companyName + "'s" : "Your"} 30-day outbound plan`;
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

  async function init() {
    const full = await API.getMarketSize(p);
    S.market = S.market ? { ...full, ...S.market, withEmail: Math.round(S.market.contacts * D.coverage.email), withPhone: Math.round(S.market.contacts * D.coverage.phone), withLinkedin: Math.round(S.market.contacts * D.coverage.linkedin) } : full;
    S.leads = await API.getSampleLeads(p, 50);
    render();
  }

  function render() {
    const o = API.outreach({ prospects: S.prospects }), cp = API.channelPlan(o), seq = API.SEQUENCE, m = S.market;
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
          <span class="eyebrow">${I("sparkles", 13)} Built with Saleshandy at ${esc(C.event.name)}</span>
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
            <div class="pills" id="volume" title="New leads per month">${B.volumeOptions.map((v) => `<button data-v="${v}" class="${S.prospects === v ? "on" : ""}">${fmtInt(v)}</button>`).join("")}</div>
          </div>
          <div class="journey j5">
            <div class="jstep"><div class="jtop"><span class="jn">1</span><span class="jic">${I("send", 18)}</span></div><div class="v num">${fmtInt(o.prospects)}</div><div class="k">Leads you reach</div><p>Fresh decision makers from Lead Finder, about ${fmtInt(o.prospectsPerDay)} a day</p></div>
            <div class="jstep"><div class="jtop"><span class="jn">2</span><span class="jic">${I("message", 18)}</span></div><div class="v num">~${rng(o.replies)}</div><div class="k">Replies</div><p>~${pct(B.replyRateRange[0])}–${pct(B.replyRateRange[1])} of people reply</p></div>
            <div class="jstep pos"><div class="jtop"><span class="jn">3</span><span class="jic">${I("sparkles", 18)}</span></div><div class="v num">~${rng(o.positiveReplies)}</div><div class="k">Positive replies</div><p>~${Math.round(B.positiveShare * 100)}% of replies want to talk</p></div>
            <div class="jstep"><div class="jtop"><span class="jn">4</span><span class="jic">${I("calendar", 18)}</span></div><div class="v num">~${rng(o.meetings)}</div><div class="k">Meetings</div><p>~${Math.round(B.meetingShare * 100)}% book a meeting</p></div>
            <div class="jstep win"><div class="jtop"><span class="jn">5</span><span class="jic">${I("trendingUp", 18)}</span></div><div class="v num">~${rng(o.clients)}</div><div class="k">New clients</div><p>~${Math.round(B.clientShare * 100)}% of meetings become clients</p></div>
          </div>
          <p class="j-est">Estimate: ~${pct(B.replyRateRange[0])} to ${pct(B.replyRateRange[1])} reply, ~${Math.round(B.positiveShare * 100)}% positive, ~${Math.round(B.meetingShare * 100)}% meet, ~${Math.round(B.clientShare * 100)}% buy. Yours can be better.</p>
          <div class="pl-note">${I("clock", 16)} <span>Saves about <b>${fmtInt(o.hours)} hours</b> of manual prospecting a month, the work of <b>${oneDp(o.sdrs)} full-time reps</b>.</span></div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">2 · The market</span>
          <h2 class="pl-h2">Who you'll reach</h2>
          <div class="pl-market">
            <div class="pl-kpi blue"><span>${I("users", 16)} Decision makers</span><b class="num">${fmtCompact(m.contacts)}</b></div>
            <div class="pl-kpi"><span>${I("building", 16)} Companies</span><b class="num">${fmtCompact(m.companies)}</b></div>
            <div class="pl-icp">
              <div><small>Roles</small><b>${esc(listJoin(p.titles))}</b></div>
              <div><small>Markets</small><b>${esc(listJoin(geoNames))}</b></div>
              <div><small>Company size</small><b>${esc(sizeRange())} employees</b></div>
              <div><small>Industries</small><b>${esc(listJoin(ind.buyers.slice(0, 3)))}</b></div>
            </div>
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">3 · The process</span>
          <h2 class="pl-h2">How the first <mark>30 days</mark> run</h2>
          <div class="timeline" style="margin-top:6px">
            <div class="tl"><div class="dot">${I("zap", 20)}</div><div class="day">Day 1</div><h3>Set up</h3><p>${o.mailboxes} mailboxes on ${o.domains} domains, configured in about 10 minutes.</p></div>
            <div class="tl"><div class="dot">${I("flame", 20)}</div><div class="day">Day 1–${B.warmupDays}</div><h3>Warm up</h3><p>Mailboxes build sender reputation automatically, so emails land in the inbox.</p></div>
            <div class="tl"><div class="dot">${I("rocket", 20)}</div><div class="day">Day ${B.warmupDays + 1}</div><h3>Launch</h3><p>The sequence starts reaching ${fmtInt(o.prospectsPerDay)} new prospects every working day.</p></div>
            <div class="tl"><div class="dot">${I("calendar", 20)}</div><div class="day">Day ${B.warmupDays + 6}+</div><h3>Book meetings</h3><p>Replies from every channel land in one inbox. The team replies and books.</p></div>
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">4 · The strategy</span>
          <h2 class="pl-h2">One sequence, four channels</h2>
          <div class="channels-grid">
            ${chan("email", "Email", "Main channel", `AI-personalised emails from ${o.mailboxes} warmed-up mailboxes, sent automatically.`, "Day 1, 4 & 11", `${fmtInt(o.prospects)} prospects, ${B.emailsPerProspect} emails each`)}
            ${chan("linkedin", "LinkedIn", "Warm-up touch", "Connect with best-fit decision makers so the name is familiar before the follow-up.", "Day 2, message on Day 8", `${fmtInt(cp.linkedin)} requests / month`)}
            ${chan("call", "Calls", "Built-in dialer", "Call the prospects who opened or clicked. Warm calls, not cold ones.", "Day 6", `~${cp.callsDay} calls a day`)}
            ${chan("whatsapp", "WhatsApp", "Close the loop", "Confirm meetings with interested prospects, faster.", "Day 14, or on reply", `~${rng(o.positiveReplies)} conversations / month`)}
          </div>
          <div class="card" style="margin-top:14px"><div class="seq">${seq.map((s) => `<div class="seq-step"><div class="dot c-${s.ch}">${I(CH_ICON[s.ch], 18)}</div><div class="day">Day ${s.day}</div><div class="what">${esc(s.what)}</div></div>`).join("")}</div></div>
          <div class="card disclosure ${S.emailOpen ? "open" : ""}" style="margin-top:14px">
            <button data-act="email"><span class="ai-tag">${I("sparkles", 13)} AI Copilot</span> See a sample first email<span class="chev">${I("chevronDown", 18)}</span></button>
            ${S.emailOpen ? `<div class="body" id="email-body">Writing…</div>` : ""}
          </div>
        </div>

        <div class="pl-final">
          <h2>Ready to start?</h2>
          <p>The first 50 leads are already picked in Saleshandy. Emails and phones are looked up when you request them.</p>
          <div class="row" style="justify-content:center">
            <a class="btn btn-primary btn-lg" href="${esc(C.cta.signupUrl)}" target="_blank" rel="noopener">Start free trial ${I("arrowRight", 18)}</a>
            <a class="btn btn-outline btn-lg" href="${esc(lfUrl)}" target="_blank" rel="noopener">Open the first 50 leads ${I("external", 16)}</a>
          </div>
          <div class="muted small" style="margin-top:16px">Booth code <b style="color:var(--ink)">${esc(C.cta.promoCode)}</b> · ${C.cta.trialDays}-day free trial · no credit card · trusted by 25,000+ businesses</div>
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
