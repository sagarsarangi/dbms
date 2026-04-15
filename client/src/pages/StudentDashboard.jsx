import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, logout, executeQuery } from '../utils/api';
import Terminal from '../components/Terminal';
import { BedDouble, Utensils, ClipboardList, LogOut, CheckCircle, Ticket } from 'lucide-react';
import './Dashboard.css';

const PANELS = [
  {
    id: 'room',
    label: 'Room Info',
    icon: <BedDouble size={20} strokeWidth={2.5} />,
    context: 'room',
    welcome: `Room Management Terminal\nView your room assignment or request a room.\n\n• \`SELECT * FROM rooms\` — view rooms\n• \`INSERT INTO rooms\` — get assigned a room (FCFS)`
  },
  {
    id: 'mess',
    label: 'Mess Allotment',
    icon: <Utensils size={20} strokeWidth={2.5} />,
    context: 'mess',
    welcome: `Mess Allotment Terminal\nApply for mess or check your status.\n\n• \`SELECT * FROM mess_allotment\` — view allocation status\n• \`INSERT INTO mess VALUES ('V')\` — apply for Veg ('V') or Non-Veg ('N')`
  },
  {
    id: 'complaints',
    label: 'Complaints',
    icon: <ClipboardList size={20} strokeWidth={2.5} />,
    context: 'complaints',
    welcome: `Complaints Terminal\nFile or view your complaints.\n\n• \`SELECT * FROM complaints\` — view your complaints\n• \`INSERT INTO complaints VALUES ('your issue')\` — file a new complaint`
  }
];

export default function StudentDashboard() {
  const [activePanel, setActivePanel] = useState('room');
  const [stats, setStats] = useState({
    roomNo: '—',
    messType: '—',
    messStatus: '',
    complaints: '—'
  });
  const user = getUser();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [roomRes, messRes, complaintsRes] = await Promise.all([
        executeQuery('SELECT room_no FROM students', 'room'),
        executeQuery('SELECT mess_type, status FROM mess_allotment', 'mess'),
        executeQuery("SELECT * FROM complaints WHERE status = 'pending'", 'complaints')
      ]);

      const roomValue = roomRes.rows?.[0]?.room_no;
      const messRecord = messRes.rows?.[0];
      
      setStats({
        roomNo: roomValue ? roomValue : 'None',
        messType: messRecord ? (messRecord.mess_type === 'V' ? 'Veg' : 'Non-Veg') : 'None',
        messStatus: messRecord?.status ?? 'pending',
        complaints: (complaintsRes.rows?.length || 0).toString()
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  if (!user || user.role !== 'student') {
    navigate('/');
    return null;
  }

  const currentPanel = PANELS.find(p => p.id === activePanel);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <h2>SD Hall</h2>
          </div>

          <nav className="sidebar-menu">
            <div className="sidebar-label">Terminal Panels</div>
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
              <div className="nav-avatar">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="nav-user-info">
                <span className="nav-user-name">{user.name}</span>
                <span className="nav-user-role">{user.roll_id}</span>
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
                  <span className="stat-title">My Room</span>
                  <span className="stat-icon"><BedDouble size={18} opacity={0.6} /></span>
                </div>
                <div className="stat-value">{stats.roomNo}</div>
                <span className="stat-trend" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>Current Assignment</span>
              </div>
              <div className="card stat-card">
                <div className="stat-header">
                  <span className="stat-title">Mess Preference</span>
                  <span className="stat-icon"><Utensils size={18} color="#94a3b8" /></span>
                </div>
                <div className="stat-value">{stats.messType}</div>
                <span className="stat-trend" style={{ background: stats.messStatus === 'approved' ? '#ecfdf5' : '#fef3c7', color: stats.messStatus === 'approved' ? '#059669' : '#f59e0b' }}>
                  {stats.messStatus.charAt(0).toUpperCase() + stats.messStatus.slice(1)}
                </span>
              </div>
              <div className="card stat-card">
                <div className="stat-header">
                  <span className="stat-title">Open Tickets</span>
                  <span className="stat-icon"><Ticket size={18} color="#94a3b8" /></span>
                </div>
                <div className="stat-value">{stats.complaints}</div>
                <span className="stat-trend" style={{ background: stats.complaints === '0' ? '#f3f4f6' : '#fee2e2', color: stats.complaints === '0' ? '#64748b' : '#ef4444' }}>Pending Issues</span>
              </div>
              <div className="card stat-card">
                <div className="stat-header">
                  <span className="stat-title">Status</span>
                  <span className="stat-icon"><CheckCircle size={18} color="#94a3b8" /></span>
                </div>
                <div className="stat-value">Active</div>
                <span className="stat-trend" style={{ background: '#e0e7ff', color: '#4f46e5' }}>Verified Student</span>
              </div>
            </div>

            <div className="dashboard-grid" style={{ marginTop: '12px' }}>
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
