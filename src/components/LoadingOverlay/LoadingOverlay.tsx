import { useEffect } from 'react';
import './LoadingOverlay.css';

type LoadingVariant = 'rocket' | 'planet' | 'moon' | 'sun' | 'saturn';

interface LoadingOverlayProps {
  visible: boolean;
  variant?: LoadingVariant;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, variant = 'planet' }) => {
  useEffect(() => {
    if (visible) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return;
  }, [visible]);

  return (
    <div className={`loading-overlay ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
      <div className={`loading-card ${variant}`} role="status" aria-live="polite">
        {variant === 'rocket' ? (
          <div className="rocket-wrap">
            <div className="rocket-launch" aria-hidden="true">
              <div className="rocket-body">
                <div className="rocket-nose" />
                <div className="rocket-window" />
                <div className="rocket-fin left" />
                <div className="rocket-fin right" />
                <div className="rocket-engine" />
                <div className="rocket-flame" />
                <div className="rocket-smoke" />
              </div>
            </div>
            <div className="loading-text">Carregando...</div>
          </div>
        ) : (
          <div className={`space-loader ${variant}`}>
            <div className="space-stars" aria-hidden="true"></div>
            <div className="space-body" aria-hidden="true"></div>
            <div className="space-ring" aria-hidden="true"></div>
            <div className="space-moon" aria-hidden="true"></div>
            <div className="loading-text">Carregando...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
