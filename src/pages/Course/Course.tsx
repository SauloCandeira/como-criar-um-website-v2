import React, { useState } from 'react';
import './Course.css';
import CodeRunner from '../../components/CodeRunner/CodeRunner';
import ContentCourse from '../../components/ContentCourse/ContentCourse';
import Breadcrumble from '../../components/Breadcrumble/Breadcrumble';
import HeaderTwo from '../../components/Headers/header-two/HeaderTwo';

const Course: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');

  const enrolledCourses = [
    { id: 1, title: 'React Avançado', progress: 70 },
  ];

  const [filter] = useState<string[]>([]);

  return (
    <div className="admin-container">
      <HeaderTwo/>
      <Breadcrumble crumbs={filter} />

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2>Admin</h2>
        <ul>
          <li className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
            HOME
          </li>
          <li className={activeTab === 'content' ? 'active' : ''} onClick={() => setActiveTab('content')}>
            CONTEÚDO
          </li>
          <li className={activeTab === 'editor' ? 'active' : ''} onClick={() => setActiveTab('editor')}>
            EDITOR
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="admin-content">

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <>
            <section>
              <h2>📚 Meu Curso Atual</h2>
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

            {/* NOVA SECTION: Metodologia do Curso */}
            <section className="course-methodology">
              <h2>🌟 Nossa Metodologia</h2>
              <p>
                Nosso curso é voltado para quem deseja aprender **HTML, CSS e JavaScript** de forma prática e eficiente.
                Acreditamos que a melhor forma de aprender é colocando a mão no código.
              </p>

              <ul>
                <li>✅ Aulas passo a passo com explicações claras.</li>
                <li>✅ Simulador de código exclusivo para testar seus aprendizados em tempo real.</li>
                <li>✅ Projeto final: você criará um site profissional com base no que aprendeu.</li>
                <li>✅ Suporte e atualizações constantes.</li>
              </ul>

              <p>
                Ao final do curso, você terá um **site completo e funcional**, além de dominar as bases para seguir como desenvolvedor web.
              </p>
            </section>
          </>
        )}

        {/* EDITOR TAB */}
        {activeTab === 'editor' && (
          <section>
            <h2>🧪 Editor de Código</h2>
            <CodeRunner />
          </section>
        )}

        {/* CONTENT TAB */}
        {activeTab === 'content' && (
          <section>
            <h2>📄 Conteúdo do Curso</h2>
            <ContentCourse />
          </section>
        )}

      </main>
    </div>
  );
};

export default Course;
