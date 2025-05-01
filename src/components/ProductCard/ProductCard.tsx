import React from 'react';
import { useNavigate } from 'react-router-dom'; // Certifique-se de importar o useNavigate
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './ProductCard.css';

interface Product {
  name: string;
  description: string;
  price: number;
  image: string;
}

const ProductCard: React.FC = () => {
  const navigate = useNavigate(); // Inicialize o hook useNavigate

  const handleViewAllClick = () => {
    // Ao clicar no botão, navegar para a página de marketplace
    navigate('/como-criar-um-website-v2/marketplace');
  };

  const products: Product[] = [
    {
      name: 'Starter Kit Arduino Uno',
      description:
        'Kit completo para criação de um sistema de RFID com Arduino, ideal para aprender sobre identificação por rádio frequência e automação.',
      price: 299.99,
      image: 'https://via.placeholder.com/150?text=Arduino+RFID+Kit',
    },
    {
      name: 'Starter Kit ESP32',
      description:
        'Kit para construção de um robô móvel controlado por Arduino, com sensores e navegação autônoma. Perfeito para projetos de automação residencial e aprendizado de IoT.',
      price: 299.99,
      image: 'https://via.placeholder.com/150?text=Arduino+Autonomous+Robot+Kit',
    },
    {
      name: 'Kit Arduino Braço Robótico',
      description:
        'Kit para montagem de uma mão robótica controlada por Arduino, projetada para aprender sobre motores e controle de movimentos. Ideal para iniciantes e entusiastas de robótica que desejam entender como servomotores funcionam na prática.',
      price: 499.99,
      image: 'https://via.placeholder.com/150?text=Arduino+Robotic+Hand+Kit',
    },
    {
      name: 'Kit Arduino Carro com Câmera',
      description:
        'Kit para construção de um carro de corrida controlado por Arduino, incluindo motores, sensores e controle remoto. Possui câmera para transmissão ao vivo e controle remoto via Wi-Fi ou Bluetooth.',
      price: 349.99,
      image: 'https://via.placeholder.com/150?text=Arduino+Race+Car+Kit',
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
  <div className="product-section">
    <div className="product-slider">
      {/* Título, descrição e botão "Ver Todos os Produtos" */}
      <div className="product-header">
        <h1>Produtos</h1>
        <p className="product-description">
          Vendemos kits para aprender eletrônica, robótica e programação na prática. Explore nossos kits e inicie seu aprendizado com projetos reais!
        </p>
        <button className="view-all-button" onClick={handleViewAllClick}>
          Ver Todos
        </button>
      </div>

      <Slider {...settings}>
        {products.map((product, index) => (
          <div key={index} className="product-card-wrapper">
            <div className="product-card">
              <img src={product.image} alt={product.name} className="product-image" />
              <div className="product-info">
                <h2>{product.name}</h2>
                <div className="product-description">{product.description}</div>
                <p className="product-price">${product.price.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  </div>
  );
};

export default ProductCard;
