import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import Authors from './pages/Authors';
import AuthorDetail from './pages/AuthorDetail';
import BookDetail from './pages/BookDetail';
import About from './pages/About';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/authors/:slug" element={<AuthorDetail />} />
          <Route path="/books/:slug" element={<BookDetail />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}