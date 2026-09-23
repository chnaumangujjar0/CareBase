import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './store/store.ts'
import 'react-toastify/dist/ReactToastify.css';
import "./styles/index.scss"

createRoot(document.getElementById('root')!).render(
  
    <Provider store={store}>
      <App />
    </Provider>
  
)
