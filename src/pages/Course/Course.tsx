import React from 'react';
import './Course.css';

const Course: React.FC = () => {
  return (
    <div>
      <div id="topBar">
        <h1 id="logo">Javascript Code Runner</h1>
        <div id="set">
          <button className="toggleB" onClick={() => changeTab(1)}>HTML</button>
          <button className="toggleB" onClick={() => changeTab(2)}>CSS</button>
          <button className="toggleB" onClick={() => changeTab(3)}>JavaScript</button>
          <button className="toggleB" onClick={() => changeTab(4)}>CDN</button>
        </div>
      </div>

      <div id="editor-output-container">
        <div id="editors-section">
          <h2>CODE EDITOR</h2>
          <div id="editors">
            <div id="editorHTML" className="editorArea active" style={{ fontSize: 13 }}></div>
            <div id="editorCSS" className="editorArea" style={{ fontSize: 13 }}></div>
            <div id="editorJS" className="editorArea" style={{ fontSize: 13 }}></div>
            <div id="editorCDN" className="editorArea">
              <table className="cdnList" id="list" style={{ display: 'none' }}>
                <thead>
                  <tr>
                    <th className="cell">TYPE</th>
                    <th className="cell">CDN LINK</th>
                    <th className="cell">REMOVE</th>
                  </tr>
                </thead>
              </table>
              <br /><br />
              <table className="cdnList">
                <thead>
                  <tr>
                    <th className="cell">TYPE</th>
                    <th className="cell">CDN LINK</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="cell">
                      <label style={{ fontSize: 25 }}>
                        <input type="radio" name="cdnType" defaultChecked /> JS
                      </label><br /><br />
                      <label style={{ fontSize: 25 }}>
                        <input type="radio" name="cdnType" /> CSS
                      </label>
                    </td>
                    <td className="cell">
                      <input type="text" placeholder="ENTER CDN LINK HERE" id="cdnLink" style={{ width: '100%', height: 50, fontSize: 20 }} />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2}>
                      <input
                        type="button"
                        value="ADD CDN LINK"
                        onClick={addCDN}
                        style={{ fontSize: 17, backgroundColor: '#4caf50', width: '100%', height: 75 }}
                      />
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
            <iframe id="output" title="preview" />
          </div>
        </div>
      </div>

      <br /><br />
      <table style={{ width: '100%' }}>
        <tbody>
          <tr>
            <td>
              <input
                type="button"
                onClick={clearCR}
                value="CLEAR CODE RUNNER"
                style={{ fontSize: 17, backgroundColor: '#f44336', width: '100%', height: 75 }}
              />
            </td>
            <td>
              <input
                type="button"
                onClick={newPage}
                value="OPEN OUTPUT IN NEW TAB"
                style={{ fontSize: 17, backgroundColor: '#4caf50', width: '100%', height: 75 }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Essas funções precisam ser implementadas ou importadas para funcionar
const changeTab = (index: number) => {
  console.log('Trocar para tab:', index);
};

const addCDN = () => {
  console.log('Adicionar CDN');
};

const clearCR = () => {
  console.log('Limpar Code Runner');
};

const newPage = () => {
  window.open('/output', '_blank');
};

export default Course;
