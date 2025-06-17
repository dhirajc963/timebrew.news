import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import LandingPage from "./components/pages/landing/LandingPage";
import Signup from "./components/pages/auth/Signup";
import Login from "./components/pages/auth/Login";

const App = () => {
	return (
		<Router>
			<div className="min-h-screen bg-gradient-to-br from-background via-card to-muted text-foreground">
				<Navbar />
				<main className="flex-1">
					<Routes>
						<Route path="/" element={<LandingPage />} />
						<Route path="/signup" element={<Signup />} />
						<Route path="/signin" element={<Login />} />
						{/* Add more routes as needed */}
						<Route path="/dashboard" element={<h1>Some Dash</h1>} />
					</Routes>
				</main>
				<Footer />
			</div>
		</Router>
	);
};

export default App;
