import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/init-firebase'; 
import { signOut } from 'firebase/auth'; 
import './Dashboard.css';

const courses = [
  { id: 1, name: 'Curso de JavaScript', status: 'Em Andamento', progress: 60 },
  { id: 2, name: 'Curso de React', status: 'Concluído', progress: 100 },
  { id: 3, name: 'Curso de Python', status: 'Em Andamento', progress: 40 },
  { id: 4, name: 'Curso de HTML e CSS', status: 'Concluído', progress: 100 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("email");
  const userProfilePic = localStorage.getItem("profilePic");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate('/como-criar-um-website-v2/login'); 
    } catch (error) {
      console.error("Erro ao fazer logout: ", error);
    }
  };

  // ... código existente ...

return (
  <div className="dashboard-container">
    <header className="dashboard-header">
      <h1>Dashboard</h1>
      <div className="user-info">
        {userProfilePic && <img src={userProfilePic} alt="Profile" className="profile-pic" />}
        <span className="user-email">{userEmail}</span>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>
    </header>
    
    <div className="separator"></div> {/* Linha de separação */}

    <nav className="dashboard-menu">
      <button onClick={() => navigate('/video-aulas')} className="menu-button">Vídeo Aulas</button>
      <button onClick={() => navigate('/ebooks')} className="menu-button">eBooks</button>
    </nav>
    <main className="courses-section">
      <h2>Cursos Matriculados</h2>
      <ul className="courses-list">
        {courses.map(course => (
          <li key={course.id} className="course-item">
            <div className="course-info">
              <h3>{course.name}</h3>
              <p className="course-status">{course.status}</p>
            </div>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${course.progress}%` }}></div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  </div>
);

};

export default Dashboard;
