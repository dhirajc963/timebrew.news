import React, { useState, useEffect } from "react";
import {
	ChevronDown,
	Coffee,
	Clock,
	Zap,
	Shield,
	Star,
	Users,
	Sparkles,
	Play,
	Check,
	Plus,
	Minus,
	Menu,
	X,
} from "lucide-react";

const TimeBrew = () => {
	const [isVisible, setIsVisible] = useState(false);
	const [currentMockup, setCurrentMockup] = useState(0);
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	useEffect(() => {
		setIsVisible(true);

		// Animated mockup rotation
		const interval = setInterval(() => {
			setCurrentMockup((prev) => (prev + 1) % 3);
		}, 3000);

		// Handle scroll for navbar effect
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};

		window.addEventListener("scroll", handleScroll);

		return () => {
			clearInterval(interval);
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	const mockupStates = [
		{ title: "Choose Your Brew", content: "Tech News • 7:00 AM • 5 articles" },
		{ title: "AI Processing", content: "Curating your perfect digest..." },
		{ title: "Your Brew Ready", content: "5 tech stories, 2-min read ☕" },
	];

	const features = [
		{
			icon: Coffee,
			title: "Up to 3 Daily Brews",
			desc: "Zero overload, maximum value",
		},
		{
			icon: Zap,
			title: "Custom Article Count",
			desc: "3, 5, or 8 articles - you decide",
		},
		{
			icon: Sparkles,
			title: "AI-Curated Summaries",
			desc: "Powered by Perplexity Sonar",
		},
		{ icon: Shield, title: "Privacy First", desc: "Only email & prefs stored" },
	];

	const steps = [
		{
			icon: Plus,
			title: "Pick Your Brews",
			desc: "Topic • Time • # of Articles",
		},
		{
			icon: Zap,
			title: "We Brew & Deliver",
			desc: "AI finds top stories, emails you a 2-min read",
		},
		{
			icon: Star,
			title: "Sip & Rate",
			desc: "Tap 👍 or 👎; we refine tomorrow's brew",
		},
	];

	const faqs = [
		{
			q: "Why limit to 3 Brews?",
			a: "We believe in intentional consumption. Three focused digests prevent information overload while keeping you well-informed.",
		},
		{
			q: "Can I change article count later?",
			a: "Absolutely! Adjust your article count (3, 5, or 8) anytime in your preferences. Your brew, your rules.",
		},
		{
			q: "What sources do you pull from?",
			a: "We aggregate from 500+ trusted sources including major news outlets, industry publications, and emerging voices.",
		},
		{
			q: "How is my data handled?",
			a: "We store only your email and preferences. No tracking, no selling data, one-click delete anytime. Privacy by design.",
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 text-slate-900">
			{/* Floating Pill-Shaped Navbar */}
			<header className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-4 w-full max-w-4xl">
				<div
					className={`relative transition-all duration-500 ${
						scrolled ? "scale-95" : "scale-100"
					}`}
				>
					{/* Glow effect behind navbar */}
					<div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 via-slate-700/20 to-slate-800/20 blur-2xl opacity-50"></div>

					{/* Main navbar container */}
					<div className="relative bg-slate-900/90 backdrop-blur-2xl rounded-full border border-slate-700/50 shadow-2xl shadow-black/20 px-8 py-4">
						{/* Subtle gradient overlay */}
						<div className="absolute inset-0 bg-gradient-to-r from-slate-800/10 via-transparent to-slate-800/10 rounded-full"></div>

						<div className="relative flex items-center justify-between">
							{/* Logo */}
							<div className="flex items-center space-x-2 group cursor-pointer">
								<div className="relative">
									<span className="text-xl font-bold text-white">Time</span>
									<span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
										Brew
									</span>
									<div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
								</div>
							</div>

							{/* Desktop Navigation */}
							<nav className="hidden md:flex items-center space-x-6">
								<a
									href="#features"
									className="text-slate-300 hover:text-white font-medium transition-all duration-300 relative group"
								>
									<span>Features</span>
									<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
								</a>
								<a
									href="#how-it-works"
									className="text-slate-300 hover:text-white font-medium transition-all duration-300 relative group"
								>
									<span>How It Works</span>
									<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
								</a>

								{/* Vertical divider */}
								<div className="h-6 w-px bg-slate-700"></div>

								<button className="text-slate-300 hover:text-white font-medium transition-colors duration-300">
									Login
								</button>

								{/* CTA Button */}
								<button className="relative group">
									<div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
									<div className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2 rounded-full font-medium text-sm hover:shadow-lg transition-all duration-300">
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
								<button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-lg font-medium">
									Get Started
								</button>
							</div>
						</div>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
				<div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-orange-50/30"></div>
				<div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
				<div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-orange-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

				<div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
					<div
						className={`space-y-8 transition-all duration-1000 ${
							isVisible
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-8"
						}`}
					>
						<div className="space-y-6">
							<h1 className="text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
								Your Personalized News Brew, on Your Clock.
							</h1>
							<p className="text-xl text-slate-600 leading-relaxed">
								Choose up to 3 daily brews, set the time, pick 3-8 stories each.
								We'll pour the perfect digest—no info-overload, just what you'll
								actually read.
							</p>
						</div>

						<div className="flex flex-col sm:flex-row gap-4">
							<button className="group bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2">
								<Coffee className="w-5 h-5" />
								<span>Brew My First Digest</span>
							</button>
							<button className="group border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-full font-semibold text-lg hover:border-orange-300 hover:bg-orange-50 transition-all duration-300 flex items-center justify-center space-x-2">
								<Play className="w-5 h-5" />
								<span>See Sample Digest</span>
							</button>
						</div>

						{/* Trust Badges */}
						<div className="flex flex-wrap items-center gap-6 pt-4">
							<div className="flex items-center space-x-2 text-sm text-slate-500">
								<Shield className="w-4 h-4 text-green-500" />
								<span>Private by Design</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-slate-500">
								<Sparkles className="w-4 h-4 text-orange-500" />
								<span>Early-access Beta</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-slate-500">
								<Zap className="w-4 h-4 text-blue-500" />
								<span>Powered by Perplexity AI</span>
							</div>
						</div>
					</div>

					{/* Animated Mockup */}
					<div
						className={`transition-all duration-1000 delay-300 ${
							isVisible
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-8"
						}`}
					>
						<div className="relative">
							<div className="bg-white/70 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-8 shadow-2xl shadow-slate-900/10">
								<div className="space-y-6">
									<div className="flex items-center space-x-3">
										<div className="flex space-x-2">
											<div className="w-3 h-3 bg-red-400 rounded-full"></div>
											<div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
											<div className="w-3 h-3 bg-green-400 rounded-full"></div>
										</div>
										<div className="text-sm text-slate-500">TimeBrew.news</div>
									</div>

									<div className="space-y-4">
										<h3 className="text-lg font-semibold text-slate-800">
											{mockupStates[currentMockup].title}
										</h3>
										<div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
											<p className="text-slate-700">
												{mockupStates[currentMockup].content}
											</p>
										</div>

										{currentMockup === 2 && (
											<div className="space-y-2">
												{[1, 2, 3, 4, 5].map((i) => (
													<div
														key={i}
														className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-fade-in"
													>
														<div className="h-2 bg-slate-300 rounded w-full mb-2"></div>
														<div className="h-2 bg-slate-200 rounded w-3/4"></div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Scroll Indicator */}
				<div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
					<ChevronDown className="w-6 h-6 text-slate-400" />
				</div>
			</section>

			{/* How It Works */}
			<section id="how-it-works" className="py-24 bg-white">
				<div className="max-w-7xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-slate-900 mb-4">
							How It Works
						</h2>
						<p className="text-xl text-slate-600">
							Three simple steps to your perfect news experience
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{steps.map((step, i) => (
							<div key={i} className="group text-center">
								<div className="relative mb-6">
									<div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
										<step.icon className="w-8 h-8" />
									</div>
									<div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
										{i + 1}
									</div>
								</div>
								<h3 className="text-xl font-semibold text-slate-900 mb-3">
									{step.title}
								</h3>
								<p className="text-slate-600">{step.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Feature Highlights */}
			<section
				id="features"
				className="py-24 bg-gradient-to-br from-slate-50 to-orange-50"
			>
				<div className="max-w-7xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-slate-900 mb-4">
							Why Choose TimeBrew?
						</h2>
						<p className="text-xl text-slate-600">
							Features designed for the modern news consumer
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{features.map((feature, i) => (
							<div
								key={i}
								className="group bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-slate-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-4 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
									<feature.icon className="w-6 h-6" />
								</div>
								<h3 className="text-lg font-semibold text-slate-900 mb-2">
									{feature.title}
								</h3>
								<p className="text-slate-600">{feature.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Benefits Banner */}
			<section className="py-24 bg-white">
				<div className="max-w-7xl mx-auto px-6">
					<div className="grid lg:grid-cols-2 gap-12 items-center">
						<div className="space-y-8">
							<div className="space-y-6">
								<h2 className="text-4xl font-bold text-slate-900">
									Stay Informed, Not Overwhelmed.
								</h2>
								<div className="space-y-4 text-lg text-slate-600">
									<div className="flex items-start space-x-3">
										<Check className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
										<span>
											Fits any schedule with customizable delivery times
										</span>
									</div>
									<div className="flex items-start space-x-3">
										<Check className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
										<span>Continuously learns what you like with feedback</span>
									</div>
									<div className="flex items-start space-x-3">
										<Check className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
										<span>No subscription fatigue - just what you need</span>
									</div>
								</div>
							</div>
							<button className="border-2 border-orange-500 text-orange-600 px-8 py-3 rounded-full font-semibold hover:bg-orange-500 hover:text-white transition-all duration-300">
								See Sample Digest
							</button>
						</div>
						<div className="relative">
							<div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl h-96 flex items-center justify-center">
								<Users className="w-24 h-24 text-slate-400" />
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Early Adopter CTA */}
			<section className="py-24 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
				<div className="max-w-4xl mx-auto px-6 text-center">
					<h2 className="text-4xl font-bold mb-4">
						Help Shape the Future of News.
					</h2>
					<p className="text-xl mb-8 text-orange-100">
						Join the beta today, get priority feature requests & lifetime 50%
						discount when we launch Pro.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
						<input
							type="email"
							placeholder="you@example.com"
							className="flex-1 px-6 py-4 rounded-full text-slate-900 border-none focus:outline-none focus:ring-4 focus:ring-orange-300"
						/>
						<button className="bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800 transition-colors">
							Claim Your Beta Spot
						</button>
					</div>

					<p className="text-sm text-orange-200 mt-4">
						We'll never share your email. Unsubscribe anytime.
					</p>
				</div>
			</section>

			{/* FAQ */}
			<section className="py-24 bg-white">
				<div className="max-w-4xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-slate-900 mb-4">
							Frequently Asked Questions
						</h2>
					</div>

					<div className="space-y-4">
						{faqs.map((faq, i) => (
							<div
								key={i}
								className="border border-slate-200 rounded-xl overflow-hidden"
							>
								<button
									className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
									onClick={() => setOpenFaq(openFaq === i ? null : i)}
								>
									<span className="font-semibold text-slate-900">{faq.q}</span>
									{openFaq === i ? (
										<Minus className="w-5 h-5" />
									) : (
										<Plus className="w-5 h-5" />
									)}
								</button>
								{openFaq === i && (
									<div className="px-6 pb-4 text-slate-600 border-t border-slate-100">
										<p className="pt-4">{faq.a}</p>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-slate-900 text-white py-16">
				<div className="max-w-7xl mx-auto px-6">
					<div className="grid md:grid-cols-4 gap-8">
						<div className="space-y-4">
							<div className="flex items-center space-x-2">
								<span className="text-xl font-bold">TimeBrew</span>
								<div className="w-2 h-2 bg-orange-500 rounded-full"></div>
							</div>
							<p className="text-slate-400">Crafted in New Jersey ☕</p>
						</div>

						<div>
							<h4 className="font-semibold mb-4">Product</h4>
							<div className="space-y-2 text-slate-400">
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Features
								</a>
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Pricing
								</a>
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Beta Access
								</a>
							</div>
						</div>

						<div>
							<h4 className="font-semibold mb-4">Company</h4>
							<div className="space-y-2 text-slate-400">
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									About
								</a>
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Blog
								</a>
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Contact
								</a>
							</div>
						</div>

						<div>
							<h4 className="font-semibold mb-4">Legal</h4>
							<div className="space-y-2 text-slate-400">
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Privacy
								</a>
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Terms
								</a>
								<a
									href="#"
									className="block hover:text-white transition-colors"
								>
									Security
								</a>
							</div>
						</div>
					</div>

					<div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
						<p>&copy; 2025 TimeBrew LLC - Crafted in New Jersey ☕</p>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default TimeBrew;
