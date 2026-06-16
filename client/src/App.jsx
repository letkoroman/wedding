import { useState } from 'react';
import Hero from './components/Hero.jsx';
import Nav from './components/Nav.jsx';
import PhotoGallery from './components/PhotoGallery.jsx';
import GuestsPage from './components/guests/GuestsPage.jsx';
import AgendaPage from './components/agenda/AgendaPage.jsx';
import TasksPage from './components/tasks/TasksPage.jsx';
import AccommodationsPage from './components/accommodations/AccommodationsPage.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('hoste');

  return (
    <div className="app">
      <Hero />
      <Nav active={activeTab} onChange={setActiveTab} />
      <PhotoGallery />
      <main className="container section">
        {activeTab === 'hoste' && <GuestsPage />}
        {activeTab === 'program' && <AgendaPage />}
        {activeTab === 'ukoly' && <TasksPage />}
        {activeTab === 'ubytovani' && <AccommodationsPage />}
      </main>
    </div>
  );
}
