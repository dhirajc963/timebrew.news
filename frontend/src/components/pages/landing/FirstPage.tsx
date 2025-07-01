import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom"; // Add this import
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
	X,
	ExternalLink,
} from "lucide-react";
import {
	motion,
	useAnimation,
	useInView,
	AnimatePresence,
} from "framer-motion";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { WordRotate } from "@/components/magicui/word-rotate";
import { TypingAnimation } from "@/components/magicui/typing-animation";

// Sample Email Data
const SAMPLE_EMAIL_DATA = {
	brew_name: "Tech & AI Daily",
	date: "Monday, January 15",
	intro:
		"Good morning! Here's your personalized digest with the most important tech stories you'll actually want to read. Grab your coffee ☕ and let's dive in.",
	articles: [
		{
			headline:
				"OpenAI Announces GPT-5 with Breakthrough Reasoning Capabilities",
			story_content:
				"The AI race just got more interesting. OpenAI's latest model doesn't just generate text—it actually thinks through problems step by step, showing its work like a diligent student. Early tests show it can solve complex math problems and write code that actually works on the first try. This isn't just a bigger model; it's a fundamentally different approach to AI reasoning.",
			source: "TechCrunch",
			published_time: "2 hours ago",
			original_url: "#",
		},
		{
			headline: "Tesla's Full Self-Driving Finally Lives Up to Its Name",
			story_content:
				"After years of 'coming soon,' Tesla's FSD just achieved a 99.8% success rate in real-world testing across major cities. The breakthrough? A new neural network that learns from edge cases in real-time. This could be the moment autonomous driving goes from lab experiment to mainstream reality. Wall Street is certainly betting on it.",
			source: "The Verge",
			published_time: "4 hours ago",
			original_url: "#",
		},
		{
			headline:
				"YC-Backed Startup Raises $50M to 'Uber-ify' Enterprise Software",
			story_content:
				"FlowTech just closed a massive Series B to transform how companies buy software. Instead of lengthy sales cycles, they're creating a marketplace where businesses can 'test drive' enterprise tools instantly. Think of it as the App Store, but for Fortune 500 companies. Early customers report 70% faster software adoption.",
			source: "TechCrunch",
			published_time: "6 hours ago",
			original_url: "#",
		},
		{
			headline: "Apple's Secret AR Glasses Project Gets Major Breakthrough",
			story_content:
				"According to leaked internal documents, Apple solved the biggest problem with AR glasses: battery life. Their new micro-LED technology can power glasses for 12 hours while weighing less than regular sunglasses. Industry insiders say we could see a public demo as early as WWDC 2025. The iPhone moment for AR might be closer than we think.",
			source: "Bloomberg",
			published_time: "8 hours ago",
			original_url: "#",
		},
	],
	outro:
		"That's a wrap for today! Found a story particularly interesting? Hit reply and let me know—your feedback helps me curate better content for tomorrow. Have a productive day! 🚀",
};

// Sample Email Modal Component - Using Theme Colors
const SampleEmailModal = ({ isOpen, onClose }) => {
	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
				onClick={onClose}
			>
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					transition={{ duration: 0.3 }}
					className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden mt-20 border border-border"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Modal Header */}
					<div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
						<div>
							<h3 className="text-lg font-semibold text-card-foreground">
								Sample TimeBrew Digest
							</h3>
							<p className="text-sm text-muted-foreground">
								See what your personalized briefing looks like
							</p>
						</div>
						<button
							onClick={onClose}
							className="p-2 hover:bg-accent rounded-full transition-colors"
						>
							<X className="w-5 h-5 text-muted-foreground" />
						</button>
					</div>

					{/* Email Content */}
					<div className="overflow-y-auto max-h-[calc(90vh-80px)]">
						<div className="p-6">
							{/* Email Preview Container */}
							<div className="rounded-lg py-6 font-sans text-foreground">
								{/* Email Header */}
								<div className="text-center pb-6 border-b border-border mb-6">
									<h1 className="text-xl font-semibold text-foreground">
										Your {SAMPLE_EMAIL_DATA.brew_name} •{" "}
										{SAMPLE_EMAIL_DATA.date}
									</h1>
								</div>

								{/* Personal Greeting */}
								<div className="mb-6">
									<p className="text-base leading-relaxed text-foreground">
										{SAMPLE_EMAIL_DATA.intro}
									</p>
								</div>

								{/* Articles */}
								<div className="space-y-6">
									{SAMPLE_EMAIL_DATA.articles.map((article, idx) => (
										<div
											key={idx}
											className="bg-card rounded-lg p-5 border border-border shadow-sm"
										>
											{/* Source and Time */}
											<div className="text-sm text-muted-foreground font-medium mb-2">
												{article.source} • {article.published_time}
											</div>

											{/* Headline */}
											<h3 className="text-lg font-semibold text-card-foreground mb-3 leading-tight">
												{article.headline}
											</h3>

											{/* Story Content */}
											<p className="text-base leading-relaxed text-card-foreground mb-4">
												{article.story_content}
											</p>

											{/* Read More Link */}
											<a
												href={article.original_url}
												className="inline-flex items-center gap-1 text-primary font-medium text-sm hover:text-primary/80 transition-colors"
											>
												Read the full story
												<ExternalLink className="w-3 h-3" />
											</a>
										</div>
									))}
								</div>

								{/* Sign-off */}
								<div className="mt-8 pt-6 border-t border-border">
									<p className="text-base leading-relaxed text-foreground mb-2">
										{SAMPLE_EMAIL_DATA.outro}
									</p>
									<p className="text-sm text-muted-foreground">
										Your TimeBrew Team
									</p>
								</div>
							</div>

							{/* CTA at bottom of modal */}
							<div className="mt-6 text-center">
								<Link to="/signup">
									<ShinyButton className="text-base px-6 py-3 mx-auto [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
										<Coffee className="w-4 h-4" />
										<span>Create My Own Brew</span>
									</ShinyButton>
								</Link>
								<p className="text-xs text-muted-foreground mt-2">
									Free forever • No credit card required
								</p>
							</div>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
};

// Constants (existing)
const MOCKUP_STATES = [
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

const STEPS = [
	{
		icon: Plus,
		title: "Pick Your Brews",
		desc: "Choose your topics (AI, fintech, health), set delivery time, and customize length. Takes 2 minutes to set up.",
		benefit: "Perfect personalization in seconds",
		color: "from-blue-500 to-cyan-500",
	},
	{
		icon: Zap,
		title: "AI Brews & Delivers",
		desc: "Our AI scans 500+ sources, finds relevant stories, and writes them in Morning Brew style - delivered to your inbox.",
		benefit: "Quality content, zero effort",
		color: "from-purple-500 to-pink-500",
	},
	{
		icon: Sparkles,
		title: "Sip & Improve",
		desc: "Rate articles with thumbs up/down. The AI learns your taste and gets better every day.",
		benefit: "Gets smarter with every brew",
		color: "from-orange-500 to-red-500",
	},
];

const TRUST_BADGES = [
	{ icon: Zap, text: "Powered by AI", color: "text-primary" },
	{ icon: Sparkles, text: "Smart Curation", color: "text-purple-500" },
];

// Simple Typing Animation Component (existing)
type TypedTextProps = {
	text: string;
	className?: string;
	duration?: number;
};

const TypedText = ({
	text,
	className = "",
	duration = 100,
}: TypedTextProps) => {
	const [displayedText, setDisplayedText] = useState("");
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		if (currentIndex < text.length) {
			const timeout = setTimeout(() => {
				setDisplayedText(text.slice(0, currentIndex + 1));
				setCurrentIndex(currentIndex + 1);
			}, duration);
			return () => clearTimeout(timeout);
		}
	}, [currentIndex, text, duration]);

	return <span className={className}>{displayedText}</span>;
};

const FirstPage = () => {
	const [currentMockup, setCurrentMockup] = useState(0);
	const [isMobile, setIsMobile] = useState(false);
	const [showSampleModal, setShowSampleModal] = useState(false);
	const controls = useAnimation();
	const ref = useRef(null);
	const inView = useInView(ref);

	useEffect(() => {
		const checkMobile = () => setIsMobile(window.innerWidth < 768);
		const interval = setInterval(() => {
			setCurrentMockup((prev) => (prev + 1) % 3);
		}, 4000);

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => {
			clearInterval(interval);
			window.removeEventListener("resize", checkMobile);
		};
	}, []);

	useEffect(() => {
		if (inView) controls.start("visible");
	}, [controls, inView]);

	return (
		<>
			{/* Sample Email Modal */}
			<SampleEmailModal
				isOpen={showSampleModal}
				onClose={() => setShowSampleModal(false)}
			/>

			{/* Hero Section */}
			<section className="min-h-screen flex items-center justify-center relative overflow-hidden py-16 md:py-0 pt-23 md:pt-0">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 w-full">
					{/* Mobile Layout */}
					<div className="md:hidden flex flex-col items-center text-center max-w-md mx-auto">
						{/* Beta Badge */}
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.2, duration: 0.5 }}
							className="mb-6"
						>
							<AnimatedGradientText className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm text-primary">
								<Sparkles className="w-4 h-4" />
								<span className="text-sm font-medium">Free Beta Access</span>
							</AnimatedGradientText>
						</motion.div>

						{/* Main Headline */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3, duration: 0.8 }}
							className="mb-8"
						>
							<h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
								Your{" "}
								<WordRotate
									words={["Personalized", "Perfect", "Smart", "Curated"]}
									className="text-gradient-green"
								/>{" "}
								News Brew,{" "}
								<span className="text-gradient-green">on Your Time.</span>
							</h1>

							<div className="text-lg text-muted-foreground leading-relaxed px-4 mb-3">
								<span>Choose up to 3 daily brews, set the perfect time.. </span>
								<TypedText
									text="we'll pour the perfect digest—no info-overload, just what you'll actually read."
									className="text-lg text-muted-foreground font-normal"
									duration={50}
								/>
							</div>
						</motion.div>

						{/* CTA Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.7, duration: 0.6 }}
							className="flex flex-col gap-3 w-full max-w-xs mb-6"
						>
							<Link to="/signup">
								<ShinyButton className="text-base px-8 py-3 flex items-center justify-center gap-2 w-full [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
									<Coffee className="w-4 h-4" />
									<span>Brew My First Digest</span>
								</ShinyButton>
							</Link>

							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setShowSampleModal(true)}
								className="border-2 border-primary text-primary text-base px-8 py-3 rounded-full font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center gap-2 w-full"
							>
								<Eye className="w-4 h-4" />
								<span>View Sample</span>
							</motion.button>
						</motion.div>

						{/* Trust Badges */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.9, duration: 0.6 }}
							className="flex items-center gap-6 pt-4"
						>
							{TRUST_BADGES.map(({ icon: Icon, text, color, link }, idx) => {
								const content = (
									<div className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
										<Icon className={`w-4 h-4 ${color}`} />
										<span>{text}</span>
									</div>
								);

								return link ? (
									<a
										key={idx}
										href={link}
										target="_blank"
										rel="noopener noreferrer"
										className="cursor-pointer"
									>
										{content}
									</a>
								) : (
									<div key={idx}>{content}</div>
								);
							})}
						</motion.div>

						{/* Mobile mockup */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 1, duration: 0.8 }}
							className="w-full max-w-sm mt-8"
						>
							<div className="relative group">
								<div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />

								<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-2xl p-4 shadow-xl">
									<div className="space-y-4">
										{/* Browser Header */}
										<div className="flex items-center space-x-2">
											<div className="flex space-x-1.5">
												<div className="w-2 h-2 bg-red-400 rounded-full" />
												<div className="w-2 h-2 bg-yellow-400 rounded-full" />
												<div className="w-2 h-2 bg-green-400 rounded-full" />
											</div>
											<div className="text-xs text-muted-foreground font-mono">
												TimeBrew.news
											</div>
										</div>

										{/* Content */}
										<div className="space-y-4">
											<motion.h3
												key={currentMockup}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												className="text-lg font-semibold"
											>
												{MOCKUP_STATES[currentMockup].title}
											</motion.h3>

											<div className="bg-gradient-to-r from-accent/10 to-primary/10 p-4 rounded-xl border border-accent/20">
												<motion.p
													key={currentMockup}
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													className="text-sm"
												>
													{MOCKUP_STATES[currentMockup].content}
												</motion.p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>

					{/* Desktop Layout */}
					<div className="hidden md:grid grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
						{/* Left Content */}
						<motion.div
							initial={{ opacity: 0, y: 50 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							className="space-y-6 lg:space-y-8 md:col-span-1 lg:col-span-8"
						>
							{/* Beta Badge */}
							<motion.div
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.2, duration: 0.5 }}
								className="inline-flex mb-4"
							>
								<AnimatedGradientText className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm text-primary">
									<Sparkles className="w-4 h-4" />
									<span className="text-sm font-medium">Free Beta Access</span>
								</AnimatedGradientText>
							</motion.div>

							{/* Main Headline */}
							<div className="space-y-6">
								<motion.h1
									initial={{ opacity: 0, y: 30 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3, duration: 0.8 }}
									className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight"
								>
									Your{" "}
									<WordRotate
										words={["Personalized", "Perfect", "Smart", "Curated"]}
										className="text-gradient-green"
									/>{" "}
									News Brew,{" "}
									<span className="text-gradient-green">on Your Time.</span>
								</motion.h1>

								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.5, duration: 0.6 }}
									className="text-lg lg:text-xl xl:text-2xl text-muted-foreground leading-relaxed"
								>
									<span>
										Choose up to 3 daily brews, set the perfect time..{" "}
									</span>
									<TypedText
										text="we'll pour the perfect digest—no info-overload, just what you'll actually read."
										className="text-lg lg:text-lg text-muted-foreground font-normal"
										duration={50}
									/>
								</motion.div>
							</div>

							{/* CTA Buttons */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.7, duration: 0.6 }}
								className="flex flex-col sm:flex-row gap-6"
							>
								<Link to="/signup">
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										className="group border-2 border-primary text-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center space-x-3"
									>
										<Coffee className="w-5 h-5" />
										<span>Brew My First Digest</span>
									</motion.button>
								</Link>

								<ShinyButton
									className="group text-lg px-8 py-4 flex items-center justify-center space-x-3 [&>span]:!flex [&>span]:!items-center [&>span]:!gap-3"
									onClick={() => setShowSampleModal(true)}
								>
									<Eye className="w-5 h-5" />
									<span>View Sample</span>
								</ShinyButton>
							</motion.div>

							{/* Trust Badges - Desktop */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.9, duration: 0.6 }}
								className="flex items-center gap-6 pt-4"
							>
								{TRUST_BADGES.map(({ icon: Icon, text, color, link }, idx) => {
									const content = (
										<div className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
											<Icon className={`w-4 h-4 ${color}`} />
											<span>{text}</span>
										</div>
									);

									return link ? (
										<a
											key={idx}
											href={link}
											target="_blank"
											rel="noopener noreferrer"
											className="cursor-pointer"
										>
											{content}
										</a>
									) : (
										<div key={idx}>{content}</div>
									);
								})}
							</motion.div>
						</motion.div>

						{/* Right animated mockup - Desktop version */}
						<motion.div
							initial={{ opacity: 0, x: 50, rotateY: -15 }}
							animate={{ opacity: 1, x: 0, rotateY: 0 }}
							transition={{ delay: 0.4, duration: 1 }}
							className="relative md:col-span-1 lg:col-span-4"
						>
							<div className="relative group">
								<div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

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
												{MOCKUP_STATES[currentMockup].title}
											</motion.h3>

											<div className="bg-gradient-to-r from-accent/10 to-primary/10 p-6 rounded-xl border border-accent/20">
												<motion.p
													key={currentMockup}
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													className="text-base text-card-foreground"
												>
													{MOCKUP_STATES[currentMockup].content}
												</motion.p>
											</div>

											{/* Article Previews for Ready State */}
											{currentMockup === 2 && (
												<motion.div
													initial={{ opacity: 0, y: 20 }}
													animate={{ opacity: 1, y: 0 }}
													transition={{ delay: 0.3 }}
													className="space-y-2"
												>
													{[1, 2].map((i) => (
														<motion.div
															key={i}
															initial={{ opacity: 0, x: -20 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ delay: i * 0.1 }}
															className="bg-muted/50 p-3 rounded-lg border border-border hover:bg-muted/70 transition-colors cursor-pointer group"
														>
															<div className="flex items-center space-x-3">
																<div className="w-8 h-8 bg-primary/20 rounded flex-shrink-0" />
																<div className="flex-1 space-y-1">
																	<div className="h-2.5 bg-foreground/20 rounded w-full" />
																	<div className="h-2 bg-foreground/10 rounded w-2/3" />
																</div>
																<div className="flex items-center space-x-2 text-xs text-muted-foreground">
																	<Clock className="w-3 h-3" />
																	<span>2m</span>
																</div>
															</div>
														</motion.div>
													))}
													<div className="text-center pt-2">
														<span className="text-xs text-muted-foreground">
															+ 3 more stories
														</span>
													</div>
												</motion.div>
											)}
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>

				{/* Scroll indicator - Desktop only */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.5 }}
					className="hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2"
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

			{/* How It Works Section */}
			<section
				ref={ref}
				id="how-it-works"
				className="py-20 md:py-24 lg:py-32 relative overflow-hidden"
			>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 relative z-10">
					{/* Updated Header */}
					<div className="text-center mb-12 md:mb-16 lg:mb-20">
						<motion.h2
							initial={{ opacity: 0, y: 30 }}
							animate={controls}
							variants={{
								visible: { opacity: 1, y: 0 },
							}}
							transition={{ duration: 0.6 }}
							className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-card-foreground mb-4 md:mb-6"
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
							className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto"
						>
							From setup to your perfect daily digest in under 5 minutes. Join
							2,800+ professionals who've transformed their news consumption.
						</motion.p>
					</div>

					{/* Updated Steps */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12">
						{STEPS.map((step, idx) => (
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
								<div
									className={`absolute -inset-4 bg-gradient-to-r ${step.color} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
								/>

								<div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 group">
									{!isMobile && (
										<BorderBeam
											size={200}
											duration={15}
											delay={idx * 3}
											className="opacity-0 group-hover:opacity-100"
										/>
									)}

									<div
										className={`w-16 h-16 bg-gradient-to-r ${step.color} rounded-2xl mb-6 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}
									>
										<step.icon className="w-8 h-8" />
									</div>

									<h3 className="text-2xl font-semibold text-card-foreground mb-4">
										{step.title}
									</h3>
									<p className="text-muted-foreground text-lg leading-relaxed mb-4">
										{step.desc}
									</p>

									{/* Updated: Added benefit badge */}
									<div className="text-sm text-primary font-medium bg-primary/10 px-3 py-2 rounded-full inline-block">
										{step.benefit}
									</div>

									{idx < STEPS.length - 1 && (
										<div className="hidden lg:block absolute top-1/2 -right-12 w-12 h-0.5 bg-gradient-to-r from-primary to-accent opacity-30" />
									)}
								</div>
							</motion.div>
						))}
					</div>

					{/* New: Final CTA */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={controls}
						variants={{ visible: { opacity: 1, y: 0 } }}
						transition={{ duration: 0.6, delay: 0.8 }}
						className="text-center mt-16"
					>
						<Link to="/signup">
							<ShinyButton className="text-lg px-8 py-4 flex items-center justify-center gap-2 mx-auto [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
								<Coffee className="w-5 h-5" />
								<span>Create Your First Brew</span>
							</ShinyButton>
						</Link>
					</motion.div>
				</div>
			</section>
		</>
	);
};

export default FirstPage;
