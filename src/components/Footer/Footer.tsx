import './Footer.css';  // Certifique-se de que o CSS esteja no mesmo diretório ou ajuste o caminho

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Logo and Description Section */}
        <div className="footer-logo">
          <img src="logo.png" alt="Logo" className="logo" />
          <p className="description">Sua descrição aqui, conectando o seu público com a missão da empresa.</p>
          <div className="social-links">
            <a href="#facebook" className="social-icon">Facebook</a>
            <a href="#twitter" className="social-icon">Twitter</a>
            <a href="#linkedin" className="social-icon">LinkedIn</a>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="footer-links">
          <h4 className="footer-heading">Links Úteis</h4>
          <ul>
            <li><a href="#">Sobre Nós</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Contato</a></li>
            <li><a href="#">Termos de Serviço</a></li>
            <li><a href="#">Privacidade</a></li>
          </ul>
        </div>

        {/* Newsletter Section */}
        <div className="newsletter">
          <h4 className="footer-heading">Inscreva-se na nossa Newsletter</h4>
          <form className="newsletter-form">
            <input type="email" placeholder="Seu email" className="email-input" required />
            <button type="submit" className="subscribe-btn">Assinar</button>
          </form>
        </div>
      </div>

      {/* Footer Bottom Section */}
      <div className="footer-bottom">
        <p>&copy; 2025 Sua Empresa. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

export default Footer;
