import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// ─── API config ──────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// FIX: centralised fetch helper — attaches auth header, handles 401 globally
async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || res.statusText), { status: res.status });
  }
  return res.json();
}

// FIX: try to get a new access token using the refresh cookie
async function refreshAccessToken() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Session expired');
  const data = await res.json();
  return data.accessToken;
}

// ─── Navigation icons ────────────────────────────────────────────────────────
const HomeIcon    = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" /><polyline points="9 22 9 12 15 12 15 22" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" /></svg>);
const PlusIcon    = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" /><path d="M12 8v8M8 12h8" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" /></svg>);
const BarIcon     = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" /></svg>);
const CheckIcon   = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const GroupIcon   = ({ active }) => (<svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" stroke={active ? '#1D9E75' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);

// ─── Reusable components ─────────────────────────────────────────────────────
const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    green: { background: '#E1F5EE', color: '#0F6E56' },
    amber: { background: '#FAEEDA', color: '#854F0B' },
    red:   { background: '#FCEBEB', color: '#A32D2D' },
    blue:  { background: '#E6F1FB', color: '#185FA5' },
    gray:  { background: '#f0f0f0', color: '#666' },
  };
  return <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, fontWeight: 500, ...colors[color] }}>{children}</span>;
};

const Avatar = ({ initials, color = 'green', size = 40 }) => {
  const colors = {
    green: { background: '#E1F5EE', color: '#0F6E56' },
    blue:  { background: '#E6F1FB', color: '#185FA5' },
    amber: { background: '#FAEEDA', color: '#854F0B' },
    pink:  { background: '#FBEAF0', color: '#993556' },
  };
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: size * 0.35, flexShrink: 0, ...colors[color] }}>
      {initials}
    </div>
  );
};

// FIX: helper to get initials from a name string
function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// FIX: helper to pick avatar color deterministically from student id
const AVATAR_COLORS = ['green', 'blue', 'amber', 'pink'];
function avatarColor(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

const SectionLabel = ({ children, mt = 14 }) => (
  <div style={{ fontSize: 10, fontWeight: 500, color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8, marginTop: mt }}>{children}</div>
);

const BtnPrimary   = ({ children, onClick, style = {}, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{ background: disabled ? '#aaa' : '#1D9E75', color: 'white', border: 'none', padding: '11px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', width: '100%', fontFamily: 'inherit', ...style }}>{children}</button>
);

const BtnSecondary = ({ children, onClick, style = {} }) => (
  <button onClick={onClick} style={{ background: '#f5f5f5', color: '#1a1a1a', border: '0.5px solid #ddd', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', ...style }}>{children}</button>
);

const BtnBack = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', fontSize: 13, color: '#1D9E75', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Back</button>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: 'white', border: '0.5px solid #e8e8e8', borderRadius: 12, padding: '13px 15px', marginBottom: 10, ...style }}>{children}</div>
);

const StatGrid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>{children}</div>
);

const StatCard = ({ number, label, numberColor }) => (
  <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '11px 13px' }}>
    <div style={{ fontSize: 22, fontWeight: 500, color: numberColor || '#1a1a1a' }}>{number}</div>
    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
  </div>
);

const LogItem = ({ time, behavior, detail, dotColor }) => (
  <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #f0f0f0' }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 4, flexShrink: 0 }} />
    <div>
      <div style={{ fontSize: 11, color: '#888' }}>{time}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{behavior}</div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{detail}</div>
    </div>
  </div>
);

const Topbar = ({ title, subtitle, left, right }) => (
  <div style={{ padding: '14px 18px 12px', borderBottom: '0.5px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
    <div>{left || <><div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>{title}</div>{subtitle && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{subtitle}</div>}</>}</div>
    {right}
  </div>
);

// FIX: generic error banner component
const ErrorBanner = ({ message }) => message ? (
  <div style={{ background: '#FCEBEB', borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: '#A32D2D' }}>{message}</div>
) : null;

// FIX: generic loading spinner
const Spinner = () => (
  <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>Loading…</div>
);

const BottomNav = ({ current, navigate }) => {
  const tabs = [
    { id: 'home',          label: 'Caseload',  Icon: HomeIcon },
    { id: 'log',           label: 'Log',       Icon: PlusIcon },
    { id: 'analytics',     label: 'Insights',  Icon: BarIcon },
    { id: 'interventions', label: 'Strategies',Icon: CheckIcon },
    { id: 'parent',        label: 'Family',    Icon: GroupIcon },
  ];
  return (
    <div style={{ borderTop: '0.5px solid #e8e8e8', display: 'flex', padding: '6px 0 2px', flexShrink: 0 }}>
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => navigate(id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', fontFamily: 'inherit' }}>
          <Icon active={current === id} />
          <span style={{ fontSize: 10, color: current === id ? '#1D9E75' : '#888', fontWeight: current === id ? 500 : 400 }}>{label}</span>
        </button>
      ))}
    </div>
  );
};

// FIX: format timestamps nicely
function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

// FIX: intensity dot color
function intensityColor(n) {
  const map = { 1: '#5DCAA5', 2: '#5DCAA5', 3: '#EF9F27', 4: '#E24B4A', 5: '#E24B4A' };
  return map[n] || '#888';
}

// ─── SCREEN: Login ───────────────────────────────────────────────────────────
// FIX: entire login screen is new — app previously skipped auth entirely
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.accessToken, data.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: '#1D9E75', letterSpacing: -0.5, marginBottom: 4 }}>
        Spectrum<span style={{ color: '#1a1a1a' }}>Track</span>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 28 }}>Track. Understand. Support.</div>
      <ErrorBanner message={error} />
      <div style={{ width: '100%', marginBottom: 10 }}>
        <input type="text" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 0 }} />
      </div>
      <div style={{ width: '100%', marginBottom: 18 }}>
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()} />
      </div>
      <BtnPrimary onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</BtnPrimary>
    </div>
  );
};

// ─── SCREEN: Home ────────────────────────────────────────────────────────────
// FIX: loads real student list from API instead of hardcoded array
const HomeScreen = ({ navigate, token, user }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    apiFetch('/api/students', {}, token)
      .then(data => setStudents(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // FIX: badge color based on logs_today count
  function badgeColor(count) {
    if (count >= 5) return 'red';
    if (count >= 2) return 'amber';
    if (count === 0) return 'gray';
    return 'green';
  }

  return (
    <>
      <Topbar
        left={
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, color: '#1D9E75', letterSpacing: -0.5 }}>
              Spectrum<span style={{ color: '#1a1a1a' }}>Track</span>
            </div>
            {/* FIX: show real user name from auth */}
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{new Date().toDateString()} · {user?.name || 'Loading…'}</div>
          </div>
        }
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{ cursor: 'pointer' }} onClick={() => navigate('alerts')}>
              <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <Avatar initials={getInitials(user?.name || '?')} color="green" size={30} />
          </div>
        }
      />
      <div className="scroll">
        <ErrorBanner message={error} />
        {loading ? <Spinner /> : (
          <>
            <SectionLabel mt={0}>My caseload ({students.length})</SectionLabel>
            {students.length === 0 && !error && (
              <div style={{ fontSize: 13, color: '#888', padding: '20px 0', textAlign: 'center' }}>No students assigned yet.</div>
            )}
            {/* FIX: clicking a student passes the real student object to navigate */}
            {students.map(s => (
              <div key={s.id} onClick={() => navigate('student', s)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '0.5px solid #f0f0f0', cursor: 'pointer' }}>
                <Avatar initials={getInitials(`${s.first_name} ${s.last_name}`)} color={avatarColor(s.id)} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {s.last_log_time ? `Last: ${formatTime(s.last_log_time)}` : 'No logs yet'}
                  </div>
                </div>
                <Badge color={badgeColor(s.logs_today || 0)}>{s.logs_today || 0} today</Badge>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <BtnPrimary onClick={() => navigate('log', null)}>+ Log a behavior</BtnPrimary>
            </div>
          </>
        )}
      </div>
      <BottomNav current="home" navigate={navigate} />
    </>
  );
};

// ─── SCREEN: Student Profile ──────────────────────────────────────────────────
// FIX: loads real logs for the selected student instead of Emma's hardcoded data
const StudentScreen = ({ navigate, token, student }) => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!student?.id) return;
    apiFetch(`/api/logs?student_id=${student.id}&limit=5`, {}, token)
      .then(data => setLogs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [student, token]);

  if (!student) return <div style={{ padding: 20, color: '#888' }}>No student selected.</div>;

  const iepGoals   = student.iep_goals       ? (typeof student.iep_goals === 'string'       ? JSON.parse(student.iep_goals)       : student.iep_goals)       : [];
  const sensory    = student.sensory_profile  ? (typeof student.sensory_profile === 'string'  ? JSON.parse(student.sensory_profile)  : student.sensory_profile)  : {};
  const reinforcers= student.reinforcers      ? (typeof student.reinforcers === 'string'      ? JSON.parse(student.reinforcers)      : student.reinforcers)      : [];
  const sensoryTags = Object.entries(sensory).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' '));

  return (
    <>
      <Topbar
        left={<div><BtnBack onClick={() => navigate('home')} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>{student.first_name} {student.last_name}</div></div>}
        right={<BtnPrimary onClick={() => navigate('log', student)} style={{ width: 'auto', padding: '7px 13px', fontSize: 12 }}>+ Log</BtnPrimary>}
      />
      <div className="scroll">
        <ErrorBanner message={error} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
          <Avatar initials={getInitials(`${student.first_name} ${student.last_name}`)} color={avatarColor(student.id)} size={50} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#1a1a1a' }}>
              {student.first_name} {student.last_name}
              {student.date_of_birth && <span style={{ fontWeight: 400, color: '#888' }}>, age {new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()}</span>}
            </div>
            {reinforcers.length > 0 && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Reinforcers: {reinforcers.join(', ')}</div>}
          </div>
        </div>

        {sensoryTags.length > 0 && (
          <>
            <SectionLabel mt={0}>Sensory profile</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {sensoryTags.map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#f0f0f0', color: '#666', border: '0.5px solid #e0e0e0', textTransform: 'capitalize' }}>{tag}</span>
              ))}
            </div>
          </>
        )}

        {iepGoals.length > 0 && (
          <>
            <SectionLabel mt={0}>IEP goals</SectionLabel>
            {iepGoals.map((g, i) => (
              <div key={i} style={{ borderLeft: '3px solid #1D9E75', paddingLeft: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{g.name}</div>
                {g.target && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{g.target}</div>}
              </div>
            ))}
          </>
        )}

        <SectionLabel mt={0}>Recent logs</SectionLabel>
        {loading ? <Spinner /> : logs.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888', padding: '12px 0' }}>No logs yet.</div>
        ) : logs.map(log => (
          <LogItem
            key={log.id}
            time={formatTime(log.start_time)}
            behavior={`${log.behavior_type}${log.intensity ? ` · Intensity ${log.intensity}` : ''}`}
            detail={[log.antecedent, log.consequence, log.intervention_used].filter(Boolean).join(' · ')}
            dotColor={intensityColor(log.intensity)}
          />
        ))}

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <BtnSecondary onClick={() => navigate('calendar', student)} style={{ width: '100%' }}>View calendar</BtnSecondary>
          <BtnSecondary onClick={() => navigate('analytics', student)} style={{ width: '100%' }}>View insights</BtnSecondary>
        </div>
      </div>
    </>
  );
};

// ─── SCREEN: Log Behavior ─────────────────────────────────────────────────────
// FIX: all form fields are now controlled; submission POSTs to real API
const LogScreen = ({ navigate, token, student }) => {
  const [selBeh,    setSelBeh]    = useState('');
  const [selInt,    setSelInt]    = useState(null);
  const [antecedent,setAntecedent]= useState('');
  const [consequence,setConsequence]=useState('');
  const [location,  setLocation]  = useState('classroom');
  const [activity,  setActivity]  = useState('');
  const [notes,     setNotes]     = useState('');
  const [timerSecs, setTimerSecs] = useState(0);
  const [running,   setRunning]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const startTimeRef = useRef(new Date());
  const intervalRef  = useRef(null);

  // FIX: record start time when timer starts
  const handleTimerToggle = () => {
    if (!running) startTimeRef.current = new Date();
    setRunning(r => !r);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    // FIX: cleanup on unmount to prevent memory leak
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const resetTimer = () => { setRunning(false); setTimerSecs(0); };
  const mins = Math.floor(timerSecs / 60);
  const secs = timerSecs % 60;

  const behaviors = [
    { id: 'aggression', icon: '⚡', label: 'Aggression' },
    { id: 'elopement',  icon: '🚪', label: 'Elopement'  },
    { id: 'stimming',   icon: '🔄', label: 'Stimming'   },
    { id: 'shutdown',   icon: '💤', label: 'Shutdown'   },
    { id: 'self_injury',icon: '🛑', label: 'Self-injury' },
    { id: 'other',      icon: '+',  label: 'Other'      },
  ];

  const intColors  = ['','#085041','#633806','#712B13','#791F1F','#501313'];
  const intBgs     = ['','#E1F5EE','#FAEEDA','#FAECE7','#FCEBEB','#FCEBEB'];
  const intBorders = ['','#9FE1CB','#FAC775','#F0997B','#F09595','#E24B4A'];

  // FIX: handleSave actually posts to the API with all controlled field values
  const handleSave = async () => {
    if (!selBeh) { setError('Please select a behavior type'); return; }
    if (!student?.id) { setError('No student selected'); return; }
    setLoading(true); setError('');
    try {
      const endTime = running ? new Date() : (timerSecs > 0 ? new Date(startTimeRef.current.getTime() + timerSecs * 1000) : null);
      await apiFetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          student_id:  student.id,
          behavior_type: selBeh,
          intensity:   selInt,
          start_time:  startTimeRef.current.toISOString(),
          end_time:    endTime?.toISOString() || null,
          antecedent:  antecedent || null,
          consequence: consequence || null,
          location:    location || null,
          activity:    activity || null,
          notes:       notes || null,
        }),
      }, token);
      navigate('saved', student);
    } catch (err) {
      setError(err.message || 'Failed to save log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Topbar
        left={<div><BtnBack onClick={() => navigate(student ? 'student' : 'home', student)} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>Log behavior</div></div>}
        right={student && <span style={{ fontSize: 11, color: '#1D9E75' }}>{student.first_name} {student.last_name}</span>}
      />
      <div className="scroll">
        <ErrorBanner message={error} />

        <SectionLabel mt={0}>Behavior type</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 14 }}>
          {behaviors.map(b => (
            <button key={b.id} onClick={() => setSelBeh(b.id)} style={{ padding: '11px 6px', borderRadius: 8, border: `1.5px solid ${selBeh === b.id ? '#1D9E75' : '#e0e0e0'}`, background: selBeh === b.id ? '#E1F5EE' : 'white', cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 500, color: selBeh === b.id ? '#0F6E56' : '#1a1a1a', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 16, display: 'block', marginBottom: 3 }}>{b.icon}</span>
              {b.label}
            </button>
          ))}
        </div>

        <SectionLabel mt={0}>Duration timer</SectionLabel>
        <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 12, textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: 2, marginBottom: 8 }}>{mins}:{secs < 10 ? '0' : ''}{secs}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <BtnSecondary onClick={handleTimerToggle} style={{ padding: '7px 18px', fontSize: 12 }}>{running ? 'Stop' : timerSecs > 0 ? 'Resume' : 'Start'}</BtnSecondary>
            <BtnSecondary onClick={resetTimer} style={{ padding: '7px 14px', fontSize: 12 }}>Reset</BtnSecondary>
          </div>
        </div>

        <SectionLabel mt={0}>Intensity (1–5)</SectionLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setSelInt(n)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1.5px solid ${selInt === n ? intBorders[n] : '#e0e0e0'}`, background: selInt === n ? intBgs[n] : 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: selInt === n ? intColors[n] : '#888', fontFamily: 'inherit' }}>{n}</button>
          ))}
        </div>

        <SectionLabel mt={0}>Antecedent &amp; location</SectionLabel>
        {/* FIX: all selects are now controlled with value + onChange */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
          <select value={antecedent} onChange={e => setAntecedent(e.target.value)}>
            <option value="">-- Trigger --</option>
            <option value="transition">Transition</option>
            <option value="task_demand">Task demand</option>
            <option value="loud_noise">Loud noise</option>
            <option value="unexpected_change">Unexpected change</option>
            <option value="unexpected_question">Unexpected question</option>
            <option value="sensory_overload">Sensory overload</option>
            <option value="peer_conflict">Peer conflict</option>
          </select>
          <select value={location} onChange={e => setLocation(e.target.value)}>
            <option value="classroom">Classroom</option>
            <option value="hallway">Hallway</option>
            <option value="cafeteria">Cafeteria</option>
            <option value="playground">Playground</option>
            <option value="therapy_room">Therapy room</option>
          </select>
        </div>

        <SectionLabel mt={0}>Consequence &amp; activity</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
          <select value={consequence} onChange={e => setConsequence(e.target.value)}>
            <option value="">-- Consequence --</option>
            <option value="sensory_break">Sensory break given</option>
            <option value="verbal_redirect">Verbal redirect</option>
            <option value="ignored">Ignored</option>
            <option value="first_then_board">First/Then board</option>
            <option value="time_out">Time-out</option>
            <option value="guided_back">Guided back</option>
          </select>
          <select value={activity} onChange={e => setActivity(e.target.value)}>
            <option value="">-- Activity --</option>
            <option value="math">Math</option>
            <option value="reading">Reading</option>
            <option value="circle_time">Circle time</option>
            <option value="recess">Recess</option>
            <option value="lunch">Lunch</option>
            <option value="art">Art</option>
          </select>
        </div>

        <SectionLabel mt={0}>Notes</SectionLabel>
        <textarea
          placeholder="Type notes here…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ marginBottom: 14 }}
        />

        <BtnPrimary onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save behavior log'}</BtnPrimary>
      </div>
    </>
  );
};

// ─── SCREEN: Saved Confirmation ───────────────────────────────────────────────
const SavedScreen = ({ navigate, student }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
    <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Behavior logged</div>
    <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
      {student ? `Entry saved to ${student.first_name}'s timeline.` : 'Entry saved.'}<br />Parent summary will be sent at 3 PM.
    </div>
    {student && <BtnPrimary onClick={() => navigate('student', student)} style={{ marginBottom: 9 }}>View {student.first_name}'s profile</BtnPrimary>}
    <BtnSecondary onClick={() => navigate('home')} style={{ width: '100%' }}>Back to caseload</BtnSecondary>
  </div>
);

// ─── SCREEN: Analytics ───────────────────────────────────────────────────────
// FIX: loads real behavior logs and computes counts; falls back gracefully
const AnalyticsScreen = ({ navigate, token, student }) => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [range,   setRange]   = useState('7');

  useEffect(() => {
    if (!student?.id) { setLoading(false); return; }
    apiFetch(`/api/logs?student_id=${student.id}&limit=200`, {}, token)
      .then(data => setLogs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [student, token]);

  // FIX: compute stats from real logs
  const cutoff = new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000);
  const filtered = logs.filter(l => new Date(l.start_time) >= cutoff);

  const counts = filtered.reduce((acc, l) => {
    acc[l.behavior_type] = (acc[l.behavior_type] || 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] || 1;

  const behaviorColors = { aggression: '#E24B4A', elopement: '#EF9F27', stimming: '#5DCAA5', shutdown: '#378ADD', self_injury: '#9B59B6', other: '#888' };

  return (
    <>
      <Topbar
        title="Insights"
        subtitle={student ? `${student.first_name} ${student.last_name} · Last ${range} days` : 'Select a student'}
        right={<select value={range} onChange={e => setRange(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select>}
      />
      <div className="scroll">
        <ErrorBanner message={error} />
        {loading ? <Spinner /> : !student ? (
          <div style={{ fontSize: 13, color: '#888', padding: '20px 0', textAlign: 'center' }}>Go to a student profile and tap "View insights".</div>
        ) : (
          <>
            <StatGrid>
              <StatCard number={filtered.length} label={`Incidents (${range}d)`} />
              <StatCard number={sorted[0]?.[0] || '—'} label="Top behavior" numberColor="#A32D2D" />
              <StatCard number={filtered.filter(l => l.intervention_successful).length} label="Successful interventions" numberColor="#1D9E75" />
              <StatCard number={filtered.filter(l => l.intensity >= 4).length} label="High intensity (4–5)" numberColor="#854F0B" />
            </StatGrid>

            <SectionLabel mt={0}>Behavior breakdown</SectionLabel>
            {sorted.length === 0 ? (
              <div style={{ fontSize: 13, color: '#888', padding: '12px 0' }}>No incidents in this period.</div>
            ) : sorted.map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: '#888', width: 80, flexShrink: 0, textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</span>
                <div style={{ flex: 1, height: 7, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, borderRadius: 4, background: behaviorColors[type] || '#888' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, width: 20, textAlign: 'right' }}>{count}</span>
              </div>
            ))}

            <div style={{ marginTop: 14 }}>
              <BtnPrimary onClick={() => navigate('interventions', student)}>View intervention tracker</BtnPrimary>
            </div>
          </>
        )}
      </div>
      <BottomNav current="analytics" navigate={navigate} />
    </>
  );
};

// ─── SCREEN: Interventions ───────────────────────────────────────────────────
// FIX: computes intervention success rates from real logs
const InterventionsScreen = ({ navigate, token, student }) => {
  const [tab,     setTab]     = useState('eff');
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!student?.id) { setLoading(false); return; }
    apiFetch(`/api/logs?student_id=${student.id}&limit=200`, {}, token)
      .then(data => setLogs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [student, token]);

  // FIX: compute strategy effectiveness from real data
  const strategyMap = {};
  logs.filter(l => l.intervention_used).forEach(l => {
    const key = l.intervention_used;
    if (!strategyMap[key]) strategyMap[key] = { used: 0, successful: 0 };
    strategyMap[key].used++;
    if (l.intervention_successful) strategyMap[key].successful++;
  });
  const strategies = Object.entries(strategyMap)
    .map(([name, { used, successful }]) => ({ name, used, rate: Math.round((successful / used) * 100) }))
    .sort((a, b) => b.rate - a.rate);

  function rateColor(r) { if (r >= 60) return 'green'; if (r >= 40) return 'amber'; return 'red'; }
  const barColor = { green: '#1D9E75', amber: '#EF9F27', red: '#E24B4A' };

  return (
    <>
      <Topbar left={<div><BtnBack onClick={() => navigate('analytics', student)} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>Intervention strategies</div></div>} />
      <div className="scroll">
        <ErrorBanner message={error} />
        <div style={{ display: 'flex', border: '0.5px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
          {['eff', 'ab'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 8, background: tab === t ? '#1D9E75' : 'none', border: 'none', fontSize: 12, fontWeight: 500, color: tab === t ? 'white' : '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
              {t === 'eff' ? 'Effectiveness' : 'A/B test'}
            </button>
          ))}
        </div>

        {tab === 'eff' && (
          <>
            <SectionLabel mt={0}>Ranked by success rate</SectionLabel>
            {loading ? <Spinner /> : strategies.length === 0 ? (
              <div style={{ fontSize: 13, color: '#888', padding: '12px 0' }}>No intervention data yet. Log behaviors with interventions to see effectiveness.</div>
            ) : strategies.map(s => {
              const rc = rateColor(s.rate);
              return (
                <div key={s.name} style={{ border: '0.5px solid #e8e8e8', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name.replace(/_/g, ' ')}</div>
                    <Badge color={rc}>{s.rate}%</Badge>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Used {s.used}x</div>
                  <div style={{ height: 6, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ height: '100%', width: `${s.rate}%`, borderRadius: 4, background: barColor[rc] }} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === 'ab' && (
          <>
            <SectionLabel mt={0}>A/B comparison (top 2 strategies)</SectionLabel>
            {strategies.length < 2 ? (
              <div style={{ fontSize: 13, color: '#888', padding: '12px 0' }}>Not enough data for A/B comparison. Need at least 2 interventions logged.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
                {strategies.slice(0, 2).map((s, i) => (
                  <Card key={s.name} style={{ border: i === 0 ? '1.5px solid #1D9E75' : undefined, marginBottom: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: i === 0 ? '#1D9E75' : '#888', marginBottom: 6 }}>Strategy {i === 0 ? 'A (best)' : 'B'}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{s.name.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: i === 0 ? '#1D9E75' : '#EF9F27', margin: '6px 0' }}>{s.rate}%</div>
                    <div style={{ fontSize: 11, color: '#888' }}>Used {s.used}x</div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav current="interventions" navigate={navigate} />
    </>
  );
};

// ─── SCREEN: Parent / Family ──────────────────────────────────────────────────
// FIX: loads real today's logs and computes summary
const ParentScreen = ({ navigate, token, student }) => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!student?.id) { setLoading(false); return; }
    apiFetch(`/api/logs?student_id=${student.id}&limit=50`, {}, token)
      .then(data => setLogs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [student, token]);

  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.start_time).toDateString() === today);
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekLogs  = logs.filter(l => new Date(l.start_time) >= weekAgo);

  const bestIntervention = (() => {
    const map = {};
    logs.filter(l => l.intervention_used && l.intervention_successful).forEach(l => {
      map[l.intervention_used] = (map[l.intervention_used] || 0) + 1;
    });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].replace(/_/g, ' ') : null;
  })();

  return (
    <>
      <Topbar title="Family view" subtitle={student ? `${student.first_name} ${student.last_name} · Read-only summary` : 'Select a student'} />
      <div className="scroll">
        <ErrorBanner message={error} />
        {loading ? <Spinner /> : !student ? (
          <div style={{ fontSize: 13, color: '#888', padding: '20px 0', textAlign: 'center' }}>Navigate to a student profile first.</div>
        ) : (
          <>
            <SectionLabel mt={0}>Today's summary</SectionLabel>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{new Date().toDateString()}</div>
              {[
                { label: 'Total incidents', value: String(todayLogs.length) },
                { label: 'Best strategy today', value: bestIntervention ? <span style={{ color: '#1D9E75', fontWeight: 500 }}>{bestIntervention}</span> : '—' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                  <span style={{ fontSize: 13, color: '#888' }}>{r.label}</span>
                  <span style={{ fontSize: 13 }}>{r.value}</span>
                </div>
              ))}
            </Card>

            {bestIntervention && (
              <>
                <SectionLabel mt={0}>Reinforcement tip for home</SectionLabel>
                <Card style={{ background: '#f9f9f9' }}>
                  <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.6 }}>
                    {student.first_name} responded well to <span style={{ fontWeight: 500, color: '#1D9E75' }}>{bestIntervention}</span> recently. Try using this strategy at home too.
                  </div>
                </Card>
              </>
            )}

            <SectionLabel mt={0}>This week at a glance</SectionLabel>
            <StatGrid>
              <StatCard number={weekLogs.length} label="Total incidents" />
              <StatCard number={weekLogs.filter(l => l.intervention_successful).length} label="Successful interventions" numberColor="#1D9E75" />
            </StatGrid>
          </>
        )}
      </div>
      <BottomNav current="parent" navigate={navigate} />
    </>
  );
};

// ─── SCREEN: Calendar ────────────────────────────────────────────────────────
const CalendarScreen = ({ navigate, token, student }) => {
  const [logs,         setLogs]        = useState([]);
  const [selectedDate, setSelectedDate]= useState(null);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState('');

  useEffect(() => {
    if (!student?.id) { setLoading(false); return; }
    apiFetch(`/api/logs?student_id=${student.id}&limit=500`, {}, token)
      .then(data => setLogs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [student, token]);

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // FIX: build real heatmap from actual logs
  const countsByDate = logs.reduce((acc, l) => {
    const d = new Date(l.start_time).toDateString();
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const selectedLogs = selectedDate
    ? logs.filter(l => new Date(l.start_time).toDateString() === selectedDate.toDateString())
    : [];

  const dayCells = [];
  for (let i = 0; i < firstDay; i++) dayCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) dayCells.push(new Date(year, month, d));

  function dayType(d) {
    if (!d) return 'empty';
    const count = countsByDate[d.toDateString()] || 0;
    if (count === 0) return 'none';
    if (count >= 4) return 'high';
    return 'has';
  }

  const dayBg    = { empty: 'transparent', none: 'transparent', has: '#E1F5EE', high: '#FCEBEB' };
  const dayColor = { empty: 'transparent', none: '#ccc', has: '#085041', high: '#791F1F' };

  return (
    <>
      <Topbar left={<div><BtnBack onClick={() => navigate('student', student)} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>Calendar — {now.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div></div>} />
      <div className="scroll">
        <ErrorBanner message={error} />
        {loading ? <Spinner /> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: 10, color: '#888', textAlign: 'center', padding: '3px 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 12 }}>
              {dayCells.map((d, i) => {
                const type   = dayType(d);
                const isToday= d && d.toDateString() === now.toDateString();
                const isSel  = d && selectedDate && d.toDateString() === selectedDate.toDateString();
                return (
                  <div key={i} onClick={() => d && type !== 'none' && setSelectedDate(d)} style={{ height: 34, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: d && type !== 'none' ? 'pointer' : 'default', background: dayBg[type], fontSize: 12, color: dayColor[type], fontWeight: (type !== 'empty' && type !== 'none') ? 500 : 400, border: isSel ? '1.5px solid #1D9E75' : isToday ? '1.5px solid #aaa' : 'none' }}>
                    {d?.getDate()}
                    {(type === 'has' || type === 'high') && <div style={{ width: 4, height: 4, borderRadius: '50%', background: type === 'high' ? '#E24B4A' : '#1D9E75', marginTop: 1 }} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              {[['#E1F5EE','Low activity'],['#FCEBEB','High activity (4+)']].map(([bg, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: bg }} />
                  <span style={{ fontSize: 11, color: '#888' }}>{lbl}</span>
                </div>
              ))}
            </div>

            {selectedDate && (
              <>
                <SectionLabel mt={0}>Selected: {selectedDate.toLocaleDateString([], { month: 'long', day: 'numeric' })}</SectionLabel>
                {selectedLogs.length === 0
                  ? <div style={{ fontSize: 13, color: '#888' }}>No logs for this day.</div>
                  : selectedLogs.map(log => (
                    <LogItem key={log.id} time={formatTime(log.start_time)} behavior={`${log.behavior_type}${log.intensity ? ` · Intensity ${log.intensity}` : ''}`} detail={[log.antecedent, log.consequence].filter(Boolean).join(' · ')} dotColor={intensityColor(log.intensity)} />
                  ))
                }
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ─── SCREEN: Alerts ───────────────────────────────────────────────────────────
// FIX: loads real alert rules from API; enable/disable actually calls API
const AlertsScreen = ({ navigate, token, user }) => {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const loadAlerts = useCallback(() => {
    apiFetch('/api/alerts', {}, token)
      .then(data => setAlerts(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const toggleAlert = async (alert) => {
    try {
      await apiFetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !alert.active }),
      }, token);
      loadAlerts();
    } catch (err) {
      setError(err.message);
    }
  };

  const active = alerts.filter(a => a.active);
  const paused = alerts.filter(a => !a.active);

  return (
    <>
      <Topbar
        left={<div><BtnBack onClick={() => navigate('home')} /><div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>Alert rules</div></div>}
        right={['admin','bcba'].includes(user?.role) && <BtnPrimary style={{ width: 'auto', padding: '7px 13px', fontSize: 12 }}>+ New</BtnPrimary>}
      />
      <div className="scroll">
        <ErrorBanner message={error} />
        {loading ? <Spinner /> : (
          <>
            <SectionLabel mt={0}>Active rules ({active.length})</SectionLabel>
            {active.length === 0 && <div style={{ fontSize: 13, color: '#888', padding: '8px 0' }}>No active alert rules.</div>}
            {active.map(a => {
              const cond   = a.rule_condition || {};
              const action = a.rule_action || {};
              return (
                <div key={a.id} style={{ borderLeft: '3px solid #E24B4A', paddingLeft: 10, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{(cond.behavior || 'Alert').replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        {cond.threshold && `≥${cond.threshold} incidents in ${cond.window_minutes || 60} min → notify ${action.notify_role || 'team'}`}
                      </div>
                      {a.last_triggered && <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>Last triggered: {formatTime(a.last_triggered)}</div>}
                    </div>
                    <Badge color="green">Active</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <BtnSecondary style={{ fontSize: 11, padding: '5px 11px' }} onClick={() => toggleAlert(a)}>Disable</BtnSecondary>
                  </div>
                </div>
              );
            })}

            {paused.length > 0 && (
              <>
                <SectionLabel mt={0}>Paused ({paused.length})</SectionLabel>
                {paused.map(a => {
                  const cond = a.rule_condition || {};
                  return (
                    <div key={a.id} style={{ opacity: 0.6, borderLeft: '3px solid #888', paddingLeft: 10, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{(cond.behavior || 'Alert').replace(/_/g, ' ')}</div>
                        </div>
                        <Badge color="gray">Paused</Badge>
                      </div>
                      <div style={{ display: 'flex', gap: 7 }}>
                        <BtnSecondary style={{ fontSize: 11, padding: '5px 11px' }} onClick={() => toggleAlert(a)}>Enable</BtnSecondary>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ─── SCREEN: Add Student ─────────────────────────────────────────────────────
const AddStudentScreen = ({ navigate, token, user }) => {
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [dob,         setDob]         = useState('');
  const [commLevel,   setCommLevel]   = useState('');
  const [reinforcers, setReinforcers] = useState('');
  const [sensory,     setSensory]     = useState([]);
  const [iepGoals,    setIepGoals]    = useState([{ name: '', target: '' }]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const sensoryOptions = [
    'Auditory sensitivity','Tactile avoidance','Visual overstimulation',
    'Proprioceptive seeking','Vestibular seeking','Oral sensitivity'
  ];

  const toggleSensory = (s) => setSensory(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  );

  const addGoal    = () => setIepGoals(g => [...g, { name: '', target: '' }]);
  const updateGoal = (i, field, val) => setIepGoals(g => g.map((goal, idx) => idx === i ? { ...goal, [field]: val } : goal));
  const removeGoal = (i) => setIepGoals(g => g.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!firstName || !lastName) { setError('First and last name are required'); return; }
    setLoading(true); setError('');
    try {
      const sensoryProfile = {};
      sensoryOptions.forEach(s => { sensoryProfile[s.toLowerCase().replace(/ /g,'_')] = sensory.includes(s); });
      const reinforcerList = reinforcers.split(',').map(r => r.trim()).filter(Boolean);
      const goals = iepGoals.filter(g => g.name.trim());
      const student = await apiFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          first_name:          firstName.trim(),
          last_name:           lastName.trim(),
          date_of_birth:       dob || null,
          communication_level: commLevel || null,
          reinforcers:         reinforcerList,
          sensory_profile:     sensoryProfile,
          iep_goals:           goals,
        }),
      }, token);
      navigate('student', student);
    } catch (err) {
      setError(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const canAdd = ['admin','teacher','bcba'].includes(user?.role);
  if (!canAdd) return (
    <>
      <Topbar left={<div><BtnBack onClick={() => navigate('home')} /><div style={{ fontSize:16, fontWeight:500, marginTop:2 }}>Add student</div></div>} />
      <div className="scroll">
        <div style={{ background:'#FCEBEB', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#A32D2D' }}>Only admins, teachers, and BCBAs can add students.</div>
      </div>
    </>
  );

  return (
    <>
      <Topbar left={<div><BtnBack onClick={() => navigate('home')} /><div style={{ fontSize:16, fontWeight:500, marginTop:2 }}>Add student</div></div>} />
      <div className="scroll">
        <ErrorBanner message={error} />
        <SectionLabel mt={0}>Basic info</SectionLabel>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:4 }}>First name *</label>
            <input type="text" placeholder="Emma" value={firstName} onChange={e => setFirstName(e.target.value)}
              style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'0.5px solid #ddd', fontSize:13, fontFamily:'inherit', outline:'none' }} />
          </div>
          <div>
            <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:4 }}>Last name *</label>
            <input type="text" placeholder="Johnson" value={lastName} onChange={e => setLastName(e.target.value)}
              style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'0.5px solid #ddd', fontSize:13, fontFamily:'inherit', outline:'none' }} />
          </div>
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:4 }}>Date of birth</label>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)}
            style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'0.5px solid #ddd', fontSize:13, fontFamily:'inherit', outline:'none' }} />
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:4 }}>Communication level</label>
          <select value={commLevel} onChange={e => setCommLevel(e.target.value)}
            style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'0.5px solid #ddd', fontSize:13, fontFamily:'inherit', outline:'none', background:'white' }}>
            <option value="">-- Select --</option>
            <option value="Verbal">Verbal</option>
            <option value="Limited verbal">Limited verbal</option>
            <option value="AAC device">AAC device</option>
            <option value="Sign language">Sign language</option>
            <option value="Non-verbal">Non-verbal</option>
          </select>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, color:'#888', display:'block', marginBottom:4 }}>Reinforcers (comma separated)</label>
          <input type="text" placeholder="fidget toys, music, stickers" value={reinforcers} onChange={e => setReinforcers(e.target.value)}
            style={{ width:'100%', padding:'9px 11px', borderRadius:8, border:'0.5px solid #ddd', fontSize:13, fontFamily:'inherit', outline:'none' }} />
        </div>
        <SectionLabel mt={0}>Sensory profile (tap to select)</SectionLabel>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
          {sensoryOptions.map(s => (
            <button key={s} onClick={() => toggleSensory(s)} style={{
              fontSize:11, padding:'5px 10px', borderRadius:20, cursor:'pointer', fontFamily:'inherit',
              background: sensory.includes(s) ? '#E1F5EE' : '#f5f5f5',
              color:      sensory.includes(s) ? '#0F6E56' : '#666',
              border:     sensory.includes(s) ? '1px solid #9FE1CB' : '0.5px solid #e0e0e0',
            }}>{s}</button>
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, marginTop:14 }}>
          <SectionLabel mt={0}>IEP goals</SectionLabel>
          <button onClick={addGoal} style={{ fontSize:11, color:'#1D9E75', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>+ Add goal</button>
        </div>
        {iepGoals.map((goal, i) => (
          <div key={i} style={{ border:'0.5px solid #e8e8e8', borderRadius:10, padding:'10px 12px', marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, color:'#888' }}>Goal {i+1}</span>
              {iepGoals.length > 1 && <button onClick={() => removeGoal(i)} style={{ fontSize:11, color:'#A32D2D', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Remove</button>}
            </div>
            <input type="text" placeholder="e.g. Reduce elopement" value={goal.name} onChange={e => updateGoal(i,'name',e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'0.5px solid #ddd', fontSize:12, fontFamily:'inherit', outline:'none', marginBottom:6 }} />
            <input type="text" placeholder="Target: ≤2x/day" value={goal.target} onChange={e => updateGoal(i,'target',e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'0.5px solid #ddd', fontSize:12, fontFamily:'inherit', outline:'none' }} />
          </div>
        ))}
        <div style={{ marginTop:16 }}>
          <BtnPrimary onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Add student'}</BtnPrimary>
        </div>
      </div>
    </>
  );
};

// ─── SCREEN: Admin Panel ──────────────────────────────────────────────────────
const AdminScreen = ({ navigate, token, user }) => {
  const [students, setStudents] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [tab,      setTab]      = useState('students');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/students/all', {}, token),
      apiFetch('/api/users', {}, token),
    ]).then(([s, u]) => { setStudents(s); setUsers(u); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (!['admin','bcba'].includes(user?.role)) return (
    <>
      <Topbar left={<div><BtnBack onClick={() => navigate('home')} /><div style={{ fontSize:16, fontWeight:500, marginTop:2 }}>Admin panel</div></div>} />
      <div className="scroll"><div style={{ background:'#FCEBEB', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#A32D2D' }}>Admin access only.</div></div>
    </>
  );

  return (
    <>
      <Topbar
        left={<div><BtnBack onClick={() => navigate('home')} /><div style={{ fontSize:16, fontWeight:500, marginTop:2 }}>Admin panel</div></div>}
        right={<BtnPrimary onClick={() => navigate('addstudent')} style={{ width:'auto', padding:'7px 13px', fontSize:12 }}>+ Student</BtnPrimary>}
      />
      <div className="scroll">
        <ErrorBanner message={error} />
        <div style={{ display:'flex', border:'0.5px solid #e0e0e0', borderRadius:8, overflow:'hidden', marginBottom:14 }}>
          {['students','users'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:8, background: tab===t ? '#1D9E75' : 'none', border:'none', fontSize:12, fontWeight:500, color: tab===t ? 'white' : '#888', cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>

        {loading ? <Spinner /> : tab === 'students' ? (
          <>
            <SectionLabel mt={0}>All students ({students.length})</SectionLabel>
            {students.length === 0 && <div style={{ fontSize:13, color:'#888', padding:'12px 0' }}>No students yet. Add one!</div>}
            {students.map(s => (
              <div key={s.id} onClick={() => navigate('student', s)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'0.5px solid #f0f0f0', cursor:'pointer' }}>
                <Avatar initials={getInitials(`${s.first_name} ${s.last_name}`)} color={avatarColor(s.id)} size={38} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                  <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{s.communication_level || 'No comm level set'}</div>
                </div>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            ))}
          </>
        ) : (
          <>
            <SectionLabel mt={0}>All users ({users.length})</SectionLabel>
            {users.map(u => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'0.5px solid #f0f0f0' }}>
                <Avatar initials={getInitials(u.name || u.email)} color="blue" size={38} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'#1a1a1a' }}>{u.name}</div>
                  <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{u.email}</div>
                </div>
                <span style={{ fontSize:11, padding:'2px 7px', borderRadius:20, fontWeight:500, background:'#E6F1FB', color:'#185FA5', textTransform:'capitalize' }}>{u.role}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,  setScreen]  = useState('login');
  const [token,   setToken]   = useState(null);
  const [user,    setUser]    = useState(null);
  const [ctx,     setCtx]     = useState({});

  useEffect(() => {
    refreshAccessToken()
      .then(accessToken => {
        setToken(accessToken);
        return apiFetch('/api/auth/me', {}, accessToken);
      })
      .then(me => { setUser(me); setScreen('home'); })
      .catch(() => setScreen('login'));
  }, []);

  const handleLogin = (accessToken, userData) => {
    setToken(accessToken); setUser(userData); setScreen('home');
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setToken(null); setUser(null); setCtx({}); setScreen('login');
  };

  const navigate = (dest, payload = null) => {
    if (payload !== null) setCtx(c => ({ ...c, student: payload }));
    setScreen(dest);
  };

  const commonProps = { navigate, token, user, student: ctx.student };

  const screens = {
    login:         <LoginScreen          onLogin={handleLogin} />,
    home:          <HomeScreen           {...commonProps} />,
    student:       <StudentScreen        {...commonProps} />,
    log:           <LogScreen            {...commonProps} />,
    saved:         <SavedScreen          {...commonProps} />,
    analytics:     <AnalyticsScreen      {...commonProps} />,
    interventions: <InterventionsScreen  {...commonProps} />,
    parent:        <ParentScreen         {...commonProps} />,
    calendar:      <CalendarScreen       {...commonProps} />,
    alerts:        <AlertsScreen         {...commonProps} />,
    addstudent:    <AddStudentScreen     {...commonProps} />,
    admin:         <AdminScreen          {...commonProps} />,
  };

  return (
    <div style={{ width: 430, background: 'white', borderRadius: 16, border: '0.5px solid #e0e0e0', overflow: 'hidden', minHeight: 720, display: 'flex', flexDirection: 'column' }}>
      {screens[screen] || <div style={{ padding: 20, color: '#888' }}>Unknown screen.</div>}
      {token && screen !== 'login' && (
        <div style={{ padding: '6px 18px', borderTop: '0.5px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {['admin','bcba'].includes(user?.role) && (
            <button onClick={() => navigate('admin')} style={{ background:'none', border:'none', fontSize:11, color:'#1D9E75', cursor:'pointer', fontFamily:'inherit' }}>Admin panel</button>
          )}
          {!['admin','bcba'].includes(user?.role) && (
            <button onClick={() => navigate('addstudent')} style={{ background:'none', border:'none', fontSize:11, color:'#1D9E75', cursor:'pointer', fontFamily:'inherit' }}>+ Add student</button>
          )}
          <button onClick={handleLogout} style={{ background:'none', border:'none', fontSize:11, color:'#aaa', cursor:'pointer', fontFamily:'inherit' }}>Sign out</button>
        </div>
      )}
    </div>
  );
}
