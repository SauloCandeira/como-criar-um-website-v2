import './ContentCourse.css';

export default function ContentCourse() {
  return (
    <section className="course-html-example">
      <h2>📄 Exemplo de Código HTML Profissional</h2>
      <p>
        Abaixo está um exemplo moderno de uma página HTML voltada para portfólio de um desenvolvedor. Esse modelo segue boas práticas estruturais e pode ser estilizado com CSS para ganhar um visual profissional.
      </p>

      <pre className="code-block">
        <code>
{`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dev Portfolio - Saulo Candeira</title>
</head>
<body>
  <header>
    <h1>Saulo Candeira</h1>
    <p>Desenvolvedor Full Stack | JavaScript • React • Node.js</p>
  </header>

  <section>
    <h2>👨‍💻 Sobre Mim</h2>
    <p>Sou um desenvolvedor apaixonado por tecnologia e inovação. Com experiência em aplicações web e mobile, estou sempre em busca de novos desafios.</p>
  </section>

  <section>
    <h2>🛠️ Tecnologias</h2>
    <ul>
      <li>React, Next.js, Vue.js</li>
      <li>Node.js, Express, MongoDB</li>
      <li>Docker, Git, CI/CD</li>
    </ul>
  </section>

  <section>
    <h2>📞 Contato</h2>
    <div class="social-links">
      <a href="https://linkedin.com/in/saulocandeira">LinkedIn</a>
      <a href="https://github.com/saulocandeira">GitHub</a>
      <a href="https://wa.me/5511999999999">WhatsApp</a>
    </div>
  </section>

  <footer>
    <p>&copy; 2025 Saulo Candeira. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`}
        </code>
      </pre>

      <div className="html-explanation">
        <h3>🔍 Explicação Técnica</h3>
        <ul>
          <li><code>&lt;!DOCTYPE html&gt;</code>: Inicia o documento como HTML5, essencial para renderização correta.</li>
          <li><code>&lt;html lang="pt-BR"&gt;</code>: Define o idioma da página, importante para acessibilidade e SEO.</li>
          <li><code>&lt;head&gt;</code>: Contém metadados (informações sobre a página, charset, título, responsividade).</li>
          <li><code>&lt;body&gt;</code>: Aqui é onde vai todo o conteúdo visual da página.</li>
          <li><code>&lt;header&gt;</code>: Bloco introdutório com nome e especialidade profissional.</li>
          <li><code>&lt;section&gt;</code>: Seções organizadas: Sobre, Tecnologias e Contato, para estrutura semântica.</li>
          <li><code>&lt;ul&gt;</code> e <code>&lt;li&gt;</code>: Lista não ordenada usada para destacar habilidades.</li>
          <li><code>&lt;footer&gt;</code>: Rodapé com direitos autorais, importante para fechar visualmente a página.</li>
          <li><code>class="social-links"</code>: Classe para aplicar estilo nos botões de contato (via CSS).</li>
        </ul>
      </div>
    </section>
  );
}
