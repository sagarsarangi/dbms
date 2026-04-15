import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, logout, executeQuery } from '../utils/api';
import Terminal from '../components/Terminal';
import { Users, BedDouble, Utensils, ClipboardList, ShieldCheck, LogOut, Home, AlertCircle, Clock } from 'lucide-react';
import './Dashboard.css';

const PANELS = [{
    id: 'students',
    label: 'All Students',
    icon: <Users size={20} strokeWidth={2.5} />,
    context: 'students',
    welcome: `All Students Management\nView, add, or remove students.\n\n• \`SELECT * FROM students\` — view all students\n• \`DELETE FROM students WHERE roll_id = '...'\` — remove student (cascades)`
  },
  {
    id: 'rooms',
    label: 'Room Occupancy',
    icon: <BedDouble size={20} strokeWidth={2.5} />,
    context: 'rooms',
    welcome: `Room Occupancy Management\nView and manage room allocations.\n\n• \`SELECT * FROM rooms\` — view all rooms\n• \`SELECT * FROM rooms WHERE current_occupancy > 0\` — occupied rooms\n• \`UPDATE rooms SET current_occupancy = 0 WHERE room_no = ...\` — reset room`
  },
  {
    id: 'mess',
    label: 'Mess Management',
    icon: <Utensils size={20} strokeWidth={2.5} />,
    context: 'mess',
    welcome: `Mess Management Terminal\nApprove or reject mess applications.\n\n• \`SELECT * FROM mess_allotment\` — view all applications\n• \`UPDATE mess_allotment SET status = 'approved' WHERE roll_id = '...'\``
  },
  {
    id: 'complaints',
    label: 'Complaints',
    icon: <ClipboardList size={20} strokeWidth={2.5} />,
    context: 'complaints',
    welcome: `Complaints Management\nView and resolve complaints.\n\n• \`SELECT * FROM complaints\` — view all complaints\n• \`SELECT * FROM complaints WHERE status = 'pending'\`\n• \`UPDATE complaints SET status = 'resolved' WHERE complaint_id = '...'\``
  },
  {
    id: 'whitelist',
    label: 'Whitelist',
    icon: <ShieldCheck size={20} strokeWidth={2.5} />,
    context: 'whitelist',
    welcome: `Whitelist Management\nManage student whitelist for registration.\n\n• \`SELECT * FROM whitelist\` — view all whitelisted students\n• \`INSERT INTO whitelist (roll_id, name, phone, branch) VALUES ('...', '...', '...', '...')\`\n• \`DELETE FROM whitelist WHERE roll_id = '...'\``
  }
];

export default function WardenDashboard() {
  const [activePanel, setActivePanel] = useState('students');
  const [stats, setStats] = useState({
    totalStudents: '—',
    occupiedRooms: '—',
    pendingComplaints: '—',
    pendingMess: '—'
  });
  const user = getUser();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, roomsRes, complaintsRes, messRes] = await Promise.all([
        executeQuery('SELECT COUNT(*) as count FROM students', 'students'),
        executeQuery('SELECT COUNT(*) as count FROM rooms WHERE current_occupancy > 0', 'rooms'),
        executeQuery("SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'", 'complaints'),
        executeQuery("SELECT COUNT(*) as count FROM mess_allotment WHERE status = 'pending'", 'mess')
      ]);

      setStats({
        totalStudents: studentsRes.rows?.[0]?.count ?? '0',
        occupiedRooms: roomsRes.rows?.[0]?.count ?? '0',
        pendingComplaints: complaintsRes.rows?.[0]?.count ?? '0',
        pendingMess: messRes.rows?.[0]?.count ?? '0'
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (!user || user.role !== 'warden') {
    navigate('/');
    return null;
  }

  const currentPanel = PANELS.find(p => p.id === activePanel);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">S</div>
          <h2>SD Hall</h2>
        </div>

        <nav className="sidebar-menu">
          <div className="sidebar-label">Management</div>
          {PANELS.map(panel => (
            <button
              key={panel.id}
              className={`sidebar-item ${activePanel === panel.id ? 'active' : ''}`}
              onClick={() => setActivePanel(panel.id)}
            >
              <span className="sidebar-item-icon">{panel.icon}</span>
              {panel.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="nav-avatar">W</div>
            <div className="nav-user-info">
              <span className="nav-user-name">Warden</span>
              <span className="nav-user-role">Administrator</span>
            </div>
          </div>

          <button className="sidebar-logout" onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={18} strokeWidth={2.5} /> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-content" style={{ paddingTop: '24px' }}>
          <div className="dashboard-stats">
            <div className="card stat-card dark">
              <div className="stat-header">
                <span className="stat-title">Total Students</span>
                <span className="stat-icon"><Users size={18} opacity={0.6} /></span>
              </div>
              <div className="stat-value">{stats.totalStudents}</div>
              <span className="stat-trend">Live Count</span>
            </div>
            <div className="card stat-card">
              <div className="stat-header">
                <span className="stat-title">Occupied Rooms</span>
                <span className="stat-icon"><Home size={18} color="#94a3b8" /></span>
              </div>
              <div className="stat-value">{stats.occupiedRooms}</div>
              <span className="stat-trend" style={{ background: '#f3f4f6', color: '#64748b' }}>Out of 100</span>
            </div>
            <div className="card stat-card">
              <div className="stat-header">
                <span className="stat-title">Issues</span>
                <span className="stat-icon"><AlertCircle size={18} color="#94a3b8" /></span>
              </div>
              <div className="stat-value">{stats.pendingComplaints}</div>
              <span className="stat-trend" style={{ background: '#fee2e2', color: '#ef4444' }}>Pending</span>
            </div>
            <div className="card stat-card">
              <div className="stat-header">
                <span className="stat-title">Mess Approval</span>
                <span className="stat-icon"><Clock size={18} color="#94a3b8" /></span>
              </div>
              <div className="stat-value">{stats.pendingMess}</div>
              <span className="stat-trend" style={{ background: '#fef3c7', color: '#f59e0b' }}>Pending</span>
            </div>
          </div>

          <div className="dashboard-grid">
            <Terminal
              key={activePanel}
              title={currentPanel.label}
              panelContext={currentPanel.context}
              welcomeMessage={currentPanel.welcome}
            />
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
