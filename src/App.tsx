import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  ImagePlus,
  LocateFixed,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Radio,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Siren,
  X,
} from 'lucide-react';

type Incident = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  description: string;
  location: string;
  time: string;
  status: string;
  reporter: string;
  photo?: string;
};
type CommunityMessage = {
  id: string;
  text: string;
  time: string;
  author: string;
  location?: string;
};

const starterIncidents: Incident[] = [
  {
    id: 'dw-101',
    title: 'Suspicious vehicle driving slowly',
    category: 'Suspicious activity',
    urgency: 'High',
    description:
      'A dark vehicle has passed the same street several times. Please stay alert and report any useful details.',
    location: 'Drieziek, Section 2',
    time: '8 min ago',
    status: 'Active',
    reporter: 'Community member',
  },
  {
    id: 'dw-102',
    title: 'Streetlight not working',
    category: 'Infrastructure',
    urgency: 'Normal',
    description:
      'The streetlight near the walkway is out, making the path difficult to see after dark.',
    location: 'Near the local walkway',
    time: '24 min ago',
    status: 'Active',
    reporter: 'Community member',
  },
  {
    id: 'dw-103',
    title: 'Attempted phone snatching',
    category: 'Theft',
    urgency: 'High',
    description:
      'A resident reported an attempted phone snatching. Keep phones out of sight and avoid confronting anyone.',
    location: 'Near the shopping area',
    time: '41 min ago',
    status: 'Monitoring',
    reporter: 'Community member',
  },
];
const starterMessages: CommunityMessage[] = [
  {
    id: 'msg-1',
    text: 'Please keep the gate area clear so emergency vehicles can pass.',
    time: '12 min ago',
    author: 'Community member',
  },
  {
    id: 'msg-2',
    text: 'Security volunteers are checking the main road. Please share verified updates only.',
    time: '31 min ago',
    author: 'Community member',
  },
];
const categories = [
  'All incidents',
  'Suspicious activity',
  'Theft',
  'Break-in',
  'Medical emergency',
  'Fire',
  'Missing person',
  'Infrastructure',
  'Other',
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function relativeTime() {
  return 'Just now';
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>(() =>
    load('drieziek-incidents', starterIncidents)
  );
  const [messages, setMessages] = useState<CommunityMessage[]>(() =>
    load('drieziek-messages', starterMessages)
  );
  const [filter, setFilter] = useState('All incidents');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'alerts' | 'messages'>('alerts');
  const [showReport, setShowReport] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Suspicious activity');
  const [urgency, setUrgency] = useState('High');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageLocation, setMessageLocation] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  );

  useEffect(() => {
    localStorage.setItem('drieziek-incidents', JSON.stringify(incidents));
  }, [incidents]);
  useEffect(() => {
    localStorage.setItem('drieziek-messages', JSON.stringify(messages));
  }, [messages]);

  const visibleIncidents = useMemo(
    () =>
      incidents.filter(
        item =>
          (filter === 'All incidents' || item.category === filter) &&
          (item.title + ' ' + item.description + ' ' + item.location)
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [incidents, filter, query]
  );
  const highPriority = incidents.filter(
    item => item.urgency === 'High' && item.status !== 'Resolved'
  ).length;

  function captureLocation() {
    if (!navigator.geolocation) {
      setNotice(
        'Location is not supported by this browser. Enter the location manually.'
      );
      return;
    }
    setNotice('Requesting location permission…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation(
          pos.coords.latitude.toFixed(5) +
            ', ' +
            pos.coords.longitude.toFixed(5)
        );
        setNotice('Location captured. Check it before sharing.');
      },
      () =>
        setNotice(
          'Could not access location. You can type the incident location instead.'
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  function choosePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Choose an image under 5 MB for this demo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ''));
    reader.readAsDataURL(file);
    setFormError('');
  }
  function submitIncident(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError(
        'Add an incident title and a short description before sending.'
      );
      return;
    }
    const item: Incident = {
      id: 'dw-' + Date.now(),
      title: title.trim(),
      category,
      urgency,
      description: description.trim(),
      location: location.trim() || 'Location not provided',
      time: relativeTime(),
      status: 'Active',
      reporter: 'You',
      photo: photo || undefined,
    };
    setIncidents(current => [item, ...current]);
    setSelectedIncident(item);
    setShowReport(false);
    setActiveTab('alerts');
    setFilter('All incidents');
    setTitle('');
    setDescription('');
    setLocation('');
    setPhoto('');
    setFormError('');
    setNotice(
      'Incident saved on this device. In this prototype, it is not sent to other users or emergency services.'
    );
  }
  function submitMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!messageText.trim()) return;
    setMessages(current => [
      {
        id: 'msg-' + Date.now(),
        text: messageText.trim(),
        time: relativeTime(),
        author: 'You',
        location: messageLocation.trim() || undefined,
      },
      ...current,
    ]);
    setMessageText('');
    setMessageLocation('');
    setNotice(
      'Message saved on this device. It is not broadcast to other users in this prototype.'
    );
  }
  function updateStatus(item: Incident) {
    const next = item.status === 'Resolved' ? 'Active' : 'Resolved';
    setIncidents(current =>
      current.map(row => (row.id === item.id ? { ...row, status: next } : row))
    );
    setSelectedIncident({ ...item, status: next });
  }

  return (
    <div className="app-shell">
      <aside className={'sidebar ' + (showMobileNav ? 'sidebar-open' : '')}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={25} />
          </div>
          <div>
            <strong>Drieziek Watch</strong>
            <span>Community safety network</span>
          </div>
          <button
            className="icon-btn mobile-close"
            aria-label="Close menu"
            onClick={() => setShowMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="area-pill">
          <span className="live-dot" />
          <span>DRIEZIEK COMMUNITY</span>
          <ChevronDown size={14} />
        </div>
        <nav className="side-nav">
          <button
            className={activeTab === 'alerts' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setActiveTab('alerts');
              setShowMobileNav(false);
            }}
          >
            <Radio size={18} />
            <span>Incident alerts</span>
            <span className="nav-count">{incidents.length}</span>
          </button>
          <button
            className={
              activeTab === 'messages' ? 'nav-item active' : 'nav-item'
            }
            onClick={() => {
              setActiveTab('messages');
              setShowMobileNav(false);
            }}
          >
            <MessageCircle size={18} />
            <span>Community messages</span>
          </button>
        </nav>
        <div className="side-label">QUICK FILTERS</div>
        <div className="quick-filters">
          <button
            onClick={() => {
              setFilter('All incidents');
              setActiveTab('alerts');
            }}
            className={
              filter === 'All incidents' && activeTab === 'alerts'
                ? 'quick active'
                : 'quick'
            }
          >
            <span className="filter-dot all" />
            All incidents<span>{incidents.length}</span>
          </button>
          <button
            onClick={() => {
              setFilter('Suspicious activity');
              setActiveTab('alerts');
            }}
            className={
              filter === 'Suspicious activity' ? 'quick active' : 'quick'
            }
          >
            <span className="filter-dot warning" />
            Suspicious activity
          </button>
          <button
            onClick={() => {
              setFilter('Theft');
              setActiveTab('alerts');
            }}
            className={filter === 'Theft' ? 'quick active' : 'quick'}
          >
            <span className="filter-dot danger" />
            Theft
          </button>
          <button
            onClick={() => {
              setFilter('Medical emergency');
              setActiveTab('alerts');
            }}
            className={
              filter === 'Medical emergency' ? 'quick active' : 'quick'
            }
          >
            <span className="filter-dot medical" />
            Medical emergency
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <Shield size={19} />
            </div>
            <strong>Stay safe together</strong>
            <p>
              Share verified information. Never put yourself at risk to collect
              evidence.
            </p>
          </div>
          <div className="profile">
            <div className="avatar">DW</div>
            <div>
              <strong>Community guest</strong>
              <span>Prototype access</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn menu-toggle"
            aria-label="Open menu"
            onClick={() => setShowMobileNav(true)}
          >
            <Menu size={21} />
          </button>
          <div className="crumb">
            <span>Drieziek</span>
            <span className="crumb-sep">/</span>
            <strong>
              {activeTab === 'alerts'
                ? 'Incident alerts'
                : 'Community messages'}
            </strong>
          </div>
          <div className="top-actions">
            <span className="prototype-badge">
              <span /> Prototype mode
            </span>
            <button
              className="icon-btn notification-btn"
              aria-label="Notifications"
              onClick={() =>
                setNotice('Notifications are not connected in this prototype.')
              }
            >
              <Bell size={19} />
              <i />
            </button>
            <div className="avatar top-avatar">DW</div>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="live-dot" /> COMMUNITY SAFETY UPDATES
              </div>
              <h1>
                Look out for <em>each other.</em>
              </h1>
              <p className="intro">
                A safer Drieziek starts with people looking out for one another.
                Share incidents, useful details and verified updates.
              </p>
            </div>
            <button
              className="primary-btn report-top"
              onClick={() => {
                setShowReport(true);
                setFormError('');
              }}
            >
              <Plus size={18} /> Report an incident
            </button>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon red">
                <Siren size={20} />
              </div>
              <div>
                <span>Active incidents</span>
                <strong>
                  {incidents.filter(i => i.status !== 'Resolved').length}
                </strong>
                <small>Community reports</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span>High priority</span>
                <strong>{highPriority}</strong>
                <small>Needs attention</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span>Resolved today</span>
                <strong>
                  {incidents.filter(i => i.status === 'Resolved').length}
                </strong>
                <small>Marked by community</small>
              </div>
            </div>
          </section>

          <div className="notice-bar">
            <AlertOctagon size={18} />
            <p>
              <strong>Prototype notice:</strong> Reports, photos and messages
              are saved only in this browser. They are not sent to security
              teams or other users yet.
            </p>
            <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
          {notice && (
            <div className="toast" role="status">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button
                onClick={() => setNotice('')}
                aria-label="Dismiss message"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {activeTab === 'alerts' ? (
            <section className="feed-layout">
              <div className="feed-main">
                <div className="section-heading">
                  <div>
                    <h2>Latest incidents</h2>
                    <p>Updates shared by the community</p>
                  </div>
                  <span className="feed-live">
                    <span className="live-dot" /> Local feed
                  </span>
                </div>
                <div className="feed-toolbar">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="Search incidents"
                      placeholder="Search incidents or locations..."
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setQuery('')}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <div className="filter-wrap">
                    <Filter size={16} />
                    <select
                      aria-label="Filter incidents"
                      value={filter}
                      onChange={e => setFilter(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="incident-list">
                  {visibleIncidents.map(item => (
                    <article className="incident-card" key={item.id}>
                      <div
                        className={
                          'incident-marker ' +
                          (item.urgency === 'High'
                            ? 'marker-high'
                            : 'marker-normal')
                        }
                      >
                        {item.urgency === 'High' ? (
                          <AlertTriangle size={20} />
                        ) : (
                          <Activity size={20} />
                        )}
                      </div>
                      <div className="incident-body">
                        <div className="incident-topline">
                          <span className="category-label">
                            {item.category}
                          </span>
                          <span
                            className={
                              'priority ' +
                              (item.urgency === 'High'
                                ? 'priority-high'
                                : 'priority-normal')
                            }
                          >
                            {item.urgency === 'High'
                              ? 'High priority'
                              : 'Standard'}
                          </span>
                          <span className="time-label">
                            <Clock3 size={13} />
                            {item.time}
                          </span>
                        </div>
                        <button
                          className="incident-title"
                          onClick={() => setSelectedIncident(item)}
                        >
                          {item.title}
                        </button>
                        <p className="incident-description">
                          {item.description}
                        </p>
                        {item.photo && (
                          <span className="attachment-label">
                            <Camera size={13} /> Photo attached
                          </span>
                        )}
                        <div className="incident-footer">
                          <span>
                            <MapPin size={14} />
                            {item.location}
                          </span>
                          <span
                            className={
                              'status-pill ' +
                              (item.status === 'Resolved'
                                ? 'status-resolved'
                                : '')
                            }
                          >
                            {item.status === 'Resolved' ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <span className="status-dot" />
                            )}
                            {item.status}
                          </span>
                          <button
                            className="text-action"
                            onClick={() => setSelectedIncident(item)}
                          >
                            View details <ArrowDownRight size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {visibleIncidents.length === 0 && (
                    <div className="empty-state">
                      <Search size={27} />
                      <strong>No incidents found</strong>
                      <p>Try a different search or category filter.</p>
                      <button
                        className="secondary-btn"
                        onClick={() => {
                          setQuery('');
                          setFilter('All incidents');
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <aside className="feed-aside">
                <div className="aside-card area-card">
                  <div className="aside-title">
                    <div>
                      <MapPin size={17} />
                      <strong>Community area</strong>
                    </div>
                    <span className="tiny-status">Demo</span>
                  </div>
                  <div className="map-placeholder">
                    <div className="map-road road-one" />
                    <div className="map-road road-two" />
                    <div className="map-road road-three" />
                    <div className="map-block block-one" />
                    <div className="map-block block-two" />
                    <div className="map-block block-three" />
                    <div className="map-pin pin-one">
                      <MapPin size={17} />
                    </div>
                    <div className="map-pin pin-two">
                      <MapPin size={17} />
                    </div>
                    <div className="map-center">
                      <ShieldCheck size={20} />
                    </div>
                    <span className="map-caption">Drieziek</span>
                  </div>
                  <p className="map-note">
                    Map preview only. Incident pins are not connected to a live
                    map yet.
                  </p>
                </div>
                <div className="aside-card safety-card">
                  <div className="safety-icon">
                    <ShieldCheck size={19} />
                  </div>
                  <h3>Safety reminder</h3>
                  <p>
                    Keep a safe distance. Do not confront suspects or share
                    unverified names and accusations.
                  </p>
                  <div className="safety-link">
                    Your safety comes first <Shield size={13} />
                  </div>
                </div>
                <button
                  className="outline-report"
                  onClick={() => setShowReport(true)}
                >
                  <Plus size={17} /> Send a community alert
                </button>
              </aside>
            </section>
          ) : (
            <section className="messages-layout">
              <div className="section-heading">
                <div>
                  <h2>Community messages</h2>
                  <p>Short updates and useful information</p>
                </div>
                <span className="feed-live">
                  <MessageCircle size={14} /> {messages.length} messages
                </span>
              </div>
              <form className="message-compose" onSubmit={submitMessage}>
                <label htmlFor="message-text">Share a community update</label>
                <textarea
                  id="message-text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Share a helpful, verified update..."
                  rows={3}
                />
                <div className="compose-bottom">
                  <div className="message-location">
                    <MapPin size={15} />
                    <input
                      value={messageLocation}
                      onChange={e => setMessageLocation(e.target.value)}
                      placeholder="Location (optional)"
                    />
                  </div>
                  <button
                    className="primary-btn"
                    type="submit"
                    disabled={!messageText.trim()}
                  >
                    <Send size={16} /> Post message
                  </button>
                </div>
              </form>
              <div className="message-list">
                {messages.map(m => (
                  <article className="message-card" key={m.id}>
                    <div className="avatar message-avatar">
                      {m.author === 'You' ? 'YOU' : 'DW'}
                    </div>
                    <div className="message-content">
                      <div className="message-meta">
                        <strong>{m.author}</strong>
                        <span>{m.time}</span>
                      </div>
                      <p>{m.text}</p>
                      {m.location && (
                        <span className="message-place">
                          <MapPin size={13} />
                          {m.location}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <footer className="footer">
            <span>
              Drieziek Watch <span className="footer-dot">•</span> Community-led
              safety
            </span>
            <span>Share responsibly. Stay safe.</span>
          </footer>
        </div>
      </main>

      {showReport && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowReport(false);
          }}
        >
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">COMMUNITY REPORT</span>
                <h2 id="report-title">Report an incident</h2>
                <p>Share the details that can help people stay aware.</p>
              </div>
              <button
                className="icon-btn"
                aria-label="Close report form"
                onClick={() => setShowReport(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitIncident}>
              <label htmlFor="incident-title">
                Incident title <span>*</span>
              </label>
              <input
                id="incident-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Suspicious activity near the park"
              />
              <div className="form-row">
                <div>
                  <label htmlFor="incident-category">Incident type</label>
                  <select
                    id="incident-category"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    {categories
                      .filter(c => c !== 'All incidents')
                      .map(c => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="incident-urgency">Priority</label>
                  <select
                    id="incident-urgency"
                    value={urgency}
                    onChange={e => setUrgency(e.target.value)}
                  >
                    <option>High</option>
                    <option>Normal</option>
                  </select>
                </div>
              </div>
              <label htmlFor="incident-description">
                What happened? <span>*</span>
              </label>
              <textarea
                id="incident-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what you saw. Avoid assumptions or unverified names."
              />
              <label htmlFor="incident-location">Incident location</label>
              <div className="location-input">
                <MapPin size={17} />
                <input
                  id="incident-location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Street, landmark, or coordinates"
                />
                <button
                  type="button"
                  onClick={captureLocation}
                  title="Use my current location"
                >
                  <LocateFixed size={16} /> Use GPS
                </button>
              </div>
              <p className="field-hint">
                Only share a location you are comfortable making visible to the
                community.
              </p>
              <label>
                Photo evidence <span className="optional">(optional)</span>
              </label>
              <label className="photo-drop">
                {photo ? (
                  <>
                    <img
                      src={photo}
                      alt="Selected incident attachment preview"
                    />
                    <span>Photo attached — click to change</span>
                  </>
                ) : (
                  <>
                    <ImagePlus size={22} />
                    <span>
                      <strong>Add a photo</strong>
                      <small>Image files only, up to 5 MB</small>
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => choosePhoto(e.target.files?.[0])}
                />
              </label>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="privacy-note">
                <ShieldCheck size={17} />
                <p>
                  Prototype only: do not rely on this form for emergencies. It
                  does not contact police, private security, or other users.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowReport(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  <Siren size={17} /> Save incident report
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedIncident && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelectedIncident(null);
          }}
        >
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">INCIDENT DETAILS</span>
                <h2 id="detail-title">{selectedIncident.title}</h2>
              </div>
              <button
                className="icon-btn"
                aria-label="Close incident details"
                onClick={() => setSelectedIncident(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="detail-badges">
              <span className="category-label">
                {selectedIncident.category}
              </span>
              <span
                className={
                  'priority ' +
                  (selectedIncident.urgency === 'High'
                    ? 'priority-high'
                    : 'priority-normal')
                }
              >
                {selectedIncident.urgency} priority
              </span>
              <span className="status-pill">{selectedIncident.status}</span>
            </div>
            <p className="detail-description">{selectedIncident.description}</p>
            {selectedIncident.photo && (
              <img
                className="detail-photo"
                src={selectedIncident.photo}
                alt="Incident attachment"
              />
            )}
            <div className="detail-location">
              <MapPin size={18} />
              <div>
                <small>Reported location</small>
                <strong>{selectedIncident.location}</strong>
              </div>
            </div>
            <div className="detail-location">
              <Clock3 size={18} />
              <div>
                <small>Reported</small>
                <strong>
                  {selectedIncident.time} · {selectedIncident.reporter}
                </strong>
              </div>
            </div>
            <div className="privacy-note">
              <ShieldCheck size={17} />
              <p>
                Location and photo are stored locally in this prototype. Public
                sharing and responder notification are not enabled.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="secondary-btn"
                onClick={() => setSelectedIncident(null)}
              >
                Close
              </button>
              <button
                className="primary-btn"
                onClick={() => updateStatus(selectedIncident)}
              >
                {selectedIncident.status === 'Resolved' ? (
                  <Activity size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}{' '}
                Mark{' '}
                {selectedIncident.status === 'Resolved' ? 'active' : 'resolved'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
