import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ChakraProvider } from "@chakra-ui/react";
import { Provider } from "react-redux";
import store from "./store/index";
import Swal from "sweetalert2";

Swal.mixin({
  customClass: {
    popup: "swal-font",
  },
});
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <HashRouter>
        <ChakraProvider>
          <App />
        </ChakraProvider>
      </HashRouter>
    </Provider>
  </React.StrictMode>
);
