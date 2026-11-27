/* ==========================================================================
   Shared view pieces for the booth (app.js) and the public plan (plan.js):
   the monthly estimate, the outbound strategy, and the first-30-days timeline.
   ========================================================================== */
window.SH_VIEWS = (function () {
  const C = window.SH_CONFIG, I = window.SH_ICON;
  const B = C.benchmarks;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtInt = (n) => Math.round(n).toLocaleString("en-IN");
  const rng = ([a, b]) => `${fmtInt(a)}–${fmtInt(b)}`;
  const pct = (x) => (x * 100).toFixed(1).replace(/\.0$/, "") + "%";
  const whole = (x) => Math.round(x * 100) + "%";
  const CH_ICON = { email: "mail", linkedin: "linkedinFill", call: "phone", whatsapp: "whatsappFill" };

  // Vertical estimate: people → replies → positive → meetings → new clients.
  function estimate(o, { who = "you" } = {}) {
    const row = (label, value, sub = "", cls = "") =>
      `<div class="er ${cls}"><span class="er-l">${label}${sub ? `<small>${sub}</small>` : ""}</span><b class="num">${value}</b></div>`;
    const conn = (text) => `<div class="ec">${I("chevronDown", 14)}<span>${text}</span></div>`;
    return `
      <div class="est">
        <div class="est-title">Your estimate</div>
        <p class="est-lead">Reach <b>${fmtInt(o.prospects)}</b> prospects a month with Saleshandy and ${who} can win <b>~${rng(o.clients)}</b> new clients.</p>
        ${row("Prospects you reach", fmtInt(o.prospects), "Lead Finder · Sequences")}
        ${conn(`~${pct(B.replyRateRange[0])}–${pct(B.replyRateRange[1])} reply`)}
        ${row("Replies", `~${rng(o.replies)}`, "Unified Inbox")}
        ${conn(`~${whole(B.positiveShare)} are positive`)}
        ${row("Positive replies", `~${rng(o.positiveReplies)}`, "Interested and ready to talk")}
        ${conn(`~${whole(B.meetingShare)} book a meeting`)}
        ${row("Meetings", `~${rng(o.meetings)}`, "Booked from your inbox")}
        ${conn(`~${whole(B.clientShare)} become clients`)}
        ${row("New clients", `~${rng(o.clients)}`, "Tracked in your CRM pipeline", "win")}
        <p class="est-note">Estimate: ~${pct(B.replyRateRange[0])} to ${pct(B.replyRateRange[1])} reply, ~${whole(B.positiveShare)} positive, ~${whole(B.meetingShare)} meet, ~${whole(B.clientShare)} buy. Yours can be better.</p>
      </div>`;
  }

  // Strategy chosen by the engine in api.js (channel mix, steps, angle, rules).
  function strategy(st) {
    return `
      <div class="card strat-card">
        <div class="strat-top">
          <div><small>Recommended channel mix</small><h3>${esc(st.name)}</h3></div>
          <div class="mix-icons">${st.channels.filter((c) => !/After/.test(c.when)).map((c) => `<span class="chan-ic c-${c.ch}" title="${esc(c.name)}">${I(CH_ICON[c.ch], 16)}</span>`).join("")}</div>
        </div>
        <ul class="strat-why">${st.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        <p class="strat-angle"><b>Message angle:</b> lead with ${esc(st.angle.lead)}, prove it with ${esc(st.angle.proof)}, and ask for ${esc(st.angle.cta)}.</p>
      </div>
      <div class="section-sub"><b>Your ${st.days}-day sequence</b><span>${st.steps.length} touches per prospect, stopped as soon as they reply</span></div>
      <div class="card"><div class="seq">${st.steps.map((s) => `
        <div class="seq-step"><div class="dot c-${s.ch}">${I(CH_ICON[s.ch], 18)}</div><div class="day">Day ${s.day}</div><div class="what">${esc(s.what)}</div></div>`).join("")}</div></div>
      <p class="strat-rules">${st.rules.join(" · ")}</p>`;
  }

  // First 30 days. Saleshandy's pre-warmed mailboxes mean sending starts on day 1.
  function timeline(o, st) {
    const days = st ? st.days : 14;
    return `
      <div class="timeline">
        <div class="tl"><div class="dot">${I("zap", 20)}</div><div class="day">Day 1</div><h3>Set up & launch</h3><p><b>${o.mailboxes} pre-warmed mailboxes</b> on ${o.domains} domains, ready to send from day 1.</p></div>
        <div class="tl"><div class="dot">${I("send", 20)}</div><div class="day">Day 1–${days}</div><h3>Sequence runs</h3><p>About <b>${fmtInt(o.prospectsPerDay)} new people a day</b> enter the sequence, across every channel.</p></div>
        <div class="tl"><div class="dot">${I("message", 20)}</div><div class="day">Week 1</div><h3>First replies</h3><p>Replies from email, LinkedIn and calls land in <b>one inbox</b>.</p></div>
        <div class="tl"><div class="dot">${I("calendar", 20)}</div><div class="day">Week 2 onwards</div><h3>Meetings booked</h3><p>Around <b>~${rng(o.meetings)} meetings</b> and ~${rng(o.clients)} new clients a month.</p></div>
      </div>`;
  }

  // Ideal customer profile: who to target, who not, when, who to talk to,
  // the outcome they want, and what they'll push back with.
  function icp(c, { objections = true } = {}) {
    if (!c) return "";
    return `
      <div class="icp">
        <div class="icp-top">
          <div class="card icp-yes">
            <div class="icp-h">${I("target", 16)} Who to target</div>
            ${c.segments.map((s, i) => `
              <div class="icp-seg">
                <span class="icp-n">${i + 1}</span>
                <div>
                  <div class="icp-seg-h"><b>${esc(s[0])}</b>${i === 0 ? '<span class="prim">Start here</span>' : ""}</div>
                  ${s[1] ? `<small>${esc(s[1])}${i === 0 && c.firmo ? ` · ${esc(c.firmo)}` : ""}</small>` : ""}
                  ${s[2] ? `<p>${esc(s[2])}</p>` : ""}
                </div>
              </div>`).join("")}
          </div>
          <div class="card icp-no">
            <div class="icp-h">${I("cross", 16)} Who not to target</div>
            <ul>${c.notFor.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
            <p class="icp-tip">Skipping these keeps reply rates high and your domains healthy.</p>
          </div>
        </div>
        <div class="icp-row2">
          <div class="card icp-c">
            <div class="icp-h">${I("zap", 16)} When to reach out</div>
            <ul class="trig">${c.triggers.map((t) => `<li><b>${esc(t[0])}</b>${t[1] ? `<span>${esc(t[1])}</span>` : ""}</li>`).join("")}</ul>
          </div>
          <div class="card icp-c">
            <div class="icp-h">${I("users", 16)} Who to talk to</div>
            <div class="role"><small>Feels the pain daily</small><b>${esc(c.champion)}</b></div>
            ${c.approver ? `<div class="role"><small>Approves the budget</small><b>${esc(c.approver)}</b></div>` : ""}
            ${c.outcome ? `<div class="outcome"><small>The result they want</small><b>${esc(c.outcome)}</b></div>` : ""}
          </div>
        </div>
        ${objections && c.objections && c.objections.length ? `
        <div class="card icp-obj">
          <div class="icp-h">${I("message", 16)} What they'll say, and how to answer</div>
          <div class="objs">${c.objections.map((o) => `<div class="obj"><span class="q">“${esc(o[0])}”</span><span class="a">${esc(o[1])}</span></div>`).join("")}</div>
        </div>` : ""}
      </div>`;
  }

  // Shown while Saleshandy AI writes the visitor's ICP.
  function icpLoading(name) {
    return `
      <div class="card icp-loading">
        <span class="spin"></span>
        <div><b>Saleshandy AI is building ${esc(name || "your")} ideal customer profile</b>
        <p>Reading the business and working out who to target, who to skip and when to reach out. Usually 20–40 seconds.</p></div>
      </div>`;
  }

  // Plain-text strategy lines for WhatsApp / email messages.
  function strategyText(st) {
    return st.channels.map((c) => `- ${c.name}: ${c.when}`).join("\n");
  }

  return { estimate, strategy, timeline, strategyText, icp, icpLoading };
})();
