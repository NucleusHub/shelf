import { createRouter, createWebHistory } from 'vue-router'
import LibraryView from '@/views/LibraryView.vue'

// Single route: the library is the whole app. Book detail and statistics are
// in-page overlays/toggles (BookDetailModal, the stats view), not routes.
export default createRouter({
  history: createWebHistory('/shelf/'),
  routes: [
    { path: '/', name: 'library', component: LibraryView },
  ],
})
