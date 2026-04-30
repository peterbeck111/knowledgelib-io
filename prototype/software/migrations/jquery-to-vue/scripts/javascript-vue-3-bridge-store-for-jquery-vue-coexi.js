// Input:  A legacy jQuery page where Vue needs to read/write shared state
// Output: A reactive bridge that lets jQuery code and Vue components share data

// bridge-store.js — shared store for jQuery ↔ Vue communication
import { reactive, watch } from 'vue';

// Create a reactive store accessible from both jQuery and Vue
export const bridgeStore = reactive({
  user: null,
  theme: 'light',
  notifications: []
});

// jQuery side: update the store from jQuery code
// window.bridgeStore = bridgeStore;
// window.bridgeStore.user = { name: 'Alice', role: 'admin' };
// window.bridgeStore.theme = 'dark';

// Vue side: use the store directly in components (it's already reactive)
// <script setup>
// import { bridgeStore } from './bridge-store';
// </script>
// <template>
//   <p v-if="bridgeStore.user">Hello, {{ bridgeStore.user.name }}</p>
//   <p v-else>Not logged in</p>
// </template>

// Optional: watch for changes and notify jQuery code
watch(
  () => bridgeStore.theme,
  (newTheme) => {
    // Notify jQuery code of Vue-initiated changes
    document.body.setAttribute('data-theme', newTheme);
    $(document).trigger('theme:changed', [newTheme]);
  }
);
