import './Footer.css';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : undefined;

  return (
    <footer className="footer">
      {whatsappLink && (
        <a
          href={whatsappLink}
          className="whatsapp-fab"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
        >
          <i className="fab fa-whatsapp"></i>
        </a>
      )}
      <div className="footer-container">

        {/* Logo & About */}
        <div className="footer-logo">
          <img
            src="/hk-logo.svg"
            alt="HK | Technology & Capital"
            className="logo"
          />

          <p className="description">
            {t('footer.about')}
          </p>

          <div className="social-links">
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              LinkedIn
            </a>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              GitHub
            </a>

            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
            >
              Instagram
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div className="footer-links">
          <h4 className="footer-heading">{t('footer.platform.title')}</h4>
          <ul>
            <li><a href="#about">{t('footer.platform.about')}</a></li>
            <li><a href="#services">{t('footer.platform.services')}</a></li>
            <li><a href="#projects">{t('footer.platform.projects')}</a></li>
            <li><a href="#platform">{t('footer.platform.access')}</a></li>
            <li><a href="#contact">{t('footer.platform.contact')}</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div className="footer-links">
          <h4 className="footer-heading">{t('footer.legal.title')}</h4>
          <ul>
            <li><a href="#terms">{t('footer.legal.terms')}</a></li>
            <li><a href="#privacy">{t('footer.legal.privacy')}</a></li>
            <li><a href="#disclaimer">{t('footer.legal.disclaimer')}</a></li>
          </ul>
        </div>

      </div>

      {/* Bottom */}
      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
