import React, { useState } from 'react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom'; // Certifique-se de importar o useNavigate
import Breadcrumble from '../../components/Breadcrumble/Breadcrumble';
import HeaderTwo from '../../components/Headers/header-two/HeaderTwo';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

  const navigate = useNavigate(); // Inicialize o hook useNavigate

  const handleViewAllClick = () => {
    // Ao clicar no botão, navegar para a página de marketplace
    navigate('/course');
  };


  const managerProject= () => {
    // Ao clicar no botão, navegar para a página de marketplace
    navigate('/manager');
  };



  const userInfo = {
    name: 'Saulo Candeira',
    enrollment: '202501234',
    status: 'Ativo',
    level: 'Junior',
    area: 'Front-end',
    stars: 4
  };
  
  

  // Dados de cursos e projetos
  const courses = [
    { id: 1, title: 'Desenvolvimento web basico', status: 'Disponível' }
  ];

  const inscritions = [
    { id: 2, title: 'Desenvolvimento web intermediario', status: 'Indisponível' },
  ];

  const enrolledCourses = [
    { id: 1, title: 'React Avançado', progress: 70 },
  ];

  const projects = [
    { id: 1, repository: 'Holding Kapital Technology', domain: 'hktech.com.br', hosting: 'GitHub Pages' },
    { id: 2, repository: 'Saulo L S Candeira', domain: 'saulocandeira.com.br', hosting: 'GitHub Pages' }
  ];

  const [filter] = useState<string[]>([]);

  return (
    <div className="admin-container">
      <HeaderTwo/>
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

     {/* Main Content */}
     <main className="admin-content">

      {/* HOME TAB */}
      {activeTab === 'home' && (
        <>

          {/* NOVA SECTION: Minha Conta */}
          <section className="account-info">
            <h2>👤 Minha Conta</h2>
            <div className="account-details">
              <p><strong>Nome:</strong> {userInfo.name}</p>
              <p><strong>Matrícula:</strong> {userInfo.enrollment}</p>
              <p><strong>Status:</strong> <span className={`status ${userInfo.status.toLowerCase()}`}>{userInfo.status}</span></p>
              <p><strong>Nível:</strong> {userInfo.level}</p>
              <p><strong>Área:</strong> {userInfo.area}</p>
              <p><strong>Estrelas:</strong> {'★'.repeat(userInfo.stars)}{'☆'.repeat(5 - userInfo.stars)}</p>
            </div>
          </section>




          {/* NOVA SECTION: Metodologia do Curso */}
          <section className="course-methodology">
          <h2>🚀 Nossa Metodologia Prática e Inovadora</h2>
          <p>
            Bem-vindo à nova geração de ensino digital! Nossa plataforma de cursos foi desenvolvida com foco total no <strong>desenvolvimento prático de projetos reais</strong>.
            Aqui, cada aula é uma oportunidade de colocar a mão na massa e criar algo do zero.
          </p>

          <ul>
            <li>🔧 Aprenda na prática a construir <strong>websites completos</strong>, sistemas interativos e até projetos de <strong>robótica</strong>.</li>
            <li>💡 Em vez de teoria isolada, cada módulo leva você a resolver problemas reais, como um verdadeiro desenvolvedor.</li>
            <li>🌐 Desenvolva diretamente na nossa plataforma com a <strong>IDE online exclusiva: Code Runner</strong>, sem precisar instalar nada.</li>
            <li>🎯 Acompanhamento contínuo com atualizações, novos desafios e suporte personalizado.</li>
          </ul>

          <p>
            Ao final de cada curso, você terá construído projetos reais que vão direto para seu portfólio, enquanto domina tecnologias como <strong>HTML, CSS, JavaScript</strong> e muito mais.
            Tudo isso em um ambiente feito para acelerar sua jornada como criador digital.
          </p>
        </section>
        </>
      )}

        {activeTab === 'courses' && (
                <>
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
          <section>
            <h2>Inscricoes abertas</h2>
            <ul className="courses-list">
              {inscritions.map((inscrition) => (
                <li key={inscrition.id} className="course-item">
                  <div className="course-info">
                    <h3>{inscrition.title}</h3>
                    <span className="course-status">{inscrition.status}</span>
                  </div>
                  <button className="view-all-button" onClick={handleViewAllClick}>
                    Inscrever
                  </button>

                </li>
              ))}
            </ul>
          </section>
                
                </>

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
                      <a href={`${project.domain}`} target="_blank" rel="noopener noreferrer">
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
                    <button className="action-button" onClick={managerProject}>Admin</button>
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
