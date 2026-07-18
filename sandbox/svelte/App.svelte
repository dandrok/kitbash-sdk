<script lang="ts">
import '../../templates/default/dist/vanilla/button.js';
import '../../templates/default/dist/vanilla/input.js';
import '../../templates/default/dist/vanilla/modal.js';

let count = $state(0);
let val = $state('');
let modalOpen = $state(false);
</script>

<div style="padding: 20px; font-family: sans-serif;">
  <h1>Svelte 5 Sandbox</h1>
  <p>Svelte State: {count}</p>
  <my-button 
    variant="secondary" 
    role="button" 
    tabindex="0" 
    onkitbash-change={() => count++}
  >
    Click Me (Svelte)
  </my-button>

  <form id="test-form" onsubmit={(e) => { e.preventDefault(); alert(val); }} style="margin-top: 20px;">
    <kitbash-input name="username" value={val} onkitbash-change={(e) => val = e.detail.props.value} required="true" placeholder="Enter username..."></kitbash-input>
    <button type="submit" style="margin-left: 10px;">Submit</button>
  </form>

  <div style="margin-top: 24px;">
    <h2>Modal</h2>
    <my-button variant="secondary" onclick={() => (modalOpen = true)}>
      Open modal
    </my-button>
    <kitbash-modal open={modalOpen} title="Svelte modal">
      <p style="margin: 0 0 12px;">Slot content — close or fire an alert.</p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <my-button variant="secondary" onclick={() => (modalOpen = false)}>
          Close
        </my-button>
        <my-button
          variant="primary"
          onclick={() => alert('Hello from the Svelte modal!')}
        >
          Trigger alert
        </my-button>
      </div>
    </kitbash-modal>
  </div>
</div>
