import React from 'react';
import { Link, useNavigate } from 'react-router-dom';  // Usando o React Router para navegação
import './Breadcrumble.css';  // Certifique-se de que o CSS esteja no mesmo diretório ou ajuste o caminho

interface BreadcrumbleProps {
  crumbs: string[];  // Caminhos das páginas para o breadcrumb
  navigateTo?: string;  // Rota para redirecionamento
}

const Breadcrumble: React.FC<BreadcrumbleProps> = ({ crumbs, navigateTo }) => {
  const navigate = useNavigate();  // Usando o hook useNavigate para navegação programática

  // Função de navegação para a rota especificada
  const handleNavigate = () => {
    if (navigateTo) {
      navigate(navigateTo);  // Redireciona para a rota definida no prop 'navigateTo'
    }
  };

  return (
    <div className="breadcrumble">
      {/* Link para Home com ícone */}
      <span>
        <Link to="/como-criar-um-website-v2" className="home-link">
          <i className="fas fa-home"></i> Home
        </Link>
        {" > "}
      </span>
      {/* Exibindo os crumbs com links */}
      {crumbs.map((crumb, index) => (
        <span key={index}>
          <Link to={`/${crumb.toLowerCase().replace(/ /g, '-')}`}>
            {crumb}
          </Link>
          {index < crumbs.length - 1 && " > "}
        </span>
      ))}

      {/* Condicionalmente renderizando o botão de navegação */}
      {navigateTo && (
        <button onClick={handleNavigate} className="navigate-button">
          Navegar para {navigateTo}
        </button>
      )}
    </div>
  );
};

export default Breadcrumble;
