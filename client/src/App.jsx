import { useState } from 'react';
import Hero from './components/Hero.jsx';
import Nav from './components/Nav.jsx';
import PhotoGallery from './components/PhotoGallery.jsx';
import AgendaPage from './components/agenda/AgendaPage.jsx';
import TasksPage from './components/tasks/TasksPage.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('program');

  return (
    <div className="app">
      <Hero />
      <Nav active={activeTab} onChange={setActiveTab} />
      <PhotoGallery />
      <main className="container section">
        {activeTab === 'program' && <AgendaPage />}
        {activeTab === 'ukoly' && <TasksPage />}
      </main>
    </div>
  );
}
