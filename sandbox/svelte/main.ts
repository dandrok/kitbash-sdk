import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
let app: ReturnType<typeof mount> | undefined;
if (target) {
  app = mount(App, { target });
}

export default app;
