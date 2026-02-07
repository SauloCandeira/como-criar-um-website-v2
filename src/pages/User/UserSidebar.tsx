export const UserSidebar: React.FC = () => {
  return (
    <aside className="user-sidebar">
      <ul className="sidebar-menu">
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/profile">Perfil</a></li>
        <li><a href="/mybots">MyBots</a></li>
        <li><a href="/dao">DAO - Governança</a></li>
        {/* Outros itens do menu... */}
      </ul>
    </aside>
  );
};