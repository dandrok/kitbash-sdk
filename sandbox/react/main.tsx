import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MyButton } from '../../templates/default/dist/react/button.js';
import { KitbashInput } from '../../templates/default/dist/react/input.js';

function App() {
  const [count, setCount] = useState(0);
  const [val, setVal] = useState('');

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>React 19 Sandbox</h1>
      <p>React State Counter: {count}</p>
      <MyButton variant="primary" onClick={() => setCount((c) => c + 1)}>
        Click Me (React Wrapper)
      </MyButton>

      <form
        id="test-form"
        onSubmit={(e) => {
          e.preventDefault();
          alert(val);
        }}
        style={{ marginTop: '20px' }}
      >
        <KitbashInput
          name="username"
          value={val}
          onKitbashChange={(e) => setVal(e.detail.props.value)}
          required
          placeholder="Enter username..."
        />
        <button type="submit" style={{ marginLeft: '10px' }}>
          Submit
        </button>
      </form>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
}
