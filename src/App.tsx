import React from 'react';
import Garden from './components/Garden/Garden';

function App() {
  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      <Garden />
    </div>
  );
}

export default App;