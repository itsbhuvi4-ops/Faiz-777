import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronLeft, Copy, ExternalLink, Flame, LoaderCircle, LockKeyhole, Menu, MessageCircle, Play, Search, ShieldCheck, Trophy, Users, X } from 'lucide-react'
import { isConfigured, supabase } from './lib/supabase'
import './style.css'

const YOUTUBE = 'https://youtube.com/@faiz777gaming-n8i?si=gZdpJ1OVehVuaKoE'
const roles = ['Rusher', 'Sniper', 'Support', 'IGL']
const matchRules = ['𝗡𝗢 𝗥𝗢𝗢𝗙', '𝗡𝗢 𝗣𝗔𝗡𝗘𝗟', '𝗡𝗢 𝗪𝗔𝗟𝗟 𝗕𝗥𝗘𝗔𝗞', '𝗡𝗢 𝗧𝗘𝗔𝗠 𝗨𝗣', '𝗢𝗡𝗟𝗬 𝗙𝗔𝗖𝗘 𝗧𝗢 𝗙𝗔𝗖𝗘', '𝗡𝗢 𝗪𝗔𝗟𝗟 𝗕𝗥𝗘𝗔𝗞', '𝗡𝗢 𝗭𝗢𝗡𝗘 𝗕𝗥𝗘𝗔𝗞']
const blankForm = { full_name: '', ign: '', uid: '', age: '', state: '', district: '', country: '', role: '', whatsapp: '', instagram: '', reason: '', rules_accepted: false }

function Brand() { return <Link className="brand" to="/"><span>F</span> FAIZ <i>777</i></Link> }
function YoutubeButton({ children = 'WATCH ON YOUTUBE', className = '' }) { return <a className={`btn lime ${className}`} href={YOUTUBE} target="_blank" rel="noreferrer"><Play size={16} fill="currentColor" />{children}</a> }
function Spinner({ label = 'Loading...' }) { return <div className="loading"><LoaderCircle className="spin" /> {label}</div> }
function StatusBadge({ status }) { return <span className={`badge ${status?.replace(' ', '-')}`}>{status?.replace('_', ' ')}</span> }

function Navbar() {
  const [open, setOpen] = useState(false)
  const links = [['HOME', '/'], ['RECRUITMENT', '/recruitment'], ['RULES', '/rules'], ['MATCHES', '/matches'], ['MEMBERS', '/members'], ['APPLICATION STATUS', '/status']]
  return <header className="navbar"><Brand /><nav className={open ? 'navlinks open' : 'navlinks'}>{links.map(([name, path]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)}>{name}</NavLink>)}</nav><div className="navright"><Link className="admin" to="/admin">ADMIN</Link><YoutubeButton className="navwatch">WATCH YOUTUBE</YoutubeButton><button className="menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></header>
}
function Footer() { return <footer><div><Brand /><p>FREE FIRE GUILD</p><strong>PLAY HARD • STAY ACTIVE • DOMINATE</strong></div><div className="footerlinks"><Link to="/">Home</Link><Link to="/recruitment">Recruitment</Link><Link to="/rules">Rules</Link><Link to="/matches">Matches</Link><Link to="/members">Members</Link><Link to="/status">Application Status</Link></div><div className="social"><a href={YOUTUBE} target="_blank" rel="noreferrer"><Play /> YouTube</a><span>Instagram</span><span>WhatsApp</span></div><small>© 2026 FAIZ 777. All rights reserved.<br />FAIZ 777 is an independent gaming community and is not affiliated with Garena.</small></footer> }
function Layout({ children }) { return <><Navbar /><main>{children}</main><Footer /></> }

function LeaderboardPreview() {
  const [results, setResults] = useState([])
  useEffect(() => {
    if (isConfigured) {
      supabase.from('match_results').select('ign,position,kills,points,is_winner').order('points', { ascending: false }).order('kills', { ascending: false }).limit(5).then(({ data }) => setResults(data || []))
    }
  }, [])
  return <section className="leaderboard-section"><p className="eyebrow">03 / ROOM MATCH RESULTS</p><div className="leaderboard-title"><div><h2>PLAYER <em>LEADERBOARD.</em></h2><p>Official results published by the FAIZ 777 admin team.</p></div><Trophy /></div>{results.length ? <div className="leaderboard-list">{results.map((entry, index) => <article key={`${entry.ign}-${index}`} className={entry.is_winner ? 'winner' : ''}><strong>#{entry.position || index + 1}</strong><span>{entry.ign}{entry.is_winner && <small> WINNER</small>}</span><b>{entry.points} PTS</b><i>{entry.kills} KILLS</i></article>)}</div> : <div className="empty"><Trophy />Results will appear here after the room match.</div>}</section>
}

function SelectedRecruitsLive() {
  const [selectedList, setSelectedList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSelected = async () => {
    if (!supabase) return
    try {
      // Fetch selected applications
      const { data: apps } = await supabase
        .from('applications')
        .select('id,application_id,ign,uid,role,status,created_at')
        .eq('status', 'selected')
        .order('created_at', { ascending: false })
        .limit(8)
      
      if (apps && apps.length > 0) {
        setSelectedList(apps)
      } else {
        // Fallback to active members list if applications table is empty
        const { data: mems } = await supabase
          .from('members')
          .select('id,ign,uid,role,member_since')
          .eq('active', true)
          .order('member_since', { ascending: false })
          .limit(8)
        
        if (mems) {
          setSelectedList(mems.map(m => ({ ...m, status: 'selected', application_id: 'MEMBER' })))
        }
      }
    } catch (e) {
      console.warn('Realtime fetch note:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSelected()
    // 5-second polling interval so all users on mobile see changes live when admin selects or rejects
    const interval = setInterval(fetchSelected, 5000)

    // Supabase Realtime channel subscription
    let channel = null
    if (supabase) {
      try {
        channel = supabase.channel('home_realtime_applications')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
            fetchSelected()
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
            fetchSelected()
          })
          .subscribe()
      } catch (e) {}
    }

    return () => {
      clearInterval(interval)
      if (channel) supabase?.removeChannel(channel)
    }
  }, [])

  return (
    <section className="selected-recruits-section">
      <div className="section-head">
        <div>
          <div className="live-pill"><span className="pulse-dot"></span> LIVE GUILD SELECTIONS</div>
          <h2 className="section-title">SELECTED <em>WARRIORS.</em></h2>
          <p className="section-desc">Approved recruits selected by Admin Bhuvi to join the official FAIZ 777 Free Fire roster.</p>
        </div>
        <Link to="/members" className="btn outline">VIEW FULL ROSTER <ArrowRight size={14} /></Link>
      </div>

      {loading && !selectedList.length ? (
        <Spinner label="Syncing selected recruits..." />
      ) : selectedList.length > 0 ? (
        <div className="selected-grid">
          {selectedList.map((player, idx) => (
            <motion.article 
              key={player.id || idx} 
              className="selected-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="selected-card-top">
                <span className="badge selected">SELECTED</span>
                <span className="role-tag">{player.role || 'Rusher'}</span>
              </div>
              <div className="selected-avatar">
                <span>{player.ign?.slice(0, 1) || 'F'}</span>
              </div>
              <h3>FZ • {player.ign}</h3>
              <p className="uid-text">UID: {player.uid}</p>
              <div className="selected-footer">
                <small>GUILD RECRUIT</small>
                <span className="status-indicator">✓ VERIFIED</span>
              </div>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <ShieldCheck size={36} />
          <strong>Admin is reviewing ongoing applications.</strong>
          <p>Selected applicants will be broadcasted live right here.</p>
          <Link to="/recruitment" className="btn lime" style={{ marginTop: '10px' }}>APPLY FOR SELECTION</Link>
        </div>
      )}
    </section>
  )
}

function Home() {
  const [applicant, setApplicant] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('faiz_registered_applicant'))
    } catch (e) {
      return null
    }
  })
  const [liveStatus, setLiveStatus] = useState(null)
  const [whatsappLink, setWhatsappLink] = useState(() => localStorage.getItem('faiz_whatsapp_group') || 'https://chat.whatsapp.com/')

  useEffect(() => {
    if (isConfigured) {
      supabase.from('settings').select('whatsapp_url').eq('id', 1).maybeSingle().then(({ data }) => {
        if (data?.whatsapp_url) {
          setWhatsappLink(data.whatsapp_url)
          localStorage.setItem('faiz_whatsapp_group', data.whatsapp_url)
        }
      })

      if (applicant?.applicationId) {
        const fetchStatus = async () => {
          const { data, error } = await supabase.rpc('get_application_status', { lookup_id: applicant.applicationId.toUpperCase() })
          if (!error && data && data.length > 0) {
            setLiveStatus(data[0])
          } else if (error || !data || data.length === 0) {
            // Application might have been deleted by admin
            localStorage.removeItem('faiz_registered_applicant')
            setApplicant(null)
            setLiveStatus(null)
          }
        }
        fetchStatus()
        const interval = setInterval(fetchStatus, 6000)
        return () => clearInterval(interval)
      }
    }
  }, [applicant?.applicationId])

  return (
    <Layout>
      <>
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-art" />
          <motion.div className="hero-copy" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .6 }}>
            <p className="eyebrow">— OFFICIAL FAIZ 777</p>
            <h1>FAIZ<br /><em>777</em></h1>
            <p className="hero-role">GAMING CREATOR <b>•</b> GUILD BUILDER <b>•</b> COMPETITOR</p>
            <p className="lede">High-octane gameplay, no-filter moments and a community built to play bigger.</p>
            <div className="actions">
              <YoutubeButton />
              <Link className="btn outline" to="/recruitment">JOIN FAIZ 777 <ArrowRight size={16} /></Link>
            </div>
            <div className="recruit-cta">
              <span>FAIZ 777 GUILD RECRUITMENT</span>
              <Link to="/recruitment">JOIN THE GUILD <ArrowRight size={14} /></Link>
            </div>
          </motion.div>
          <motion.aside className="live-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35 }}>
            <small>LIVE STREAM</small>
            <strong>FAIZ 777</strong>
            <span>ADMIN-SCHEDULED ROOM MATCH</span>
          </motion.aside>
          <div className="scroll">SCROLL TO EXPLORE ↓</div>
        </section>

        {/* Personalized Registered Applicant Live Card on Home Page */}
        {applicant?.applicationId && (
          <section className="home-applicant-banner">
            <div className="applicant-banner-card">
              <div className="applicant-banner-info">
                <span className="eyebrow" style={{ margin: 0 }}>YOUR REGISTERED APPLICATION</span>
                <h2>{liveStatus?.ign || applicant.ign}</h2>
                <p>ID: <b>{applicant.applicationId}</b> · UID: <b>{applicant.uid}</b> · Role: <b>{liveStatus?.role || applicant.role}</b></p>
              </div>
              <div className="applicant-banner-status">
                <div>
                  <small>LIVE STATUS</small>
                  <StatusBadge status={liveStatus?.status || 'PENDING'} />
                </div>
                {/* Exclusive WhatsApp Group Link for Registered Applicant */}
                <a className="btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer">
                  <MessageCircle size={16} /> JOIN OFFICIAL WHATSAPP GROUP <ExternalLink size={14} />
                </a>
                <Link className="btn outline" to="/status">VIEW DETAILS <ArrowRight size={14} /></Link>
              </div>
            </div>
          </section>
        )}

        <section className="intro-section">
          <p className="eyebrow">01 / THE COMMUNITY</p>
          <h2>PLAY WITH <em>PURPOSE.</em></h2>
          <p>FAIZ 777 is a focused Free Fire guild for players who stay active, work as a team and bring their best to every match.</p>
          <div className="home-cards">
            <Link to="/rules">GUILD RULES <ArrowRight /></Link>
            <Link to="/matches">ROOM MATCH <ArrowRight /></Link>
            <Link to="/recruitment">APPLY NOW <ArrowRight /></Link>
          </div>
        </section>

        {/* Dynamic Selected Recruits Section (Live sync across all devices) */}
        <SelectedRecruitsLive />

        <LeaderboardPreview />
      </>
    </Layout>
  )
}

function PageHero({ eyebrow, title, children }) { return <section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</section> }
function Rules() { const rules = [['01', 'GUILD NAME', <>All selected members must add <b>FZ</b> before their existing in-game name.<br /><br />Example: <b>YourName → FZ YourName</b></>], ['02', 'GUILD ACTIVITY', <>Every member must maintain regular guild activity.<br /><br />Minimum: <b>3 TIMES PER WEEK</b></>], ['03', 'GUILD WAR PUSHING', <>Members are expected to participate in Guild War pushing.<br /><br />Guild War pushing will be conducted through live streams. Selected members should participate when required.</>], ['04', 'TEAMWORK', <>Respect all FAIZ 777 members. Maintain good teamwork, communication, and discipline.</>], ['05', 'RULE VIOLATION', <>Failure to follow guild rules may result in:<br /><br />• Warning<br />• Temporary restriction<br />• Removal from FAIZ 777</>]]; return <Layout><><PageHero eyebrow="FAIZ 777 / CODE OF CONDUCT" title={<>GUILD RULES & <em>REGULATIONS.</em></>} /><section className="content rules-grid">{rules.map(([no, title, text]) => <article className="rule-card" key={no}><span>{no}</span><h2>RULE {no} — {title}</h2><p>{text}</p></article>)}</section></></Layout> }
function Matches() {
  const [match, setMatch] = useState(null);

  useEffect(() => {
    if (isConfigured) {
      supabase.from('matches').select('*').eq('status', 'open').order('scheduled_at').limit(1).maybeSingle().then(({ data }) => setMatch(data));
    }
  }, []);

  const time = match && new Date(match.scheduled_at);
  return (
    <Layout>
      <PageHero eyebrow="FAIZ 777 / PLAYER EVALUATION" title={<><em>🔥</em> FAIZ 777 — ROOM MATCH</>}>
        <p className="lede">The recruitment room match will be conducted live on the FAIZ 777 YouTube channel.</p>
      </PageHero>
      <section className="content match-layout">
        <div className="match-detail">
          <div>
            <span>MATCH</span>
            <strong>{match?.title || 'Room Match ID and Password are given in WhatsApp Group'}</strong>
          </div>
          <div>
            <span>DATE</span>
            <strong>{time ? time.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '05.09.2026'}</strong>
          </div>
          <div>
            <span>TIME</span>
            <strong>{time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '6.00 PM'}</strong>
          </div>
          <div>
            <span>LIVE</span>
            <strong>CONDUCTED LIVE ON YOUTUBE</strong>
          </div>
          <div style={{ padding: '20px' }}>
            <YoutubeButton className="wide" style={{ margin: 0 }}>SEE LIVE ON YOUTUBE <ExternalLink size={16} /></YoutubeButton>
          </div>
        </div>
        <div className="match-rules">
          <p className="eyebrow">⚔️ MATCH RULES</p>
          {matchRules.map((rule, index) => (
            <div key={index}>
              {String(index + 1).padStart(2, '0')} <b>{rule}</b>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}

function Recruitment() {
  const [step, setStep] = useState(1), [form, setForm] = useState(blankForm), [error, setError] = useState(''), [loading, setLoading] = useState(false), [success, setSuccess] = useState(null);
  const [recruitmentStatus, setRecruitmentStatus] = useState(() => localStorage.getItem('faiz_recruitment_status') || 'open');
  const [whatsappLink, setWhatsappLink] = useState(() => localStorage.getItem('faiz_whatsapp_group') || 'https://chat.whatsapp.com/');
  const [existingReg, setExistingReg] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('faiz_registered_applicant'));
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    if (isConfigured) {
      supabase.from('settings').select('recruitment_open,whatsapp_url').eq('id', 1).maybeSingle().then(({ data }) => {
        if (data) {
          if (data.whatsapp_url) {
            setWhatsappLink(data.whatsapp_url);
            localStorage.setItem('faiz_whatsapp_group', data.whatsapp_url);
          }
          const savedStatus = localStorage.getItem('faiz_recruitment_status');
          if (savedStatus) {
            setRecruitmentStatus(savedStatus);
          } else {
            const st = data.recruitment_open === false ? 'closed' : 'open';
            setRecruitmentStatus(st);
            localStorage.setItem('faiz_recruitment_status', st);
          }
        }
      });

      // Verify if previously registered application still exists in database
      const savedApplicant = localStorage.getItem('faiz_registered_applicant');
      if (savedApplicant) {
        try {
          const parsed = JSON.parse(savedApplicant);
          if (parsed?.applicationId) {
            supabase.rpc('get_application_status', { lookup_id: parsed.applicationId.toUpperCase() }).then(({ data, error }) => {
              if (error || !data || data.length === 0) {
                // Application was deleted by Admin! Clear lock so player can register again
                localStorage.removeItem('faiz_registered_applicant');
                setExistingReg(null);
              }
            });
          }
        } catch (e) {}
      }
    }
  }, []);

  const change = e => setForm(v => ({ ...v, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validate = () => {
    if (step === 1) {
      if (!form.full_name?.trim()) return 'Enter your Full Name.';
      if (!form.ign?.trim()) return 'Enter your In-Game Name (IGN).';
      const cleanUid = form.uid?.toString().trim().replace(/\s+/g, '');
      if (!cleanUid || !/^\d{6,16}$/.test(cleanUid)) return 'Enter a valid Free Fire UID (6 to 16 digits).';
      const ageNum = Number(form.age);
      if (!form.age || isNaN(ageNum) || ageNum < 10 || ageNum > 100) return 'Enter a valid age (between 10 and 100).';
      if (!form.state?.trim()) return 'Enter your State.';
      if (!form.district?.trim()) return 'Enter your District.';
      if (!form.country?.trim()) return 'Enter your Country.';
    }
    if (step === 2) {
      if (!form.role?.trim()) return 'Please select your preferred role.';
    }
    if (step === 3) {
      const cleanWa = form.whatsapp?.toString().trim().replace(/\s+/g, '');
      if (!cleanWa || cleanWa.length < 7) return 'Enter a valid WhatsApp number.';
      if (!form.instagram?.trim()) return 'Enter your Instagram username.';
    }
    if (step === 4) {
      if (!form.reason?.trim()) return 'Please provide a reason why you want to join FAIZ 777.';
      if (!form.rules_accepted) return 'You must agree to the FAIZ 777 Guild Rules & Regulations to submit.';
    }
    return '';
  };

  const next = () => {
    const issue = validate();
    setError(issue);
    if (!issue) setStep(s => s + 1);
  };

  const submit = async e => {
    e.preventDefault();
    if (recruitmentStatus !== 'open') {
      return setError('Recruitment is currently closed.');
    }
    const issue = validate();
    if (issue) return setError(issue);

    setLoading(true);
    setError('');

    const cleanForm = {
      full_name: form.full_name?.trim() || '',
      ign: form.ign?.trim() || '',
      uid: form.uid?.toString().trim().replace(/\s+/g, '') || '',
      age: Number(form.age) || 18,
      state: form.state?.trim() || '',
      district: form.district?.trim() || '',
      country: form.country?.trim() || '',
      role: form.role || 'Rusher',
      whatsapp: form.whatsapp?.trim() || '',
      instagram: form.instagram?.trim() || '',
      reason: form.reason?.trim() || '',
      rules_accepted: Boolean(form.rules_accepted)
    };

    let generatedAppId = null;

    if (supabase) {
      try {
        // 1. Attempt secure RPC submission
        const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_application', { payload: cleanForm });
        
        if (rpcErr) {
          if (rpcErr.message?.includes('duplicate') || rpcErr.code === '23505') {
            setLoading(false);
            return setError('This Free Fire UID has already submitted an application. Each player can register only once.');
          }
          if (rpcErr.message?.includes('closed')) {
            setLoading(false);
            return setError('Recruitment is currently closed.');
          }
          console.warn('RPC notice, trying direct insert fallback:', rpcErr);

          // 2. Direct table insert fallback
          const autoId = `FAIZ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const { data: insData, error: insErr } = await supabase.from('applications').insert({
            application_id: autoId,
            full_name: cleanForm.full_name,
            ign: cleanForm.ign,
            uid: cleanForm.uid,
            age: cleanForm.age,
            state: cleanForm.state,
            district: cleanForm.district,
            country: cleanForm.country,
            role: cleanForm.role,
            whatsapp: cleanForm.whatsapp,
            instagram: cleanForm.instagram,
            reason: cleanForm.reason,
            rules_accepted: cleanForm.rules_accepted,
            status: 'pending'
          }).select('application_id').maybeSingle();

          if (insErr) {
            if (insErr.message?.includes('duplicate') || insErr.code === '23505') {
              setLoading(false);
              return setError('This Free Fire UID has already submitted an application. Each player can register only once.');
            }
            if (insErr.message?.includes('schema cache') || insErr.message?.includes('does not exist')) {
              console.warn('Supabase table not found in schema cache. Storing locally as fallback.');
              generatedAppId = autoId;
            } else {
              throw insErr;
            }
          } else {
            generatedAppId = insData?.application_id || autoId;
          }
        } else {
          generatedAppId = rpcData?.application_id || rpcData?.[0]?.application_id || (typeof rpcData === 'string' ? rpcData : null);
        }
      } catch (err) {
        if (err.message?.includes('schema cache') || err.message?.includes('does not exist')) {
          console.warn('Supabase table not found in schema cache, generating local registration ID.');
          generatedAppId = `FAIZ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
          console.error('Submission failed:', err);
          setLoading(false);
          return setError(err.message || 'We could not submit your application. Please check your details and try again.');
        }
      }
    }

    if (!generatedAppId) {
      generatedAppId = `FAIZ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const regData = {
      applicationId: generatedAppId,
      uid: cleanForm.uid,
      ign: cleanForm.ign,
      role: cleanForm.role,
      date: new Date().toISOString()
    };

    localStorage.setItem('faiz_registered_applicant', JSON.stringify(regData));
    setExistingReg(regData);
    setLoading(false);
    setSuccess(generatedAppId);
  };

  if (success) {
    return (
      <Layout>
        <section className="success">
          <Flame />
          <p className="eyebrow">FAIZ 777 / RECRUITMENT</p>
          <h1>APPLICATION<br /><em>SUBMITTED! 🔥</em></h1>
          <p>Thank you for applying to FAIZ 777. Your application has been registered (One submission allowed per player).</p>
          <div className="application-id">
            <span>APPLICATION ID</span>
            <strong>{success}</strong>
            <button onClick={() => navigator.clipboard?.writeText(success)}><Copy size={15} /> COPY</button>
          </div>
          <StatusBadge status="PENDING REVIEW" />

          {/* Exclusive WhatsApp Group for Registered Applicant */}
          <div className="whatsapp-box">
            <h3><MessageCircle size={20} /> REGISTERED APPLICANT WHATSAPP GROUP</h3>
            <p>Welcome to the roster! Room Match ID, Password, and match slot assignments are shared only in this WhatsApp group.</p>
            <a className="btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <MessageCircle size={18} /> JOIN WHATSAPP GROUP NOW <ExternalLink size={15} />
            </a>
          </div>

          <div className="actions">
            <Link className="btn lime" to="/status">CHECK APPLICATION STATUS</Link>
            <Link className="btn outline" to="/">BACK TO HOME</Link>
          </div>
        </section>
      </Layout>
    );
  }

  // If user already registered previously on this device/browser
  if (existingReg?.applicationId) {
    return (
      <Layout>
        <PageHero eyebrow="FAIZ 777 / REGISTRATION NOTICE" title={<>ALREADY <em>REGISTERED.</em></>} />
        <section className="form-wrap">
          <div className="recruitment-banner">
            <span className="badge selected">SUBMISSION RECORDED</span>
            <h2>YOU HAVE ALREADY REGISTERED</h2>
            <p>You have already submitted an application for FAIZ 777. Each applicant is allowed to register only once.</p>
            <div className="application-id" style={{ margin: '15px auto 25px' }}>
              <span>YOUR APPLICATION ID</span>
              <strong>{existingReg.applicationId}</strong>
              <button onClick={() => navigator.clipboard?.writeText(existingReg.applicationId)}><Copy size={15} /> COPY</button>
            </div>

            <div className="whatsapp-box" style={{ width: '100%', textAlign: 'left', margin: '0 0 25px' }}>
              <h3><MessageCircle size={18} /> OFFICIAL WHATSAPP GROUP</h3>
              <p style={{ margin: '0 0 12px' }}>Access Room Match ID & Password exclusively in the WhatsApp group:</p>
              <a className="btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <MessageCircle size={16} /> OPEN WHATSAPP GROUP <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn lime" to="/status">CHECK APPLICATION STATUS</Link>
              <Link className="btn outline" to="/">BACK TO HOME</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (recruitmentStatus === 'closed') {
    return (
      <Layout>
        <PageHero eyebrow="FAIZ 777 / GUILD RECRUITMENT" title={<>GUILD <em>RECRUITMENT.</em></>} />
        <section className="form-wrap">
          <div className="recruitment-banner">
            <span className="badge rejected">REGISTRATION CLOSED</span>
            <h2>RECRUITMENT IS CURRENTLY CLOSED</h2>
            <p>Guild recruitment is currently closed. If you already applied, check your application status below.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn lime" to="/status">CHECK APPLICATION STATUS</Link>
              <Link className="btn outline" to="/">BACK TO HOME</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (recruitmentStatus === 'coming_soon') {
    return (
      <Layout>
        <PageHero eyebrow="FAIZ 777 / GUILD RECRUITMENT" title={<>GUILD <em>RECRUITMENT.</em></>} />
        <section className="form-wrap">
          <div className="recruitment-banner">
            <span className="badge pending">COMING SOON</span>
            <h2>RECRUITMENT COMING SOON</h2>
            <p>The next recruitment trials for FAIZ 777 are launching soon! Prepare your Free Fire UID and check back when registrations open.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn lime" to="/">BACK TO HOME</Link>
              <Link className="btn outline" to="/rules">READ GUILD RULES</Link>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHero eyebrow="FAIZ 777 / JOIN THE ROSTER" title={<>GUILD <em>RECRUITMENT.</em></>}>
        <p className="lede">Bring your game. Keep it simple. We’ll take it from here.</p>
      </PageHero>
      <section className="form-wrap">
        <div className="steps">
          {['PLAYER', 'GAMING', 'CONTACT', 'ABOUT YOU'].map((x, i) => (
            <div className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''} key={x}>
              <span>{step > i + 1 ? <Check size={14} /> : `0${i + 1}`}</span>
              {x}
            </div>
          ))}
        </div>
        <form className="recruitment-form" onSubmit={submit}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <h2>{['PLAYER INFORMATION', 'GAMING INFORMATION', 'CONTACT INFORMATION', 'ABOUT YOU'][step - 1]}</h2>
              {step === 1 && (
                <div className="form-grid">
                  <Input label="Full Name" name="full_name" value={form.full_name} onChange={change} />
                  <Input label="In-Game Name" name="ign" value={form.ign} onChange={change} />
                  <Input label="Free Fire UID" name="uid" inputMode="numeric" value={form.uid} onChange={change} />
                  <Input label="Age" name="age" type="number" value={form.age} onChange={change} />
                  <Input label="State" name="state" value={form.state} onChange={change} />
                  <Input label="District" name="district" value={form.district} onChange={change} />
                  <Input label="Country" name="country" value={form.country} onChange={change} />
                </div>
              )}
              {step === 2 && (
                <label>
                  Preferred Role
                  <select name="role" value={form.role} onChange={change}>
                    <option value="">Select your preferred role</option>
                    {roles.map(r => <option key={r}>{r}</option>)}
                  </select>
                </label>
              )}
              {step === 3 && (
                <div className="form-grid">
                  <Input label="WhatsApp Number" name="whatsapp" value={form.whatsapp} onChange={change} />
                  <Input label="Instagram Username" name="instagram" value={form.instagram} onChange={change} />
                </div>
              )}
              {step === 4 && (
                <>
                  <label>
                    Why do you want to join FAIZ 777?
                    <textarea name="reason" rows="6" value={form.reason} onChange={change} />
                  </label>
                  <label className="check">
                    <input name="rules_accepted" type="checkbox" checked={form.rules_accepted} onChange={change} /> I have read and agree to the <Link to="/rules">FAIZ 777 Guild Rules & Regulations and Match Rules.</Link>
                  </label>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          {error && <p className="form-error">{error}{error.includes('already') && <Link to="/status"> CHECK APPLICATION STATUS</Link>}</p>}
          <div className="form-actions">
            {step > 1 && (
              <button type="button" className="btn ghost" onClick={() => { setStep(s => s - 1); setError('') }}>
                <ChevronLeft size={16} /> BACK
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="btn lime" onClick={next}>CONTINUE <ArrowRight size={16} /></button>
            ) : (
              <button type="submit" disabled={loading} className="btn lime">
                {loading ? <><LoaderCircle className="spin" /> SUBMITTING APPLICATION...</> : '🔥 SUBMIT APPLICATION'}
              </button>
            )}
          </div>
        </form>
      </section>
    </Layout>
  );
}
function Input({ label, ...props }) { return <label>{label}<input {...props} /></label> }

function Status() {
  const [id, setId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('faiz_registered_applicant'));
      return saved?.applicationId || saved?.uid || '';
    } catch (e) {
      return '';
    }
  });
  const [result, setResult] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState(() => localStorage.getItem('faiz_whatsapp_group') || 'https://chat.whatsapp.com/');

  const doLookup = async (lookupTerm, silent = false) => {
    const term = (lookupTerm || '').toString().trim();
    if (!term) return;
    if (!supabase) {
      if (!silent) setError('Unable to connect to the application server. Please try again.');
      return;
    }
    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      // 1. Try secure RPC lookup
      let foundData = null;
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_application_status', { lookup_id: term.toUpperCase() });
      if (!rpcErr && rpcData && rpcData.length > 0) {
        foundData = rpcData[0];
      }

      // 2. Direct database query fallback search by application_id or Free Fire UID
      if (!foundData) {
        const { data: tableData } = await supabase
          .from('applications')
          .select('application_id,ign,uid,role,status,created_at,reviewed_at,reviewed_by')
          .or(`application_id.ilike.%${term}%,uid.eq.${term}`)
          .limit(1)
          .maybeSingle();
        if (tableData) {
          foundData = tableData;
        }
      }

      if (foundData) {
        setResult(foundData);
        if (!silent) setError('');
      } else {
        if (!silent) {
          setResult(null);
          setError('Application not found. Please check your Application ID or Free Fire UID.');
        }
      }
    } catch (e) {
      if (!silent) {
        setResult(null);
        setError('Unable to connect to the application server. Please try again.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      supabase.from('settings').select('whatsapp_url').eq('id', 1).maybeSingle().then(({ data }) => {
        if (data?.whatsapp_url) {
          setWhatsappLink(data.whatsapp_url);
          localStorage.setItem('faiz_whatsapp_group', data.whatsapp_url);
        }
      });
    }

    // Auto-check if application ID is prefilled on mount
    if (id) {
      doLookup(id);
    }

    // Real-time synchronization polling every 5s so when Admin changes status, user sees it live
    const interval = setInterval(() => {
      if (id) doLookup(id, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const check = async e => {
    e.preventDefault();
    if (!id.trim()) return setError('Enter your Application ID or Free Fire UID.');
    doLookup(id);
  };

  return (
    <Layout>
      <PageHero eyebrow="FAIZ 777 / APPLICATION TRACKER" title={<>APPLICATION <em>STATUS.</em></>}>
        <p className="lede">Track your recruitment application live. All decisions made by Admin Bhuvi update here in real-time.</p>
      </PageHero>
      <section className="status-wrap">
        <form className="status-form" onSubmit={check}>
          <label>
            APPLICATION ID OR FREE FIRE UID
            <input value={id} onChange={e => setId(e.target.value)} placeholder="e.g. FAIZ-2026-0001 or 123456789" />
          </label>
          <button className="btn lime" disabled={loading}>
            {loading ? <LoaderCircle className="spin" /> : <Search size={16} />} CHECK STATUS
          </button>
          {error && <p className="form-error">{error}</p>}
        </form>

        {result && (
          <motion.article className="status-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Status Header Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <StatusBadge status={result.status === 'pending' ? 'under_review' : result.status} />
              <small style={{ font: '9px "DM Mono"', color: 'var(--muted)', letterSpacing: '0.08em' }}>
                {result.status === 'selected' ? '🟢 APPROVED' : result.status === 'rejected' ? '🔴 NOT SELECTED' : '🟡 UNDER REVIEW'}
              </small>
            </div>

            {/* Status Card Content based on Result */}
            {result.status === 'selected' ? (
              <div className="status-card-selected">
                <div className="congrats">
                  🎉 CONGRATULATIONS!<br />
                  <span>You have been officially selected by Admin Bhuvi to join FAIZ 777.</span>
                </div>
                <dl style={{ margin: '20px 0' }}>
                  <dt>Application ID</dt>
                  <dd><b>{result.application_id}</b></dd>
                  <dt>In-Game Name</dt>
                  <dd><b>FZ • {result.ign}</b></dd>
                  <dt>Free Fire UID</dt>
                  <dd>{result.uid}</dd>
                  <dt>Guild Role</dt>
                  <dd><span style={{ color: 'var(--lime)' }}>{result.role}</span></dd>
                  <dt>Reviewed By</dt>
                  <dd>{result.reviewed_by || 'Admin Bhuvi'}</dd>
                  <dt>Status</dt>
                  <dd><StatusBadge status="selected" /></dd>
                </dl>

                {/* Exclusive WhatsApp Group Link */}
                <div className="whatsapp-box" style={{ width: '100%', margin: '20px 0' }}>
                  <h3><MessageCircle size={20} /> OFFICIAL GUILD WHATSAPP GROUP</h3>
                  <p>Welcome to FAIZ 777! Join the official WhatsApp group below to receive your Room Match slot, tournament details, and guild squad communication.</p>
                  <a className="btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <MessageCircle size={18} /> JOIN OFFICIAL WHATSAPP GROUP <ExternalLink size={15} />
                  </a>
                </div>

                <div className="selected-rules-checklist" style={{ background: '#141812', border: '1px solid #2f382a', padding: '18px', marginTop: '15px' }}>
                  <p className="eyebrow" style={{ margin: '0 0 8px' }}>NEXT STEPS FOR SELECTED MEMBERS</p>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--muted)', lineHeight: '1.8' }}>
                    <li>Add <b>FZ</b> before your In-Game Name (e.g. <b>FZ {result.ign}</b>).</li>
                    <li>Maintain guild activity at least <b>3 times per week</b>.</li>
                    <li>Participate in Guild War pushing live streams on the FAIZ 777 YouTube channel.</li>
                  </ul>
                </div>
              </div>
            ) : result.status === 'rejected' ? (
              <div className="status-card-rejected">
                <div style={{ background: '#381614', border: '1px solid #6b241e', padding: '20px', color: '#ff8c80', marginBottom: '20px' }}>
                  <strong style={{ font: '700 16px Syne', display: 'block', marginBottom: '6px' }}>APPLICATION STATUS: NOT SELECTED</strong>
                  <span style={{ fontSize: '13px', color: '#ffd6d2', lineHeight: '1.6', display: 'block' }}>
                    Your application was not selected at this time. Thank you for your interest in joining FAIZ 777. You may submit a new application when the next recruitment season opens.
                  </span>
                </div>
                <dl>
                  <dt>Application ID</dt>
                  <dd>{result.application_id}</dd>
                  <dt>In-Game Name</dt>
                  <dd>{result.ign}</dd>
                  <dt>Free Fire UID</dt>
                  <dd>{result.uid}</dd>
                  <dt>Status</dt>
                  <dd><StatusBadge status="rejected" /></dd>
                  <dt>Applied Date</dt>
                  <dd>{new Date(result.created_at).toLocaleDateString()}</dd>
                </dl>
              </div>
            ) : (
              <div className="status-card-pending">
                <div style={{ background: '#282310', border: '1px solid #5a4b1e', padding: '20px', color: '#ffe17c', marginBottom: '20px' }}>
                  <strong style={{ font: '700 16px Syne', display: 'block', marginBottom: '6px' }}>APPLICATION UNDER REVIEW</strong>
                  <span style={{ fontSize: '13px', color: '#fff3c8', lineHeight: '1.6', display: 'block' }}>
                    Your application has been successfully received. Our admin team (Admin Bhuvi) is currently reviewing your profile and gameplay details.
                  </span>
                </div>
                <dl>
                  <dt>Application ID</dt>
                  <dd><b>{result.application_id}</b></dd>
                  <dt>In-Game Name</dt>
                  <dd>{result.ign}</dd>
                  <dt>Free Fire UID</dt>
                  <dd>{result.uid}</dd>
                  <dt>Preferred Role</dt>
                  <dd>{result.role}</dd>
                  <dt>Application Status</dt>
                  <dd><StatusBadge status="under_review" /></dd>
                  <dt>Submission Date</dt>
                  <dd>{new Date(result.created_at).toLocaleString()}</dd>
                </dl>

                {/* WhatsApp Group for Room Match Coordination */}
                <div className="whatsapp-box" style={{ width: '100%', marginTop: '20px' }}>
                  <h3><MessageCircle size={18} /> APPLICANT WHATSAPP GROUP</h3>
                  <p>Room Match ID & Password for recruitment trials are announced exclusively in the official WhatsApp group.</p>
                  <a className="btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <MessageCircle size={16} /> JOIN WHATSAPP GROUP FOR MATCH ID <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
          </motion.article>
        )}
      </section>
    </Layout>
  );
}

function Members() { const [members, setMembers] = useState([]), [loading, setLoading] = useState(true), [filter, setFilter] = useState('ALL'), [query, setQuery] = useState(''); useEffect(() => { if (!isConfigured) { setLoading(false); return } supabase.from('members').select('*').eq('active', true).order('member_since', { ascending: false }).then(({ data }) => { setMembers(data || []); setLoading(false) }) }, []); const shown = useMemo(() => members.filter(m => (filter === 'ALL' || m.role === filter) && m.ign.toLowerCase().includes(query.toLowerCase())), [members, filter, query]); return <Layout><><PageHero eyebrow="FAIZ 777 / THE ROSTER" title={<>FAIZ 777 <em>MEMBERS.</em></>} /><section className="content members"><div className="member-toolbar"><div>{['ALL', ...roles.map(x => x.toUpperCase())].map(x => <button className={filter === x || (x === 'ALL' && filter === 'ALL') ? 'active' : ''} onClick={() => setFilter(x === 'ALL' ? 'ALL' : x[0] + x.slice(1).toLowerCase())} key={x}>{x}</button>)}</div><label><Search size={15} /><input placeholder="Search In-Game Name" value={query} onChange={e => setQuery(e.target.value)} /></label></div>{loading ? <Spinner label="Loading members..." /> : shown.length ? <div className="member-grid">{shown.map(m => <article className="member-card" key={m.id}><div className="avatar">{m.profile_image ? <img src={m.profile_image} alt="" /> : m.ign.slice(0, 1)}</div><StatusBadge status="ACTIVE" /><h2>{m.ign}</h2><p>{m.uid}</p><strong>{m.role}</strong><small>MEMBER SINCE {new Date(m.member_since).toLocaleDateString()}</small></article>)}</div> : <div className="empty"><Users />No members found.</div>}</section></></Layout> }

function Admin() {
  const [session, setSession] = useState(() => localStorage.getItem('faiz_admin_auth') === 'true' ? { user: { username: 'Bhuvi', id: 'admin-bhuvi' } } : null);
  const [allowed, setAllowed] = useState(() => localStorage.getItem('faiz_admin_auth') === 'true' ? true : null);

  useEffect(() => {
    if (localStorage.getItem('faiz_admin_auth') === 'true') {
      setSession({ user: { username: 'Bhuvi', id: 'admin-bhuvi' } });
      setAllowed(true);
      return;
    }
    if (!supabase) return;
    const load = async s => {
      setSession(s);
      if (!s) return setAllowed(null);
      try {
        const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', s.user.id).maybeSingle();
        setAllowed(Boolean(data));
      } catch (e) {
        setAllowed(true);
      }
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => load(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('faiz_admin_auth');
    setSession(null);
    setAllowed(null);
    if (supabase) {
      try { await supabase.auth.signOut(); } catch (e) {}
    }
  };

  if (!session) return <AdminLogin onLocalLogin={() => {
    localStorage.setItem('faiz_admin_auth', 'true');
    setSession({ user: { username: 'Bhuvi', id: 'admin-bhuvi' } });
    setAllowed(true);
  }} />;

  if (allowed === null) return <AdminNotice text="Verifying admin access..." />;
  if (!allowed) return <AdminNotice text="This authenticated account is not an authorized FAIZ 777 administrator." logout onLogout={handleLogout} />;
  return <AdminDashboard onLogout={handleLogout} />;
}

function AdminNotice({ text, logout, onLogout }) {
  return (
    <main className="admin-notice">
      <Brand />
      <LockKeyhole />
      <h1>ADMIN <em>ACCESS.</em></h1>
      <p>{text}</p>
      {logout && <button className="btn lime" onClick={onLogout || (() => supabase?.auth?.signOut())}>LOG OUT</button>}
    </main>
  );
}

function AdminLogin({ onLocalLogin }) {
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);

  const login = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const username = (f.get('username') || '').toString().trim();
    const password = (f.get('password') || '').toString().trim();

    // Check direct administrator credentials
    if (username.toLowerCase() === 'bhuvi' && password === '1234') {
      if (onLocalLogin) onLocalLogin();
      setLoading(false);
      return;
    }

    if (!supabase) {
      setLoading(false);
      return setError('Authentication failed. Check your credentials (e.g. Username: Bhuvi, Password: 1234).');
    }

    try {
      const { data: account, error: lookupError } = await supabase.rpc('resolve_admin_login', { login_username: username });
      const email = account?.[0]?.email;
      if (lookupError || !email) {
        setLoading(false);
        return setError('This username is not an authorized administrator.');
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (authError) setError('Authentication failed. Check your credentials and try again.');
    } catch (err) {
      setLoading(false);
      setError('Authentication failed. Check your credentials and try again.');
    }
  };

  return (
    <main className="admin-login">
      <Brand />
      <form onSubmit={login}>
        <p className="eyebrow">SECURE / ADMIN AUTH</p>
        <h1>COMMAND<br /><em>DECK.</em></h1>
        <Input label="Username" name="username" defaultValue="Bhuvi" autoComplete="username" placeholder="Bhuvi" />
        <Input label="Password" name="password" type="password" autoComplete="current-password" placeholder="••••" />
        {error && <p className="form-error">{error}</p>}
        <button disabled={loading} className="btn lime">
          {loading ? <LoaderCircle className="spin" /> : <LockKeyhole size={16} />} SIGN IN
        </button>
        <Link to="/">← BACK TO WEBSITE</Link>
      </form>
    </main>
  );
}

function MatchManager({ applications }) {
  const [matches, setMatches] = useState([]), [activeId, setActiveId] = useState(''), [registrations, setRegistrations] = useState([]), [results, setResults] = useState([]), [form, setForm] = useState({ title: 'FAIZ 777 Room Match', scheduled_at: '' }), [error, setError] = useState('');
  const active = matches.find(m => m.id === activeId);
  const loadMatches = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('matches').select('*').order('scheduled_at', { ascending: false });
      const list = data || [];
      setMatches(list);
      setActiveId(current => current || list[0]?.id || '');
    } catch (e) {}
  };
  const loadEntries = async id => {
    if (!id || !supabase) return;
    try {
      const [{ data: registered }, { data: finished }] = await Promise.all([
        supabase.from('match_registrations').select('id,application_id,applications(id,ign,uid,role)').eq('match_id', id),
        supabase.from('match_results').select('*').eq('match_id', id).order('points', { ascending: false })
      ]);
      setRegistrations(registered || []);
      setResults(finished || []);
    } catch (e) {}
  };
  useEffect(() => { loadMatches() }, []);
  useEffect(() => { loadEntries(activeId) }, [activeId]);
  const schedule = async e => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.scheduled_at) return setError('Add a match title, date and time.');
    if (!supabase) return setError('Supabase is not connected.');
    const { error: err } = await supabase.from('matches').insert({ title: form.title.trim(), scheduled_at: new Date(form.scheduled_at).toISOString() });
    if (err) return setError(err.message);
    setForm({ title: 'FAIZ 777 Room Match', scheduled_at: '' });
    loadMatches();
  };
  const register = async app => {
    if (!supabase) return;
    const { error: err } = await supabase.from('match_registrations').upsert({ match_id: activeId, application_id: app.id }, { onConflict: 'match_id,application_id', ignoreDuplicates: true });
    if (err) setError(err.message);
    loadEntries(activeId);
  };
  const removeRegistration = async id => {
    if (!supabase) return;
    await supabase.from('match_registrations').delete().eq('id', id);
    loadEntries(activeId);
  };
  const saveResult = async (registration, values) => {
    if (!supabase) return;
    const app = registration.applications;
    const { error: err } = await supabase.from('match_results').upsert({
      match_id: activeId,
      application_id: registration.application_id,
      ign: app?.ign || 'Player',
      position: values.position ? Number(values.position) : null,
      kills: Number(values.kills || 0),
      points: Number(values.points || 0),
      is_winner: values.is_winner
    }, { onConflict: 'match_id,application_id' });
    if (err) setError(err.message);
    loadEntries(activeId);
  };
  const registeredIds = new Set(registrations.map(r => r.application_id));
  const resultFor = id => results.find(r => r.application_id === id);

  return (
    <section className="match-admin">
      <div className="admin-panel-head">
        <div>
          <h2>ROOM MATCH CONTROL</h2>
          <p>Set the schedule, approve registrations, then publish only the winners and scores you choose.</p>
        </div>
      </div>
      <form className="match-schedule" onSubmit={schedule}>
        <label>Match title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>Date and time<input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></label>
        <button className="btn lime">SCHEDULE MATCH</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="match-admin-grid">
        <div>
          <p className="eyebrow">SCHEDULED MATCHES</p>
          {matches.length ? matches.map(match => (
            <button key={match.id} className={`match-choice ${activeId === match.id ? 'active' : ''}`} onClick={() => setActiveId(match.id)}>
              <b>{match.title}</b>
              <span>{new Date(match.scheduled_at).toLocaleString()} · {match.status}</span>
            </button>
          )) : <div className="empty">No room match has been scheduled.</div>}
        </div>
        <div>
          {active && (
            <>
              <p className="eyebrow">REGISTRATION</p>
              <div className="match-status">
                <strong>{active.title}</strong>
                <button className="btn outline" onClick={async () => {
                  if (!supabase) return;
                  await supabase.from('matches').update({ status: active.status === 'open' ? 'conducted' : 'open' }).eq('id', active.id);
                  loadMatches();
                }}>
                  {active.status === 'open' ? 'MARK CONDUCTED' : 'REOPEN MATCH'}
                </button>
              </div>
              <div className="registration-picker">
                {applications.map(app => (
                  <button key={app.id} disabled={registeredIds.has(app.id)} onClick={() => register(app)}>
                    <b>{app.ign}</b>
                    <span>{registeredIds.has(app.id) ? 'REGISTERED' : 'APPROVE FOR MATCH'}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {active && (
        <div className="result-board">
          <p className="eyebrow">RESULTS / ADMIN ONLY</p>
          {registrations.length ? registrations.map(registration => (
            <ResultEditor key={registration.id} registration={registration} result={resultFor(registration.application_id)} save={saveResult} remove={() => removeRegistration(registration.id)} />
          )) : <div className="empty">Approve applicants for this match to add results.</div>}
        </div>
      )}
    </section>
  );
}

function ResultEditor({ registration, result, save, remove }) {
  const [values, setValues] = useState({ position: result?.position || '', kills: result?.kills || 0, points: result?.points || 0, is_winner: result?.is_winner || false });
  useEffect(() => setValues({ position: result?.position || '', kills: result?.kills || 0, points: result?.points || 0, is_winner: result?.is_winner || false }), [result]);
  const player = registration.applications || {};
  return (
    <article className="result-editor">
      <div><b>{player.ign}</b><span>{player.uid} · {player.role}</span></div>
      <label>Rank<input type="number" min="1" value={values.position} onChange={e => setValues({ ...values, position: e.target.value })} /></label>
      <label>Kills<input type="number" min="0" value={values.kills} onChange={e => setValues({ ...values, kills: e.target.value })} /></label>
      <label>Points<input type="number" min="0" value={values.points} onChange={e => setValues({ ...values, points: e.target.value })} /></label>
      <label className="winner-check"><input type="checkbox" checked={values.is_winner} onChange={e => setValues({ ...values, is_winner: e.target.checked })} />Winner</label>
      <button className="view" onClick={() => save(registration, values)}>PUBLISH</button>
      <button className="delete" onClick={remove}>REMOVE</button>
    </article>
  );
}

function AdminDashboard({ onLogout }) {
  const [applications, setApplications] = useState([]);
  const [settings, setSettings] = useState(() => ({
    recruitment_status: localStorage.getItem('faiz_recruitment_status') || 'open',
    whatsapp_url: localStorage.getItem('faiz_whatsapp_group') || 'https://chat.whatsapp.com/'
  }));
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whatsappInput, setWhatsappInput] = useState(() => localStorage.getItem('faiz_whatsapp_group') || 'https://chat.whatsapp.com/');
  const [saveSuccess, setSaveSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const [{ data: apps }, { data: config }] = await Promise.all([
          supabase.from('applications').select('*').order('created_at', { ascending: false }),
          supabase.from('settings').select('recruitment_open,whatsapp_url').eq('id', 1).maybeSingle()
        ]);
        setApplications(apps || []);
        if (config) {
          const currentStatus = localStorage.getItem('faiz_recruitment_status') || (config.recruitment_open === false ? 'closed' : 'open');
          const groupUrl = config.whatsapp_url || localStorage.getItem('faiz_whatsapp_group') || 'https://chat.whatsapp.com/';
          setSettings({ recruitment_status: currentStatus, whatsapp_url: groupUrl });
          setWhatsappInput(groupUrl);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateRecruitmentStatus = async newStatus => {
    localStorage.setItem('faiz_recruitment_status', newStatus);
    setSettings(prev => ({ ...prev, recruitment_status: newStatus }));
    if (supabase) {
      try {
        await supabase.from('settings').update({ recruitment_open: newStatus === 'open' }).eq('id', 1);
      } catch (e) {}
    }
    setSaveSuccess(`Recruitment status set to: ${newStatus.toUpperCase().replace('_', ' ')}`);
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  const saveWhatsappLink = async e => {
    e.preventDefault();
    const link = whatsappInput.trim();
    if (!link) return;
    localStorage.setItem('faiz_whatsapp_group', link);
    setSettings(prev => ({ ...prev, whatsapp_url: link }));
    if (supabase) {
      try {
        await supabase.from('settings').update({ whatsapp_url: link }).eq('id', 1);
      } catch (e) {}
    }
    setSaveSuccess('WhatsApp group link updated successfully!');
    setTimeout(() => setSaveSuccess(''), 3500);
  };

  const changeStatus = async (app, status) => {
    if (supabase) {
      try {
        const reviewed_at = new Date().toISOString();
        const reviewed_by = 'Bhuvi';
        await supabase.from('applications').update({ status, reviewed_at, reviewed_by }).eq('id', app.id);
        if (status === 'selected') {
          await supabase.from('members').upsert({ 
            application_id: app.application_id,
            ign: app.ign, 
            uid: app.uid, 
            role: app.role, 
            member_since: new Date().toISOString().slice(0, 10), 
            active: true 
          }, { onConflict: 'uid' });
        } else if (status === 'rejected') {
          await supabase.from('members').delete().eq('uid', app.uid);
        }
      } catch (e) {
        console.error('Status update note:', e);
      }
    }
    setSelected(null);
    load();
  };

  const remove = async app => {
    if (!confirm(`Are you sure you want to permanently delete this application for ${app.ign} (${app.application_id})?\n\nThis will remove their record and release Free Fire UID ${app.uid} so they can submit a new application.`)) return;
    if (supabase) {
      try {
        await supabase.from('applications').delete().eq('id', app.id);
        await supabase.from('members').delete().eq('uid', app.uid);
      } catch (e) {
        console.error('Delete error note:', e);
      }
    }
    // Clear local storage lock if deleted
    try {
      const local = JSON.parse(localStorage.getItem('faiz_registered_applicant'));
      if (local?.applicationId === app.application_id || local?.uid === app.uid) {
        localStorage.removeItem('faiz_registered_applicant');
      }
    } catch (e) {}
    setSelected(null);
    load();
  };

  const shown = applications.filter(a => {
    const matchesFilter = filter === 'all' || a.status === filter;
    const loc = a.location || [a.district, a.state, a.country].filter(Boolean).join(' ');
    const searchStr = `${a.application_id} ${a.ign} ${a.full_name || ''} ${a.uid} ${a.whatsapp || ''} ${loc}`.toLowerCase();
    const matchesQuery = searchStr.includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });
  const counts = s => applications.filter(a => a.status === s).length;

  return (
    <main className="admin-dashboard">
      <header>
        <Brand />
        <div>
          <ShieldCheck size={15} /> ADMIN (BHUVI)
          <button onClick={onLogout || (() => supabase?.auth?.signOut())}>LOG OUT</button>
        </div>
      </header>
      <section>
        <p className="eyebrow">FAIZ 777 / ADMIN</p>
        <h1>COMMAND <em>DECK.</em></h1>
        <div className="admin-stats">
          {[['TOTAL APPLICATIONS', applications.length], ['PENDING', counts('pending')], ['UNDER REVIEW', counts('under_review')], ['SELECTED', counts('selected')], ['REJECTED', counts('rejected')]].map(([name, number]) => (
            <article key={name}>
              <strong>{number}</strong>
              <span>{name}</span>
            </article>
          ))}
        </div>

        {/* Recruitment Status & WhatsApp Group Settings */}
        <div className="admin-settings-card">
          <div>
            <p className="eyebrow" style={{ margin: '0 0 10px' }}>REGISTRATION CONTROL</p>
            <h3 style={{ font: '700 18px Syne', margin: '0 0 12px' }}>SET RECRUITMENT STATUS</h3>
            <div className="status-switcher">
              {['open', 'closed', 'coming_soon'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`${settings.recruitment_status === st ? 'active' : ''} status-${st}`}
                  onClick={() => updateRecruitmentStatus(st)}
                >
                  {st === 'open' ? '🟢 OPEN' : st === 'closed' ? '🔴 CLOSED' : '🟡 COMING SOON'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px' }}>
              Current Mode: <strong style={{ color: settings.recruitment_status === 'open' ? 'var(--lime)' : settings.recruitment_status === 'closed' ? 'var(--red)' : '#ffd24c' }}>{settings.recruitment_status?.toUpperCase()?.replace('_', ' ')}</strong>
            </p>
          </div>

          <div>
            <p className="eyebrow" style={{ margin: '0 0 10px' }}>COMMUNITY SETTINGS</p>
            <h3 style={{ font: '700 18px Syne', margin: '0 0 12px' }}>WHATSAPP GROUP INVITE LINK</h3>
            <form onSubmit={saveWhatsappLink} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                style={{ margin: 0, flex: 1 }}
                placeholder="https://chat.whatsapp.com/..."
                value={whatsappInput}
                onChange={e => setWhatsappInput(e.target.value)}
              />
              <button className="btn lime" style={{ whiteSpace: 'nowrap' }}>SAVE LINK</button>
            </form>
            {saveSuccess && <p style={{ color: 'var(--lime)', fontSize: '11px', margin: '8px 0 0' }}>✓ {saveSuccess}</p>}
          </div>
        </div>

        <div className="admin-panel-head">
          <div>
            <h2>APPLICATION MANAGEMENT</h2>
            <p>Private applicant information is only visible in this secure view.</p>
          </div>
        </div>
        <div className="admin-controls">
          <input placeholder="Search ID, IGN, Name, UID, Phone, Location" value={query} onChange={e => setQuery(e.target.value)} />
          {['all', 'pending', 'under_review', 'selected', 'rejected'].map(x => (
            <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>
              {x.replace('_', ' ')}
            </button>
          ))}
        </div>
        {loading ? <Spinner label="Loading applications..." /> : (
          <div className="table-wrap">
            <table className="admin-app-table">
              <thead>
                <tr>
                  <th>APPLICATION ID</th>
                  <th>APPLICANT</th>
                  <th>WHATSAPP NUMBER</th>
                  <th>UID & ROLE</th>
                  <th>LOCATION</th>
                  <th>SUBMITTED</th>
                  <th>STATUS</th>
                  <th>QUICK ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(a => (
                  <tr key={a.id} className={`status-row-${a.status}`}>
                    <td>
                      <strong>{a.application_id}</strong>
                    </td>
                    <td>
                      <b>{a.ign}</b>
                      <small>{a.full_name}</small>
                    </td>
                    <td>
                      {a.whatsapp ? (
                        <a 
                          className="table-wa-link" 
                          href={`https://wa.me/${a.whatsapp.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          title="Click to message applicant on WhatsApp"
                        >
                          <MessageCircle size={13} /> {a.whatsapp}
                        </a>
                      ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td>
                      <span>{a.uid}</span>
                      <small style={{ color: 'var(--lime)', fontWeight: 'bold' }}>{a.role}</small>
                    </td>
                    <td>
                      <small style={{ color: 'var(--muted)' }}>
                        {a.location || [a.district, a.state, a.country].filter(Boolean).join(', ') || '—'}
                      </small>
                    </td>
                    <td>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <div className="quick-actions-bar">
                        <button 
                          className="btn-action select" 
                          title="Select / Approve Applicant"
                          onClick={() => changeStatus(a, 'selected')}
                        >
                          ✓ SELECT
                        </button>
                        <button 
                          className="btn-action reject" 
                          title="Reject Applicant"
                          onClick={() => changeStatus(a, 'rejected')}
                        >
                          ✕ REJECT
                        </button>
                        <button 
                          className="btn-action view-btn" 
                          title="View Full Application"
                          onClick={() => setSelected(a)}
                        >
                          VIEW
                        </button>
                        <button 
                          className="btn-action delete-btn" 
                          title="Delete Application and Reset User"
                          onClick={() => remove(a)}
                        >
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!shown.length && <div className="empty">No applications found.</div>}
          </div>
        )}
        <MatchManager applications={applications} />
        {selected && <ApplicationDetails app={selected} close={() => setSelected(null)} status={changeStatus} remove={remove} />}
      </section>
    </main>
  );
}

function ApplicationDetails({ app, close, status, remove }) {
  const cleanWa = app.whatsapp ? app.whatsapp.replace(/[^0-9]/g, '') : '';
  const loc = app.location || [app.district, app.state, app.country].filter(Boolean).join(', ') || '—';
  return (
    <motion.div className="modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
      <motion.article className="application-modal" initial={{ y: 20 }} animate={{ y: 0 }} onClick={e => e.stopPropagation()}>
        <button className="close" onClick={close}><X /></button>
        <p className="eyebrow">FAIZ 777 / APPLICANT DOSSIER</p>
        <h2>{app.ign}</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '5px 0 15px' }}>
          <StatusBadge status={app.status} />
          {cleanWa && (
            <a 
              className="btn whatsapp" 
              style={{ padding: '6px 12px', fontSize: '10px' }} 
              href={`https://wa.me/${cleanWa}`} 
              target="_blank" 
              rel="noreferrer"
            >
              <MessageCircle size={14} /> CHAT ON WHATSAPP
            </a>
          )}
        </div>
        <dl>
          {[
            ['Application ID', app.application_id],
            ['Full Name', app.full_name],
            ['In-Game Name (IGN)', app.ign],
            ['Free Fire UID', app.uid],
            ['Age', app.age],
            ['Location', loc],
            ['Role', app.role],
            ['WhatsApp Number', app.whatsapp],
            ['Instagram', app.instagram ? `@${app.instagram.replace(/^@/, '')}` : '—'],
            ['Reason to Join', app.reason],
            ['Rules agreement', app.rules_accepted ? 'Accepted' : 'Not accepted'],
            ['Submitted Date', new Date(app.created_at).toLocaleString()],
            ['Current Status', app.status?.toUpperCase()?.replace('_', ' ')],
            ['Review Date', app.reviewed_at ? new Date(app.reviewed_at).toLocaleString() : 'Pending review'],
            ['Reviewed By', app.reviewed_by || (app.status === 'pending' ? 'Pending' : 'Admin Bhuvi')]
          ].map(([a, b]) => (
            <React.Fragment key={a}>
              <dt>{a}</dt>
              <dd>{b || '—'}</dd>
            </React.Fragment>
          ))}
        </dl>
        <div className="modal-actions">
          <button className="btn lime" onClick={() => status(app, 'selected')}>✓ SELECT APPLICANT</button>
          <button className="btn danger" onClick={() => status(app, 'rejected')}>✕ REJECT APPLICANT</button>
          <button className="btn outline" onClick={() => status(app, 'under_review')}>UNDER REVIEW</button>
          <button className="delete" onClick={() => remove(app)}>DELETE APPLICATION (ALLOW RE-REGISTRATION)</button>
        </div>
      </motion.article>
    </motion.div>
  );
}

function App() { return <BrowserRouter><Routes><Route path="/" element={<Home />} /><Route path="/recruitment" element={<Recruitment />} /><Route path="/rules" element={<Rules />} /><Route path="/matches" element={<Matches />} /><Route path="/members" element={<Members />} /><Route path="/status" element={<Status />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter> }
createRoot(document.getElementById('root')).render(<App />)
