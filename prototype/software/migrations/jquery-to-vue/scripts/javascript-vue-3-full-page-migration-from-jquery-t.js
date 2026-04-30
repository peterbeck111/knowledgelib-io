// Input:  A jQuery page with a search form, results list, and loading spinner
// Output: Equivalent Vue 3 Single File Component with Composition API

// SearchPage.vue
<script setup>
import { ref, computed } from 'vue';

const query = ref('');
const results = ref([]);
const loading = ref(false);
const error = ref(null);

const hasResults = computed(() => results.value.length > 0);

async function handleSearch() {
  if (!query.value.trim()) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query.value)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    results.value = data.items;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="search-page">
    <form @submit.prevent="handleSearch">
      <input
        v-model="query"
        type="text"
        placeholder="Search..."
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Searching...' : 'Search' }}
      </button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <ul v-if="hasResults">
      <li v-for="item in results" :key="item.id">
        {{ item.title }}
      </li>
    </ul>
  </div>
</template>
