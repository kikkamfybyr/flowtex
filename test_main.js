import { get } from 'http';

get('http://localhost:5173/src/main.tsx', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('main.tsx response size:', data.length));
});
get('http://localhost:5173/src/App.tsx', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('App.tsx response size:', data.length));
});
