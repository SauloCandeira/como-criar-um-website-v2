import React, { useState, useEffect } from 'react';
import './CodeRunner.css';

export default function CodeRunner() {
  const [activeTab, setActiveTab] = useState('html');
  const [selectedCdnType, setSelectedCdnType] = useState('js'); // Estado para controlar o tipo de CDN selecionado

  // Função para carregar os scripts dinamicamente
  const loadScript = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src; // ✅ Caminho relativo simples
      script.onload = () => {
        console.log(`✅ Script carregado: ${script.src}`);
        resolve();
      };
      script.onerror = () => {
        console.error(`❌ Erro ao carregar script: ${script.src}`);
        reject(new Error(`Erro ao carregar script: ${script.src}`));
      };
      document.body.appendChild(script);
    });
  };

  // Carregar scripts quando o componente for montado
  useEffect(() => {
    const loadAce = async () => {
      try {
        console.log("🔄 Iniciando carregamento do ACE...");
        await loadScript('JS/ace/ace.js');
        await loadScript('JS/ace/ext-language_tools.js');
        await loadScript('JS/ace/ext-beautify.js');
        await loadScript('JS/editor.js');
        //await loadScript('JS/script.js');
      } catch (error) {
        console.error("💥 Erro durante carregamento do ACE:", error);
      }
    };

    loadAce();
  }, []);

  // Função para alternar entre os editores
  const changeTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Função para atualizar o tipo de CDN selecionado
  const handleCdnTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCdnType(event.target.value);
  };

  return (
    <div>
      <div id="topBar">
        <h1 id="logo">Javascript Code Runner</h1>
        <div id="set">
          <button className="toggleB" onClick={() => changeTab('html')}>HTML</button>
          <button className="toggleB" onClick={() => changeTab('css')}>CSS</button>
          <button className="toggleB" onClick={() => changeTab('js')}>JavaScript</button>
          <button className="toggleB" onClick={() => changeTab('cdn')}>CDN</button>
        </div>
      </div>

      <div id="editor-output-container">
        <div id="editors-section">
          <h2>CODE EDITOR</h2>
          <div id="editors">
            <div id="editorHTML" className={`editorArea ${activeTab === 'html' ? 'active' : ''}`} style={{ fontSize: '13px' }}></div>
            <div id="editorCSS" className={`editorArea ${activeTab === 'css' ? 'active' : ''}`} style={{ fontSize: '13px' }}></div>
            <div id="editorJS" className={`editorArea ${activeTab === 'js' ? 'active' : ''}`} style={{ fontSize: '13px' }}></div>
            <div id="editorCDN" className={`editorArea ${activeTab === 'cdn' ? 'active' : ''}`}>
              <table className="cdnList" id="list" style={{ display: 'none' }}>
                <thead>
                  <tr>
                    <th className="cell"> TYPE </th>
                    <th className="cell"> CDN LINK </th>
                    <th className="cell"> REMOVE </th>
                  </tr>
                </thead>
              </table>
              <br />
              <table className="cdnList">
                <thead>
                  <tr>
                    <th className="cell"> TYPE </th>
                    <th className="cell"> CDN LINK </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="cell">
                      <label style={{ fontSize: '25px' }}>
                        <input 
                          type="radio" 
                          name="cdnType" 
                          value="js" 
                          checked={selectedCdnType === 'js'} 
                          onChange={handleCdnTypeChange} 
                        /> JS
                      </label><br /><br />
                      <label style={{ fontSize: '25px' }}>
                        <input 
                          type="radio" 
                          name="cdnType" 
                          value="css" 
                          checked={selectedCdnType === 'css'} 
                          onChange={handleCdnTypeChange} 
                        /> CSS
                      </label>
                    </td>
                    <td className="cell">
                      <input type="text" placeholder="ENTER CDN LINK HERE" id="cdnLink" style={{ width: '100%', height: '50px', fontSize: '20px' }} />
                    </td>
                  </tr>
                  <tr>
                  <td colSpan={2}>
                      <input type="button" value="ADD CDN LINK" style={{ fontSize: '17px', backgroundColor: '#4caf50', width: '100%', height: '75px' }} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>


        <div id="preview-section">
          <h2>OUTPUT</h2>
          <div id="preview">
            <iframe id="output"></iframe>
          </div>
        </div>
      </div>

      <br /><br />
      <table style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td>
              <input type="button" value="CLEAR CODE RUNNER" style={{ fontSize: '17px', backgroundColor: '#f44336', width: '100%', height: '75px' }} />
            </td>
            <td>
              <input type="button" value="OPEN OUTPUT IN NEW TAB" style={{ fontSize: '17px', backgroundColor: '#4caf50', width: '100%', height: '75px' }} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
