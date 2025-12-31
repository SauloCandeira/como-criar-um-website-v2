import React, { useState } from 'react';
import './Manager.css';
import CodeRunner from '../../components/CodeRunner/CodeRunner';
import ContentCourse from '../../components/ContentCourse/ContentCourse';
import Breadcrumble from '../../components/Breadcrumble/Breadcrumble';
import HeaderTwo from '../../components/Headers/header-two/HeaderTwo';
import TodoBoard from '../../components/TodoBoard/TodoBoard';
import TimelineBoard from '../../components/TimelineBoard/TimelineBoard';

const Manager: React.FC = () => {
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
            TASKS
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
              <TodoBoard/>
            </section>
          </>
        )}

        {/* EDITOR TAB */}
        {activeTab === 'editor' && (
          <section>
            < TimelineBoard />
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

export default Manager;
