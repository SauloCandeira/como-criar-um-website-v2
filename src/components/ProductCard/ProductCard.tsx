import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './ProductCard.css';
import arduinoImg from './../../assets/img/kit-arduino-uno.jpg';
import espImg from './../../assets/img/kit-esp32.jpg';
import print3dImg from './../../assets/img/print-3d.jpg';
import { fetchProducts, ProductDTO } from '../../services/productsApi';

interface Item {
  name: string;
  description: string;
  price?: number;
  image: string;
}

const ProductCard: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const imagePool = [arduinoImg, espImg, print3dImg];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (err) {
        console.error('Erro ao carregar produtos da home:', err);
        setError('Não foi possível carregar os produtos.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const items: Item[] = useMemo(() => {
    return products
      .filter((product) => product.showOnHome)
      .map((product, index) => {
        const numericPrice = Number(
          String(product.salePrice ?? product.price)
            .replace('R$', '')
            .replace('.', '')
            .replace(',', '.')
            .trim()
        );
        return {
          name: product.name,
          description: product.description,
          price: Number.isNaN(numericPrice) ? undefined : numericPrice,
          image: imagePool[index % imagePool.length],
        };
      });
  }, [products]);

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
          {loading && <p>Carregando produtos...</p>}
          {!loading && error && <p>{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p>Nenhum produto disponível para a Home.</p>
          )}
          {!loading && !error && items.length > 0 && (
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
                      <span className="product-badge product">Produto</span>
                      <h2>{item.name}</h2>
                      <p className="product-text">{item.description}</p>
                      {item.price !== undefined && !Number.isNaN(item.price) && (
                        <p className="product-price">
                          R$ {item.price.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>

                    <button
                      className="product-action buy"
                      onClick={() => navigate('/marketplace')}
                    >
                      Acessar
                    </button>
                  </div>
                </div>
              ))}
            </Slider>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductCard;
