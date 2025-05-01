var beautify = ace.require("ace/ext/beautify");

var code;
var cdn = [];
var cdnCounter = 0;

// Inicializando os editores e tornando-os globais para uso consistente
var editorHTML = ace.edit("editorHTML");
var editorCSS = ace.edit("editorCSS");
var editorJS = ace.edit("editorJS");

window.htmlEditor = editorHTML;
window.cssEditor = editorCSS;
window.jsEditor = editorJS;

// Configuração dos editores
editorHTML.setTheme("ace/theme/xcode");
editorHTML.session.setMode("ace/mode/html");
editorHTML.session.setNewLineMode("unix");
editorHTML.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
});

editorCSS.setTheme("ace/theme/xcode");
editorCSS.session.setMode("ace/mode/css");
editorCSS.session.setNewLineMode("unix");
editorCSS.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
});

editorJS.setTheme("ace/theme/xcode");
editorJS.session.setMode("ace/mode/javascript");
editorJS.session.setNewLineMode("unix");
editorJS.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
});

// Conteúdo padrão
const defaultHTML = `<!DOCTYPE html>
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
</html>`;

const defaultCSS = `
/* CSS Estilizado para o Layout */
body {
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
}
@media (max-width: 768px) {
    header h1 { font-size: 2em; }
    header p { font-size: 1em; }
    section h2 { font-size: 1.5em; }
    ul li { font-size: 0.9em; }
}
`;

const defaultJS = `// Digite seu código JavaScript aqui`;

window.onload = function () {
    console.log("🔃 Carregando conteúdo padrão...");

    editorHTML.setValue(defaultHTML, -1);
    editorHTML.clearSelection();

    editorCSS.setValue(defaultCSS, -1);
    editorCSS.clearSelection();

    editorJS.setValue(defaultJS, -1);
    editorJS.clearSelection();

    updatePageContent();
};

function getHTMLContent() {
    return editorHTML.getValue();
}

function getCSSContent() {
    return editorCSS.getValue();
}

function getJSContent() {
    return editorJS.getValue();
}

function beautifyHTML() {
    beautify.beautify(editorHTML.session);
}

function setPreview(content) {
    document.getElementById("output").src = "data:text/html;charset=utf-8," + encodeURIComponent(content);
}

function updatePageContent() {
    const htmlCode = editorHTML.getValue();
    const cssCode = editorCSS.getValue();
    const jsCode = editorJS.getValue();

    console.log("📄 Atualizando conteúdo da página...");
    console.log("📑 HTML:", htmlCode.substring(0, 200));
    console.log("🎨 CSS:", cssCode.substring(0, 200));
    console.log("🧠 JS:", jsCode.substring(0, 200));

    const fullDocument = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Pré-visualização</title>
    <style>${cssCode}</style>
</head>
<body>
    ${htmlCode}
    <script>
        try {
            ${jsCode}
        } catch (error) {
            document.body.innerHTML += '<pre style="color:red;">Erro no JavaScript:\\n' + error + '</pre>';
        }
    </script>
</body>
</html>`;

    try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(fullDocument, 'text/html');
        const hasHtmlTag = parsed.querySelector('html');

        if (!hasHtmlTag) throw new Error("HTML malformado");

        const previewFrame = document.getElementById("previewFrame");
        if (previewFrame) {
            previewFrame.srcdoc = fullDocument;
            console.log("✅ Visualização atualizada.");
        } else {
            console.warn("⚠️ Elemento #previewFrame não encontrado.");
        }
    } catch (err) {
        console.error("❌ HTML inválido:", err.message);
        const fallbackFrame = document.getElementById("previewFrame");
        if (fallbackFrame) {
            fallbackFrame.srcdoc = `
                <html>
                    <body style="font-family:sans-serif; color: red;">
                        <h2>❌ HTML inválido</h2>
                        <p>Verifique se há tags malformadas ou conteúdo ausente.</p>
                        <pre>${err.message}</pre>
                    </body>
                </html>`;
        }
    }
}

// Eventos de mudança
editorHTML.getSession().on("change", () => {
    localStorage.setItem("htmlContent", getHTMLContent());
    updatePageContent();
});

editorCSS.getSession().on("change", updatePageContent);
editorJS.getSession().on("change", updatePageContent);

function newPage() {
    const html = localStorage.getItem("htmlContent");
    if (html) {
        const win = window.open("data:text/html;charset=utf-8," + encodeURIComponent(html), "_blank");
        win?.focus();
    } else {
        alert("Nenhum conteúdo salvo para exibir!");
    }
}

function clearCR() {
    localStorage.removeItem("htmlContent");
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
