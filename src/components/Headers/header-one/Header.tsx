import React, { useState } from 'react';
import './Header.css'; // Arquivo de estilos

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="container">
        <a href="#" className="logo">IHK</a>
        <div className="nav-container">
          <ul className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
            <li><a href="#intro" onClick={() => setIsMenuOpen(false)}>Home</a></li>
            <li><a href="#roteiro" onClick={() => setIsMenuOpen(false)}>Roteiro</a></li>
            <li><a href="#embarque" onClick={() => setIsMenuOpen(false)}>Embarque</a></li>
            <li><a className="login-button" href="#login" onClick={() => setIsMenuOpen(false)}>Login</a></li>
          </ul>
          <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
