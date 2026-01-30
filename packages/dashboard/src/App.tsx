import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Events } from './pages/Events';
import { Schema } from './pages/Schema';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/events" element={<Events />} />
        <Route path="/schema" element={<Schema />} />
      </Routes>
    </Layout>
  );
}

export default App;
