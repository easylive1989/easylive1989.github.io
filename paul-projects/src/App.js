import logo from './logo.svg';
import './App.css';
import { useState } from 'react';

const projectsMap = {
  "NS-SHAFT": "https://playernsshaft.web.app/#/",
  "breakout": "https://easylive1989.github.io/flutter_breakout"
}

function App() {

  const [key, setKey] = useState("NS-SHAFT")

  return (
    <div className="App">
      <header className="App-header d-flex align-items-center">
        <div className="d-flex align-items-start mb-4">
          {
            Object.keys(projectsMap).map((key) => {
              return <button type="button" className="btn btn-primary ms-2 me-2" onClick={() => setKey(key)}>{key}</button>
            })
          }
        </div>
        <iframe name="iframe" src={projectsMap[key]}></iframe>
      </header>
    </div>
  );
}

export default App;
