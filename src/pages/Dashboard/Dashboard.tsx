import React, { useState } from 'react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom'; // Certifique-se de importar o useNavigate
import Breadcrumble from '../../components/Breadcrumble/Breadcrumble';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

  const navigate = useNavigate(); // Inicialize o hook useNavigate

  const handleViewAllClick = () => {
    // Ao clicar no botão, navegar para a página de marketplace
    navigate('/como-criar-um-website-v2/course');
  };


  // Dados de cursos e projetos
  const courses = [
    { id: 1, title: 'Desenvolvimento web basico', status: 'Disponível' },
    { id: 2, title: 'Desenvolvimento web intermediario', status: 'Indisponível' },
  ];

  const enrolledCourses = [
    { id: 1, title: 'React Avançado', progress: 70 },
  ];

  const projects = [
    { id: 1, repository: 'meu-projeto', domain: 'meusite.com', hosting: 'GitHub Pages' },
    { id: 2, repository: 'outro-projeto', domain: 'outrosite.com', hosting: 'AWS' }
  ];

  const [filter] = useState<string[]>([]);

  return (
    <div className="admin-container">
      <Breadcrumble crumbs={filter} />

      <aside className="admin-sidebar">
        <h2>Admin</h2>
        <ul>
          <li className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
            HOME
          </li>
          <li className={activeTab === 'courses' ? 'active' : ''} onClick={() => setActiveTab('courses')}>
            CURSOS
          </li>
          <li className={activeTab === 'myCourses' ? 'active' : ''} onClick={() => setActiveTab('myCourses')}>
            MEUS CURSOS
          </li>
          <li className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}>
            PROJETO
          </li>
        </ul>
      </aside>

      <main className="admin-content">
        {activeTab === 'home' && (
          <section>
            <h2>Meu Curso Atual</h2>
            {enrolledCourses.map((course) => (
              <div key={course.id} className="course-item">
                <h3>{course.title}</h3>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${course.progress}%` }}></div>
                </div>
                <p>Progresso: {course.progress}%</p>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'courses' && (
          <section>
            <h2>Cursos Disponíveis</h2>
            <ul className="courses-list">
              {courses.map((course) => (
                <li key={course.id} className="course-item">
                  <div className="course-info">
                    <h3>{course.title}</h3>
                    <span className="course-status">{course.status}</span>
                  </div>
                  <button className="view-all-button" onClick={handleViewAllClick}>
                    Iniciar
                  </button>

                </li>
              ))}
            </ul>
          </section>
        )}

{activeTab === 'myCourses' && (
          <section>
            <h2>Meus Cursos</h2>
            <ul className="courses-list">
              {enrolledCourses.map((course) => (
                <li key={course.id} className="course-item">
                  <h3>{course.title}</h3>
                  <p>Progresso: {course.progress}%</p>
                  <div className="progress-bar">
                    <div className="progress" style={{ width: `${course.progress}%` }}></div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'projects' && (
          <section>
            <h2>Plataforma de Projetos</h2>
            <p>Gerencie seus repositórios e hospede seus projetos de forma simples.</p>
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Repositório</th>
                  <th>Domínio</th>
                  <th>Hospedagem</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <a href={`https://github.com/${project.repository}`} target="_blank" rel="noopener noreferrer">
                        {project.repository}
                      </a>
                    </td>
                    <td>
                      <a href={`https://registro.br/2/${project.domain}`} target="_blank" rel="noopener noreferrer">
                        {project.domain}
                      </a>
                    </td>
                    <td>
                      {project.hosting === 'GitHub Pages' ? (
                        <a href={`https://${project.repository}.github.io`} target="_blank" rel="noopener noreferrer">
                          {project.hosting}
                        </a>
                      ) : (
                        <a href="https://aws.amazon.com/" target="_blank" rel="noopener noreferrer">
                          AWS
                        </a>
                      )}
                    </td>
                    <td>
                    <button className="action-button" onClick={() => alert('Indo para admin do site')}>Admin</button>
                  </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
