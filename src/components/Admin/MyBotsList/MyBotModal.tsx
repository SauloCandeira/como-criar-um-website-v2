import React from 'react';
import './MyBotModal.css';
import { MyBotAdminDTO } from '../../../services/mybotAdminApi';

interface MyBotModalProps {
  bot: MyBotAdminDTO | null;
  onClose: () => void;
}

const MyBotModal: React.FC<MyBotModalProps> = ({ bot, onClose }) => {
  if (!bot) return null;
  return (
    <div className="mybot-modal-backdrop" onClick={onClose}>
      <div className="mybot-modal" onClick={e => e.stopPropagation()}>
        <button className="mybot-modal-close" onClick={onClose}>×</button>
        <h2>Detalhes do MyBot</h2>
        <div className="mybot-modal-content">
          <div className="mybot-modal-img">
            {bot.imageUrl ? (
              <img src={bot.imageUrl} alt="MyBot" />
            ) : (
              <span className="mybot-modal-noimg">Sem imagem</span>
            )}
          </div>
          <table className="mybot-modal-table">
            <tbody>
              <tr><th>User ID</th><td>{bot.userId}</td></tr>
              <tr><th>MyAlien User</th><td>{bot.myalienUserId}</td></tr>
              <tr><th>Stage</th><td>{bot.stage}</td></tr>
              <tr><th>Raridade</th><td>{bot.rarity ? bot.rarity.charAt(0).toUpperCase() + bot.rarity.slice(1) : '—'}</td></tr>
              <tr><th>Força</th><td>{bot.attributes?.strength ?? '—'}</td></tr>
              <tr><th>Velocidade</th><td>{bot.attributes?.speed ?? '—'}</td></tr>
              <tr><th>Inteligência</th><td>{bot.attributes?.intelligence ?? '—'}</td></tr>
              <tr><th>Resistência</th><td>{bot.attributes?.endurance ?? '—'}</td></tr>
              <tr><th>Motivo</th><td>{bot.stageReason}</td></tr>
              <tr><th>Criado em</th><td>{bot.createdAt ? new Date(bot.createdAt).toLocaleString() : ''}</td></tr>
              <tr><th>Atualizado em</th><td>{bot.updatedAt ? new Date(bot.updatedAt).toLocaleString() : ''}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyBotModal;
