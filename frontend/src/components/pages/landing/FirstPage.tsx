import React, { useState, useEffect } from "react";
import {
	ChevronDown,
	Coffee,
	Zap,
	Shield,
	Sparkles,
	Play,
	Plus,
	ArrowRight,
} from "lucide-react";

const FirstPage = () => {
	const [isVisible, setIsVisible] = useState(false);
	const [currentMockup, setCurrentMockup] = useState(0);

	useEffect(() => {
		setIsVisible(true);

		// Animated mockup rotation
		const interval = setInterval(() => {
			setCurrentMockup((prev) => (prev + 1) % 3);
		}, 3000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	const mockupStates = [
		{ title: "Choose Your Brew", content: "Tech News • 7:00 AM • 5 articles" },
		{ title: "AI Processing", content: "Curating your perfect digest..." },
		{ title: "Your Brew Ready", content: "5 tech stories, 2-min read ☕" },
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
			icon: Sparkles,
			title: "Sip & Rate",
			desc: "Tap 👍 or 👎; we refine tomorrow's brew",
		},
	];

	return (
		<>
			{/* Hero Section */}
			<section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
				<div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse"></div>
				<div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

				<div className="max-w-5xl mx-auto px-8 grid lg:grid-cols-2 gap-12 items-center relative z-10">
					<div
						className={`space-y-8 transition-all duration-1000 ${
							isVisible
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-8"
						}`}
					>
						<div className="space-y-6">
							<h1 className="text-4xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text text-transparent">
								Your Personalized News Brew, on Your Clock.
							</h1>
							<p className="text-xl text-muted-foreground leading-relaxed">
								Choose up to 3 daily brews, set the time, pick 3-8 stories each.
								We'll pour the perfect digest—no info-overload, just what you'll
								actually read.
							</p>
						</div>

						<div className="flex flex-col sm:flex-row gap-4">
							<button className="group bg-gradient-to-r from-primary to-accent text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2">
								<Coffee className="w-5 h-5" />
								<span>Brew My First Digest</span>
							</button>
							<button className="group border-2 border-primary text-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center space-x-2">
								<Play className="w-5 h-5" />
								<span>See Sample Digest</span>
							</button>
						</div>

						{/* Trust Badges */}
						<div className="flex flex-wrap items-center gap-6 pt-4">
							<div className="flex items-center space-x-2 text-sm text-muted-foreground">
								<Shield className="w-4 h-4 text-green-500" />
								<span>Private by Design</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-muted-foreground">
								<Sparkles className="w-4 h-4 text-accent" />
								<span>Early-access Beta</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-muted-foreground">
								<Zap className="w-4 h-4 text-primary" />
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
							<div className="bg-card/70 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl shadow-foreground/5">
								<div className="space-y-6">
									<div className="flex items-center space-x-3">
										<div className="flex space-x-2">
											<div className="w-3 h-3 bg-red-400 rounded-full"></div>
											<div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
											<div className="w-3 h-3 bg-green-400 rounded-full"></div>
										</div>
										<div className="text-sm text-muted-foreground">
											TimeBrew.news
										</div>
									</div>

									<div className="space-y-4">
										<h3 className="text-lg font-semibold text-card-foreground">
											{mockupStates[currentMockup].title}
										</h3>
										<div className="bg-gradient-to-r from-accent/10 to-primary/10 p-4 rounded-xl border border-accent/20">
											<p className="text-card-foreground">
												{mockupStates[currentMockup].content}
											</p>
										</div>

										{currentMockup === 2 && (
											<div className="space-y-2">
												{[1, 2, 3, 4, 5].map((i) => (
													<div
														key={i}
														className="bg-muted p-3 rounded-lg border border-border animate-fade-in"
													>
														<div className="h-2 bg-primary/30 rounded w-full mb-2"></div>
														<div className="h-2 bg-muted-foreground/30 rounded w-3/4"></div>
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
					<ChevronDown className="w-6 h-6 text-muted-foreground" />
				</div>
			</section>

			{/* How It Works */}
			<section id="how-it-works" className="py-24 bg-card">
				<div className="max-w-5xl mx-auto px-6">
					{/* Header */}
					<div className="text-center mb-16">
						<h2 className="text-5xl font-bold text-card-foreground mb-4">
							How It Works
						</h2>
						<p className="text-xl text-muted-foreground">
							Three simple steps to your perfect news experience
						</p>
					</div>

					{/* Steps + Arrows */}
					<div className="flex items-center justify-center space-x-6">
						{steps.map((step, idx) => (
							<div key={idx} className="flex items-center">
								{/* Step Card */}
								<div className="flex flex-col items-center text-center space-y-2">
									<step.icon className="w-8 h-8 text-primary" />
									<h3 className="text-lg font-semibold text-card-foreground">
										{step.title}
									</h3>
									<p className="text-sm text-muted-foreground">{step.desc}</p>
								</div>

								{/* Arrow (skip after last) */}
								{idx < steps.length - 1 && (
									<ArrowRight className="w-6 h-6 text-muted-foreground mx-4" />
								)}
							</div>
						))}
					</div>
				</div>
			</section>
		</>
	);
};

export default FirstPage;
