import React, { useEffect, useMemo, useState } from "react";
import {
  fetchAdminMyBotEcosystem,
  MyBotEcosystemBotDTO,
  MyBotEcosystemResponse,
  MyBotMapDTO,
  MyBotMovementDTO,
} from "../../services/adminMybotEcosystemApi";
import { fetchMyBotEcosystem } from "../../services/mybotEcosystemApi";
import "./MyBotsEcosystemMap.css";

interface Props {
  viewerId: string;
  mode?: "admin" | "user";
  showChallenge?: boolean;
  onChallenge?: (bot: MyBotEcosystemBotDTO) => void;
}

const sortByName = (a: MyBotMapDTO, b: MyBotMapDTO) => a.name.localeCompare(b.name);

const formatMovementReason = (reason: string) => {
  switch (reason) {
    case "battle_start":
      return "Batalha iniciada";
    case "battle_end":
      return "Batalha encerrada";
    case "origin_assigned":
      return "Origem definida";
    default:
      return reason;
  }
};

const MAP_ICON_FALLBACK: Record<string, string> = {
  "Arena Classica": "⚔️",
  "Deserto": "🏜️",
  "Floresta": "🌲",
  "Cidade em Ruinas": "🏚️",
  "Arena Tecnologica": "🛰️",
};

const DEFAULT_MAP_IDS = [
  "Arena Classica",
  "Floresta",
  "Deserto",
  "Cidade em Ruinas",
  "Arena Tecnologica",
];

const buildFallbackMaps = (mapIds: string[]) => {
  const total = mapIds.length;
  if (total === 0) return [];
  const centerX = 50;
  const centerY = 50;
  const radius = 32;
  return mapIds.map((id, index) => {
    const angle = (Math.PI * 2 * index) / total;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    return {
      id,
      name: id,
      positionX: Number(x.toFixed(2)),
      positionY: Number(y.toFixed(2)),
      icon: MAP_ICON_FALLBACK[id] || "🧭",
      visualMeta: {},
    } as MyBotMapDTO;
  });
};

export const MyBotsEcosystemMap: React.FC<Props> = ({
  viewerId,
  mode = "admin",
  showChallenge = false,
  onChallenge,
}) => {
  const [data, setData] = useState<MyBotEcosystemResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const isAdminMode = mode === "admin";

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = isAdminMode
        ? await fetchAdminMyBotEcosystem(viewerId, 800, 200)
        : await fetchMyBotEcosystem(viewerId, 800, 120);
      response.maps.sort(sortByName);
      setData(response);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Não foi possível carregar o ecossistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminMode && !viewerId) return;
    loadData();
  }, [viewerId, isAdminMode]);

  const botsByCurrentMap = useMemo(() => {
    const buckets: Record<string, MyBotEcosystemBotDTO[]> = {};
    (data?.bots ?? []).forEach((bot) => {
      const key = bot.currentMapId || "";
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(bot);
    });
    return buckets;
  }, [data]);

  const botIndex = useMemo(() => {
    const index: Record<string, MyBotEcosystemBotDTO> = {};
    (data?.bots ?? []).forEach((bot) => {
      index[bot.botId] = bot;
    });
    return index;
  }, [data]);

  const selectedBot = selectedBotId ? botIndex[selectedBotId] : null;

  const movements = useMemo(() => {
    const list = data?.movements ?? [];
    if (!selectedBotId) return list;
    return list.filter((movement) => movement.botId === selectedBotId);
  }, [data, selectedBotId]);

  const mapStats = useMemo(() => {
    const stats: Record<string, { origin: number; current: number }> = {};
    (data?.bots ?? []).forEach((bot) => {
      if (bot.originMapId) {
        stats[bot.originMapId] = stats[bot.originMapId] || { origin: 0, current: 0 };
        stats[bot.originMapId].origin += 1;
      }
      if (bot.currentMapId) {
        stats[bot.currentMapId] = stats[bot.currentMapId] || { origin: 0, current: 0 };
        stats[bot.currentMapId].current += 1;
      }
    });
    return stats;
  }, [data]);

  const renderBot = (bot: MyBotEcosystemBotDTO) => {
    const isOriginSelected = selectedMapId && bot.originMapId === selectedMapId;
    const isCurrentSelected = selectedMapId && bot.currentMapId === selectedMapId;
    const isDimmed = selectedMapId && !isOriginSelected && !isCurrentSelected;

    return (
      <button
        key={bot.botId}
        className={
          "ecosystem-bot" +
          (isOriginSelected ? " origin-highlight" : "") +
          (isCurrentSelected ? " current-highlight" : "") +
          (isDimmed ? " dimmed" : "") +
          (selectedBotId === bot.botId ? " active" : "")
        }
        style={{ left: `${bot.currentPosX}%`, top: `${bot.currentPosY}%` }}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedBotId(bot.botId);
        }}
        title={`${bot.name || "MyBot"} (${bot.rarity || ""})`}
        type="button"
      >
        {bot.imageUrl ? (
          <img src={bot.imageUrl} alt={bot.name || "MyBot"} />
        ) : (
          <span className="ecosystem-bot-initial">🤖</span>
        )}
        {showOrigin && bot.originMapId && bot.originMapId !== bot.currentMapId && (
          <span className="ecosystem-origin-dot" title={`Origem: ${bot.originMapId}`} />
        )}
      </button>
    );
  };

  const renderMap = (map: MyBotMapDTO) => {
    const bots = botsByCurrentMap[map.id] ?? [];
    const stats = mapStats[map.id] ?? { origin: 0, current: 0 };
    const isSelected = selectedMapId === map.id;
    const showCluster = bots.length > 30;
    const clusterCount = bots.length;
    const displayBots = showCluster ? bots.slice(0, 30) : bots;

    return (
      <div
        key={map.id}
        className={"ecosystem-map-node" + (isSelected ? " active" : "")}
        style={{ left: `${map.positionX}%`, top: `${map.positionY}%` }}
        onClick={() => setSelectedMapId(isSelected ? null : map.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setSelectedMapId(isSelected ? null : map.id);
          }
        }}
      >
        <div className="ecosystem-map-header">
          <span className="ecosystem-map-icon">{map.icon || "🧭"}</span>
          <span className="ecosystem-map-name">{map.name}</span>
        </div>
        <div className="ecosystem-map-stats">
          <span>Origem: {stats.origin}</span>
          <span>Agora: {stats.current}</span>
        </div>
        <div className="ecosystem-map-bots">
          {displayBots.map(renderBot)}
          {showCluster && (
            <div className="ecosystem-bot-cluster" title={`${clusterCount} bots`}>+{clusterCount}</div>
          )}
        </div>
      </div>
    );
  };

  const mapList = data?.maps?.length
    ? data.maps
    : buildFallbackMaps(
        Array.from(
          new Set(
            (data?.bots ?? [])
              .flatMap((bot) => [bot.originMapId, bot.currentMapId])
              .filter(Boolean)
          )
        ).concat(DEFAULT_MAP_IDS)
      );

  return (
    <section className="ecosystem-panel">
      <header className="ecosystem-header">
        <div>
          <h2>Ecossistema de Bots</h2>
          <p>Mapa da ilha com bots, origem, localização atual e histórico de movimentos.</p>
          <div className="ecosystem-meta">
            <span>Bots carregados: {data?.bots?.length ?? 0}</span>
            <span>Mapas carregados: {mapList.length}</span>
            {data?.counts && (
              <span>
                Base: cards {data.counts.userCards ?? 0} • profiles {data.counts.profiles ?? 0} • mybots {data.counts.mybots ?? 0}
              </span>
            )}
          </div>
        </div>
        <div className="ecosystem-actions">
          <label className="ecosystem-toggle">
            <input
              type="checkbox"
              checked={showOrigin}
              onChange={(event) => setShowOrigin(event.target.checked)}
            />
            Mostrar origem
          </label>
          <label className="ecosystem-toggle">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(event) => setShowHistory(event.target.checked)}
            />
            Mostrar histórico
          </label>
          <button className="admin-btn" onClick={loadData} type="button">
            Atualizar
          </button>
        </div>
      </header>

      {loading && <p>Carregando ecossistema...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && (
        <div className="ecosystem-layout">
          <div className="ecosystem-island" onClick={() => setSelectedBotId(null)} role="presentation">
            {mapList.map(renderMap)}
          </div>

          <aside className="ecosystem-sidebar">
            {selectedBot ? (
              <div className="ecosystem-card">
                <h3>{selectedBot.name || "MyBot"}</h3>
                <p><strong>Origem:</strong> {selectedBot.originMapId || "—"}</p>
                <p><strong>Atual:</strong> {selectedBot.currentMapId || "—"}</p>
                <p><strong>Raridade:</strong> {selectedBot.rarity || "—"}</p>
                <p><strong>Nível:</strong> {selectedBot.level || 1}</p>
                {isAdminMode && <p><strong>User ID:</strong> {selectedBot.userId}</p>}
              </div>
            ) : (
              <div className="ecosystem-card">
                <h3>Selecione um bot</h3>
                <p>Clique em um bot no mapa para ver origem, localização atual e perfil.</p>
              </div>
            )}

            {showHistory && (
              <div className="ecosystem-card">
                <h3>Movimentos recentes</h3>
                {movements.length === 0 && <p>Nenhum movimento registrado.</p>}
                <ul className="ecosystem-history">
                  {movements.map((movement: MyBotMovementDTO) => {
                    const bot = botIndex[movement.botId];
                    return (
                      <li key={movement.id}>
                        <div className="ecosystem-history-title">
                          <span>{bot?.name || movement.botId}</span>
                          <small>{movement.createdAt ? new Date(movement.createdAt).toLocaleString("pt-BR") : ""}</small>
                        </div>
                        <div className="ecosystem-history-detail">
                          {movement.fromMapId ? `${movement.fromMapId} → ` : ""}
                          {movement.toMapId} · {formatMovementReason(movement.reason)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}

      {selectedBot && (
        <div className="ecosystem-modal-backdrop" onClick={() => setSelectedBotId(null)}>
          <div className="ecosystem-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ecosystem-modal__header">
              <h3>{selectedBot.name || "MyBot"}</h3>
              <button type="button" className="ecosystem-modal__close" onClick={() => setSelectedBotId(null)}>
                Fechar
              </button>
            </div>
            <div className="ecosystem-modal__body">
              <div className="ecosystem-modal__media">
                {selectedBot.imageUrl ? (
                  <img src={selectedBot.imageUrl} alt={selectedBot.name || "MyBot"} />
                ) : (
                  <div className="ecosystem-modal__placeholder">🤖</div>
                )}
              </div>
              <div className="ecosystem-modal__details">
                <p><strong>Origem:</strong> {selectedBot.originMapId || "—"}</p>
                <p><strong>Atual:</strong> {selectedBot.currentMapId || "—"}</p>
                <p><strong>Raridade:</strong> {selectedBot.rarity || "—"}</p>
                <p><strong>Nível:</strong> {selectedBot.level || 1}</p>
                {isAdminMode && <p><strong>User ID:</strong> {selectedBot.userId}</p>}
              </div>
            </div>
            {showChallenge && onChallenge && (
              <div className="ecosystem-modal__footer">
                <button type="button" className="ecosystem-modal__action" onClick={() => onChallenge(selectedBot)}>
                  Disputar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
