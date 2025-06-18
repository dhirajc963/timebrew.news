import React, { useRef } from "react";
import {
	Coffee,
	Zap,
	Shield,
	Sparkles,
	Check,
	Users,
	Globe,
	Clock,
	Brain,
	Target,
	TrendingUp,
	Mail,
	Star,
	ArrowRight,
	BookOpen,
	Smartphone,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Marquee } from "@/components/magicui/marquee";
import { ShinyButton } from "@/components/magicui/shiny-button";

// Custom BlurIn component with proper TypeScript types
interface BlurInProps {
	children: React.ReactNode;
	className?: string;
	delay?: number;
}

const BlurIn: React.FC<BlurInProps> = ({
	children,
	className = "",
	delay = 0,
}) => {
	return (
		<motion.div
			initial={{ opacity: 0, filter: "blur(10px)" }}
			whileInView={{ opacity: 1, filter: "blur(0px)" }}
			viewport={{ once: true }}
			transition={{ duration: 0.8, delay }}
			className={className}
		>
			{children}
		</motion.div>
	);
};

// Custom Shimmer component with proper TypeScript types
interface ShimmerProps {
	className?: string;
}

const Shimmer: React.FC<ShimmerProps> = ({ className = "" }) => {
	return (
		<motion.div>
			<div className={`relative overflow-hidden ${className}`}>
				<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
			</div>
		</motion.div>
	);
};

// Type definitions
interface Feature {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	desc: string;
	color: string;
	stats: string;
	benefit: string;
}

interface Benefit {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description: string;
}

interface Testimonial {
	name: string;
	role: string;
	content: string;
	avatar: string;
	rating: number;
	company: string;
}

interface Stat {
	label: string;
	value: number;
	suffix?: string;
}

interface Article {
	title: string;
	category: string;
	readTime: string;
}

const SecondPage: React.FC = () => {
	const ref = useRef<HTMLElement>(null);
	const inView = useInView(ref, { once: true });

	const features: Feature[] = [
		{
			icon: Coffee,
			title: "Up to 3 Daily Brews",
			desc: "Perfect balance - no information overload",
			color: "from-amber-500 to-orange-500",
			stats: "3 max",
			benefit: "Zero overwhelm, maximum insight",
		},
		{
			icon: Target,
			title: "Custom Article Count",
			desc: "Choose 3, 5, or 8 articles per digest",
			color: "from-blue-500 to-cyan-500",
			stats: "3-8 articles",
			benefit: "Tailored to your reading time",
		},
		{
			icon: Brain,
			title: "AI-Powered Curation",
			desc: "Perplexity Sonar finds the best stories",
			color: "from-purple-500 to-pink-500",
			stats: "Smart AI",
			benefit: "Only relevant, high-quality content",
		},
		{
			icon: Shield,
			title: "Privacy First",
			desc: "Only email & preferences stored",
			color: "from-green-500 to-emerald-500",
			stats: "100% Private",
			benefit: "Your data stays yours",
		},
	];

	const benefits: Benefit[] = [
		{
			icon: Clock,
			title: "Fits Any Schedule",
			description: "Set custom delivery times that work for your routine",
		},
		{
			icon: TrendingUp,
			title: "Learns Your Taste",
			description: "Continuously improves based on your feedback",
		},
		{
			icon: Mail,
			title: "No Subscription Fatigue",
			description: "Simple, focused delivery - just what you need",
		},
		{
			icon: Globe,
			title: "Global Sources",
			description: "500+ trusted outlets from around the world",
		},
	];

	const testimonials: Testimonial[] = [
		{
			name: "Alex Chen",
			role: "Product Manager",
			content: "Finally, news that fits my schedule. Perfect 5-minute reads!",
			avatar: "AC",
			rating: 5,
			company: "TechCorp",
		},
		{
			name: "Sarah Kim",
			role: "Startup Founder",
			content: "Cut my news reading time by 80% while staying better informed.",
			avatar: "SK",
			rating: 5,
			company: "InnovateLab",
		},
		{
			name: "Marcus Johnson",
			role: "Developer",
			content:
				"The AI curation is spot-on. Only stories I actually care about.",
			avatar: "MJ",
			rating: 5,
			company: "DevStudio",
		},
		{
			name: "Emily Rodriguez",
			role: "Designer",
			content: "Love the clean format and personalization. Game changer!",
			avatar: "ER",
			rating: 5,
			company: "DesignCo",
		},
		{
			name: "David Park",
			role: "Investor",
			content: "Best way to stay on top of market trends. Highly recommend!",
			avatar: "DP",
			rating: 5,
			company: "VentureMax",
		},
		{
			name: "Lisa Wang",
			role: "CEO",
			content: "Saves me hours every week. Essential for busy executives.",
			avatar: "LW",
			rating: 5,
			company: "GrowthTech",
		},
	];

	const stats: Stat[] = [
		{ label: "Active Beta Users", value: 2847 },
		{ label: "Daily Digests Sent", value: 8541 },
		{ label: "Hours Saved Weekly", value: 340 },
		{ label: "Satisfaction Rate", value: 96, suffix: "%" },
	];

	const articles: Article[] = [
		{
			title: "AI Breakthrough in Healthcare",
			category: "AI",
			readTime: "1 min",
		},
		{ title: "New iPhone Features Leak", category: "Apple", readTime: "2 min" },
		{
			title: "Startup Raises $50M Series B",
			category: "Funding",
			readTime: "1 min",
		},
		{
			title: "Climate Tech Innovation",
			category: "Climate",
			readTime: "2 min",
		},
		{ title: "Space Mining Gets Real", category: "Space", readTime: "1 min" },
	];

	return (
		<>
			{/* Enhanced Feature Highlights */}
			<section id="features" className="py-32 md:py-32 pt-23 md:pt-32 relative overflow-hidden">
				<div className="max-w-7xl mx-auto px-10 relative z-10">
					<BlurIn>
						<div className="text-center mb-20">
							<motion.h2
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6 }}
								className="text-5xl lg:text-6xl font-bold text-foreground mb-6"
							>
								Why Choose{" "}
								<span className="text-gradient-green">TimeBrew?</span>
							</motion.h2>
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6, delay: 0.2 }}
								className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto"
							>
								Features designed for the modern news consumer who values
								quality over quantity
							</motion.p>
						</div>
					</BlurIn>

					{/* Enhanced Feature Grid */}
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
						{features.map((feature, i) => {
							const IconComponent = feature.icon;
							return (
								<motion.div
									key={i}
									initial={{ opacity: 0, y: 50 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.6, delay: i * 0.1 }}
									className="group relative"
								>
									{/* Background glow */}
									<div
										className={`absolute -inset-2 bg-gradient-to-r ${feature.color} rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
									/>

									{/* Card */}
									<div className="relative bg-card/70 backdrop-blur-sm p-8 rounded-3xl border border-border hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 h-full">
										<BorderBeam
											size={200}
											duration={15}
											delay={i * 2}
											className="opacity-0 group-hover:opacity-100"
										/>

										{/* Icon */}
										<div
											className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl mb-6 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}
										>
											<IconComponent className="w-8 h-8" />
										</div>

										{/* Stats badge */}
										<div className="absolute top-4 right-4 bg-primary/10 text-primary text-xs px-3 py-1 rounded-full font-medium">
											{feature.stats}
										</div>

										{/* Content */}
										<h3 className="text-xl font-semibold text-card-foreground mb-3">
											{feature.title}
										</h3>
										<p className="text-muted-foreground leading-relaxed mb-4">
											{feature.desc}
										</p>
										<div className="text-sm text-primary font-medium">
											{feature.benefit}
										</div>
									</div>
								</motion.div>
							);
						})}
					</div>

					{/* Stats Section */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="grid grid-cols-2 lg:grid-cols-4 gap-8 bg-card/30 backdrop-blur-sm rounded-3xl p-8 border border-border relative"
					>
						<BorderBeam size={300} duration={12} />
						{stats.map((stat, i) => (
							<div key={i} className="text-center">
								<div className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
									<NumberTicker value={stat.value} />
									{stat.suffix}
								</div>
								<div className="text-sm text-muted-foreground">
									{stat.label}
								</div>
							</div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Enhanced Benefits Section */}
			<section ref={ref} className="py-32 md:py-32 pt-23 md:pt-32 relative overflow-hidden">
				<div className="max-w-7xl mx-auto px-10">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						{/* Left Content */}
						{/* <motion.div
							initial={{ opacity: 0, x: -50 }}
							animate={inView ? { opacity: 1, x: 0 } : {}}
							transition={{ duration: 0.8 }}
							className="space-y-10"
						> */}
						<div className="space-y-6">
							<motion.h2
								initial={{ opacity: 0, y: 30 }}
								animate={inView ? { opacity: 1, y: 0 } : {}}
								transition={{ duration: 0.6, delay: 0.2 }}
								className="text-4xl lg:text-5xl font-bold text-card-foreground leading-tight"
							>
								Stay <span className="text-gradient-green">Informed</span>,
								<br />
								Not Overwhelmed.
							</motion.h2>

							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={inView ? { opacity: 1, y: 0 } : {}}
								transition={{ duration: 0.6, delay: 0.4 }}
								className="text-xl text-muted-foreground leading-relaxed"
							>
								TimeBrew transforms how you consume news. No more endless
								scrolling or FOMO - just the stories that matter, when you want
								them.
							</motion.p>
						</div>

						{/* Benefits List */}
						<div className="space-y-6">
							{benefits.map((benefit, i) => {
								const IconComponent = benefit.icon;
								return (
									<motion.div
										key={i}
										initial={{ opacity: 0, x: -20 }}
										animate={inView ? { opacity: 1, x: 0 } : {}}
										transition={{ duration: 0.6, delay: 0.6 + i * 0.1 }}
										className="flex items-start space-x-4 group"
									>
										<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
											<IconComponent className="w-6 h-6 text-primary" />
										</div>
										<div>
											<h4 className="font-semibold text-card-foreground mb-1">
												{benefit.title}
											</h4>
											<p className="text-muted-foreground">
												{benefit.description}
											</p>
										</div>
									</motion.div>
								);
							})}
						</div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={inView ? { opacity: 1, y: 0 } : {}}
							transition={{ duration: 0.6, delay: 1 }}
							className="flex flex-col sm:flex-row gap-4"
						>
							<ShinyButton className="text-lg px-8 py-4 flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
								<Coffee className="w-5 h-5" />
								<span>Start Your Free Trial</span>
							</ShinyButton>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="border-2 border-primary text-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center space-x-2"
							>
								<span>See Sample Digest</span>
								<ArrowRight className="w-5 h-5" />
							</motion.button>
						</motion.div>

						{/* Right Visual - Enhanced Email Mockup */}
						<motion.div
							initial={{ opacity: 0, x: 50 }}
							animate={inView ? { opacity: 1, x: 0 } : {}}
							transition={{ duration: 0.8, delay: 0.3 }}
							className="relative"
						>
							{/* Main visual container */}
							<div className="relative bg-card/40 backdrop-blur-2xl rounded-3xl p-8 border border-border">
								<BorderBeam size={300} duration={15} />

								{/* Mock email interface */}
								<div className="space-y-6">
									{/* Header */}
									<div className="flex items-center space-x-3 pb-4 border-b border-border">
										<div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center text-white">
											<Mail className="w-5 h-5" />
										</div>
										<div>
											<div className="font-semibold text-card-foreground">
												Your Morning Tech Brew ☕
											</div>
											<div className="text-sm text-muted-foreground">
												5 stories • 2-min read
											</div>
										</div>
									</div>

									{/* Article previews with enhanced styling */}
									<div className="space-y-4">
										{articles.map((article, i) => (
											<motion.div
												key={i}
												initial={{ opacity: 0, y: 10 }}
												animate={inView ? { opacity: 1, y: 0 } : {}}
												transition={{
													duration: 0.4,
													delay: 1 + i * 0.1,
												}}
												className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
											>
												<div className="w-3 h-3 bg-gradient-to-r from-primary to-accent rounded-full" />
												<div className="flex-1">
													<div className="font-medium text-card-foreground group-hover:text-primary transition-colors">
														{article.title}
													</div>
													<div className="flex items-center space-x-2 mt-1">
														<span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
															{article.category}
														</span>
														<span className="text-xs text-muted-foreground">
															{article.readTime}
														</span>
													</div>
												</div>
											</motion.div>
										))}
									</div>

									{/* Footer */}
									<div className="pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
										<span>Delivered at 7:00 AM</span>
										<span className="flex items-center space-x-1">
											<Clock className="w-4 h-4" />
											<span>7 min total</span>
										</span>
									</div>
								</div>
							</div>

							{/* Floating elements */}
							<motion.div
								animate={{ y: [0, -10, 0] }}
								transition={{ repeat: Infinity, duration: 3 }}
								className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-full shadow-lg"
							>
								<Check className="w-6 h-6" />
							</motion.div>

							<motion.div
								animate={{ y: [0, 10, 0] }}
								transition={{ repeat: Infinity, duration: 4, delay: 1 }}
								className="absolute -bottom-4 -left-4 bg-blue-500 text-white p-3 rounded-full shadow-lg"
							>
								<Smartphone className="w-6 h-6" />
							</motion.div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Testimonials Section */}
			<section className="py-32 md:py-32 pt-23 md:pt-32 relative overflow-hidden">
				<div className="max-w-7xl mx-auto px-10">
					<BlurIn>
						<div className="text-center mb-16">
							<motion.h2
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6 }}
								className="text-4xl lg:text-5xl font-bold text-foreground mb-6"
							>
								Loved by{" "}
								<span className="text-gradient-green">Early Adopters</span>
							</motion.h2>
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.6, delay: 0.2 }}
								className="text-xl text-muted-foreground"
							>
								See what our beta users are saying
							</motion.p>
						</div>
					</BlurIn>

					{/* Testimonials Marquee */}
					<div className="space-y-8">
						<Marquee className="py-4" pauseOnHover>
							{testimonials.slice(0, 3).map((testimonial, i) => (
								<div
									key={i}
									className="mx-4 bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border min-w-80 hover:shadow-lg transition-shadow"
								>
									<div className="flex items-center space-x-1 mb-4">
										{[...Array(testimonial.rating)].map((_, j) => (
											<Star
												key={j}
												className="w-4 h-4 fill-yellow-400 text-yellow-400"
											/>
										))}
									</div>
									<p className="text-card-foreground mb-4 italic">
										"{testimonial.content}"
									</p>
									<div className="flex items-center space-x-3">
										<div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold text-sm">
											{testimonial.avatar}
										</div>
										<div>
											<div className="font-semibold text-card-foreground">
												{testimonial.name}
											</div>
											<div className="text-sm text-muted-foreground">
												{testimonial.role} at {testimonial.company}
											</div>
										</div>
									</div>
								</div>
							))}
						</Marquee>

						<Marquee className="py-4" reverse pauseOnHover>
							{testimonials.slice(3).map((testimonial, i) => (
								<div
									key={`reverse-${i}`}
									className="mx-4 bg-card/70 backdrop-blur-sm p-6 rounded-2xl border border-border min-w-80 hover:shadow-lg transition-shadow"
								>
									<div className="flex items-center space-x-1 mb-4">
										{[...Array(testimonial.rating)].map((_, j) => (
											<Star
												key={j}
												className="w-4 h-4 fill-yellow-400 text-yellow-400"
											/>
										))}
									</div>
									<p className="text-card-foreground mb-4 italic">
										"{testimonial.content}"
									</p>
									<div className="flex items-center space-x-3">
										<div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-white font-semibold text-sm">
											{testimonial.avatar}
										</div>
										<div>
											<div className="font-semibold text-card-foreground">
												{testimonial.name}
											</div>
											<div className="text-sm text-muted-foreground">
												{testimonial.role} at {testimonial.company}
											</div>
										</div>
									</div>
								</div>
							))}
						</Marquee>
					</div>
				</div>
			</section>
		</>
	);
};

export default SecondPage;
