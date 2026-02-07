import React, { useEffect, useState } from 'react';
import { fetchAllMyBots, MyBotAdminDTO } from '../services/mybotAdminApi';

const attributeSum = (bot: MyBotAdminDTO) => {
  if (!bot.attributes) return 0;
  // Considera força, velocidade, inteligência, resistência
  const { strength = 0, speed = 0, intelligence = 0, resistance = 0 } = bot.attributes;
  return strength + speed + intelligence + resistance;
};

export const MyBotsLeaderboard: React.FC = () => {
  const [bots, setBots] = useState<MyBotAdminDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBots = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllMyBots();
        setBots(data);
      } catch (err) {
        setError('Erro ao carregar bots.');
      } finally {
        setLoading(false);
      }
    };
    loadBots();
  }, []);

  // Ordena bots pela soma dos atributos
  const sortedBots = bots.slice().sort((a, b) => attributeSum(b) - attributeSum(a));
  const topBots = sortedBots.slice(0, 3);

  return (
    <div className="mybots-leaderboard" style={{ maxWidth: 700, margin: '0 auto', background: 'var(--bg-dark, #18181b)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #0002', overflowX: 'auto' }}>
      <h3 style={{ color: 'var(--text-light, #f3f4f6)', fontSize: 18, marginBottom: 12 }}>Placar dos Bots</h3>
      {loading && <p style={{ color: 'var(--text-light, #f3f4f6)' }}>Carregando placar...</p>}
      {error && <p style={{ color: 'var(--text-light, #f87171)' }}>{error}</p>}
      {!loading && !error && topBots.length > 0 && (
        <table className="leaderboard-table" style={{ width: '100%', fontSize: 14, background: 'transparent', borderCollapse: 'collapse', tableLayout: 'auto', minWidth: 650 }}>
          <thead>
            <tr style={{ background: 'var(--bg-header, #23232a)' }}>
              <th style={{ color: 'var(--text-light, #e5e7eb)', padding: '10px 8px', minWidth: 70, whiteSpace: 'normal', textAlign: 'center' }}>Posição</th>
              <th style={{ color: 'var(--text-light, #e5e7eb)', padding: '10px 8px', minWidth: 80, whiteSpace: 'normal', textAlign: 'center' }}>Foto</th>
              <th style={{ color: 'var(--text-light, #e5e7eb)', padding: '10px 8px', minWidth: 160, whiteSpace: 'normal', textAlign: 'center' }}>Nome</th>
              <th style={{ color: 'var(--text-light, #e5e7eb)', padding: '10px 8px', minWidth: 180, whiteSpace: 'normal', textAlign: 'center' }}>Proprietário</th>
              <th style={{ color: 'var(--text-light, #e5e7eb)', padding: '10px 8px', minWidth: 90, whiteSpace: 'normal', textAlign: 'center' }}>Resultado</th>
              <th style={{ color: 'var(--text-light, #e5e7eb)', padding: '10px 8px', minWidth: 110, whiteSpace: 'normal', textAlign: 'center' }}>Valor mercado</th>
              <th style={{ color: 'var(--text-light, #e5e7eb)', padding: '10px 8px', minWidth: 90, whiteSpace: 'normal', textAlign: 'center' }}>À venda</th>
            </tr>
          </thead>
          <tbody>
            {topBots.map((bot, idx) => {
              const rowBg = idx === 0
                ? 'linear-gradient(90deg,#27272a,#18181b)'
                : idx === 1
                  ? '#23232a'
                  : '#1f1f23';
              const textColor = idx === 0 ? '#facc15' : idx === 1 ? '#60a5fa' : '#a3e635';
              return (
                <tr key={bot.userId} style={{ fontWeight: idx === 0 ? 'bold' : 'normal', background: rowBg }}>
                  <td style={{ color: textColor, padding: '4px 2px', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                    {bot.imageUrl ? (
                      <img src={bot.imageUrl} alt="MyBot" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', boxShadow: '0 1px 4px #0006', display: 'block', margin: '0 auto' }} />
                    ) : (
                      <span style={{color:'#888'}}>—</span>
                    )}
                  </td>
                  <td style={{ color: textColor, padding: '4px 2px', textAlign: 'center', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', maxWidth: 160 }}>{bot.name || '—'}</td>
                  <td style={{ color: '#e5e7eb', padding: '4px 2px', textAlign: 'center', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', maxWidth: 180 }}>{bot.ownerName || bot.myalienUserId || '—'}</td>
                  <td style={{ color: textColor, padding: '4px 2px', textAlign: 'center', fontWeight: 'bold' }}>{attributeSum(bot)}</td>
                  <td style={{ color: '#e5e7eb', padding: '4px 2px', textAlign: 'center' }}>
                    {typeof bot.marketValue === 'number' ? `R$ ${bot.marketValue.toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td style={{ color: '#e5e7eb', padding: '4px 2px', textAlign: 'center' }}>{bot.forSale ? 'À venda' : 'Não'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!loading && !error && topBots.length === 0 && <p style={{ color: 'var(--text-light, #e5e7eb)' }}>Nenhum bot encontrado.</p>}
    </div>
  );
};

