import React from "react";
import ReactDOM from "react-dom/client";
import { Amplify } from '@aws-amplify/core';
import amplifyConfig from './config/amplify';
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";

// Configure Amplify
Amplify.configure(amplifyConfig);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ThemeProvider>
			<App />
		</ThemeProvider>
	</React.StrictMode>
);
