<script lang="ts">
import '../../templates/default/dist/vanilla/button.js';
import '../../templates/default/dist/vanilla/input.js';

let count = $state(0);
let val = $state('');
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
</div>
