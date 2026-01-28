import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Breadcrumble.css';  // Certifique-se de que o CSS esteja no mesmo diretório ou ajuste o caminho

export interface BreadcrumbleItem {
  label: string;
  to?: string;
}

interface BreadcrumbleProps {
  crumbs: BreadcrumbleItem[];
  navigateTo?: string;
}

const Breadcrumble: React.FC<BreadcrumbleProps> = ({ crumbs, navigateTo }) => {
  const navigate = useNavigate();  // Usando o hook useNavigate para navegação programática

  // Se não há crumbs, não renderizar nada
  if (!crumbs || crumbs.length === 0) {
    return null;
  }

  // Função de navegação para a rota especificada
  const handleNavigate = () => {
    if (navigateTo) {
      navigate(navigateTo);  // Redireciona para a rota definida no prop 'navigateTo'
    }
  };

  return (
    <div className="breadcrumble">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`}>
          {crumb.to ? (
            <Link to={crumb.to}>{crumb.label}</Link>
          ) : (
            <span>{crumb.label}</span>
          )}
          {index < crumbs.length - 1 && ' > '}
        </span>
      ))}

      {navigateTo && (
        <button onClick={handleNavigate} className="navigate-button">
          Navegar para {navigateTo}
        </button>
      )}
    </div>
  );
};

export default Breadcrumble;
