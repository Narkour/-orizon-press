import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div style={{fontFamily:'Georgia',padding:'2rem',textAlign:'center',background:'#faf7f2',minHeight:'100vh'}}>
            <h1 style={{color:'#c9952a',fontSize:'3rem'}}>◈ Orizon Press</h1>
            <p style={{color:'#8a8278',marginTop:'1rem'}}>Publishing works that reach beyond the horizon</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}