import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import './App.css'
import Upload from './pages/Upload';
import Reader from './pages/Book';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element ={<Home/>} />
        <Route path="/upload" element={<Upload/>} />
        <Route path="/reader" element={<Reader/>} />
      </Routes>
    </Router>
  )
}

export default App
