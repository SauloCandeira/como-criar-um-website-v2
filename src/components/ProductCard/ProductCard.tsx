import React from 'react';
import Section from '../ui/section';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import starBg from '../../assets/img/stars.png';

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

// Custom Arrow Components
const NextArrow = (props: any) => {
  const { onClick } = props;
  return (
    <div
      className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-blue-600 p-3 text-white shadow-lg transition-transform hover:bg-blue-700 hover:scale-110 md:-right-12"
      onClick={onClick}
    >
      <i className="fas fa-chevron-right text-lg"></i>
    </div>
  );
};

const PrevArrow = (props: any) => {
  const { onClick } = props;
  return (
    <div
      className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-blue-600 p-3 text-white shadow-lg transition-transform hover:bg-blue-700 hover:scale-110 md:-left-12"
      onClick={onClick}
    >
      <i className="fas fa-chevron-left text-lg"></i>
    </div>
  );
};

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
      name: 'Curso de Robótica',
      description: 'Curso completo do básico ao avançado em robótica e automação.',
      price: 199.90,
      image: arduinoImg, // Placeholder
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
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 2 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1 },
      },
    ],
  };

  return (
    <Section
      background={starBg}
      className="bg-[#092554] text-white"
    >
      <div className="mb-16 flex flex-col items-center justify-center text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-3xl font-bold md:text-5xl text-[#38bdf8]">Produtos & Serviços</h1>
          <p className="mb-8 text-lg text-gray-200 leading-relaxed">
            Oferecemos kits educacionais, produtos tecnológicos e serviços
            especializados como impressão 3D, sempre com foco em aprendizado
            prático e soluções reais.
          </p>
        </div>

        <button
          className="rounded-full bg-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-600 hover:scale-105 hover:shadow-emerald-500/20"
          onClick={() => navigate('/marketplace')}
        >
          Ver Todos
        </button>
      </div>

      <div className="w-full">
        <Slider {...settings}>
          {items.map((item, index) => (
            <div key={index} className="px-3 py-6">
              <div className="group relative flex h-[480px] flex-col overflow-hidden rounded-2xl bg-[#1f2933] shadow-xl transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">

                {/* Image Area */}
                <div className="relative h-56 w-full overflow-hidden bg-white p-6">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-sm ${item.type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                    >
                      {item.type === 'product' ? 'Produto' : 'Serviço'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="mb-3 text-xl font-bold text-white line-clamp-2">
                    {item.name}
                  </h2>

                  <p className="mb-6 text-sm leading-relaxed text-gray-400 line-clamp-3">
                    {item.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-gray-700 pt-4">
                    {item.type === 'product' && item.price ? (
                      <p className="text-2xl font-bold text-[#38bdf8]">
                        R$ {item.price.toFixed(2)}
                      </p>
                    ) : (
                      <span className="text-sm font-medium text-gray-400">Sob Consulta</span>
                    )}

                    <button
                      className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors ${item.type === 'product'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-cyan-600 hover:bg-cyan-700'
                        }`}
                      onClick={() =>
                        navigate(
                          item.type === 'product'
                            ? '/marketplace'
                            : '/contact'
                        )
                      }
                    >
                      {item.type === 'product' ? 'Comprar' : 'Orçamento'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </Section>
  );
};

export default ProductCard;
