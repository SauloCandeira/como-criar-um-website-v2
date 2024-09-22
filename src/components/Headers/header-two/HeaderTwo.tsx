// HeaderTwo.tsx
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'; // Importa o useNavigate
import './HeaderTwo.css'; // Arquivo de estilos
import LanguageSwitcher from '../../LanguageSwitcher/LanguageSwitcher'; // Importa o componente LanguageSwitcher

const HeaderTwo: React.FC = () => {
  const { t } = useTranslation();
  const goTopBtnRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate(); // Inicializa o navigate

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY >= 800) {
        if (goTopBtnRef.current) {
          goTopBtnRef.current.classList.add('active');
        }
      } else {
        if (goTopBtnRef.current) {
          goTopBtnRef.current.classList.remove('active');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLoginClick = () => {
    navigate('/como-criar-um-website-v2/login'); // Navega para a página de login
  };

  return (
    <header>
      <div className="container">
        <LanguageSwitcher />
        <button className="btn-login" onClick={handleLoginClick}>
          <i className="fas fa-user"></i> {t('login')}
        </button>
      </div>
    </header>
  );
};

export default HeaderTwo;
