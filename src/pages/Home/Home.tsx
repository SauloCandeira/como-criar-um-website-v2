import './Home.css'; // Certifique-se de que seus estilos CSS estejam no arquivo Home.css
 {/*import Timeline from '../../components/Timeline/Timeline';*/} // Ajuste o caminho conforme necessário
import Ticket from '../../components/PlatformAccess/PlatformAccess'; // Ajuste o caminho conforme necessário
import HeaderTwo from '../../components/Headers/header-two/HeaderTwo';
import Intro from '../../components/Intro/Intro';
import ProductCard from '../../components/ProductCard/ProductCard';
import Footer from '../../components/Footer/Footer';
  {/*import FounderCard from '../../components/FounderCard/FounderCard';  */}
import Services from '../../components/Services/Services';
import AboutCard from '../../components/AboutCard/AboutCard';

const Home = () => {

  {/*
  const founder = {
    name: "Saulo Candeira",
    position: "Desenvolvedor de Software e Eletrônica",
    image: 'https://via.placeholder.com/150',
    description: "Técnico em Contabilidade e Eletrônica, graduado em Gestão de Negócios Imobiliários, Análise e Desenvolvimento de Sistemas, e pós-graduado em Engenharia de Software, com 6 anos de experiência prática. Atua como desenvolvedor e instrutor, criando soluções com eletrônica e programação, capacitando outros a desenvolverem seus próprios projetos. A 'How to Make' tem como objetivo focar em projetos práticos, onde a teoria encontra a prática, permitindo que todos transformem ideias em realidade.",
    linkedin: 'https://www.linkedin.com/in/saulocandeira',
    github: 'https://github.com/saulocandeira',
    website: 'https://www.saulocandeira.com.br'
  };
  */}
  return (
    <div className="home-container">
      <HeaderTwo />
      <main>
        <section className="home-section">
          <Intro />
        </section>
        <section className="home-section">
          <AboutCard />
        </section>
        <section className="home-section">
          <Services />
        </section>
        <section className="home-section">
          <Ticket />
        </section>
        <section className="home-section">
          <ProductCard />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
