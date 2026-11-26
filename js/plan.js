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
    const o = API.outreach({ prospects: S.prospects }), cp = API.channelPlan(o), seq = API.SEQUENCE, L = S.leads, m = S.market;
    const lock = (t) => `<span class="lock"><span class="blur">${esc(t)}</span>${I("lock", 14)}</span>`;
    const chan = (key, name, role, text, when, volume) => `
      <div class="card chan">
        <div class="chan-head"><span class="chan-ic c-${key}">${I(CH_ICON[key], 18)}</span><div><small>${role}</small><b>${name}</b></div></div>
        <p>${text}</p>
        <div class="meta"><span>When: <b>${when}</b></span><span>Volume: <b>${volume}</b></span></div>
      </div>`;
    root.innerHTML = `
      <section class="screen plan-wrap">
        <div class="pl-hero">
          <span class="eyebrow">${I("sparkles", 13)} Built with Saleshandy at ${esc(C.event.name)}</span>
          <h1>${esc(title)}</h1>
          <p class="sub">${esc(ind.name)} · ${esc(listJoin(p.titles.slice(0, 2)))} in ${esc(listJoin(geoNames))}</p>
          <div class="row pl-actions-top">
            <button class="btn btn-primary" data-act="share">${I("users", 16)} Share with your team</button>
            <button class="btn btn-outline" data-act="pdf">${I("file", 16)} Save as PDF</button>
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">1 · Your market</span>
          <h2 class="pl-h2">Who you can sell to</h2>
          <div class="card filterbar"><div class="filterbar-head">
            <span class="lbl">${I("sliders", 16)} Ideal customer</span>
            <div class="fpills">
              <span class="fpill">${I(ind.icon, 15)} ${esc(ind.name)}</span>
              <span class="fpill">${I("globe", 15)} ${esc(listJoin(geoNames))}</span>
              <span class="fpill">${I("user", 15)} ${esc(p.titles.length > 2 ? p.titles.slice(0, 2).join(", ") + ` +${p.titles.length - 2}` : p.titles.join(", "))}</span>
              <span class="fpill">${I("building", 15)} ${esc(sizeRange())} employees</span>
            </div>
          </div></div>
          <div class="stat-hero">
            <div class="stat-big blue"><div class="k">${I("users", 18)} Decision makers</div><div class="v num">${fmtInt(m.contacts)}</div><div class="d">${fmtCompact(m.contacts)} people who match the ideal customer</div></div>
            <div class="stat-big light"><div class="k">${I("building", 18)} Companies</div><div class="v num">${fmtInt(m.companies)}</div><div class="d">across ${esc(listJoin(geoNames))}</div></div>
          </div>
          <div class="coverage">
            <span class="cov">${I("mail", 16)} <b class="num">${fmtInt(m.withEmail)}</b> verified emails</span>
            <span class="cov">${I("phone", 16)} <b class="num">${fmtInt(m.withPhone)}</b> direct dials</span>
            <span class="cov">${I("linkedin", 16)} <b class="num">${fmtInt(m.withLinkedin)}</b> LinkedIn profiles</span>
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">2 · Your leads</span>
          <div class="row pl-head-row"><h2 class="pl-h2">The first ${L.length} leads</h2><span class="spacer"></span>
            <a class="btn btn-primary" href="${esc(lfUrl)}" target="_blank" rel="noopener">Open all ${L.length} in Saleshandy ${I("external", 16)}</a></div>
          <div class="card">
            <div class="leads-scroll"><table class="leads">
              <thead><tr><th class="n hide-sm">#</th><th>Name</th><th>Company</th><th class="hide-md">Location</th><th class="hide-md">Size</th><th class="hide-sm">Email</th><th class="hide-sm">Phone</th><th class="hide-sm">LinkedIn</th></tr></thead>
              <tbody>${L.map((l, k) => `<tr>
                <td class="n hide-sm">${k + 1}</td>
                <td><div class="who"><span class="av" style="background:${AV[k % 5][0]};color:${AV[k % 5][1]}">${esc(initials(l.name))}</span><div><b>${esc(l.name)}</b><small>${esc(l.title)}</small></div></div></td>
                <td><div class="who"><div><b>${esc(l.company)}</b><small class="domain">${esc(l.domain)}</small></div></div></td>
                <td class="hide-md"><div class="who"><div><b style="font-weight:500">${esc(l.location)}</b><small>${esc(l.region)}</small></div></div></td>
                <td class="hide-md">${esc(l.size)}</td>
                <td class="hide-sm">${lock(l.emailMasked)}</td>
                <td class="hide-sm">${l.hasPhone ? lock(l.phoneMasked) : '<span class="muted">—</span>'}</td>
                <td class="hide-sm">${l.hasLinkedin ? `<span class="yes">${I("check", 14)} Profile</span>` : '<span class="muted">—</span>'}</td>
              </tr>`).join("")}</tbody>
            </table></div>
            <div class="leads-note">${I("lock", 16)} Emails and phone numbers unlock in Saleshandy. New users sign up first with code <b style="color:var(--ink)">&nbsp;${esc(C.cta.promoCode)}</b>.</div>
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">3 · Your results</span>
          <h2 class="pl-h2">What Saleshandy can help you achieve each month</h2>
          <div class="volume"><span class="lbl">New leads per month</span>
            <div class="pills" id="volume">${B.volumeOptions.map((v) => `<button data-v="${v}" class="${S.prospects === v ? "on" : ""}">${fmtInt(v)}</button>`).join("")}</div></div>
          <div class="journey">
            <div class="jstep"><div class="jtop"><span class="jn">1</span><span class="jic">${I("database", 18)}</span></div><div class="v num">${fmtInt(o.prospects)}</div><div class="k">Leads you get</div><p>Verified decision makers from Lead Finder, out of ${fmtCompact(m.contacts)} in the market</p></div>
            <div class="jstep"><div class="jtop"><span class="jn">2</span><span class="jic">${I("send", 18)}</span></div><div class="v num">${fmtInt(o.prospects)}</div><div class="k">Prospects you reach</div><p>About ${fmtInt(o.prospectsPerDay)} a day, by email, LinkedIn and calls</p></div>
            <div class="jstep"><div class="jtop"><span class="jn">3</span><span class="jic">${I("message", 18)}</span></div><div class="v num">${rng(o.replies)}</div><div class="k">Replies</div><p>Prospects who write back to your outreach</p></div>
            <div class="jstep win"><div class="jtop"><span class="jn">4</span><span class="jic">${I("calendar", 18)}</span></div><div class="v num">${rng(o.positive)}</div><div class="k">Meetings booked</div><p>Interested replies that turn into sales conversations</p></div>
          </div>
          <div class="card value" style="margin-top:14px">
            <div class="tag">${I("clock", 15)} Time saved</div>
            <div class="big num">${fmtInt(o.hours)} hrs <small>/ month</small></div>
            <p>Saleshandy can take on finding, researching and following up with ${fmtInt(o.prospects)} prospects a month, work that would take about <b>${oneDp(o.sdrs)} full-time reps</b>.</p>
          </div>
        </div>

        <div class="pl-section">
          <span class="eyebrow">4 · Your plan</span>
          <h2 class="pl-h2">Your first <mark>30 days</mark> of outbound</h2>
          <div class="section-head" style="margin-top:6px"><h2>Your outbound strategy</h2><p>Each channel has one job. Together they help you reach ${rng(o.positive)} interested replies & meetings a month.</p></div>
          <div class="channels-grid">
            ${chan("email", "Email", "Main channel", `AI-personalised emails from ${o.mailboxes} warmed-up mailboxes, sent automatically every working day.`, "Day 1, 4 & 11", `${fmtInt(o.prospects)} prospects, ${B.emailsPerProspect} emails each`)}
            ${chan("linkedin", "LinkedIn", "Warm-up touch", "Connect with your best-fit decision makers so your name is familiar before the follow-up.", "Day 2, message on Day 8", `${fmtInt(cp.linkedin)} requests / month (~${cp.linkedinWeek}/week)`)}
            ${chan("call", "Calls", "Built-in dialer", "Call the prospects who opened or clicked your emails. Warm calls, not cold ones.", "Day 6", `~${fmtInt(cp.calls)} calls / month (~${cp.callsDay}/day)`)}
            ${chan("whatsapp", "WhatsApp", "Close the loop", "Follow up with interested prospects on WhatsApp to confirm the meeting faster.", "Day 14, or on reply", `${rng(o.positive)} conversations / month`)}
          </div>
          <div class="section-head"><h2>Your sequence</h2><p>${seq.length} touches over ${seq[seq.length - 1].day} days for every prospect, written by AI.</p></div>
          <div class="card"><div class="seq">${seq.map((s) => `<div class="seq-step"><div class="dot c-${s.ch}">${I(CH_ICON[s.ch], 18)}</div><div class="day">Day ${s.day}</div><div class="what">${esc(s.what)}</div></div>`).join("")}</div></div>
          <div class="section-head"><h2>Your first 30 days</h2></div>
          <div class="timeline" style="margin-top:0">
            <div class="tl"><div class="dot">${I("zap", 20)}</div><div class="day">Day 1</div><h3>Set up</h3><p>Get <b>${o.mailboxes} mailboxes</b> on ${o.domains} domains, configured in about 10 minutes.</p></div>
            <div class="tl"><div class="dot">${I("flame", 20)}</div><div class="day">Day 1–${B.warmupDays}</div><h3>Warm up</h3><p>Mailboxes build sender reputation <b>automatically</b>, so you land in the inbox.</p></div>
            <div class="tl"><div class="dot">${I("rocket", 20)}</div><div class="day">Day ${B.warmupDays + 1}</div><h3>Launch</h3><p>The sequence starts reaching <b>${fmtInt(o.prospectsPerDay)} new prospects</b> every working day.</p></div>
            <div class="tl"><div class="dot">${I("calendar", 20)}</div><div class="day">Day ${B.warmupDays + 6}+</div><h3>Book meetings</h3><p>Replies from every channel land in <b>one inbox</b>. You reply and book.</p></div>
          </div>
          <div class="card disclosure ${S.emailOpen ? "open" : ""}">
            <button data-act="email"><span class="ai-tag">${I("sparkles", 13)} AI Copilot</span> Preview the first email to ${esc(L[0].name)} at ${esc(L[0].company)}<span class="chev">${I("chevronDown", 18)}</span></button>
            ${S.emailOpen ? `<div class="body" id="email-body">Writing…</div>` : ""}
          </div>
        </div>

        <div class="pl-final">
          <h2>Ready to start?</h2>
          <p>Start free, open your first ${L.length} leads, and send your first email today.</p>
          <div class="row" style="justify-content:center">
            <a class="btn btn-primary btn-lg" href="${esc(C.cta.signupUrl)}" target="_blank" rel="noopener">Start free trial ${I("arrowRight", 18)}</a>
            <span class="code">Booth code <b>${esc(C.cta.promoCode)}</b></span>
          </div>
          <div class="muted small" style="margin-top:18px">${C.cta.trialDays}-day free trial · no credit card · trusted by 25,000+ businesses</div>
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
