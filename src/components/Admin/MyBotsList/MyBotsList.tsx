
import React, { useEffect, useState } from 'react';
import './MyBotsList.css';
import { fetchAllMyBots, MyBotAdminDTO } from '../../../services/mybotAdminApi';
import MyBotModal from './MyBotModal';

const MyBotsList: React.FC = () => {
  const [myBots, setMyBots] = useState<MyBotAdminDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<MyBotAdminDTO | null>(null);

  useEffect(() => {
    const fetchMyBots = async () => {
      setLoading(true);
      try {
        const bots = await fetchAllMyBots();
        setMyBots(bots);
      } catch (err) {
        setError('Erro ao carregar MyBots.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyBots();
  }, []);

  if (loading) return <p>Carregando MyBots...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="mybots-list">
      <h2>MyBots Gerados</h2>
      <table>
        <thead>
          <tr>
            <th>Imagem</th>
            <th>User ID</th>
            <th>MyAlien User</th>
            <th>Stage</th>
            <th>Raridade</th>
            <th>Força</th>
            <th>Velocidade</th>
            <th>Inteligência</th>
            <th>Resistência</th>
            <th>Motivo</th>
            <th>Criado em</th>
            <th>Atualizado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {myBots.map((bot) => (
            <tr key={bot.userId}>
              <td>
                {bot.imageUrl ? (
                  <img src={bot.imageUrl} alt="MyBot" />
                ) : (
                  <span style={{color:'#888'}}>—</span>
                )}
              </td>
              <td>{bot.userId}</td>
              <td>{bot.myalienUserId}</td>
              <td>{bot.stage}</td>
              <td>{bot.rarity ? bot.rarity.charAt(0).toUpperCase() + bot.rarity.slice(1) : '—'}</td>
              <td>{bot.attributes?.strength ?? '—'}</td>
              <td>{bot.attributes?.speed ?? '—'}</td>
              <td>{bot.attributes?.intelligence ?? '—'}</td>
              <td>{bot.attributes?.endurance ?? '—'}</td>
              <td>{bot.stageReason}</td>
              <td>{bot.createdAt ? new Date(bot.createdAt).toLocaleString() : ''}</td>
              <td>{bot.updatedAt ? new Date(bot.updatedAt).toLocaleString() : ''}</td>
              <td>
                <button className="admin-btn" onClick={() => setSelectedBot(bot)}>
                  Visualizar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <MyBotModal bot={selectedBot} onClose={() => setSelectedBot(null)} />
    </div>
  );
};

export default MyBotsList;
