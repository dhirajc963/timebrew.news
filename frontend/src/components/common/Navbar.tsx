import React, { useState, useEffect, useRef } from "react";
import { Menu, LogOut, User, Coffee, Settings, Zap, Workflow, LogIn, Rocket } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const Navbar = () => {
	const { isAuthenticated, user, logout } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [scrolled, setScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const mobileMenuRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

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

	// Close mobile menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				mobileMenuRef.current &&
				buttonRef.current &&
				!mobileMenuRef.current.contains(event.target as Node) &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setIsMobileMenuOpen(false);
			}
		};

		if (isMobileMenuOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isMobileMenuOpen]);

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [location.pathname]);

	// Function to close mobile menu when clicking on menu items
	const handleMenuItemClick = () => {
		setIsMobileMenuOpen(false);
	};

	// Function to handle anchor navigation
	const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
		e.preventDefault();
		handleMenuItemClick(); // Close mobile menu
		
		// If we're not on the home page, navigate to home first
		if (location.pathname !== '/') {
			navigate('/');
			// Wait for navigation to complete, then scroll to section
			setTimeout(() => {
				const element = document.getElementById(sectionId);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth' });
				}
			}, 100);
		} else {
			// We're already on home page, just scroll to section
			const element = document.getElementById(sectionId);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth' });
			}
		}
	};

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
									onClick={(e) => handleAnchorClick(e, 'features')}
									className="text-muted-foreground hover:text-foreground font-medium transition-all duration-300 relative group flex items-center gap-2"
								>
									<Zap className="w-4 h-4" />
									<span>Features</span>
									<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
								</a>
								<a
									href="#how-it-works"
									onClick={(e) => handleAnchorClick(e, 'how-it-works')}
									className="text-muted-foreground hover:text-foreground font-medium transition-all duration-300 relative group flex items-center gap-2"
								>
									<Workflow className="w-4 h-4" />
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

						{/* Mobile menu - simple test */}
						<div className="md:hidden relative">
							<button 
								ref={buttonRef}
								className="p-2 rounded-lg bg-card/90 backdrop-blur-sm border border-border/20 hover:bg-accent/50 transition-colors"
								onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							>
								<Menu className="w-5 h-5 text-foreground" />
							</button>
							{isMobileMenuOpen && (
								<div 
									ref={mobileMenuRef}
									className="absolute top-full right-0 mt-2 w-56 bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl z-[9999]"
								>
								{!isAuthenticated ? (
									<>
										<div className="mx-2 my-1">
											<a href="#features" onClick={(e) => handleAnchorClick(e, 'features')} className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-md flex items-center">
												<Zap className="w-4 h-4 mr-2" />
												Features
											</a>
										</div>
										<div className="mx-2 my-1">
											<a href="#how-it-works" onClick={(e) => handleAnchorClick(e, 'how-it-works')} className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-md flex items-center">
												<Workflow className="w-4 h-4 mr-2" />
												How It Works
											</a>
										</div>
										<div className="h-px bg-border/50 mx-2 my-2"></div>
										<div className="mx-2 my-1">
											<Link to="/signin" onClick={handleMenuItemClick} className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-md flex items-center">
												<LogIn className="w-4 h-4 mr-2" />
												Login
											</Link>
										</div>
										<div className="mx-2 my-1">
											<Link to="/signup" onClick={handleMenuItemClick} className="block px-4 py-3 text-foreground font-medium bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-colors rounded-md flex items-center">
												<Rocket className="w-4 h-4 mr-2" />
												Get Started
											</Link>
										</div>
									</>
								) : (
									<>
										<div className="px-4 py-3 font-medium text-foreground flex items-center mx-2 my-1">
											<User className="w-4 h-4 mr-2 text-primary" />
											{user?.firstName || "User"}
										</div>
										<div className="h-px bg-border/50 mx-2 my-2"></div>
										<div className="mx-2 my-1">
											<Link to="/dashboard" onClick={handleMenuItemClick} className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-md flex items-center">
												<Coffee className="w-4 h-4 mr-2" />
												My Brews
											</Link>
										</div>
										<div className="mx-2 my-1">
											<Link to="/settings" onClick={handleMenuItemClick} className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-md flex items-center">
												<Settings className="w-4 h-4 mr-2" />
												Settings
											</Link>
										</div>
										<div className="h-px bg-border/50 mx-2 my-2"></div>
										<div className="mx-2 my-1">
											<button onClick={() => { logout(); handleMenuItemClick(); }} className="block w-full text-left px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-md flex items-center">
												<LogOut className="w-4 h-4 mr-2" />
												Logout
											</button>
										</div>
									</>
								)}
								{/* Theme Toggle in dropdown */}
								<div className="h-px bg-border/50 mx-2 my-2"></div>
								<div className="px-4 py-3 mx-2 my-1">
										<ThemeToggle />
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Navbar;
