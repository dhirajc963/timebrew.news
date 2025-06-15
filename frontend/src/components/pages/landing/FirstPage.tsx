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
} from "lucide-react";
import { motion, useAnimation, useInView } from "framer-motion";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Meteors } from "@/components/magicui/meteors";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { WordRotate } from "@/components/magicui/word-rotate";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { Ripple } from "@/components/magicui/ripple";

const FirstPage = () => {
	const [isVisible, setIsVisible] = useState(false);
	const [currentMockup, setCurrentMockup] = useState(0);
	const controls = useAnimation();
	const ref = useRef(null);
	const inView = useInView(ref);

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

	useEffect(() => {
		if (inView) {
			controls.start("visible");
		}
	}, [controls, inView]);

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
			content: "5 tech stories, 2-min read ☕",
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

	const stats = [
		{ label: "Beta Users", value: 2847, suffix: "+" },
		{ label: "Articles Curated", value: 156000, suffix: "+" },
		{ label: "Time Saved", value: 340, suffix: "hrs" },
	];

	return (
		<>
			{/* Hero Section */}
			<section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
				<div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center relative z-10">
					{/* Left Content */}
					<motion.div
						initial={{ opacity: 0, y: 50 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, ease: "easeOut" }}
						className="space-y-10"
					>
						{/* Beta Badge */}
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.2, duration: 0.5 }}
							className="inline-flex"
						>
							<AnimatedGradientText className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 backdrop-blur-sm">
								<Sparkles className="w-4 h-4" />
								<span className="text-sm font-medium">Early Access Beta</span>
							</AnimatedGradientText>
						</motion.div>

						{/* Main Headline */}
						<div className="space-y-8">
							<motion.h1
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3, duration: 0.8 }}
								className="text-5xl lg:text-7xl font-bold leading-tight"
							>
								Your{" "}
								<WordRotate
									words={["Personalized", "Perfect", "Smart", "Curated"]}
									className="text-gradient-green"
								/>{" "}
								News Brew,{" "}
								<span className="text-gradient-green">on Your Clock.</span>
							</motion.h1>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.5, duration: 0.6 }}
								className="text-xl lg:text-2xl text-muted-foreground leading-relaxed space-y-4"
							>
								<p>
									Choose up to 3 daily brews, set the perfect time, pick 3-8
									stories each.
								</p>
								<TypingAnimation
									className="text-xl text-muted-foreground"
									duration={50}
								>
									{
										"We'll pour the perfect digest—no info-overload, just what you'll actually read."
									}
								</TypingAnimation>
							</motion.div>
						</div>

						{/* CTA Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.7, duration: 0.6 }}
							className="flex flex-col sm:flex-row gap-6"
						>
							<ShinyButton className="group text-lg px-8 py-4 flex items-center space-x-3">
								<Coffee className="w-6 h-6" />
								<span>Brew My First Digest</span>
							</ShinyButton>

							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="group border-2 border-primary text-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center space-x-3"
							>
								<Play className="w-5 h-5" />
								<span>Watch Demo</span>
							</motion.button>
						</motion.div>

						{/* Social Proof Stats */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.9, duration: 0.6 }}
							className="grid grid-cols-3 gap-8 pt-8"
						>
							{stats.map((stat, i) => (
								<div key={i} className="text-center">
									<div className="text-2xl lg:text-3xl font-bold text-foreground">
										<NumberTicker value={stat.value} />
										{stat.suffix}
									</div>
									<div className="text-sm text-muted-foreground">
										{stat.label}
									</div>
								</div>
							))}
						</motion.div>

						{/* Trust Badges */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 1.1, duration: 0.6 }}
							className="flex flex-wrap items-center gap-6 pt-4"
						>
							<div className="flex items-center space-x-2 text-sm text-muted-foreground">
								<Shield className="w-4 h-4 text-green-500" />
								<span>Private by Design</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-muted-foreground">
								<Zap className="w-4 h-4 text-primary" />
								<span>Powered by Perplexity AI</span>
							</div>
							<div className="flex items-center space-x-2 text-sm text-muted-foreground">
								<TrendingUp className="w-4 h-4 text-blue-500" />
								<span>500+ Premium Sources</span>
							</div>
						</motion.div>
					</motion.div>

					{/* Enhanced Animated Mockup */}
					<motion.div
						initial={{ opacity: 0, x: 50, rotateY: -15 }}
						animate={{ opacity: 1, x: 0, rotateY: 0 }}
						transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
						className="relative"
					>
						<div className="relative group">
							{/* Glow effect */}
							<div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

							{/* Main mockup container */}
							<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl">
								<BorderBeam size={250} duration={12} delay={9} />

								<div className="space-y-6">
									{/* Browser Header */}
									<div className="flex items-center space-x-3">
										<div className="flex space-x-2">
											<div className="w-3 h-3 bg-red-400 rounded-full" />
											<div className="w-3 h-3 bg-yellow-400 rounded-full" />
											<div className="w-3 h-3 bg-green-400 rounded-full" />
										</div>
										<div className="text-sm text-muted-foreground font-mono">
											TimeBrew.news
										</div>
									</div>

									{/* Content Area */}
									<div className="space-y-6">
										<motion.h3
											key={currentMockup}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											className="text-xl font-semibold text-card-foreground"
										>
											{mockupStates[currentMockup].title}
										</motion.h3>

										<div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6 rounded-xl border border-accent/20">
											<motion.p
												key={currentMockup}
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												className="text-card-foreground"
											>
												{mockupStates[currentMockup].content}
											</motion.p>
										</div>

										{/* Article Previews for Ready State */}
										{currentMockup === 2 && (
											<motion.div
												initial={{ opacity: 0, y: 20 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: 0.3 }}
												className="space-y-3"
											>
												{[1, 2, 3, 4, 5].map((i) => (
													<motion.div
														key={i}
														initial={{ opacity: 0, x: -20 }}
														animate={{ opacity: 1, x: 0 }}
														transition={{ delay: i * 0.1 }}
														className="bg-muted/50 p-4 rounded-lg border border-border hover:bg-muted/70 transition-colors cursor-pointer group"
													>
														<div className="flex items-start space-x-3">
															<div className="w-12 h-12 bg-primary/20 rounded-lg flex-shrink-0" />
															<div className="flex-1 space-y-2">
																<div className="h-3 bg-foreground/20 rounded w-full" />
																<div className="h-3 bg-foreground/10 rounded w-3/4" />
																<div className="flex items-center space-x-4 text-xs text-muted-foreground">
																	<span className="flex items-center space-x-1">
																		<Clock className="w-3 h-3" />
																		<span>2 min read</span>
																	</span>
																	<span className="flex items-center space-x-1">
																		<TrendingUp className="w-3 h-3" />
																		<span>Trending</span>
																	</span>
																</div>
															</div>
														</div>
													</motion.div>
												))}
											</motion.div>
										)}
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				</div>

				{/* Enhanced Scroll Indicator */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.5 }}
					className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
				>
					<motion.div
						animate={{ y: [0, 10, 0] }}
						transition={{ repeat: Infinity, duration: 2 }}
						className="flex flex-col items-center space-y-2"
					>
						<span className="text-xs text-muted-foreground">
							Scroll to explore
						</span>
						<ChevronDown className="w-6 h-6 text-muted-foreground" />
					</motion.div>
				</motion.div>
			</section>

			{/* Enhanced How It Works Section */}
			<section
				ref={ref}
				id="how-it-works"
				className="py-32 relative overflow-hidden"
			>
				<div className="max-w-6xl mx-auto px-6 relative z-10">
					{/* Header */}
					<div className="text-center mb-20">
						<motion.h2
							initial={{ opacity: 0, y: 30 }}
							animate={controls}
							variants={{
								visible: { opacity: 1, y: 0 },
							}}
							transition={{ duration: 0.6 }}
							className="text-5xl lg:text-6xl font-bold text-card-foreground mb-6"
						>
							How It <span className="text-gradient-green">Works</span>
						</motion.h2>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={controls}
							variants={{
								visible: { opacity: 1, y: 0 },
							}}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="text-xl lg:text-2xl text-muted-foreground"
						>
							Three simple steps to your perfect news experience
						</motion.p>
					</div>

					{/* Enhanced Steps */}
					<div className="grid lg:grid-cols-3 gap-12">
						{steps.map((step, idx) => (
							<motion.div
								key={idx}
								initial={{ opacity: 0, y: 50 }}
								animate={controls}
								variants={{
									visible: { opacity: 1, y: 0 },
								}}
								transition={{ duration: 0.6, delay: idx * 0.2 }}
								className="relative group"
							>
								{/* Background glow */}
								<div
									className={`absolute -inset-4 bg-gradient-to-r ${step.color} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
								/>

								{/* Card */}
								<div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 group">
									<BorderBeam
										size={200}
										duration={15}
										delay={idx * 3}
										className="opacity-0 group-hover:opacity-100"
									/>

									{/* Step number */}
									<div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
										{idx + 1}
									</div>

									{/* Icon */}
									<div
										className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-2xl mb-6 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}
									>
										<step.icon className="w-8 h-8" />
									</div>

									{/* Content */}
									<h3 className="text-2xl font-semibold text-card-foreground mb-4">
										{step.title}
									</h3>
									<p className="text-muted-foreground text-lg leading-relaxed">
										{step.desc}
									</p>

									{/* Connecting line to next step */}
									{idx < steps.length - 1 && (
										<div className="hidden lg:block absolute top-1/2 -right-6 w-12 h-0.5 bg-gradient-to-r from-primary to-accent opacity-30" />
									)}
								</div>
							</motion.div>
						))}
					</div>

					{/* Bottom CTA */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={controls}
						variants={{
							visible: { opacity: 1, y: 0 },
						}}
						transition={{ duration: 0.6, delay: 0.8 }}
						className="text-center mt-16"
					>
						<ShinyButton className="text-lg px-10 py-4">
							<Coffee className="w-5 h-5 mr-2" />
							Start Your First Brew
						</ShinyButton>
					</motion.div>
				</div>
			</section>
		</>
	);
};

export default FirstPage;
