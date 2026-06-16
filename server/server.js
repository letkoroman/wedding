import './load-env.js';
import app from './app.js';

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
