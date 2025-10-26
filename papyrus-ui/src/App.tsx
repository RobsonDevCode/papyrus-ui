import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import './App.css'
import Upload from './pages/Upload';
import Reader from './pages/Book';
import Library from './pages/Library';
import LoginPage from './pages/Login';
import SignUp from './pages/SignUp';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element ={<Home/>} />
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/register" element={<SignUp/>}/>
        <Route path="/upload" element={<Upload/>} />
        <Route path="/reader/:documentGroupId" element={<Reader/>} />
        <Route path="/library" element={<Library/>}/>
      </Routes>
    </Router>
  )
}

export default App
