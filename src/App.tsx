import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Catalogue from './pages/Catalogue';
import Authors from './pages/Authors';
import AuthorDetail from './pages/AuthorDetail';
import BookDetail from './pages/BookDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import InstallPrompt from './components/InstallPrompt';

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
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
        </Route>
      </Routes>
      <InstallPrompt />
    </BrowserRouter>
  );
}