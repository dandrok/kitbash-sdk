import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MyButton } from '../../templates/default/dist/react/button.js';
import { KitbashInput } from '../../templates/default/dist/react/input.js';
import { KitbashModal } from '../../templates/default/dist/react/modal.js';

function App() {
  const [count, setCount] = useState(0);
  const [val, setVal] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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

      <div style={{ marginTop: '24px' }}>
        <h2>Modal</h2>
        <MyButton variant="secondary" onClick={() => setModalOpen(true)}>
          Open modal
        </MyButton>
        <KitbashModal open={modalOpen} title="React modal">
          <p style={{ margin: '0 0 12px' }}>
            Slot content — close or fire an alert.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <MyButton variant="secondary" onClick={() => setModalOpen(false)}>
              Close
            </MyButton>
            <MyButton
              variant="primary"
              onClick={() => alert('Hello from the React modal!')}
            >
              Trigger alert
            </MyButton>
          </div>
        </KitbashModal>
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
}
