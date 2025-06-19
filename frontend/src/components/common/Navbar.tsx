import React, { useState, useEffect, useRef } from "react";
import { Menu, X, LogOut, User, Coffee, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
	const { isAuthenticated, user, logout } = useAuth();
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const mobileMenuRef = useRef<HTMLDivElement>(null);
	const mobileButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		// Handle scroll for navbar effect
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};

		window.addEventListener("scroll", handleScroll);

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		// Handle clicks outside of mobile menu
		const handleClickOutside = (event: MouseEvent) => {
			if (
				mobileMenuOpen &&
				mobileMenuRef.current &&
				mobileButtonRef.current &&
				!mobileMenuRef.current.contains(event.target as Node) &&
				!mobileButtonRef.current.contains(event.target as Node)
			) {
				setMobileMenuOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [mobileMenuOpen]);

	return (
		<header className="fixed top-3 md:top-6 left-1/2 transform -translate-x-1/2 z-50 px-2 md:px-3 w-full max-w-7xl">
			<div
				className={`relative transition-all duration-500 ${
					scrolled ? "scale-97" : "scale-100"
				}`}
			>
				{/* Glow effect - reduced on mobile */}
				<div className="absolute inset-0 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 blur-xl md:blur-2xl opacity-30 md:opacity-50"></div>

				{/* Main navbar container - more compact on mobile */}
				<div className="relative bg-card/90 backdrop-blur-2xl rounded-full border-1 border-accent/10 shadow-md shadow-primary/20 shadow-accent/30 px-4 py-3 md:px-8 md:py-4">
					{/* Subtle gradient overlay */}
					<div className="absolute inset-0 bg-gradient-to-r from-muted/10 via-transparent to-muted/10 rounded-full"></div>

					<div className="relative flex items-center justify-between">
						{/* Logo */}
						<Link
							to="/"
							className="flex items-center space-x-2 group cursor-pointer"
						>
							<div className="relative">
								<span className="text-xl font-bold text-foreground">Time</span>
								<span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
									Brew
								</span>
								{/* <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div> */}
							</div>
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex items-center space-x-6">
							{!isAuthenticated ? (
								<>
									<a
										href="#features"
										className="text-muted-foreground hover:text-foreground font-medium transition-all duration-300 relative group"
									>
										<span>Features</span>
										<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
									</a>
									<a
										href="#how-it-works"
										className="text-muted-foreground hover:text-foreground font-medium transition-all duration-300 relative group"
									>
										<span>How It Works</span>
										<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
									</a>

									{/* Vertical divider */}
									<div className="h-6 w-px bg-border"></div>

									<Link
										to="/signin"
										className="text-muted-foreground hover:text-foreground font-medium transition-colors duration-300"
									>
										Login
									</Link>

									{/* Theme Toggle */}
									<ThemeToggle variant="minimal" />

									{/* CTA Button */}
									<Link to="/signup" className="relative group">
										<div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
										<div className="relative bg-gradient-to-r from-primary to-accent text-primary-foreground px-5 py-2 rounded-full font-medium text-sm hover:shadow-lg transition-all duration-300">
											Get Started
										</div>
									</Link>
								</>
							) : (
								<>
									<Link
										to="/dashboard"
										className="text-muted-foreground hover:text-foreground font-medium transition-all duration-300 relative group flex items-center gap-2"
									>
										<Coffee className="w-4 h-4" />
										<span>My Brews</span>
										<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
									</Link>
									<Link
										to="/settings"
										className="text-muted-foreground hover:text-foreground font-medium transition-all duration-300 relative group flex items-center gap-2"
									>
										<Settings className="w-4 h-4" />
										<span>Settings</span>
										<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
									</Link>

									{/* Vertical divider */}
									<div className="h-6 w-px bg-border"></div>

									{/* Theme Toggle */}
									<ThemeToggle variant="minimal" />

									{/* User info */}
									<div className="flex items-center gap-2 text-muted-foreground">
										<User className="w-4 h-4" />
										<span className="font-medium">
											{user?.firstName || "User"}
										</span>
									</div>

									{/* Logout Button */}
									<button
										onClick={logout}
										className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors duration-300"
									>
										<LogOut className="w-4 h-4" />
										Logout
									</button>
								</>
							)}
						</nav>

						{/* Mobile menu button */}
						<button
							ref={mobileButtonRef}
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="md:hidden text-foreground p-1.5"
						>
							<Menu className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Mobile dropdown */}
				<div
					ref={mobileMenuRef}
					className={`md:hidden absolute top-full left-0 right-0 mt-2 transition-all duration-300 ${
						mobileMenuOpen
							? "opacity-100 translate-y-0"
							: "opacity-0 -translate-y-4 pointer-events-none"
					}`}
				>
					<div className="mx-8 p-4 bg-card/90 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl">
						<div className="space-y-3">
							{!isAuthenticated ? (
								<>
									<a
										href="#features"
										className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
									>
										Features
									</a>
									<a
										href="#how-it-works"
										className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
									>
										How It Works
									</a>
									<Link
										to="/signin"
										className="block px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
									>
										Login
									</Link>

									{/* Theme Toggle */}
									<ThemeToggle variant="button" />
									<Link to="/signup" className="block w-full">
										<div className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-2 rounded-lg font-medium">
											Get Started
										</div>
									</Link>
								</>
							) : (
								<>
									<div className="flex items-center gap-2 px-4 py-2 text-primary font-medium">
										<User className="w-4 h-4" />
										{user?.firstName || "User"}
									</div>
									<Link
										to="/dashboard"
										className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
									>
										<Coffee className="w-4 h-4" />
										My Brews
									</Link>
									<Link
										to="/settings"
										className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
									>
										<Settings className="w-4 h-4" />
										Settings
									</Link>
									{/* Theme Toggle */}
									<ThemeToggle variant="button" />

									<button
										onClick={logout}
										className="flex items-center gap-2 w-full px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
									>
										<LogOut className="w-4 h-4" />
										Logout
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Navbar;
