import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Users, BriefcaseBusiness, Plus, Search, RefreshCw,
  Pencil, Trash2, X, Check, ExternalLink, ShieldCheck, Clock3, Smartphone, MessageCircle
} from "lucide-react";
import { supabase, supabaseConfigured } from "./supabase";
import "./styles.css";

const emptyMember = {
  name: "", whatsapp: "", email: "", city: "", state: "", qualification: "",
  graduation_year: "", experience: "Fresher", skills: "", preferred_role: "",
  preferred_location: "", work_preference: "Any", job_type: "Full-time",
  membership_start: "", membership_expiry: "", status: "Active"
};

const emptyJob = {
  company: "", title: "", category: "", location: "", work_mode: "",
  experience: "", qualification: "", skills: "", salary: "", source: "",
  source_url: "", application_url: "", posted_date: "", deadline: "",
  verification_status: "Unverified", status: "Active"
};

const demoMembers = [
  { id: "demo-m1", name: "Demo Member", whatsapp: "9999999999", email: "demo@example.com", city: "Bareilly", state: "Uttar Pradesh", qualification: "BCA", graduation_year: 2026, experience: "Fresher", skills: "HTML, CSS, JavaScript, React", preferred_role: "Frontend Developer", preferred_location: "India", work_preference: "Remote / Hybrid", job_type: "Full-time", membership_start: "2026-09-01", membership_expiry: "2026-10-01", status: "Active" }
];
const demoJobs = [
  { id: "demo-j1", company: "Demo Technologies", title: "Junior Frontend Developer", category: "IT / Software", location: "Noida", work_mode: "Hybrid", experience: "Fresher / 0-1 year", qualification: "BCA / B.Tech", skills: "React, JavaScript, HTML, CSS", salary: "Not disclosed", source: "Demo", source_url: "https://example.com", application_url: "https://example.com", posted_date: "2026-09-20", deadline: "2026-10-15", verification_status: "Unverified", status: "Active" }
];

function today() { return new Date().toISOString().slice(0, 10); }
function isExpired(date) { return date && date < today(); }
function csv(value) { return String(value || "").split(/[,|/]+/).map(x => x.trim()).filter(Boolean); }

function score(member, job) {
  const text = `${job.title} ${job.skills} ${job.location} ${job.work_mode} ${job.experience} ${job.qualification}`.toLowerCase();
  let s = 0;
  if (member.preferred_role && text.includes(member.preferred_role.toLowerCase())) s += 40;
  const hits = csv(member.skills).filter(x => x.length > 1 && text.includes(x.toLowerCase()));
  s += Math.min(35, hits.length * 7);
  if (member.preferred_location && text.includes(member.preferred_location.toLowerCase())) s += 15;
  if (/fresher/i.test(member.experience || "") && /fresh|0-1|entry/i.test(job.experience || "")) s += 10;
  return { score: Math.min(100, s), hits };
}

async function getData() {
  if (!supabaseConfigured) return { members: demoMembers, jobs: demoJobs, demo: true };
  const [m, j] = await Promise.all([
    supabase.from("members").select("*").order("created_at", { ascending: false }),
    supabase.from("jobs").select("*").order("discovered_at", { ascending: false })
  ]);
  if (m.error) throw m.error;
  if (j.error) throw j.error;
  return { members: m.data || [], jobs: j.data || [], demo: false };
}


const MEMBER_SIGNUP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-signup`;
const MEMBER_SIGNUP_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const emptySignup = {
  name: "",
  whatsapp: "",
  email: "",
  city: "",
  state: "",
  qualification: "",
  graduation_year: "",
  experience: "Fresher",
  skills: "",
  preferred_role: "",
  preferred_location: "",
  work_preference: "Any",
  job_type: "Full-time"
};

function MemberSignupPage() {
  const [form, setForm] = useState(emptySignup);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setError("");

    const cleanWhatsapp = String(form.whatsapp).replace(/\D/g, "");

    if (!form.name.trim()) return setError("Please enter your name.");
    if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 15) {
      return setError("Please enter a valid WhatsApp number.");
    }
    if (!form.email.trim()) return setError("Please enter your email.");
    if (!form.preferred_role.trim()) return setError("Please enter your preferred job role.");

    if (!MEMBER_SIGNUP_URL || !MEMBER_SIGNUP_KEY) {
      return setError("Signup service is not configured. Please try again later.");
    }

    setBusy(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(MEMBER_SIGNUP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: MEMBER_SIGNUP_KEY
        },
        signal: controller.signal,
        body: JSON.stringify({
          ...form,
          whatsapp: cleanWhatsapp,
          graduation_year: form.graduation_year || null,
          client_request_id: crypto.randomUUID()
        })
      });

      const raw = await response.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("The signup service returned an unexpected response.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not submit your application.");
      }

      setSuccess({ ...data, name: form.name.trim() });
      setForm(emptySignup);
    } catch (err) {
      if (err?.name === "AbortError") {
        setError("The server is taking longer than usual. Please wait a moment and try again.");
      } else if (!navigator.onLine) {
        setError("Your internet connection dropped. Please reconnect and try again.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setBusy(false);
    }
  }

  if (success) {
    const whatsappText = encodeURIComponent(
      `Hi Naukri Spot,

I have submitted my membership application.

Application ID: ${success.member_id}
Name: ${success.name || "Member"}

I want to activate my ₹49 / 30 days membership.
I will send my payment proof here.`
    );
    const whatsappUrl = `https://wa.me/919368125502?text=${whatsappText}`;
    const upiUrl = `upi://pay?pa=naukrispot@upi&pn=${encodeURIComponent("Naukri Spot")}&am=49&cu=INR`;

    return (
      <div className="joinShell">
        <div className="joinNav">
          <div className="logo">NAUKRI<span>SPOT</span></div>
          <span className="joinNavTag">MEMBER APPLICATION</span>
        </div>

        <main className="joinSuccess">
          <div className="successMark"><Check size={26}/></div>
          <div className="joinEyebrow">APPLICATION RECEIVED</div>
          <h1>One last step.</h1>
          <p>
            Your application is received. Your membership stays <strong>Pending</strong>
            until the ₹49 payment is manually verified.
          </p>

          <div className="memberIdCard">
            <span>YOUR APPLICATION ID</span>
            <strong>{success.member_id}</strong>
          </div>

          <div className="paymentCard">
            <div className="paymentTop">
              <div>
                <span>MEMBERSHIP</span>
                <h2>₹49 <small>/ 30 days</small></h2>
              </div>
              <div className="pendingBadge">PENDING</div>
            </div>

            <div className="paymentSteps">
              <div><span>01</span><div><b>Pay ₹49</b><small>Send ₹49 to <strong>naukrispot@upi</strong> using any UPI app.</small></div></div>
              <div><span>02</span><div><b>Open WhatsApp</b><small>Use the button below and send your payment screenshot or UTR.</small></div></div>
              <div><span>03</span><div><b>Get activated</b><small>We verify the payment manually and activate your membership.</small></div></div>
            </div>

            <a className="upiPayButton" href={upiUrl}>
              <Smartphone size={17}/>
              Pay ₹49 via UPI
            </a>

            <div className="upiIdBox">
              <div><span>UPI ID</span><strong>naukrispot@upi</strong></div>
              <button type="button" onClick={() => navigator.clipboard?.writeText("naukrispot@upi")}>Copy</button>
            </div>

            <a className="whatsappPayButton" href={whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={18}/>
              Send payment proof on WhatsApp
              <ExternalLink size={15}/>
            </a>

            <p className="paymentHint">
              Please mention your Application ID <strong>{success.member_id}</strong> when sending the proof.
            </p>
          </div>

          <div className="successSteps">
            <div><span>01</span><b>Application received</b><small>Done</small></div>
            <div><span>02</span><b>₹49 payment verification</b><small>Pending</small></div>
            <div><span>03</span><b>Membership activation</b><small>After verification</small></div>
          </div>

          <button className="joinSecondary" onClick={() => setSuccess(null)}>
            Submit another application
          </button>
        </main>

        <footer className="joinFooter">
          Naukri Spot · Private job assistance for students & freshers
        </footer>
      </div>
    );
  }

  return (
    <div className="joinShell">
      <div className="joinNav">
        <div className="logo">NAUKRI<span>SPOT</span></div>
        <span className="joinNavTag">FOR STUDENTS & FRESHERS</span>
      </div>

      <main className="joinMain">
        <section className="joinHero">
          <div className="joinEyebrow">PRIVATE JOB ASSISTANCE</div>
          <h1>Tell us what<br/><span>you’re looking for.</span></h1>
          <p>
            Build your profile once. We’ll use it to understand the kind of
            private jobs that may be relevant to you.
          </p>
          <div className="joinProofRow">
            <span><Check size={14}/> India-wide private jobs</span>
            <span><Check size={14}/> Student & fresher focused</span>
            <span><Check size={14}/> No placement guarantee</span>
          </div>
        </section>

        <section className="joinCard">
          <div className="joinCardHead">
            <div>
              <span>01 / PROFILE</span>
              <h2>Your details</h2>
            </div>
            <small>All fields help us match you better.</small>
          </div>

          {error && (
            <div className="joinAlert">
              <X size={16}/>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="joinForm">
            <div className="joinSectionLabel">CONTACT</div>
            <div className="joinGrid">
              <JoinInput label="Full name *" value={form.name} onChange={v => set("name", v)} placeholder="Your name"/>
              <JoinInput label="WhatsApp number *" value={form.whatsapp} onChange={v => set("whatsapp", v)} placeholder="10-digit number" type="tel"/>
              <JoinInput label="Email *" value={form.email} onChange={v => set("email", v)} placeholder="you@example.com" type="email"/>
              <JoinInput label="City" value={form.city} onChange={v => set("city", v)} placeholder="e.g. Bareilly"/>
              <JoinInput label="State" value={form.state} onChange={v => set("state", v)} placeholder="e.g. Uttar Pradesh"/>
            </div>

            <div className="joinSectionLabel">EDUCATION & EXPERIENCE</div>
            <div className="joinGrid">
              <JoinInput label="Qualification" value={form.qualification} onChange={v => set("qualification", v)} placeholder="e.g. BCA, B.Com, B.Tech"/>
              <JoinInput label="Graduation year" value={form.graduation_year} onChange={v => set("graduation_year", v)} placeholder="e.g. 2026" type="number"/>
              <JoinInput label="Experience" value={form.experience} onChange={v => set("experience", v)} placeholder="Fresher / 1 year"/>
              <JoinInput label="Skills" value={form.skills} onChange={v => set("skills", v)} placeholder="e.g. Excel, JavaScript, Sales"/>
            </div>

            <div className="joinSectionLabel">JOB PREFERENCES</div>
            <div className="joinGrid">
              <JoinInput label="Preferred job role *" value={form.preferred_role} onChange={v => set("preferred_role", v)} placeholder="e.g. Web Developer"/>
              <JoinInput label="Preferred location" value={form.preferred_location} onChange={v => set("preferred_location", v)} placeholder="e.g. Delhi NCR / India"/>
              <JoinInput label="Work preference" value={form.work_preference} onChange={v => set("work_preference", v)} placeholder="Remote / Hybrid / Office"/>
              <JoinInput label="Job type" value={form.job_type} onChange={v => set("job_type", v)} placeholder="Full-time / Part-time"/>
            </div>

            <div className="joinNote">
              <ShieldCheck size={17}/>
              <p>
                Your application is stored privately in our member system.
                Submitting this form does <strong>not</strong> activate a paid
                membership or guarantee a job.
              </p>
            </div>

            <button className="joinSubmit" disabled={busy}>
              {busy ? (
                <>
                  <span className="joinSpinner" aria-hidden="true" />
                  Submitting securely...
                </>
              ) : (
                <>
                  Continue with application
                  <ExternalLink size={17}/>
                </>
              )}
            </button>
          </form>
        </section>
      </main>

      <footer className="joinFooter">
        Naukri Spot · Private job assistance for students & freshers
      </footer>
    </div>
  );
}

function JoinInput({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="joinInput">
      <span>{label}</span>
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? "1950" : undefined}
        max={type === "number" ? "2100" : undefined}
      />
    </label>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return <div className="loginShell">
    <div className="loginCard">
      <div className="logo loginLogo">NAUKRI<span>SPOT</span></div>
      <div className="sideLabel">PRIVATE ADMIN</div>
      <h1>Sign in</h1>
      <p className="loginCopy">Admin access only. Your member and job data stays behind authentication.</p>
      {error && <div className="alert"><X size={16}/>{error}</div>}
      <form onSubmit={signIn} className="form loginForm">
        <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="admin@example.com"/>
        <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="Your password"/>
        <button className="primary loginButton" disabled={busy || !email || !password}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  </div>;
}

function App() {
  const [tab, setTab] = useState("overview");
  const [members, setMembers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [editingMember, setEditingMember] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    try { const d = await getData(); setMembers(d.members); setJobs(d.jobs); setDemo(d.demo); }
    catch (e) { setError(e.message || "Could not load data."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let mounted = true;
    if (!supabaseConfigured) {
      setAuthLoading(false);
      load();
      return () => { mounted = false; };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setAuthLoading(false);
      if (data.session) load();
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession) load();
      else { setMembers([]); setJobs([]); setLoading(false); }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Keep this hook above the conditional returns below.
  // Otherwise React sees a different hook order after login and throws error #310.
  const stats = useMemo(() => ({
    members: members.length,
    active: members.filter(x => x.status === "Active" && !isExpired(x.membership_expiry)).length,
    jobs: jobs.filter(x => x.status === "Active" && !isExpired(x.deadline)).length,
    review: jobs.filter(x => x.verification_status !== "Verified" && x.status === "Active").length,
    expired: jobs.filter(x => isExpired(x.deadline)).length
  }), [members, jobs]);

  if (authLoading) return <div className="loginShell"><div className="loginCard loadingCard">Checking admin session...</div></div>;
  if (supabaseConfigured && !session) return <LoginScreen />;

  const filteredMembers = members.filter(m => `${m.name} ${m.email} ${m.preferred_role} ${m.city}`.toLowerCase().includes(memberSearch.toLowerCase()));
  const filteredJobs = jobs.filter(j => `${j.title} ${j.company} ${j.location} ${j.skills}`.toLowerCase().includes(jobSearch.toLowerCase()));

  function openNewMember() { setEditingMember(null); setMemberForm({...emptyMember, membership_start: today(), membership_expiry: today()}); }
  function openNewJob() { setEditingJob(null); setJobForm({...emptyJob, posted_date: today()}); }
  function editMember(m) { setEditingMember(m.id); setMemberForm({...emptyMember, ...m, graduation_year: m.graduation_year || ""}); setTab("members"); }
  function editJob(j) { setEditingJob(j.id); setJobForm({...emptyJob, ...j}); setTab("jobs"); }

  async function saveMember(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (!supabaseConfigured) {
        const item = { ...memberForm, id: editingMember || `demo-${Date.now()}` };
        setMembers(v => editingMember ? v.map(x => x.id === editingMember ? item : x) : [item, ...v]);
      } else {
        const payload = {...memberForm, graduation_year: memberForm.graduation_year ? Number(memberForm.graduation_year) : null};
        const result = editingMember ? await supabase.from("members").update(payload).eq("id", editingMember) : await supabase.from("members").insert(payload);
        if (result.error) throw result.error;
        await load();
      }
      setMemberForm(emptyMember); setEditingMember(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function saveJob(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (!supabaseConfigured) {
        const item = { ...jobForm, id: editingJob || `demo-${Date.now()}` };
        setJobs(v => editingJob ? v.map(x => x.id === editingJob ? item : x) : [item, ...v]);
      } else {
        const result = editingJob ? await supabase.from("jobs").update(jobForm).eq("id", editingJob) : await supabase.from("jobs").insert(jobForm);
        if (result.error) throw result.error;
        await load();
      }
      setJobForm(emptyJob); setEditingJob(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function remove(table, id) {
    if (!window.confirm("Delete this record?")) return;
    try {
      if (!supabaseConfigured) {
        table === "members" ? setMembers(v => v.filter(x => x.id !== id)) : setJobs(v => v.filter(x => x.id !== id));
      } else {
        const result = await supabase.from(table).delete().eq("id", id);
        if (result.error) throw result.error;
        await load();
      }
    } catch (e) { setError(e.message); }
  }

  const selected = members.find(m => m.id === selectedMember);
  const matches = selected ? jobs.map(j => ({j, ...score(selected, j)})).filter(x => x.score > 0 && x.j.status === "Active" && !isExpired(x.j.deadline)).sort((a,b) => b.score - a.score) : [];

  return <div className="shell">
    <aside className="sidebar">
      <div className="logo">NAUKRI<span>SPOT</span></div>
      <div className="sideLabel">PRIVATE ADMIN</div>
      <nav>
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard/> Overview</button>
        <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}><Users/> Members</button>
        <button className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}><BriefcaseBusiness/> Jobs</button>
        <button className={tab === "match" ? "active" : ""} onClick={() => setTab("match")}><ShieldCheck/> Match review</button>
      </nav>
      <div className="sideBottom"><span className={supabaseConfigured ? "dot green" : "dot"}></span>{supabaseConfigured ? "Supabase connected" : "Demo mode"}{session?.user?.email && <small className="sideEmail">{session.user.email}</small>}</div>
    </aside>

    <main className="main">
      <header className="top"><div><div className="crumb">NAUKRI SPOT / ADMIN</div><h1>{tab === "overview" ? "Control room" : tab === "members" ? "Members" : tab === "jobs" ? "Jobs" : "Match review"}</h1></div><div className="topActions"><button className="ghost" onClick={load}><RefreshCw size={15}/> Refresh</button>{session && <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>}</div></header>
      {error && <div className="alert"><X size={16}/>{error}</div>}
      {demo && <div className="demoBanner">Demo mode is active. Your real Supabase database is not being changed.</div>}

      {tab === "overview" && <section>
        <div className="hero"><div><div className="eyebrow">OPERATIONS</div><h2>Keep every job and member<br/><span>clean, current and reviewable.</span></h2><p>One private workspace for the core Naukri Spot workflow. No placement promises, no automatic publishing.</p></div></div>
        <div className="statGrid"><Stat label="Total members" value={stats.members}/><Stat label="Active members" value={stats.active}/><Stat label="Active jobs" value={stats.jobs}/><Stat label="Need verification" value={stats.review}/></div>
        <div className="overviewGrid"><div className="card"><div className="cardHead"><div><b>Workflow</b><small>Current operating model</small></div></div><div className="flow"><Flow n="01" t="Member added"/><Flow n="02" t="Job collected"/><Flow n="03" t="Original listing checked"/><Flow n="04" t="Match reviewed"/><Flow n="05" t="Share manually"/></div></div><div className="card"><div className="cardHead"><div><b>Data rules</b><small>Keep the database trustworthy</small></div></div><ul className="rules"><li>Discovery is not verification.</li><li>Never invent salary, deadline or vacancies.</li><li>Keep source URL and application URL separate.</li><li>Review before sharing a vacancy.</li></ul></div></div>
      </section>}

      {tab === "members" && <section><div className="sectionBar"><div><b>Member database</b><small>{members.length} records</small></div><button className="primary" onClick={openNewMember}><Plus size={16}/> Add member</button></div><div className="toolbar"><div className="search"><Search size={15}/><input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Search name, role, city..."/></div></div><div className="tableWrap"><table><thead><tr><th>Member</th><th>Contact</th><th>Profile</th><th>Membership</th><th>Status</th><th></th></tr></thead><tbody>{filteredMembers.map(m=><tr key={m.id}><td><b>{m.name}</b><small>{m.qualification || "Qualification not set"}</small></td><td><span>{m.whatsapp || "No WhatsApp"}</span><small>{m.email || "No email"}</small></td><td><span>{m.preferred_role || "Role not set"}</span><small>{m.city || ""}{m.state ? `, ${m.state}` : ""}</small></td><td><span>{m.membership_start || "-"}</span><small>expires {m.membership_expiry || "-"}</small></td><td><Badge text={m.status}/></td><td className="actions"><button onClick={()=>editMember(m)}><Pencil size={14}/></button><button onClick={()=>remove("members",m.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div><Modal open={editingMember !== null || memberForm.name !== ""} title={editingMember ? "Edit member" : "Add member"} close={()=>{setEditingMember(null);setMemberForm(emptyMember)}}><MemberForm value={memberForm} setValue={setMemberForm} save={saveMember} busy={busy}/></Modal></section>}

      {tab === "jobs" && <section><div className="sectionBar"><div><b>Job database</b><small>{jobs.length} records</small></div><button className="primary" onClick={openNewJob}><Plus size={16}/> Add job</button></div><div className="toolbar"><div className="search"><Search size={15}/><input value={jobSearch} onChange={e=>setJobSearch(e.target.value)} placeholder="Search company, title, skill..."/></div></div><div className="tableWrap"><table><thead><tr><th>Job</th><th>Location</th><th>Experience</th><th>Deadline</th><th>Verification</th><th>Status</th><th></th></tr></thead><tbody>{filteredJobs.map(j=><tr key={j.id}><td><b>{j.title}</b><small>{j.company}</small></td><td><span>{j.location || "Not disclosed"}</span><small>{j.work_mode || "Work mode not set"}</small></td><td>{j.experience || "Not disclosed"}</td><td>{j.deadline || "Not disclosed"}{isExpired(j.deadline) && <small className="danger">Expired</small>}</td><td><Badge text={j.verification_status}/></td><td><Badge text={j.status}/></td><td className="actions"><button onClick={()=>editJob(j)}><Pencil size={14}/></button><button onClick={()=>window.open(j.application_url || j.source_url, "_blank")}><ExternalLink size={14}/></button><button onClick={()=>remove("jobs",j.id)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div><Modal open={editingJob !== null || jobForm.title !== ""} title={editingJob ? "Edit job" : "Add job"} close={()=>{setEditingJob(null);setJobForm(emptyJob)}}><JobForm value={jobForm} setValue={setJobForm} save={saveJob} busy={busy}/></Modal></section>}

      {tab === "match" && <section><div className="sectionBar"><div><b>Match review</b><small>Internal relevance only</small></div></div><div className="matchSelect"><select value={selectedMember} onChange={e=>setSelectedMember(e.target.value)}><option value="">Select a member</option>{members.map(m=><option value={m.id} key={m.id}>{m.name} · {m.preferred_role || "Profile"}</option>)}</select></div>{selected ? <div className="matchGrid">{matches.length ? matches.map(({j,score:sc,hits})=><article className="matchCard" key={j.id}><div><div className="matchScore">{sc}%</div><h3>{j.title}</h3><b>{j.company}</b><p>{j.location || "Location not disclosed"} · {j.work_mode || "Work mode not disclosed"}</p><small>Skills matched: {hits.join(", ") || "basic profile match"}</small></div><a href={j.application_url || j.source_url} target="_blank" rel="noreferrer">Open listing <ExternalLink size={14}/></a></article>) : <div className="empty">No current matches for this member.</div>}</div> : <div className="empty">Select a member to review matches.</div>}</section>}
    </main>
  </div>
}

function Stat({label,value}) { return <div className="stat"><small>{label}</small><strong>{value}</strong></div> }
function Flow({n,t}) { return <div className="flowItem"><span>{n}</span><b>{t}</b></div> }
function Badge({text}) { const t=String(text||"Unknown"); const cls=t.toLowerCase().includes("verif") || t.toLowerCase()==="active" ? "ok" : t.toLowerCase().includes("unver") || t.toLowerCase().includes("expired") ? "warn" : "neutral"; return <span className={`badge ${cls}`}>{t}</span> }
function Modal({open,title,close,children}) { if(!open) return null; return <div className="overlay"><div className="modal"><div className="modalHead"><h2>{title}</h2><button onClick={close}><X/></button></div>{children}</div></div> }
function Input({label,value,onChange,type="text",placeholder=""}) { return <label><span>{label}</span><input type={type} value={value || ""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label> }
function MemberForm({value,setValue,save,busy}) { const set=(k,v)=>setValue({...value,[k]:v}); return <form onSubmit={save} className="form"><div className="formGrid"><Input label="Name *" value={value.name} onChange={v=>set("name",v)}/><Input label="WhatsApp" value={value.whatsapp} onChange={v=>set("whatsapp",v)}/><Input label="Email" value={value.email} onChange={v=>set("email",v)} type="email"/><Input label="City" value={value.city} onChange={v=>set("city",v)}/><Input label="State" value={value.state} onChange={v=>set("state",v)}/><Input label="Qualification" value={value.qualification} onChange={v=>set("qualification",v)}/><Input label="Graduation year" value={value.graduation_year} onChange={v=>set("graduation_year",v)} type="number"/><Input label="Experience" value={value.experience} onChange={v=>set("experience",v)}/><Input label="Skills" value={value.skills} onChange={v=>set("skills",v)} placeholder="React, JavaScript, HTML"/><Input label="Preferred role" value={value.preferred_role} onChange={v=>set("preferred_role",v)}/><Input label="Preferred location" value={value.preferred_location} onChange={v=>set("preferred_location",v)}/><Input label="Work preference" value={value.work_preference} onChange={v=>set("work_preference",v)}/><Input label="Job type" value={value.job_type} onChange={v=>set("job_type",v)}/><Input label="Membership start" value={value.membership_start} onChange={v=>set("membership_start",v)} type="date"/><Input label="Membership expiry" value={value.membership_expiry} onChange={v=>set("membership_expiry",v)} type="date"/><label><span>Status</span><select value={value.status} onChange={e=>set("status",e.target.value)}><option>Active</option><option>Expired</option><option>Paused</option></select></label></div><button className="primary" disabled={busy}><Check size={16}/> {busy ? "Saving..." : "Save member"}</button></form> }
function JobForm({value,setValue,save,busy}) { const set=(k,v)=>setValue({...value,[k]:v}); return <form onSubmit={save} className="form"><div className="formGrid"><Input label="Company *" value={value.company} onChange={v=>set("company",v)}/><Input label="Job title *" value={value.title} onChange={v=>set("title",v)}/><Input label="Category" value={value.category} onChange={v=>set("category",v)}/><Input label="Location" value={value.location} onChange={v=>set("location",v)}/><Input label="Work mode" value={value.work_mode} onChange={v=>set("work_mode",v)}/><Input label="Experience" value={value.experience} onChange={v=>set("experience",v)}/><Input label="Qualification" value={value.qualification} onChange={v=>set("qualification",v)}/><Input label="Skills" value={value.skills} onChange={v=>set("skills",v)}/><Input label="Salary" value={value.salary} onChange={v=>set("salary",v)}/><Input label="Source name" value={value.source} onChange={v=>set("source",v)}/><Input label="Source URL" value={value.source_url} onChange={v=>set("source_url",v)} type="url"/><Input label="Application URL" value={value.application_url} onChange={v=>set("application_url",v)} type="url"/><Input label="Posted date" value={value.posted_date} onChange={v=>set("posted_date",v)} type="date"/><Input label="Deadline" value={value.deadline} onChange={v=>set("deadline",v)} type="date"/><label><span>Verification</span><select value={value.verification_status} onChange={e=>set("verification_status",e.target.value)}><option>Unverified</option><option>Verified</option><option>Needs review</option></select></label><label><span>Status</span><select value={value.status} onChange={e=>set("status",e.target.value)}><option>Active</option><option>Expired</option><option>Removed</option></select></label></div><button className="primary" disabled={busy}><Check size={16}/> {busy ? "Saving..." : "Save job"}</button></form> }


const isJoinPage = window.location.pathname.replace(/\/+$/, "") === "/join";

createRoot(document.getElementById("root")).render(
  isJoinPage ? <MemberSignupPage /> : <App />
);

