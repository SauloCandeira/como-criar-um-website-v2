import { useEffect } from 'react';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  visible: boolean;
  variant?: 'default' | 'rocket';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, variant = 'default' }) => {
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
            <div className="rocket-emoji" aria-hidden="true">🚀</div>
            <div className="loading-text">Carregando...</div>
          </div>
        ) : (
          <div className="spinner-wrap">
            <div className="spinner"></div>
            <div className="loading-text">Carregando...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
