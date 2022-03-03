import { createRouter, createWebHistory } from 'vue-router'
import Landing from '../pages/landing'

const routes = [
  {
    path: '/',
    name: 'Landing',
    component: Landing
  },
  {
    path: '/lab1',
    name: 'lab1',
    component: () => import('../pages/lab1')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
