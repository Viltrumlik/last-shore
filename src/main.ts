import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import './style.css';
import { App } from './ui/app';

const root = document.getElementById('app');
if (root) {
  try {
    new App(root);
  } catch (err) {
    root.textContent = 'Last Shore could not start: ' + String(err);
    throw err;
  }
}
