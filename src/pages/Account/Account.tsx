import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/init-firebase';
import { fetchUserByEmail } from '../../services/usersApi';
import { fetchMasterEmail } from '../../services/settingsApi';
import './Account.css';

type PanelOption = {
  key: 'user' | 'admin' | 'investor';
  label: string;
  description: string;
  route: string;
};

const Account: React.FC = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [permissionLevel, setPermissionLevel] = useState<'A' | 'B' | 'C'>(
    (localStorage.getItem('permissionLevel') || 'A') as 'A' | 'B' | 'C'
  );
  const email = (localStorage.getItem('email') || '').toLowerCase();
  const [masterEmail, setMasterEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const [profile, master] = await Promise.all([
          fetchUserByEmail(email || user.email || ''),
          fetchMasterEmail()
        ]);
        const dbLevel = (profile?.permissionLevel || 'A') as 'A' | 'B' | 'C';
        setPermissionLevel(dbLevel);
        setMasterEmail(master || '');
        localStorage.setItem('permissionLevel', dbLevel);
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [email, navigate]);

  const options: PanelOption[] = [
    {
      key: 'user',
      label: 'Painel do Usuário',
      description: 'Acesso aos serviços liberados pelo admin e projetos públicos.',
      route: '/dashboard'
    },
    {
      key: 'admin',
      label: 'Painel do Admin',
      description: 'Gestão de usuários, projetos, produtos e relatórios.',
      route: '/admin'
    },
    {
      key: 'investor',
      label: 'Painel do Investidor',
      description: 'Visão de projetos, indicadores financeiros e planejamento.',
      route: '/investor'
    }
  ];

  const allowedKeys = (() => {
    if (masterEmail && email === masterEmail.toLowerCase()) return ['user', 'admin', 'investor'];
    if (permissionLevel === 'B') return ['user', 'admin'];
    if (permissionLevel === 'C') return ['user', 'investor'];
    return ['user'];
  })();

  const allowedOptions = options.filter((option) => allowedKeys.includes(option.key));

  const handleSelect = (route: string, key: PanelOption['key']) => {
    localStorage.setItem('role', key);
    navigate(route);
  };

  if (checkingAuth) {
    return (
      <LayoutPrivate>
        <section className="account-page">
          <header className="account-page__header">
            <h1>Minha Conta</h1>
            <p>Carregando permissões...</p>
          </header>
        </section>
      </LayoutPrivate>
    );
  }

  return (
    <LayoutPrivate>
      <section className="account-page">
        <header className="account-page__header">
          <h1>Minha Conta</h1>
          <p>Selecione o painel que deseja acessar.</p>
        </header>

        <div className="account-page__grid">
          {allowedOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className="account-card"
              onClick={() => handleSelect(option.route, option.key)}
            >
              <h3>{option.label}</h3>
              <p>{option.description}</p>
              <span>Acessar →</span>
            </button>
          ))}
        </div>
      </section>
    </LayoutPrivate>
  );
};

export default Account;
