UPDATE projects
SET html_content = '<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Página Institucional</title>
    <style id="dynamicCSS"></style>
</head>
<body>
    <header>
        <h1>Bem-vindo à Nossa Empresa</h1>
        <p>Somos líderes no mercado de soluções inovadoras.</p>
    </header>
    <section>
        <h2>Quem Somos</h2>
        <p>Somos uma empresa focada em oferecer soluções tecnológicas para o mercado global.</p>
    </section>
    <section>
        <h2>Nossos Serviços</h2>
        <ul>
            <li>Consultoria em Tecnologia</li>
            <li>Desenvolvimento de Software</li>
            <li>Treinamentos e Suporte</li>
        </ul>
    </section>
    <footer>
        <p>&copy; 2025 Nossa Empresa. Todos os direitos reservados.</p>
    </footer>
    <script id="dynamicJS"></script>
</body>
</html>',
    css_content = 'body {
    background-color: #092554;
    color: white;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
}
header {
    background-color: #0f3c62;
    padding: 20px;
    text-align: center;
}
header h1 {
    font-size: 2.5em;
    margin: 0;
}
header p {
    font-size: 1.2em;
}
section {
    padding: 20px;
    margin: 10px;
}
section h2 {
    color: #1e8bff;
}
ul {
    list-style-type: none;
    padding: 0;
}
ul li {
    background-color: #1e8bff;
    margin: 10px 0;
    padding: 10px;
    border-radius: 5px;
}
footer {
    background-color: #0f3c62;
    padding: 10px;
    text-align: center;
}
footer p {
    margin: 0;
}'
WHERE lower(name) = lower('Landingpage Profissional')
  AND (html_content IS NULL OR html_content = '');
