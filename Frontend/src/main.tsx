import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store/store";
import "react-toastify/dist/ReactToastify.css";
import "./styles/index.scss";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Missing application root element with id "root".');
}

createRoot(rootElement).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
