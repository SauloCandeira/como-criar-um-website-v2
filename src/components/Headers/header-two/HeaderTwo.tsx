import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './HeaderTwo.css';
import LanguageSwitcher from '../../LanguageSwitcher/LanguageSwitcher';

// Firebase Auth
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';

const HeaderTwo: React.FC = () => {
  const { t } = useTranslation();
  const goTopBtnRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  // Detecta scroll para mostrar botão "voltar ao topo" (se houver)
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

  // Detecta se usuário está logado
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleLogoutClick = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      setUser(null);
      navigate('/'); // ou para outra rota desejada
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleMyAccountClick = () => {
    navigate('/dashboard'); // ou a rota da conta do usuário
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <header>
      <div className="container">
        <div className="header-left">
          <img
            src="/hk-logo.svg"
            alt="HK Logo"
            className="header-logo"
            onClick={handleHomeClick}
          />
          <LanguageSwitcher />
        </div>

        {user ? (
          <div className="auth-buttons">
            <button className="btn-account" onClick={handleMyAccountClick}>
              <i className="fas fa-user"></i> {t('myAccount')}
            </button>
            <button className="btn-login" onClick={handleLogoutClick}>
              <i className="fas fa-sign-out-alt"></i> {t('logout')}
            </button>
          </div>
        ) : (
          <button className="btn-login" onClick={handleLoginClick}>
            <i className="fas fa-user"></i> {t('login')}
          </button>
        )}
      </div>
    </header>
  );
};

export default HeaderTwo;
