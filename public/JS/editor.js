var beautify = ace.require("ace/ext/beautify");

var code;
var cdn = [];
var cdnCounter = 0;

var editorHTML = ace.edit("editorHTML");
editorHTML.setTheme("ace/theme/xcode");
editorHTML.session.setMode("ace/mode/html");
editorHTML.session.setNewLineMode("unix");
editorHTML.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
});

var editorJS = ace.edit("editorJS");
editorJS.setTheme("ace/theme/xcode");
editorJS.session.setMode("ace/mode/javascript");
editorJS.session.setNewLineMode("unix");
editorJS.session.setValue("// Enter your JavaScript code here");
editorJS.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
});

var editorCSS = ace.edit("editorCSS");
editorCSS.setTheme("ace/theme/xcode");
editorCSS.session.setMode("ace/mode/css");
editorCSS.session.setNewLineMode("unix");
editorCSS.setValue(`
/* CSS Estilizado para o Layout */
        body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        color: #f1f5f9;
        line-height: 1.6;
        }

        header {
        background-color: #1e293b;
        padding: 2rem;
        text-align: center;
        }

        header h1 {
        margin: 0;
        font-size: 2.5rem;
        color: #38bdf8;
        }

        header p {
        margin: 0.5rem 0 0;
        font-size: 1.2rem;
        color: #cbd5e1;
        }

        section {
        padding: 2rem;
        max-width: 800px;
        margin: auto;
        }

        h2 {
        color: #7dd3fc;
        border-bottom: 1px solid #334155;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
        }

        ul {
        list-style-type: square;
        padding-left: 1.5rem;
        }

        footer {
        background-color: #1e293b;
        color: #94a3b8;
        text-align: center;
        padding: 1.5rem;
        margin-top: 3rem;
        }

        .social-links {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1rem;
        }

        .social-links a {
        color: #38bdf8;
        text-decoration: none;
        font-weight: bold;
        transition: color 0.3s ease;
        }

        .social-links a:hover {
        color: #facc15;
        }
  
`);
editorCSS.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
});

window.onload = function () {
    editorHTML.setValue(`
    <!DOCTYPE html>
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
        <p>Você pode me encontrar nas redes abaixo:</p>
        <div class="social-links">
        <a href="https://www.linkedin.com/in/joaosilva" target="_blank">LinkedIn</a>
        <a href="https://github.com/joaosilva" target="_blank">GitHub</a>
        <a href="https://wa.me/5511999999999" target="_blank">WhatsApp</a>
        </div>
    </section>

    <footer>
        <p>&copy; 2025 IHK. Todos os direitos reservados.</p>
    </footer>
    </body>
    </html>

    `);

    updatePageContent();
}

var getHTMLContent = function () {
    return editorHTML.getValue();
}

var getCSSContent = function () {
    return editorCSS.getValue();
}

var getJSContent = function () {
    return editorJS.getValue();
}

var setHTMLContent = function (content) {
    editorHTML.setValue(content);
}

var beautifyHTML = function () {
    beautify.beautify(editorHTML.session);
}

var setPreview = function (content) {
    document.getElementById('output').src = "data:text/html;charset=utf-8," + encodeURIComponent(content);
}

var updatePageContent = function () {
    var html = localStorage.getItem("htmlContent") || getHTMLContent();
    var css = getCSSContent();
    var js = getJSContent();

    if (html.includes('<style id="dynamicCSS"></style>')) {
        html = html.replace('<style id="dynamicCSS"></style>', `<style id="dynamicCSS">${css}</style>`);
    } else {
        html = html.replace('</head>', `<style id="dynamicCSS">${css}</style></head>`);
    }

    html = html.replace('<script id="dynamicJS"></script>', `<script id="dynamicJS">${js}</script>`);

    setPreview(html);
    localStorage.setItem("htmlContent", html);
}

editorHTML.getSession().on('change', function () {
    localStorage.setItem("htmlContent", getHTMLContent());
    updatePageContent();
});

editorCSS.getSession().on('change', function () {
    updatePageContent();
});

editorJS.getSession().on('change', function () {
    updatePageContent();
});

function newPage() {
    var url = "data:text/html;charset=utf-8," + encodeURIComponent(localStorage.getItem("htmlContent"));
    var tabOrWindow = window.open(url, '_blank');
    tabOrWindow.focus();
}

function clearCR() {
    location.reload();
}


function changeTab(tabNumber) {
    document.getElementById("editorHTML").style.display = (tabNumber === 1) ? 'block' : 'none';
    document.getElementById("editorCSS").style.display = (tabNumber === 2) ? 'block' : 'none';
    document.getElementById("editorJS").style.display = (tabNumber === 3) ? 'block' : 'none';
    document.getElementById("editorCDN").style.display = (tabNumber === 4) ? 'block' : 'none';

    document.getElementById("htmlButton").style.backgroundColor = (tabNumber === 1) ? '#ffeb3b' : 'azure';
    document.getElementById("cssButton").style.backgroundColor = (tabNumber === 2) ? '#ffeb3b' : 'azure';
    document.getElementById("jsButton").style.backgroundColor = (tabNumber === 3) ? '#ffeb3b' : 'azure';
    document.getElementById("cdnButton").style.backgroundColor = (tabNumber === 4) ? '#ffeb3b' : 'azure';

    updatePageContent();
}
