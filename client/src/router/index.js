import { createRouter, createWebHistory } from 'vue-router'
import LibraryView from '@/views/LibraryView.vue'

export default createRouter({
  history: createWebHistory('/shelf/'),
  routes: [
    { path: '/', name: 'library', component: LibraryView },
  ],
})
