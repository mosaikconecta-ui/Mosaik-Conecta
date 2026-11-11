import { lazy } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/layout/Layout'

// Code splitting por rota: cada página (e a cena 3D da Home) vira um chunk próprio.
const Home = lazy(() => import('./pages/Home'))
const Treatments = lazy(() => import('./pages/Treatments'))
const About = lazy(() => import('./pages/About'))
const Technology = lazy(() => import('./pages/Technology'))
const Contact = lazy(() => import('./pages/Contact'))
const NotFound = lazy(() => import('./pages/NotFound'))

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/tratamentos', element: <Treatments /> },
      { path: '/sobre', element: <About /> },
      { path: '/tecnologia', element: <Technology /> },
      { path: '/contato', element: <Contact /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
