import { createServer } from 'http';
import { get } from 'http';

get('http://localhost:5173', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('HTML:', data.substring(0, 500)));
});
