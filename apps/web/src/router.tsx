import { createBrowserRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage.js';
import CasePage from './pages/CasePage.js';
import FilePage from './pages/FilePage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/c/:owner/:repo',
    element: <CasePage />,
  },
  {
    path: '/c/:owner/:repo/f/*',
    element: <FilePage />,
  },
]);
