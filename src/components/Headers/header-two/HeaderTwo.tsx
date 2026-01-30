import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './HeaderTwo.css';
import LanguageSwitcher from '../../LanguageSwitcher/LanguageSwitcher';

// Firebase Auth
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';

interface HeaderTwoProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

const HeaderTwo: React.FC<HeaderTwoProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { t } = useTranslation();
  const goTopBtnRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [roleLabel, setRoleLabel] = useState<string | null>(null);

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

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const initial = saved === 'light' ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  useEffect(() => {
    const resolveRole = () => {
      const storedRole = localStorage.getItem('role');
      const permissionLevel = localStorage.getItem('permissionLevel');
      const roleFromPermission = permissionLevel === 'C' ? 'investor' : permissionLevel === 'B' ? 'admin' : 'user';
      const effectiveRole = storedRole || roleFromPermission;
      const labelMap: Record<string, string> = {
        admin: 'Administrador',
        user: 'Usuário',
        investor: 'Investidor',
      };
      setRoleLabel(labelMap[effectiveRole] || null);
    };
    resolveRole();
    window.addEventListener('storage', resolveRole);
    return () => window.removeEventListener('storage', resolveRole);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const handleLoginClick = () => {
    navigate('/account');
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
    navigate('/account');
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <header className="header-two">
      <div className="header-two__container">
        <div className="header-two__left">
          {onToggleSidebar && (
            <button
              type="button"
              className={`header-toggle ${sidebarCollapsed ? '' : 'open'}`}
              aria-label={sidebarCollapsed ? 'Abrir menu lateral' : 'Fechar menu lateral'}
              onClick={onToggleSidebar}
              title={roleLabel || undefined}
            >
              <span></span>
              <span></span>
              <span></span>
              {roleLabel && <span className="header-toggle__role">{roleLabel}</span>}
            </button>
          )}
          <img
            src="/hk-logo.svg"
            alt="HK Logo"
            className="header-logo"
            onClick={handleHomeClick}
          />
          <LanguageSwitcher />
        </div>

        {user ? (
          <div className="header-two__auth">
            <button
              type="button"
              className="header-theme-toggle"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {roleLabel !== 'Investidor' && (
              <button className="btn-account" onClick={handleMyAccountClick}>
                <i className="fas fa-user"></i>
              </button>
            )}
            <button className="btn-login" onClick={handleLogoutClick}>
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        ) : (
          <div className="header-two__auth">
            <button
              type="button"
              className="header-theme-toggle"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn-login" onClick={handleLoginClick}>
              <i className="fas fa-user"></i> {t('login')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderTwo;
