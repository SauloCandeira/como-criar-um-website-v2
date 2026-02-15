import React, { useCallback, useEffect, useMemo, useState } from 'react';

type CronJob = {
  id: string;
  name: string;
  enabled: boolean;
  cron_expression: string;
  next_run?: string | null;
  last_run?: string | null;
  last_status?: string | null;
  duration_ms?: number | null;
  consecutive_errors?: number | null;
  agent?: string | null;
  action_message?: string | null;
  delivery_mode?: string | null;
  delivery_channel?: string | null;
  source?: string | null;
};

type CronPayload = {
  success?: boolean;
  scheduler?: string;
  jobs?: {
    jobs?: CronJob[];
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
};

const CronsPage: React.FC = () => {
  const cronUrl = import.meta.env.VITE_OPENCLAW_CRONS_URL || '/api/crons';
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);

  const loadCrons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Obter token do usuário autenticado
      const user = (window as any).auth?.currentUser;
      let token = '';
      if (user && user.getIdToken) {
        token = await user.getIdToken();
      }
      const res = await fetch(cronUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Falha ao carregar crons.');
      }
      const payload = (await res.json()) as CronPayload;
      const list = payload?.jobs?.jobs ?? [];
      setJobs(list);
    } catch (err) {
      console.error('Erro ao carregar crons:', err);
      setError('Nao foi possivel carregar os crons.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [cronUrl]);

  useEffect(() => {
    loadCrons();
    const timer = window.setInterval(loadCrons, 60000);
    return () => window.clearInterval(timer);
  }, [loadCrons]);

  const schedulerLabel = useMemo(() => {
    const label = jobs[0]?.source ? 'OpenClaw Oracle Scheduler' : 'Oracle Scheduler';
    return label;
  }, [jobs]);

  return (
    <section>
      <div className="admin-actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Crons</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{schedulerLabel}</p>
        </div>
        <button className="admin-btn admin-btn--ghost" onClick={loadCrons} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {loading && <p>Carregando crons...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && jobs.length === 0 && <p>Nenhum cron encontrado.</p>}

      {jobs.length > 0 && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome do Cron</th>
                <th>Agente</th>
                <th>Expressao Cron</th>
                <th>Status</th>
                <th>Proxima Execucao</th>
                <th>Ultima Execucao</th>
                <th>Ultimo Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.name}</td>
                  <td>{job.agent || '—'}</td>
                  <td>{job.cron_expression}</td>
                  <td>
                    <span className={`admin-status-badge ${job.enabled ? 'admin-status-badge--active' : 'admin-status-badge--inactive'}`}>
                      {job.enabled ? 'Ativo' : 'Desativado'}
                    </span>
                  </td>
                  <td>{formatDate(job.next_run)}</td>
                  <td>{formatDate(job.last_run)}</td>
                  <td>{job.last_status || '—'}</td>
                  <td>
                    <button className="admin-btn admin-btn--ghost" onClick={() => setSelectedJob(job)}>
                      <span className="admin-action-icon">👁️</span>
                      Visualizar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedJob && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedJob(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Detalhes do Cron</h3>
              <button className="admin-btn admin-btn--ghost" onClick={() => setSelectedJob(null)}>Fechar</button>
            </div>
            <div className="admin-modal__form" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <div><strong>Nome:</strong> {selectedJob.name}</div>
                <div><strong>ID:</strong> {selectedJob.id}</div>
                <div><strong>Agente:</strong> {selectedJob.agent || '—'}</div>
                <div><strong>Expressao:</strong> {selectedJob.cron_expression}</div>
                <div><strong>Proxima execucao:</strong> {formatDate(selectedJob.next_run)}</div>
                <div><strong>Ultima execucao:</strong> {formatDate(selectedJob.last_run)}</div>
                <div><strong>Duracao:</strong> {selectedJob.duration_ms ?? '—'} ms</div>
                <div><strong>Erros consecutivos:</strong> {selectedJob.consecutive_errors ?? '—'}</div>
                <div><strong>Modo de entrega:</strong> {selectedJob.delivery_mode || '—'}</div>
                <div><strong>Canal de entrega:</strong> {selectedJob.delivery_channel || '—'}</div>
                <div><strong>Source:</strong> {selectedJob.source || '—'}</div>
              </div>
              <div>
                <strong>Descricao completa</strong>
                <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selectedJob.action_message || '—'}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CronsPage;
