import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import LandingPage from "./components/pages/landing/LandingPage";
import Signup from "./components/pages/auth/Signup";
import Login from "./components/pages/auth/Signin";
import Dashboard from "./components/pages/dashboard/Dashboard";
import CreateBrew from "./components/pages/dashboard/CreateBrew";
import BrewDetails from "./components/pages/dashboard/BrewDetails";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

const App = () => {
	return (
		<Router>
			<AuthProvider>
				<div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-card to-muted text-foreground">
				<Navbar />
				<main className="flex-1">
					<Routes>
						{/* Public Routes */}
						<Route path="/" element={<LandingPage />} />
						<Route path="/signup" element={<Signup />} />
						<Route path="/signin" element={<Login />} />

						{/* Protected Routes */}
						<Route element={<ProtectedRoute />}>
							<Route path="/dashboard" element={<Dashboard />} />
							<Route path="/dashboard/create-brew" element={<CreateBrew />} />
							<Route path="/dashboard/brew/:id" element={<BrewDetails />} />
							{/* Add more protected routes here */}
						</Route>
					</Routes>
				</main>
				<Footer />
			</div>
			</AuthProvider>
		</Router>
	);
};

export default App;
