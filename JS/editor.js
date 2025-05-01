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

/* Corpo da Página */
body {
    background-color: #092554;
    color: white;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
}

/* Cabeçalho */
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

/* Seções */
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

/* Rodapé */
footer {
    background-color: #0f3c62;
    padding: 10px;
    text-align: center;
}

footer p {
    margin: 0;
}

/* Responsividade */
@media (max-width: 768px) {
    header h1 {
        font-size: 2em;
    }

    header p {
        font-size: 1em;
    }

    section h2 {
        font-size: 1.5em;
    }

    ul li {
        font-size: 0.9em;
    }
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
        <html>
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
