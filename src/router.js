import Vue from 'vue'
import VueRouter from 'vue-router'

/*
  Import views
*/
import HomeView from './views/Home'
import LoginView from './views/Login'
import LogoutView from './views/Logout'
import UtsendelserView from './views/Utsendelser'
import TemplateView from './views/Templates'
import DevelopmentView from './views/Development'

Vue.use(VueRouter)

/*
  Setup routes
*/
const routes = [
  {
    path: '/',
    component: HomeView
  },
  {
    path: '/login',
    component: LoginView
  },
  {
    path: '/logout',
    component: LogoutView
  },
  {
    path: '/utsendelser',
    component: UtsendelserView
  },
  {
    path: '/maler',
    component: TemplateView
  }
]

// Add the dev route if in development mode
if (process.env.NODE_ENV === 'development') {
  routes.push({
    path: '/dev',
    component: DevelopmentView
  })
}

/*
  Set up the router
*/
const router = new VueRouter({
  mode: 'history',
  routes
})

/*
  Handle authentication
*/
router.beforeEach(async (to, from, next) => {
  // If logging in, just proceed
  if (to && (to.path === '/login' || to.path === '/logout')) return next()
  if (to.hash && to.hash.startsWith('#code=')) return next()

  // Check if re-authentication is necessary
  if (Vue.prototype.$isAuthenticationRequired()) {
    console.log('Must re-authenticate')
    next('/login')
  }

  // Proceed
  next()
})

// Error handler
router.onError((err) => {
  console.log('Route error:')
  console.log(err)
})

export default router
