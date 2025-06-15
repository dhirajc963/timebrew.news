import React from "react";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import LandingPage from "./components/pages/LandingPage";

const App = () => {
	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-card to-muted text-foreground">
			<Navbar />
			<LandingPage />
			<Footer />
		</div>
	);
};

export default App;
