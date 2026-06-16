import express from 'express';
import guestsRouter from './routes/guests.js';
import agendaRouter from './routes/agenda.js';
import tasksRouter from './routes/tasks.js';
import accommodationsRouter from './routes/accommodations.js';

const app = express();

app.use(express.json());

app.use('/api/guests', guestsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/accommodations', accommodationsRouter);

export default app;
