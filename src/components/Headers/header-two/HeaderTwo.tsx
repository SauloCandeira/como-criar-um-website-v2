import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../../LanguageSwitcher/LanguageSwitcher';
import { getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';

const HeaderTwo: React.FC = () => {
  const { t } = useTranslation();
  const goTopBtnRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY >= 800) {
        goTopBtnRef.current?.classList.remove('hidden');
      } else {
        goTopBtnRef.current?.classList.add('hidden');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginClick = () => navigate('/login');
  const handleLogoutClick = async () => {
    try {
      await signOut(getAuth());
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full h-[60px] flex items-center bg-[#092554]/90 shadow-sm z-[1000] transition-none">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between border-2 border-red-600 bg-red-500/5 px-4">
        <div className="flex items-center gap-5">
          <img
            src="/hk-logo.svg"
            alt="HK Logo"
            className="h-10 w-10 cursor-pointer transition-transform duration-300 hover:scale-110"
            onClick={() => navigate('/')}
          />
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <button
                className="flex items-center gap-1.5 whitespace-nowrap rounded bg-[#28a745] px-4 py-2.5 text-white transition-colors hover:bg-[#218838]"
                onClick={() => navigate('/dashboard')}
              >
                <i className="fas fa-user"></i> {t('myAccount')}
              </button>
              <button
                className="flex items-center gap-1.5 whitespace-nowrap rounded bg-[#007bff] px-4 py-2.5 text-white transition-colors hover:bg-[#0056b3]"
                onClick={handleLogoutClick}
              >
                <i className="fas fa-sign-out-alt"></i> {t('logout')}
              </button>
            </>
          ) : (
            <button
              className="flex items-center gap-1.5 whitespace-nowrap rounded bg-[#007bff] px-4 py-2.5 text-white transition-colors hover:bg-[#0056b3]"
              onClick={handleLoginClick}
            >
              <i className="fas fa-user"></i> {t('login')}
            </button>
          )}
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        ref={goTopBtnRef}
        className="fixed bottom-5 right-5 hidden cursor-pointer rounded-full bg-black/50 p-2.5 text-white transition-transform hover:scale-110"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <i className="fas fa-arrow-up text-2xl"></i>
      </button>
    </header>
  );
};

export default HeaderTwo;
