import React, { useState, useEffect, useRef } from "react";
import {
	ChevronDown,
	Coffee,
	Zap,
	Shield,
	Sparkles,
	Play,
	Plus,
	ArrowRight,
	Users,
	TrendingUp,
	Clock,
	Eye,
} from "lucide-react";

const FirstPage = () => {
	const [isVisible, setIsVisible] = useState(false);
	const [currentMockup, setCurrentMockup] = useState(0);

	useEffect(() => {
		setIsVisible(true);

		// Animated mockup rotation
		const interval = setInterval(() => {
			setCurrentMockup((prev) => (prev + 1) % 3);
		}, 4000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	const mockupStates = [
		{
			title: "Choose Your Brew",
			content: "Tech News • 7:00 AM • 5 articles",
			type: "setup",
		},
		{
			title: "AI Processing Magic",
			content: "Curating your perfect digest...",
			type: "processing",
		},
		{
			title: "Your Brew is Ready!",
			content: "5 tech stories, 8-min read  ☕",
			type: "ready",
		},
	];

	const steps = [
		{
			icon: Plus,
			title: "Pick Your Brews",
			desc: "Choose topics, time & article count",
			color: "from-blue-500 to-cyan-500",
		},
		{
			icon: Zap,
			title: "AI Brews & Delivers",
			desc: "Smart curation powered by Perplexity",
			color: "from-purple-500 to-pink-500",
		},
		{
			icon: Sparkles,
			title: "Sip & Improve",
			desc: "Rate content to perfect your brew",
			color: "from-orange-500 to-red-500",
		},
	];

	return (
		<div className="min-h-screen bg-gray-950 text-white">
			{/* Hero Section */}
			<section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-23 sm:pt-23 md:pt-23 lg:pt-24">
				<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 md:gap-16 lg:gap-20 xl:gap-24 items-center">
						{/* Left Content */}
						<div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12 text-center lg:text-left order-2 lg:order-1">
							{/* Beta Badge */}
							<div className="inline-flex justify-center lg:justify-start">
								<div className="inline-flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-blue-500/50 bg-blue-500/20 backdrop-blur-sm text-blue-400">
									<Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
									<span className="text-xs sm:text-sm font-medium">
										Early Access Beta
									</span>
								</div>
							</div>

							{/* Main Headline */}
							<div className="space-y-4 sm:space-y-6 md:space-y-8">
								<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold leading-tight">
									Your{" "}
									<span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
										Perfect
									</span>{" "}
									News Brew,{" "}
									<span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
										on Your Clock.
									</span>
								</h1>

								<div className="space-y-3 sm:space-y-4">
									<p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 leading-relaxed">
										Choose up to 3 daily brews, set the perfect time, pick 3-8
										stories each.
									</p>
									<p className="text-base sm:text-lg md:text-xl text-gray-400">
										We'll pour the perfect digest—no info-overload, just what
										you'll actually read.
									</p>
								</div>
							</div>

							{/* CTA Buttons */}
							<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start">
								<button className="group bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105">
									<Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
									<span className="whitespace-nowrap">
										Brew My First Digest
									</span>
								</button>

								<button className="group border-2 border-blue-500 text-blue-400 px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-blue-500 hover:text-white transition-all duration-300 flex items-center justify-center space-x-3">
									<Eye className="w-4 h-4 sm:w-5 sm:h-5" />
									<span>View Sample</span>
								</button>
							</div>

							{/* Trust Badges */}
							<div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-4">
								<div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
									<Zap className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
									<span>Powered by AI</span>
								</div>
								<div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
									<Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
									<span>Zero Spam</span>
								</div>
								<div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400">
									<Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
									<span>Smart Curation</span>
								</div>
							</div>
						</div>

						{/* Enhanced Animated Mockup */}
						<div className="relative order-1 lg:order-2 mb-8 lg:mb-0">
							<div className="relative group max-w-lg mx-auto">
								{/* Glow effect */}
								<div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

								{/* Main mockup container */}
								<div className="relative bg-gray-800/80 backdrop-blur-2xl border border-gray-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
									<div className="space-y-4 sm:space-y-6">
										{/* Browser Header */}
										<div className="flex items-center space-x-3">
											<div className="flex space-x-1.5 sm:space-x-2">
												<div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-400 rounded-full" />
												<div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full" />
												<div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full" />
											</div>
											<div className="text-xs sm:text-sm text-gray-400 font-mono">
												TimeBrew.news
											</div>
										</div>

										{/* Content Area */}
										<div className="space-y-4 sm:space-y-6">
											<h3 className="text-lg sm:text-xl font-semibold text-white">
												{mockupStates[currentMockup].title}
											</h3>

											<div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 sm:p-6 rounded-xl border border-blue-500/20">
												<p className="text-white text-sm sm:text-base">
													{mockupStates[currentMockup].content}
												</p>
											</div>

											{/* Article Previews for Ready State */}
											{currentMockup === 2 && (
												<div className="space-y-2">
													{[1, 2].map((i) => (
														<div
															key={i}
															className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 hover:bg-gray-700/70 transition-colors cursor-pointer group"
														>
															<div className="flex items-center space-x-3">
																<div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/20 rounded flex-shrink-0" />
																<div className="flex-1 space-y-1">
																	<div className="h-2 sm:h-2.5 bg-gray-400/20 rounded w-full" />
																	<div className="h-1.5 sm:h-2 bg-gray-400/10 rounded w-2/3" />
																</div>
																<div className="flex items-center space-x-2 text-xs text-gray-400">
																	<Clock className="w-3 h-3" />
																	<span>2m</span>
																</div>
															</div>
														</div>
													))}
													<div className="text-center pt-2">
														<span className="text-xs text-gray-400">
															+ 3 more stories
														</span>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Enhanced Scroll Indicator */}
				<div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 hidden md:flex">
					<div className="flex flex-col items-center space-y-2 animate-bounce">
						<span className="text-xs text-gray-400">Scroll to explore</span>
						<ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
					</div>
				</div>
			</section>

			{/* Enhanced How It Works Section */}
			<section
				id="how-it-works"
				className="py-16 sm:py-24 md:py-32 relative overflow-hidden"
			>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10">
					{/* Header */}
					<div className="text-center mb-12 sm:mb-16 md:mb-20">
						<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
							How It{" "}
							<span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
								Works
							</span>
						</h2>
						<p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto">
							Three simple steps to your perfect news experience
						</p>
					</div>

					{/* Enhanced Steps */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
						{steps.map((step, idx) => (
							<div key={idx} className="relative group">
								{/* Background glow */}
								<div
									className={`absolute -inset-2 sm:-inset-4 bg-gradient-to-r ${step.color} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
								/>

								{/* Card */}
								<div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 sm:hover:-translate-y-4 group h-full">
									{/* Icon */}
									<div
										className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r ${step.color} rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}
									>
										<step.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
									</div>

									{/* Content */}
									<h3 className="text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4">
										{step.title}
									</h3>
									<p className="text-gray-400 text-base sm:text-lg leading-relaxed">
										{step.desc}
									</p>

									{/* Connecting line to next step - only show on larger screens */}
									{idx < steps.length - 1 && (
										<div className="hidden lg:block absolute top-1/2 -right-6 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30" />
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
};

export default FirstPage;
