import React from 'react';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './ProductCard.css';
import arduinoImg from './../../assets/img/kit-arduino-uno.jpg';
import espImg from './../../assets/img/kit-esp32.jpg';
import print3dImg from './../../assets/img/print-3d.jpg';

type ItemType = 'product' | 'service';

interface Item {
  name: string;
  description: string;
  price?: number;
  image: string;
  type: ItemType;
}

const ProductCard: React.FC = () => {
  const navigate = useNavigate();

  const items: Item[] = [
    {
      name: 'Starter Kit Arduino Uno',
      description:
        'Kit completo para aprender eletrônica e automação com Arduino, ideal para iniciantes.',
      price: 299.99,
      image: arduinoImg,
      type: 'product',
    },
    {
      name: 'Starter Kit ESP32',
      description:
        'Aprenda IoT e sistemas conectados com ESP32 e projetos práticos.',
      price: 299.99,
      image: espImg,
      type: 'product',
    },
    {
      name: 'Impressão 3D',
      description:
        'Serviço de impressão 3D sob demanda para protótipos, peças técnicas e projetos personalizados.',
      image: print3dImg,
      type: 'service',
    },
    {
      name: 'Landingpage Institucional',
      description:
        'Landingpage profissional e responsiva para sua empresa com design moderno, otimizada para SEO e conversão de leads.',
      price: 499.99,
      image: arduinoImg,
      type: 'product',
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 600,
        settings: { slidesToShow: 1 },
      },
    ],
  };

  return (
    <section className="product-section">
      <div className="product-wrapper">
        <div className="product-header">
          <div className="text-container">
            <h1>Produtos & Serviços</h1>
            <p className="product-description">
              Oferecemos kits educacionais, produtos tecnológicos e serviços
              especializados como impressão 3D, sempre com foco em aprendizado
              prático e soluções reais.
            </p>
          </div>

          <button
            className="view-all-button"
            onClick={() => navigate('/marketplace')}
          >
            Ver todos
          </button>
        </div>

        <div className="product-slider">
          <Slider {...settings}>
            {items.map((item, index) => (
              <div key={index} className="product-card-wrapper">
                <div className="product-card">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="product-image"
                  />

                  <div className="product-info">
                    <span
                      className={`product-badge ${
                        item.type === 'product' ? 'product' : 'service'
                      }`}
                    >
                      {item.type === 'product' ? 'Produto' : 'Serviço'}
                    </span>

                    <h2>{item.name}</h2>

                    <p className="product-text">{item.description}</p>

                    {item.type === 'product' && item.price && (
                      <p className="product-price">
                        ${item.price.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <button
                    className={`product-action ${
                      item.type === 'product' ? 'buy' : 'quote'
                    }`}
                    onClick={() =>
                      navigate(
                        item.type === 'product'
                          ? '/marketplace'
                          : '/contact'
                      )
                    }
                  >
                    {item.type === 'product'
                      ? 'Acessar'
                      : 'Solicitar orçamento'}
                  </button>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
};

export default ProductCard;
