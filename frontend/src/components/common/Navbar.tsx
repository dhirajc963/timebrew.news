import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const Navbar = () => {
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

	return (
		<header className="fixed top-3 md:top-6 left-1/2 transform -translate-x-1/2 z-50 px-2 md:px-3 w-full max-w-7xl">
			<div
				className={`relative transition-all duration-500 ${
					scrolled ? "scale-97" : "scale-100"
				}`}
			>
				{/* Glow effect - reduced on mobile */}
				<div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 via-slate-700/20 to-slate-800/20 blur-xl md:blur-2xl opacity-30 md:opacity-50"></div>

				{/* Main navbar container - more compact on mobile */}
				<div className="relative bg-slate-900/90 backdrop-blur-2xl rounded-full border border-slate-700/50 shadow-xl md:shadow-2xl shadow-black/20 px-4 py-3 md:px-8 md:py-4">
					{/* Subtle gradient overlay */}
					<div className="absolute inset-0 bg-gradient-to-r from-slate-800/10 via-transparent to-slate-800/10 rounded-full"></div>

					<div className="relative flex items-center justify-between">
						{/* Logo */}
						<div className="flex items-center space-x-2 group cursor-pointer">
							<div className="relative">
								<span className="text-xl font-bold text-white">Time</span>
								<span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
									Brew
								</span>
								{/* <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div> */}
							</div>
						</div>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex items-center space-x-6">
							<a
								href="#features"
								className="text-slate-300 hover:text-white font-medium transition-all duration-300 relative group"
							>
								<span>Features</span>
								<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
							</a>
							<a
								href="#how-it-works"
								className="text-slate-300 hover:text-white font-medium transition-all duration-300 relative group"
							>
								<span>How It Works</span>
								<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
							</a>

							{/* Vertical divider */}
							<div className="h-6 w-px bg-slate-700"></div>

							<button className="text-slate-300 hover:text-white font-medium transition-colors duration-300">
								Login
							</button>

							{/* CTA Button */}
							<button className="relative group">
								<div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
								<div className="relative bg-gradient-to-r from-primary to-accent text-primary-foreground px-5 py-2 rounded-full font-medium text-sm hover:shadow-lg transition-all duration-300">
									Get Started
								</div>
							</button>
						</nav>

						{/* Mobile menu button */}
						<button
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="md:hidden text-white p-1.5"
						>
							{mobileMenuOpen ? (
								<X className="w-5 h-5" />
							) : (
								<Menu className="w-5 h-5" />
							)}
						</button>
					</div>
				</div>

				{/* Mobile dropdown */}
				<div
					className={`md:hidden absolute top-full left-0 right-0 mt-2 transition-all duration-300 ${
						mobileMenuOpen
							? "opacity-100 translate-y-0"
							: "opacity-0 -translate-y-4 pointer-events-none"
					}`}
				>
					<div className="mx-8 p-4 bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-2xl">
						<div className="space-y-3">
							<a
								href="#features"
								className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
							>
								Features
							</a>
							<a
								href="#how-it-works"
								className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
							>
								How It Works
							</a>
							<a
								href="#"
								className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
							>
								Login
							</a>
							<button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-2 rounded-lg font-medium">
								Get Started
							</button>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Navbar;
