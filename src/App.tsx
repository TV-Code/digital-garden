import Garden from './components/Garden/Garden';

function App() {
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden' 
    }}>
      <Garden />
    </div>
  );
}

export default App;