import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, Check,
  ChevronDown, CircleHelp, Clock3, Coffee, CreditCard, DollarSign,
  Ellipsis, Filter, Home, LayoutDashboard, Lightbulb, Plus, Receipt,
  RefreshCw, Search, Settings2, ShieldCheck, ShoppingBasket, Trash2,
  TrendingDown, TrendingUp, Users, Wallet, X, Zap
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';

const CATEGORIES = ['Groceries', 'Food', 'Utilities', 'Transport', 'Entertainment', 'Other'];
const CATEGORY_COLORS = ['#2D9D70', '#86C9A7', '#F2B66D', '#6E91D7', '#BA9AE8', '#9AA8A2'];
const ICONS = { Groceries: ShoppingBasket, Food: Coffee, Utilities: Zap, Transport: Activity, Entertainment: CreditCard, Other: Receipt };
const today = () => new Date().toISOString().slice(0, 10);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
const prettyDate = value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed. Is the backend running?');
  return payload;
}

function Avatar({ member, small = false }) {
  return <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ background: member?.color || '#DDF4E5' }}>{member?.initials || 'TS'}</span>;
}

function StatCard({ icon: Icon, label, value, foot, tone = 'green', trend }) {
  return <article className="stat-card">
    <div className={`stat-icon ${tone}`}><Icon size={19} /></div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    <div className={`stat-foot ${trend === 'down' ? 'positive' : ''}`}>{foot}</div>
  </article>;
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [roommates, setRoommates] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [activeNav, setActiveNav] = useState('Overview');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [dash, roomies, expenseData] = await Promise.all([
        api('/api/dashboard'), api('/api/roommates'), api('/api/expenses')
      ]);
      setDashboard(dash);
      setRoommates(roomies.roommates);
      setAllExpenses(expenseData.expenses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const notify = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const visibleExpenses = useMemo(() => allExpenses.filter(expense => {
    const matchesSearch = `${expense.title} ${expense.paidByName} ${expense.category}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (categoryFilter === 'All categories' || expense.category === categoryFilter);
  }).slice(0, 8), [allExpenses, searchTerm, categoryFilter]);

  const chartData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = day.toDateString();
      const total = allExpenses.filter(e => new Date(e.date).toDateString() === key)
        .reduce((sum, e) => sum + e.amount, 0);
      days.push({ day: day.toLocaleDateString('en-IN', { weekday: 'short' }), amount: total });
    }
    return days;
  }, [allExpenses]);

  const memberSpend = useMemo(() => roommates.map(member => ({
    ...member,
    amount: allExpenses.filter(e => e.paidBy === member.id).reduce((sum, e) => sum + e.amount, 0)
  })), [roommates, allExpenses]);

  async function addExpense(formData) {
    try {
      await api('/api/expenses', { method: 'POST', body: JSON.stringify(formData) });
      setShowExpenseModal(false);
      await loadData();
      notify('Expense saved to MongoDB');
    } catch (err) { setError(err.message); }
  }

  async function deleteExpense(id) {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await api(`/api/expenses/${id}`, { method: 'DELETE' });
      await loadData();
      notify('Expense deleted');
    } catch (err) { setError(err.message); }
  }

  async function saveBudget(amount) {
    try {
      await api('/api/budget', { method: 'PUT', body: JSON.stringify({ monthlyBudget: Number(amount) }) });
      setShowBudgetModal(false);
      await loadData();
      notify('Monthly budget updated');
    } catch (err) { setError(err.message); }
  }

  if (loading) return <div className="loading-screen"><div className="loading-mark"><Wallet /></div><strong>TrackMySpend</strong><span>Preparing your room dashboard…</span></div>;

  const prediction = dashboard?.prediction;
  const spent = dashboard?.totalSpent || 0;
  const budget = dashboard?.room?.monthlyBudget || 12000;
  const progress = Math.min(100, budget > 0 ? spent / budget * 100 : 0);
  const riskClass = prediction?.riskLevel || 'safe';

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Wallet size={21} /></div><div><strong>TrackMySpend</strong><span>ROOM FINANCE</span></div></div>
      <div className="room-switcher"><div className="room-icon"><Home size={18} /></div><div className="room-switch-text"><b>Maple Hostel</b><span>Room 204 · Shared</span></div><ChevronDown size={16} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav">
        {[['Overview', LayoutDashboard], ['Expenses', Receipt], ['Roommates', Users], ['Insights', Activity]].map(([label, Icon]) =>
          <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => {
            setActiveNav(label);
            if (label === 'Expenses') document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' });
            else if (label === 'Insights') document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth' });
            else if (label === 'Roommates') document.getElementById('roommates')?.scrollIntoView({ behavior: 'smooth' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }}><Icon size={18} /><span>{label}</span>{label === 'Expenses' && <span className="nav-count">{allExpenses.length}</span>}</button>
        )}
      </nav>
      <div className="sidebar-spacer" />
      <div className="budget-mini">
        <div className="mini-top"><span>MONTHLY BUDGET</span><button title="Edit budget" onClick={() => setShowBudgetModal(true)}><Settings2 size={15}/></button></div>
        <strong>{money(budget)}</strong>
        <div className="mini-progress"><span style={{ width: `${progress}%` }} /></div>
        <div className="mini-foot"><span>{money(Math.max(0, budget - spent))} left</span><span>{Math.round(progress)}%</span></div>
      </div>
      <div className="profile-row"><div className="profile-avatar">AS</div><div className="profile-meta"><b>Ananya Sharma</b><span>Room member</span></div><Ellipsis size={19} /></div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{activeNav}</b></div>
        <div className="top-actions"><span className="month-pill"><CalendarDays size={15}/>{prediction?.monthLabel || 'This month'}<ChevronDown size={14}/></span><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i /></button><div className="top-avatar">AS</div></div>
      </header>
      <div className="page-wrap">
        {error && <div className="error-banner"><CircleHelp size={18}/><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
        <section className="welcome-row">
          <div><div className="eyebrow"><span className="live-dot"/> YOUR ROOM, IN SYNC</div><h1>Good afternoon, Ananya <span className="wave">✦</span></h1><p>Here’s how your room is doing with money this month.</p></div>
          <div className="welcome-actions"><button className="button-secondary" onClick={loadData}><RefreshCw size={16}/> Refresh</button><button className="button-primary" onClick={() => setShowExpenseModal(true)}><Plus size={17}/> Add expense</button></div>
        </section>

        <section className="stat-grid">
          <StatCard icon={Wallet} label="Total spent this month" value={money(spent)} foot={<><span className="foot-dot green-dot"/> Across {dashboard?.expenseCount || 0} transactions</>} tone="green"/>
          <StatCard icon={TrendingDown} label="Budget remaining" value={money(budget - spent)} foot={<>{budget - spent >= 0 ? 'Available to spend' : 'Over your budget'}</>} tone="blue" trend="down"/>
          <StatCard icon={Activity} label="7-day spend velocity" value={`${money(prediction?.dailyVelocity)}/day`} foot={<><span className="foot-dot orange-dot"/> {money(prediction?.lastSevenDays)} in the last 7 days</>} tone="orange"/>
          <StatCard icon={Users} label="Roommates sharing" value={roommates.length} foot={<>Everyone in one place</>} tone="purple"/>
        </section>

        <section className={`prediction-banner ${riskClass}`}>
          <div className="prediction-symbol">{riskClass === 'danger' ? <Bell size={22}/> : riskClass === 'caution' ? <Lightbulb size={22}/> : <ShieldCheck size={22}/>}</div>
          <div className="prediction-copy"><div className="prediction-kicker">{riskClass === 'danger' ? 'BUDGET ALERT' : riskClass === 'caution' ? 'KEEP AN EYE ON SPENDING' : 'YOU’RE ON TRACK'} <span className="risk-tag">{riskClass === 'danger' ? 'High risk' : riskClass === 'caution' ? 'Watch' : 'Healthy pace'}</span></div>
            <h2>{riskClass === 'danger' ? `At this pace, your room may exceed its budget.` : riskClass === 'caution' ? 'Your spending deserves a closer look.' : 'Your room is looking good this month.'}</h2>
            <p>{prediction?.recommendation}</p>
            {prediction?.exhaustedDate && riskClass === 'danger' && <p className="exhaust-date">Estimated budget exhaustion: <b>{new Date(`${prediction.exhaustedDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</b></p>}
            {prediction?.dataLimited && <p className="limited-note">Forecast confidence is limited because fewer than 3 separate days of recent expense data are available.</p>}
          </div>
          <div className="forecast-total"><span>PROJECTED MONTH-END</span><strong>{money(prediction?.projectedMonthlySpend)}</strong><div className="forecast-budget">of {money(budget)} budget</div><div className="forecast-track"><span style={{ width: `${Math.min(100, (prediction?.projectedMonthlySpend || 0) / budget * 100)}%` }}/></div></div>
        </section>

        <section className="content-grid" id="insights">
          <article className="panel spending-panel">
            <div className="panel-heading"><div><h3>Spending overview</h3><p>Your day-by-day spend over the last week</p></div><button className="subtle-select">Last 7 days <ChevronDown size={14}/></button></div>
            <div className="chart-summary"><strong>{money(prediction?.lastSevenDays)}</strong><span className="summary-note"><ArrowUpRight size={15}/> Recent 7-day spend</span></div>
            <div className="area-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 5, left: -16, bottom: 0 }}><defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#29966A" stopOpacity={0.22}/><stop offset="100%" stopColor="#29966A" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#E8EEE9"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8A9890', fontSize: 12 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8A9890', fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v}/><Tooltip formatter={v => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E3EAE5', boxShadow: '0 8px 24px #10251d12' }}/><Area type="monotone" dataKey="amount" stroke="#23875F" strokeWidth={2.5} fill="url(#spendFill)" activeDot={{ r: 5, fill: '#23875F', stroke: '#fff', strokeWidth: 2 }}/></AreaChart></ResponsiveContainer></div>
            <div className="chart-footer"><span><i className="legend-dot"/> Daily expenses</span><span className="chart-footer-right"><span className="soft-pill">7-day view</span></span></div>
          </article>

          <article className="panel category-panel">
            <div className="panel-heading"><div><h3>Spending by category</h3><p>Where the money goes</p></div><button className="more-button" aria-label="Category options"><Ellipsis size={19}/></button></div>
            {dashboard?.categories?.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dashboard.categories} dataKey="value" nameKey="name" innerRadius={63} outerRadius={87} paddingAngle={3} stroke="none"><>{dashboard.categories.map((entry, i) => <Cell key={entry.name} fill={CATEGORY_COLORS[CATEGORIES.indexOf(entry.name) % CATEGORY_COLORS.length] || CATEGORY_COLORS[i % CATEGORY_COLORS.length]}/>)}</></Pie><Tooltip formatter={v => money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(spent)}</strong><span>Total spent</span></div></div><div className="category-legend">{dashboard.categories.slice(0, 4).map((item, i) => <div className="category-row" key={item.name}><span className="category-name"><i style={{ background: CATEGORY_COLORS[CATEGORIES.indexOf(item.name) % CATEGORY_COLORS.length] || CATEGORY_COLORS[i] }}/>{item.name}</span><b>{money(item.value)}</b><span className="category-percent">{spent ? Math.round(item.value / spent * 100) : 0}%</span></div>)}</div></> : <div className="empty-chart"><div className="empty-icon"><Receipt/></div><b>No spending yet</b><span>Add an expense to see your category breakdown.</span></div>}
          </article>
        </section>

        <section className="panel transactions-panel" id="transactions">
          <div className="panel-heading transaction-heading"><div><h3>Recent transactions</h3><p>Stay up to date with your room’s shared expenses</p></div><button className="button-text" onClick={() => { setActiveNav('Expenses'); document.getElementById('transactions')?.scrollIntoView({ behavior: 'smooth' }); }}>View all <ArrowUpRight size={15}/></button></div>
          <div className="table-toolbar"><div className="search-box"><Search size={16}/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search expenses..." /></div><label className="filter-select"><Filter size={15}/><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={14}/></label></div>
          <div className="table-scroll"><table><thead><tr><th>EXPENSE</th><th>CATEGORY</th><th>PAID BY</th><th>DATE</th><th className="amount-col">AMOUNT</th><th></th></tr></thead><tbody>
            {visibleExpenses.map(expense => { const Icon = ICONS[expense.category] || Receipt; const member = roommates.find(m => m.id === expense.paidBy); return <tr key={expense._id}><td><div className="expense-cell"><div className={`expense-icon cat-${expense.category.toLowerCase()}`}><Icon size={17}/></div><div><b>{expense.title}</b><span>{expense.splitAmong?.length || 1} people sharing</span></div></div></td><td><span className="category-chip"><i style={{ background: CATEGORY_COLORS[CATEGORIES.indexOf(expense.category)] || CATEGORY_COLORS[5] }}/>{expense.category}</span></td><td><div className="payer-cell"><Avatar member={member} small/><span>{expense.paidByName}</span></div></td><td className="date-cell">{prettyDate(expense.date)}</td><td className="amount-col amount-cell">{money(expense.amount)}</td><td><button className="delete-button" title="Delete expense" onClick={() => deleteExpense(expense._id)}><Trash2 size={15}/></button></td></tr>; })}
          </tbody></table></div>
          {!visibleExpenses.length && <div className="empty-table"><Receipt size={24}/><b>No matching expenses</b><span>Try a different search or add a new expense.</span></div>}
          <div className="table-bottom"><span>Showing <b>{visibleExpenses.length}</b> of <b>{allExpenses.length}</b> transactions</span><span className="secure-note"><ShieldCheck size={14}/> Saved in your database</span></div>
        </section>

        <section className="bottom-grid" id="roommates">
          <article className="panel roommates-panel"><div className="panel-heading"><div><h3>Your roommates</h3><p>Shared budget members</p></div><span className="member-count">{roommates.length} members</span></div><div className="roommate-list">{memberSpend.map(member => <div className="roommate-row" key={member.id}><Avatar member={member}/><div className="roommate-name"><b>{member.name}</b><span>{member.id === 'ananya' ? 'You' : 'Room member'}</span></div><div className="roommate-total"><b>{money(member.amount)}</b><span>paid this month</span></div></div>)}</div></article>
          <article className="tip-card"><div className="tip-icon"><Lightbulb size={20}/></div><span className="tip-label">SMART MONEY TIP</span><h3>Small habits add up.</h3><p>Before the next shared order, check your category spend. A little planning today can give your room more breathing room at month-end.</p><div className="tip-bottom"><span>Made for shared living</span><span className="tip-spark">✳</span></div></article>
        </section>
        <footer className="footer"><span>© 2026 TrackMySpend · Spend smarter, together.</span><span><span className="footer-dot"/> Demo room connected</span></footer>
      </div>
    </main>

    {showExpenseModal && <ExpenseModal roommates={roommates} onClose={() => setShowExpenseModal(false)} onSave={addExpense}/>}
    {showBudgetModal && <BudgetModal budget={budget} onClose={() => setShowBudgetModal(false)} onSave={saveBudget}/>}
    {toast && <div className="toast"><span><Check size={16}/></span>{toast}</div>}
  </div>;
}

function ExpenseModal({ roommates, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [paidBy, setPaidBy] = useState('ananya');
  const [splitAmong, setSplitAmong] = useState(roommates.map(m => m.id));
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setFormError('');
    try { await onSave({ title, amount, category, paidBy, splitAmong, date, note }); }
    catch (err) { setFormError(err.message); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card"><div className="modal-header"><div><span className="modal-kicker">SHARED ROOM</span><h2>Add an expense</h2><p>Keep everyone in the loop.</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><form onSubmit={submit}>
    <label className="form-label">Expense name<input required maxLength="80" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekly groceries"/></label>
    <div className="form-two"><label className="form-label">Amount (₹)<input required type="number" min="1" max="1000000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/></label><label className="form-label">Date<input required type="date" value={date} max={today()} onChange={e => setDate(e.target.value)}/></label></div>
    <label className="form-label">Category<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
    <label className="form-label">Paid by<select value={paidBy} onChange={e => setPaidBy(e.target.value)}>{roommates.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
    <div className="form-label">Split with <span className="label-hint">Choose at least one roommate</span></div><div className="split-choices">{roommates.map(m => <label className={`split-choice ${splitAmong.includes(m.id) ? 'chosen' : ''}`} key={m.id}><input type="checkbox" checked={splitAmong.includes(m.id)} onChange={e => setSplitAmong(old => e.target.checked ? [...old, m.id] : old.filter(id => id !== m.id))}/><Avatar member={m} small/><span>{m.name.split(' ')[0]}</span>{splitAmong.includes(m.id) && <Check size={13}/>}</label>)}</div>
    <label className="form-label">Note <span className="label-hint">Optional</span><input maxLength="180" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a little context"/></label>
    {formError && <div className="form-error">{formError}</div>}
    <div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button-primary" disabled={saving || !splitAmong.length}>{saving ? 'Saving…' : <><Plus size={16}/> Save expense</>}</button></div>
  </form></section></div>;
}

function BudgetModal({ budget, onClose, onSave }) {
  const [amount, setAmount] = useState(String(budget));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  async function submit(e) {
    e.preventDefault(); setSaving(true); setFormError('');
    try { await onSave(amount); } catch (err) { setFormError(err.message); } finally { setSaving(false); }
  }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card budget-modal"><div className="modal-header"><div><span className="modal-kicker">ROOM SETTINGS</span><h2>Monthly budget</h2><p>Set a shared spending target for the room.</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><form onSubmit={submit}><label className="form-label">Monthly budget (₹)<input type="number" required min="100" max="10000000" step="100" value={amount} onChange={e => setAmount(e.target.value)}/></label><p className="budget-hint"><Lightbulb size={15}/> Your forecast will update automatically after saving.</p>{formError && <div className="form-error">{formError}</div>}<div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save budget'}</button></div></form></section></div>;
}

export default App;
