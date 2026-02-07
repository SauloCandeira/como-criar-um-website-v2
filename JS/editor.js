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

var appContext = window.APP_CONTEXT || {};
var API_BASE = appContext.apiBase || "/api";
var userId = appContext.userId || (localStorage.getItem("email") || "").toLowerCase();
var projectId = appContext.projectId || new URLSearchParams(window.location.search).get("projectId") || "";

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

function buildPreview(htmlCode, cssCode, jsCode) {
    try {
        var parser = new DOMParser();
        var parsed = parser.parseFromString(htmlCode || "", "text/html");
        var styleTag = parsed.querySelector("style#dynamicCSS");
        if (!styleTag) {
            styleTag = parsed.createElement("style");
            styleTag.id = "dynamicCSS";
            parsed.head.appendChild(styleTag);
        }
        styleTag.textContent = cssCode || "";

        if (jsCode) {
            var scriptTag = parsed.createElement("script");
            scriptTag.textContent = `try {\n${jsCode}\n} catch (error) { document.body.innerHTML += '<pre style="color:red;">Erro no JavaScript:\n' + error + '</pre>'; }`;
            parsed.body.appendChild(scriptTag);
        }

        return "<!DOCTYPE html>\n" + parsed.documentElement.outerHTML;
    } catch (err) {
        console.error("❌ HTML inválido:", err.message);
        return "<html><body style=\"font-family:sans-serif; color: red;\"><h2>❌ HTML inválido</h2><pre>" + err.message + "</pre></body></html>";
    }
}

function updatePageContent() {
    var htmlCode = getHTMLContent();
    var cssCode = getCSSContent();
    var jsCode = getJSContent();
    var fullDocument = buildPreview(htmlCode, cssCode, jsCode);

    var previewFrame = document.getElementById("previewFrame");
    if (previewFrame) {
        previewFrame.srcdoc = fullDocument;
    }
}

function fetchProjectContent() {
    if (!projectId || !userId) {
        console.warn("⚠️ projectId/userId ausentes para carregar conteúdo.");
        return;
    }
    fetch(API_BASE + "/projects/" + encodeURIComponent(projectId) + "/content?userId=" + encodeURIComponent(userId))
        .then(function (res) {
            if (!res.ok) throw new Error("Falha ao carregar conteúdo");
            return res.json();
        })
        .then(function (data) {
            editorHTML.setValue(data.htmlContent || "", -1);
            editorCSS.setValue(data.cssContent || "", -1);
            editorJS.setValue("", -1);
            updatePageContent();
        })
        .catch(function (err) {
            console.error("❌ Erro ao carregar conteúdo:", err);
        });
}

var saveTimer = null;
function scheduleSave() {
    if (!projectId || !userId) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
        var payload = {
            userId: userId,
            htmlContent: getHTMLContent(),
            cssContent: getCSSContent()
        };
        fetch(API_BASE + "/projects/" + encodeURIComponent(projectId) + "/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).catch(function (err) {
            console.error("❌ Erro ao salvar conteúdo:", err);
        });
    }, 600);
}

window.onload = function () {
    fetchProjectContent();
    updatePageContent();
};

// Eventos de mudança
editorHTML.getSession().on("change", function () {
    updatePageContent();
    scheduleSave();
});

editorCSS.getSession().on("change", function () {
    updatePageContent();
    scheduleSave();
});

editorJS.getSession().on("change", updatePageContent);

function newPage() {
    var html = getHTMLContent();
    if (html) {
        var win = window.open("data:text/html;charset=utf-8," + encodeURIComponent(html), "_blank");
        if (win) win.focus();
    } else {
        alert("Nenhum conteúdo salvo para exibir!");
    }
}

function clearCR() {
    editorHTML.setValue("", -1);
    editorCSS.setValue("", -1);
    editorJS.setValue("", -1);
    updatePageContent();
    scheduleSave();
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
