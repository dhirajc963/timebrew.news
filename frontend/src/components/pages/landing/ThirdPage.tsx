import React, { useState, useRef } from "react";
import {
	Plus,
	Minus,
	Coffee,
	Mail,
	Shield,
	Zap,
	Clock,
	TrendingUp,
	Users,
	Star,
	ArrowRight,
	CheckCircle,
	Sparkles,
	Globe,
	Target,
	Rocket,
} from "lucide-react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BorderBeam } from "@/components/magicui/border-beam";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";

// Custom BlurIn component
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

// Type definitions
interface FAQ {
	q: string;
	a: string;
	icon: React.ComponentType<{ className?: string }>;
}

interface Benefit {
	text: string;
	icon: React.ComponentType<{ className?: string }>;
}

const ThirdPage: React.FC = () => {
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [email, setEmail] = useState<string>("");
	const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const ref = useRef<HTMLElement>(null);
	const inView = useInView(ref, { once: true });

	const faqs: FAQ[] = [
		{
			q: "Why limit to 3 Brews?",
			a: "We believe in intentional consumption. Three focused digests prevent information overload while keeping you well-informed. Studies show people retain more information from fewer, high-quality sources.",
			icon: Coffee,
		},
		{
			q: "Can I change article count later?",
			a: "Absolutely! Adjust your article count (3, 5, or 8) anytime in your preferences. Your brew, your rules. We also learn from your reading patterns to suggest optimal counts.",
			icon: Clock,
		},
		{
			q: "What sources do you pull from?",
			a: "We aggregate from 500+ trusted sources including major news outlets, industry publications, emerging voices, and specialized tech blogs. Our AI ensures quality and credibility.",
			icon: Globe,
		},
		{
			q: "How is my data handled?",
			a: "We store only your email and preferences. No tracking, no selling data, one-click delete anytime. Privacy by design. Your reading habits stay private - we only use aggregated, anonymized data to improve the service.",
			icon: Shield,
		},
		{
			q: "When will TimeBrew launch publicly?",
			a: "We're planning a public launch in Q3 2025. Beta users get lifetime 50% discount and priority access to all new features. You're helping shape the future of news consumption!",
			icon: Rocket,
		},
		{
			q: "Can I customize the topics?",
			a: "Yes! Choose from 20+ categories including Tech, Business, Science, Health, Politics, and more. Mix and match topics for each brew, and we'll learn what resonates with you.",
			icon: Target,
		},
	];

	const benefits: Benefit[] = [
		{ text: "Lifetime 50% discount when we go public", icon: Star },
		{ text: "Priority feature requests & feedback", icon: TrendingUp },
		{ text: "Exclusive beta community access", icon: Users },
		{ text: "No commitment - cancel anytime", icon: CheckCircle },
		{ text: "Free during entire beta period", icon: Zap },
		{ text: "Direct line to our founding team", icon: Mail },
	];

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (email && !isSubmitting) {
			setIsSubmitting(true);
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1500));
			setIsSubmitted(true);
			setIsSubmitting(false);
		}
	};

	return (
		<>
			{/* Enhanced Early Adopter CTA */}
			<section className="py-32 bg-gradient-to-br from-primary via-accent to-primary text-primary-foreground relative overflow-hidden">
				{/* Floating gradient orbs */}
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					<motion.div
						className="absolute top-20 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"
						animate={{
							x: [0, 50, 0],
							y: [0, -30, 0],
							scale: [1, 1.2, 1],
						}}
						transition={{
							duration: 15,
							repeat: Infinity,
							ease: "easeInOut",
						}}
					/>
					<motion.div
						className="absolute bottom-20 right-10 w-80 h-80 bg-white/8 rounded-full blur-3xl"
						animate={{
							x: [0, -40, 0],
							y: [0, 25, 0],
							scale: [1, 0.8, 1],
						}}
						transition={{
							duration: 12,
							repeat: Infinity,
							ease: "easeInOut",
							delay: 3,
						}}
					/>
				</div>

				<div className="max-w-6xl mx-auto px-6 text-center relative z-10">
					<motion.div
						initial={{ opacity: 0, y: 50 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.8 }}
						className="space-y-12"
					>
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ delay: 0.2, duration: 0.5 }}
							className="inline-flex"
						>
							<AnimatedGradientText className="inline-flex items-center space-x-2 px-6 py-3 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur-sm">
								<Star className="w-5 h-5" />
								<span className="font-medium">Limited Beta Access</span>
							</AnimatedGradientText>
						</motion.div>

						{/* Main Headline */}
						<div className="space-y-8">
							<motion.h2
								initial={{ opacity: 0, y: 30 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.3, duration: 0.8 }}
								className="text-5xl lg:text-7xl font-bold leading-tight"
							>
								Help Shape the
								<br />
								<span className="text-primary-foreground/90">
									Future of News
								</span>
							</motion.h2>

							<motion.p
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ delay: 0.5, duration: 0.6 }}
								className="text-xl lg:text-2xl text-primary-foreground/80 max-w-4xl mx-auto leading-relaxed"
							>
								Join <NumberTicker value={2847} />+ beta users shaping the
								future of personalized news. Get priority features, lifetime
								discounts, and early access to everything we build.
							</motion.p>
						</div>

						{/* Benefits Grid */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.7, duration: 0.6 }}
							className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12"
						>
							{benefits.map((benefit, i) => {
								const IconComponent = benefit.icon;
								return (
									<motion.div
										key={i}
										initial={{ opacity: 0, x: -20 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
										className="flex items-center space-x-3 bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4 hover:bg-primary-foreground/15 transition-colors"
									>
										<IconComponent className="w-5 h-5 text-green-300 flex-shrink-0" />
										<span className="text-primary-foreground/90 text-sm">
											{benefit.text}
										</span>
									</motion.div>
								);
							})}
						</motion.div>

						{/* Email Form */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 0.9, duration: 0.6 }}
							className="max-w-2xl mx-auto"
						>
							<AnimatePresence mode="wait">
								{!isSubmitted ? (
									<motion.form
										key="form"
										initial={{ opacity: 1 }}
										exit={{ opacity: 0, y: -20 }}
										onSubmit={handleSubmit}
										className="space-y-6"
									>
										<div className="flex flex-col sm:flex-row gap-4">
											<div className="flex-1 relative">
												<Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
												<input
													type="email"
													placeholder="Enter your email address"
													value={email}
													onChange={(e) => setEmail(e.target.value)}
													required
													disabled={isSubmitting}
													className="w-full pl-12 pr-6 py-4 rounded-full text-foreground bg-background border-2 border-transparent focus:outline-none focus:border-primary-foreground/30 focus:ring-4 focus:ring-primary-foreground/20 text-lg disabled:opacity-70"
												/>
											</div>
											<button
												type="submit"
												disabled={isSubmitting}
												className="px-8 py-4 text-lg whitespace-nowrap relative overflow-hidden"
												style={{
													border: "none",
													background: "none",
													padding: 0,
												}}
											>
												<ShinyButton className="w-full h-full">
													{isSubmitting ? (
														<motion.div
															animate={{ rotate: 360 }}
															transition={{
																duration: 1,
																repeat: Infinity,
																ease: "linear",
															}}
															className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
														/>
													) : (
														<>
															<Zap className="w-5 h-5 mr-2" />
															Claim Your Spot
														</>
													)}
												</ShinyButton>
											</button>
										</div>

										<p className="text-sm text-primary-foreground/60">
											Join the beta • No spam ever • Unsubscribe anytime
										</p>
									</motion.form>
								) : (
									<motion.div
										key="success"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										className="text-center space-y-4"
									>
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ type: "spring", delay: 0.2 }}
											className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center"
										>
											<CheckCircle className="w-8 h-8 text-white" />
										</motion.div>
										<h3 className="text-2xl font-bold text-primary-foreground">
											Welcome to the Beta!
										</h3>
										<p className="text-primary-foreground/80">
											Check your email for next steps. We're excited to have you
											on board! 🎉
										</p>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>

						{/* Trust indicators */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: 1.1, duration: 0.5 }}
							className="flex flex-wrap justify-center items-center gap-8 pt-8"
						>
							<div className="flex items-center space-x-2 text-primary-foreground/70">
								<Shield className="w-5 h-5" />
								<span className="text-sm">GDPR Compliant</span>
							</div>
							<div className="flex items-center space-x-2 text-primary-foreground/70">
								<Users className="w-5 h-5" />
								<span className="text-sm">
									<NumberTicker value={2847} />+ Beta Users
								</span>
							</div>
							<div className="flex items-center space-x-2 text-primary-foreground/70">
								<Star className="w-5 h-5" />
								<span className="text-sm">4.9/5 Beta Rating</span>
							</div>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* Enhanced FAQ Section */}
			<section ref={ref} className="py-32 relative overflow-hidden">
				<div className="max-w-5xl mx-auto px-6 relative z-10">
					<BlurIn>
						<div className="text-center mb-20">
							<motion.h2
								initial={{ opacity: 0, y: 30 }}
								animate={inView ? { opacity: 1, y: 0 } : {}}
								transition={{ duration: 0.6 }}
								className="text-5xl lg:text-6xl font-bold text-card-foreground mb-6"
							>
								Frequently Asked{" "}
								<span className="text-gradient-green">Questions</span>
							</motion.h2>
							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={inView ? { opacity: 1, y: 0 } : {}}
								transition={{ duration: 0.6, delay: 0.2 }}
								className="text-xl text-muted-foreground"
							>
								Everything you need to know about TimeBrew
							</motion.p>
						</div>
					</BlurIn>

					{/* FAQ Items */}
					<div className="space-y-6">
						{faqs.map((faq, i) => {
							const IconComponent = faq.icon;
							return (
								<motion.div
									key={i}
									initial={{ opacity: 0, y: 30 }}
									animate={inView ? { opacity: 1, y: 0 } : {}}
									transition={{ duration: 0.6, delay: i * 0.1 }}
									className="group"
								>
									<div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
										<BorderBeam
											size={200}
											duration={15}
											delay={i * 2}
											className="opacity-0 group-hover:opacity-100"
										/>

										<button
											className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
											onClick={() => setOpenFaq(openFaq === i ? null : i)}
										>
											<div className="flex items-center space-x-4">
												<div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center text-white flex-shrink-0">
													<IconComponent className="w-6 h-6" />
												</div>
												<span className="font-semibold text-lg text-card-foreground">
													{faq.q}
												</span>
											</div>
											<motion.div
												animate={{ rotate: openFaq === i ? 180 : 0 }}
												transition={{ duration: 0.3 }}
												className="flex-shrink-0"
											>
												{openFaq === i ? (
													<Minus className="w-6 h-6 text-primary" />
												) : (
													<Plus className="w-6 h-6 text-muted-foreground" />
												)}
											</motion.div>
										</button>

										<AnimatePresence>
											{openFaq === i && (
												<motion.div
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: "auto", opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.3 }}
													className="overflow-hidden"
												>
													<div className="px-8 pb-6 text-muted-foreground border-t border-border/50">
														<motion.p
															initial={{ y: -10, opacity: 0 }}
															animate={{ y: 0, opacity: 1 }}
															transition={{ delay: 0.1 }}
															className="pt-6 leading-relaxed text-lg"
														>
															{faq.a}
														</motion.p>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</motion.div>
							);
						})}
					</div>

					{/* Bottom CTA */}
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={inView ? { opacity: 1, y: 0 } : {}}
						transition={{ duration: 0.6, delay: 0.8 }}
						className="text-center mt-20"
					>
						<div className="space-y-6">
							<h3 className="text-2xl font-bold text-card-foreground">
								Still have questions?
							</h3>
							<p className="text-muted-foreground mb-8">
								We'd love to hear from you. Reach out anytime!
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="border-2 border-primary text-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center space-x-2"
								>
									<Mail className="w-5 h-5" />
									<span>Contact Support</span>
								</motion.button>
								<ShinyButton className="text-lg px-8 py-4 flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
								<Coffee className="w-5 h-5" />
								<span>Join Beta Now</span>
							</ShinyButton>
							</div>
						</div>
					</motion.div>
				</div>
			</section>
		</>
	);
};

export default ThirdPage;
