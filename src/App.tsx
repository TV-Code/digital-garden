import { Scene } from "./components/Sanctuary/Scene";

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden' 
    }}>
      <Scene />
    </div>
  );
}

export default App;