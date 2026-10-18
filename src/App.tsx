import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  clearSession, currentAccount, getEntries, getSummary, logout, readSession, requestCode,
  saveSession, verifyCode, type DiaryRole, type Entry, type Session, type Summary,
} from "./api";
import { formatInr, isEligibleDiaryAccount, normalizePhone } from "./diary";

type View = "loading" | "login" | "code" | "ledger";
const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

function ErrorNote({ message }: { message: string }) {
  return <div className="error-note" role="alert">{message}</div>;
}

function Arrow() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 10h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function App() {
  const [view, setView] = useState<View>("loading");
  const [role, setRole] = useState<DiaryRole>("CUSTOMER");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadLedger = useCallback(async (token: string, nextPage = 1) => {
    const [nextSummary, nextEntries] = await Promise.all([getSummary(token), getEntries(token, nextPage)]);
    setSummary(nextSummary);
    setEntries(nextPage === 1 ? nextEntries.entries : (previous) => [...previous, ...nextEntries.entries]);
    setPage(nextPage);
    setTotalPages(nextEntries.meta.totalPages);
  }, []);

  useEffect(() => {
    let live = true;
    const saved = readSession();
    if (!saved) {
      setView("login");
      return;
    }
    void (async () => {
      try {
        const account = await currentAccount(saved.token);
        if (!isEligibleDiaryAccount(account)) throw new Error("This account cannot access the diary portal.");
        await loadLedger(saved.token);
        if (live) { setSession({ ...saved, account }); setView("ledger"); }
      } catch (cause) {
        clearSession();
        if (live) { setError(cause instanceof Error ? cause.message : "Sign in again."); setView("login"); }
      }
    })();
    return () => { live = false; };
  }, [loadLedger]);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizePhone(phoneInput);
    if (!normalized) { setError("Enter a valid 10 digit Indian mobile number."); return; }
    setBusy(true); setError("");
    try {
      await requestCode(normalized, role);
      setPhone(normalized);
      setView("code");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send the code."); }
    finally { setBusy(false); }
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setError("Enter the 6 digit code."); return; }
    setBusy(true); setError("");
    try {
      const nextSession = await verifyCode(phone, role, otp);
      if (!isEligibleDiaryAccount(nextSession.account) || nextSession.account.role !== role) {
        void logout(nextSession.token).catch(() => undefined);
        throw new Error("This account cannot access the diary portal.");
      }
      await loadLedger(nextSession.token);
      saveSession(nextSession);
      setSession(nextSession);
      setView("ledger");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not verify the code."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    const token = session?.token;
    clearSession(); setSession(null); setSummary(null); setEntries([]); setOtp(""); setView("login"); setError("");
    if (token) void logout(token).catch(() => undefined);
  }

  async function loadMore() {
    if (!session || busy) return;
    setBusy(true); setError("");
    try { await loadLedger(session.token, page + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load more entries."); }
    finally { setBusy(false); }
  }

  return <div className="site-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">N<span>·</span></span><span>NexaShopping <strong>Diary</strong></span></div>
      {view === "ledger" && <button className="text-button" onClick={signOut}>Sign out</button>}
    </header>
    {view === "loading" && <main className="loading-state" role="status">Opening your cash record…</main>}
    {(view === "login" || view === "code") && <main className="auth-layout">
      <section className="auth-intro">
        <div className="section-kicker"><span className="kicker-line" /> PERSONAL CASH RECORD</div>
        <h1>Every cash entry,<br /><em>clearly recorded.</em></h1>
        <p>View cash entries recorded for your account. Only approved entries appear in your total.</p>
        <div className="auth-footnote">For existing NexaShopping customers and distributors only. No registration is available here.</div>
      </section>
      <section className="auth-card" aria-labelledby="sign-in-heading">
        <div className="card-index">YOUR ACCESS <span>01 / 02</span></div>
        <h2 id="sign-in-heading">{view === "login" ? "Sign in with your phone" : "Enter your code"}</h2>
        {view === "login" ? <form onSubmit={sendCode}>
          <label className="field-label" htmlFor="role">I am a</label>
          <select id="role" value={role} onChange={(event) => setRole(event.target.value as DiaryRole)}>
            <option value="CUSTOMER">Customer</option><option value="DISTRIBUTOR">Distributor</option>
          </select>
          <label className="field-label" htmlFor="phone">Mobile number</label>
          <div className="phone-field"><span>+91</span><input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} required /></div>
          {error && <ErrorNote message={error} />}
          <button className="primary-button" disabled={busy}>{busy ? "Sending code…" : "Send sign-in code"}<Arrow /></button>
        </form> : <form onSubmit={confirmCode}>
          <p className="code-hint">Enter the code sent to <strong>{phone}</strong>.</p>
          <label className="field-label" htmlFor="otp">One-time code</label>
          <input id="otp" className="otp-field" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} required />
          {error && <ErrorNote message={error} />}
          <button className="primary-button" disabled={busy}>{busy ? "Checking code…" : "Open my record"}<Arrow /></button>
          <button className="back-button" type="button" onClick={() => { setView("login"); setOtp(""); setError(""); }}>Change number</button>
        </form>}
        <p className="card-help">Your record is read only. Cash entries are created and reviewed by authorized staff.</p>
      </section>
    </main>}
    {view === "ledger" && summary && <main className="ledger-layout">
      <div className="ledger-heading"><div><div className="section-kicker"><span className="kicker-line" /> PERSONAL CASH RECORD</div><h1>Cash record</h1><p>For {summary.account.name || summary.account.phone || "your account"} · Updated when entries are approved</p></div><div className="read-only">READ ONLY <span aria-hidden="true">↗</span></div></div>
      <section className="total-panel" aria-labelledby="total-heading"><div><div className="eyebrow" id="total-heading">TOTAL APPROVED CASH ENTRIES</div><div className="total-amount">{formatInr(summary.approvedTotal)}</div><p>From {summary.approvedEntryCount} approved {summary.approvedEntryCount === 1 ? "entry" : "entries"}. Pending and rejected records are excluded.</p></div><div className="total-glyph" aria-hidden="true"><span>₹</span><span>✓</span></div></section>
      <div className="content-grid"><section className="entries-section" aria-labelledby="entries-heading"><div className="section-head"><div><div className="eyebrow">YOUR HISTORY</div><h2 id="entries-heading">Approved entries</h2></div><span className="ist-badge">Dates shown in IST</span></div>
        {entries.length === 0 ? <div className="empty-state"><div className="empty-icon" aria-hidden="true">↗</div><h3>No approved entries yet</h3><p>Once an entry is approved, it will appear here and be included in your total.</p></div> : <ol className="entry-list">{entries.map((entry) => <li className="entry" key={entry.id}><div className="entry-date"><span>{dateTime.format(new Date(entry.cashReceivedAt))}</span><small>CASH RECEIVED</small></div><div className="entry-detail"><strong>{entry.notes || "Cash received"}</strong><span>Ref. {entry.referenceCode}</span></div><div className="entry-amount">{formatInr(entry.amount)}</div></li>)}</ol>}
        {page < totalPages && <button className="more-button" onClick={loadMore} disabled={busy}>{busy ? "Loading…" : "Load more entries"}<Arrow /></button>}{error && <ErrorNote message={error} />}
      </section><aside className="reference-card"><div className="eyebrow">REFERENCE INFORMATION</div><h2>Plan reference</h2><div className="reference-value">{formatInr(summary.plan.monthlyReferenceAmount)} <span>/ month</span></div><p>{summary.plan.description}</p><div className="reference-divider" /><div className="reference-row"><span>Reference period</span><strong>{summary.plan.durationMonths / 12} years</strong></div><p className="reference-note">This reference does not record a payment, request a payment, or promise a return. Your cash record is the approved entries shown here.</p></aside></div>
    </main>}
    <footer className="footer"><span>NexaShopping Diary</span><span>Cash entry records · India Standard Time</span></footer>
  </div>;
}
