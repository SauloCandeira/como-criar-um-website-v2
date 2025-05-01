function changeTab(tabNumber) {
    switch (tabNumber) {
        case 1:
            document.getElementById("editorHTML").style.display = 'block';
            document.getElementById("editorCSS").style.display = 'none';
            document.getElementById("editorJS").style.display = 'none';
            document.getElementById("editorCDN").style.display = 'none';
            document.getElementById("htmlButton").style.backgroundColor = '#ffeb3b';
            document.getElementById("cssButton").style.backgroundColor = 'azure';
            document.getElementById("jsButton").style.backgroundColor = 'azure';
            document.getElementById("cdnButton").style.backgroundColor = 'azure';
            break;
        case 2:
            document.getElementById("editorHTML").style.display = 'none';
            document.getElementById("editorCSS").style.display = 'block';
            document.getElementById("editorJS").style.display = 'none';
            document.getElementById("editorCDN").style.display = 'none';
            document.getElementById("cssButton").style.backgroundColor = '#ffeb3b';
            document.getElementById("htmlButton").style.backgroundColor = 'azure';
            document.getElementById("jsButton").style.backgroundColor = 'azure';
            document.getElementById("cdnButton").style.backgroundColor = 'azure';
            break;
        case 3:
            document.getElementById("editorJS").style.display = 'block';
            document.getElementById("editorCSS").style.display = 'none';
            document.getElementById("editorHTML").style.display = 'none';
            document.getElementById("editorCDN").style.display = 'none';
            document.getElementById("jsButton").style.backgroundColor = '#ffeb3b';
            document.getElementById("cssButton").style.backgroundColor = 'azure';
            document.getElementById("htmlButton").style.backgroundColor = 'azure';
            document.getElementById("cdnButton").style.backgroundColor = 'azure';
            break;
        case 4:
            document.getElementById("editorJS").style.display = 'none';
            document.getElementById("editorCSS").style.display = 'none';
            document.getElementById("editorHTML").style.display = 'none';
            document.getElementById("editorCDN").style.display = 'block';
            document.getElementById("jsButton").style.backgroundColor = 'azure';
            document.getElementById("cssButton").style.backgroundColor = 'azure';
            document.getElementById("htmlButton").style.backgroundColor = 'azure';
            document.getElementById("cdnButton").style.backgroundColor = '#ffeb3b';
            break;
    }
    // Garantir que o conteúdo da página seja atualizado após a mudança de aba
    updatePageContent();
}
