import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Coffee,
	Clock,
	ArrowRight,
	ArrowLeft,
	Check,
	Sparkles,
	Zap,
	Plus,
	CheckIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeBlockPicker } from "@/components/ui/time-block-picker";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { Meteors } from "@/components/magicui/meteors";
import { WordRotate } from "@/components/magicui/word-rotate";

// Types
interface BrewFormData {
	name: string;
	topics: string[];
	delivery_time: string;
	article_count: number;
}

// Animation variants
const containerVariants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

const stepVariants = {
	initial: { opacity: 0, x: 20 },
	animate: { opacity: 1, x: 0 },
	exit: { opacity: 0, x: -20 },
};

const fadeInUpVariants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.5 },
};

const scaleInVariants = {
	initial: { opacity: 0, scale: 0.9 },
	animate: { opacity: 1, scale: 1 },
	transition: { duration: 0.5 },
};

const BrewCreationForm: React.FC = () => {
	// Form state
	const [currentStep, setCurrentStep] = useState(1);
	const [formData, setFormData] = useState<BrewFormData>({
		name: "",
		topics: [],
		delivery_time: "08:00",
		article_count: 5,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);
	// For mobile responsiveness
	const [isMobile, setIsMobile] = useState(false);

	// Check for mobile view
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => {
			window.removeEventListener("resize", checkMobile);
		};
	}, []);

	// Available topics - memoized to prevent recreation on each render
	const availableTopics = useMemo(
		() => [
			"Technology",
			"Business",
			"Science",
			"Politics",
			"Sports",
			"Entertainment",
			"Health",
			"Finance",
			"Startups",
			"AI & ML",
			"Climate",
			"Space",
			"Crypto",
			"Gaming",
			"Design",
		],
		[]
	);

	// Handle input changes - memoized with useCallback
	const handleInputChange = useCallback(
		(field: keyof BrewFormData, value: string | number) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[]
	);

	// Handle topic toggle - memoized with useCallback
	const handleTopicToggle = useCallback((topic: string) => {
		try {
			setFormData((prev) => {
				// Create a copy of the previous state to avoid direct mutation
				const prevTopics = [...prev.topics];
				const topicIndex = prevTopics.indexOf(topic);

				// If topic exists, remove it; otherwise add it
				let newTopics;
				if (topicIndex !== -1) {
					newTopics = prevTopics.filter((t) => t !== topic);
				} else {
					newTopics = [...prevTopics, topic];
				}

				// Return new state object
				return { ...prev, topics: newTopics };
			});
		} catch (error) {
			console.error("Error toggling topic:", error);
		}
	}, []);

	// Handle form submission
	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setIsSubmitting(true);

			try {
				// Simulate API call
				await new Promise((resolve) => setTimeout(resolve, 1500));
				console.log("Brew created:", formData);
				setSuccess(true);
			} catch (error) {
				console.error("Error creating brew:", error);
				// Handle error state here
			} finally {
				setIsSubmitting(false);
			}
		},
		[formData]
	);

	// Validate current step - memoized with useMemo
	const isStepValid = useMemo(() => {
		switch (currentStep) {
			case 1:
				return !!formData.name;
			case 2:
				return formData.topics.length > 0;
			case 3:
				return (
					!!formData.delivery_time &&
					formData.article_count >= 3 &&
					formData.article_count <= 8
				);
			default:
				return false;
		}
	}, [currentStep, formData]);

	// Navigation functions - memoized with useCallback
	const nextStep = useCallback(() => {
		if (isStepValid) {
			setCurrentStep((prev) => Math.min(prev + 1, 3));
		}
	}, [isStepValid]);

	const prevStep = useCallback(() => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	}, []);

	// Reset form - memoized with useCallback
	const resetForm = useCallback(() => {
		setSuccess(false);
		setCurrentStep(1);
		setFormData({
			name: "",
			topics: [],
			delivery_time: "08:00",
			article_count: 5,
		});
	}, []);

	// Success screen
	if (success) {
		return (
			<div className="w-full max-w-4xl mx-auto">
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.6 }}
					className="relative"
				>
					<div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-3xl blur-2xl" />

					<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl">
						<BorderBeam size={250} duration={12} delay={0} />
						<Meteors number={8} />

						<div className="space-y-6">
							<div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto flex items-center justify-center">
								<Check className="w-8 h-8 text-white" />
							</div>

							<div className="text-center">
								<h2 className="text-2xl font-bold text-gradient-green mb-2">
									Your{" "}
									<AnimatedGradientText>{formData.name}</AnimatedGradientText>{" "}
									Brew is Ready!
								</h2>
								<p className="text-xl text-muted-foreground">
									We'll deliver it daily at{" "}
									<span className="text-primary font-medium">
										{formData.delivery_time}
									</span>
								</p>
							</div>

							<div className="bg-primary/10 border border-primary/20 rounded-xl p-4 max-w-md mx-auto">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-2">
										<Coffee className="w-5 h-5 text-primary" />
										<span className="font-medium">Brew Details</span>
									</div>
									<div className="bg-primary/20 text-primary text-sm px-3 py-1 rounded-full">
										{formData.article_count} articles
									</div>
								</div>

								<div className="space-y-3">
									<div>
										<div className="text-sm text-muted-foreground mb-1">
											Topics
										</div>
										<div className="flex flex-wrap gap-2">
											{formData.topics.map((topic) => (
												<div
													key={topic}
													className="bg-white/10 text-white text-xs px-3 py-1 rounded-full"
												>
													{topic}
												</div>
											))}
										</div>
									</div>
								</div>
							</div>

							<div className="pt-4">
								<ShinyButton
									onClick={resetForm}
									className="w-full flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
									aria-label="Create another brew"
								>
									<Plus className="w-4 h-4" />
									<span>Create Another Brew</span>
								</ShinyButton>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-4xl mx-auto">
			{/* Form Header */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="mb-10 text-center"
			>
				<motion.h1
					className="text-3xl md:text-4xl font-bold mb-4 inline-flex items-center justify-center gap-1 md:gap-2"
					initial={{ scale: 0.98, opacity: 0.9 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
				>
					Craft Your
					<WordRotate
						words={["Perfect", "Personalized", "Daily", "Curated"]}
						className="text-gradient-green mx-0.5"
						inline={true}
						motionProps={{
							initial: { opacity: 0, y: 10 },
							animate: { opacity: 1, y: 0 },
							exit: { opacity: 0, y: -10 },
							transition: { duration: 0.7, ease: "easeInOut" },
						}}
					/>
					Brew
				</motion.h1>
				<motion.p
					className="text-lg text-muted-foreground"
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3 }}
				>
					Step {currentStep} of 3:{" "}
					{currentStep === 1
						? "Name Your Brew"
						: currentStep === 2
						? "Select Topics"
						: "Delivery Settings"}
				</motion.p>
			</motion.div>

			{/* Progress Indicator */}
			<div className="flex items-center justify-center mb-8">
				{[1, 2, 3].map((step) => (
					<React.Fragment key={step}>
						<div
							className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
								currentStep >= step
									? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
									: "bg-muted text-muted-foreground"
							}`}
						>
							{step < currentStep ? <Check className="w-4 h-4" /> : step}
						</div>
						{step < 3 && (
							<div
								className={`w-12 h-1 transition-all duration-300 ${
									currentStep > step
										? "bg-gradient-to-r from-primary to-accent"
										: "bg-muted"
								}`}
							/>
						)}
					</React.Fragment>
				))}
			</div>

			{/* Form Steps */}
			<div className="relative group">
				<div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl opacity-60" />

				<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl">
					<BorderBeam size={300} duration={15} delay={3} />
					<div className="space-y-6">
						<form onSubmit={handleSubmit}>
							<AnimatePresence mode="wait">
								{/* Step 1: Name Your Brew */}
								{currentStep === 1 && (
									<motion.div
										key="step1"
										variants={stepVariants}
										initial="initial"
										animate="animate"
										exit="exit"
										transition={{ duration: 0.4 }}
										className="space-y-8"
									>
										<div className="space-y-6">
											<div className="text-center mb-6">
												<h3 className="text-xl font-semibold">
													What would you like to call your brew?
												</h3>
												<p className="text-muted-foreground text-sm">
													Give your brew a memorable name that reflects its
													content
												</p>
											</div>
											<div className="space-y-2">
												<Label
													htmlFor="brew-name"
													className="text-sm font-medium"
												>
													Brew Name
												</Label>
												<div className="relative">
													<Coffee className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
													<Input
														id="brew-name"
														placeholder="Morning Tech Update"
														value={formData.name}
														onChange={(e) =>
															handleInputChange("name", e.target.value)
														}
														className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
														aria-label="Brew name"
														aria-required="true"
													/>
												</div>
											</div>
										</div>
									</motion.div>
								)}

								{/* Step 2: Select Topics */}
								{currentStep === 2 && (
									<motion.div
										key="step2"
										variants={stepVariants}
										initial="initial"
										animate="animate"
										exit="exit"
										transition={{ duration: 0.4 }}
										className="space-y-8"
									>
										<div>
											<div className="text-center mb-6">
												<h3 className="text-xl font-semibold">
													What topics are you interested in?
												</h3>
												<p className="text-muted-foreground text-sm">
													Choose topics you'd like to receive news about
												</p>
											</div>

											<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
												{availableTopics.map((topic) => (
													<div
														key={topic}
														onClick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															handleTopicToggle(topic);
														}}
														className={`
                              relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all duration-300
                              ${
																formData.topics.includes(topic)
																	? "border-primary/50 bg-gradient-to-br from-primary/20 to-accent/10 backdrop-blur-sm shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
																	: "border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30"
															}`}
														role="checkbox"
														aria-checked={formData.topics.includes(topic)}
														tabIndex={0}
														onKeyDown={(e) => {
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																handleTopicToggle(topic);
															}
														}}
													>
														<div className="flex items-center gap-3">
															<div className="flex-shrink-0">
																{/* Use a static checkbox indicator instead of the interactive component */}
																<div
																	className={`size-4 rounded-[4px] border flex items-center justify-center ${
																		formData.topics.includes(topic)
																			? "bg-primary border-primary text-primary-foreground"
																			: "border-input bg-background"
																	}`}
																>
																	{formData.topics.includes(topic) && (
																		<CheckIcon className="size-3.5" />
																	)}
																</div>
															</div>
															<span
																className={`${
																	formData.topics.includes(topic)
																		? "text-primary font-medium"
																		: "text-foreground"
																}`}
															>
																{topic}
															</span>
														</div>
														{formData.topics.includes(topic) && (
															<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"></div>
														)}
													</div>
												))}
											</div>
										</div>
									</motion.div>
								)}

								{/* Step 3: Delivery Settings */}
								{currentStep === 3 && (
									<motion.div
										key="step3"
										variants={stepVariants}
										initial="initial"
										animate="animate"
										exit="exit"
										transition={{ duration: 0.4 }}
										className="space-y-8"
									>
										<div className="text-center mb-6">
											<h3 className="text-xl font-semibold">
												Delivery Settings
											</h3>
											<p className="text-muted-foreground text-sm">
												Customize when and how much content you receive
											</p>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
											<div className="space-y-2">
												<Label
													htmlFor="delivery-time"
													className="text-sm font-medium"
												>
													Delivery Time
												</Label>
												<div className="relative">
													<TimeBlockPicker
														value={formData.delivery_time}
														onChange={(value) =>
															handleInputChange("delivery_time", value)
														}
														className="w-full"
													/>
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													When would you like to receive your daily brew?
												</p>
											</div>

											<div className="space-y-4">
												<Label
													htmlFor="article-count"
													className="text-xl font-medium block"
												>
													Article Count
												</Label>
												<div className="space-y-4">
													<div className="flex items-center justify-between">
														<span className="text-4xl font-bold text-primary">
															{formData.article_count}
														</span>
														<span className="text-muted-foreground">
															articles per day
														</span>
													</div>

													<input
														id="article-count"
														type="range"
														min="3"
														max="8"
														value={formData.article_count}
														onChange={(e) =>
															handleInputChange(
																"article_count",
																parseInt(e.target.value)
															)
														}
														className="w-full h-3 bg-gradient-to-r from-white/5 to-white/10 rounded-full appearance-none backdrop-blur-sm border border-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-primary [&::-webkit-slider-thumb]:to-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/20 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/20"
														aria-label="Select number of articles"
														aria-valuemin={3}
														aria-valuemax={8}
														aria-valuenow={formData.article_count}
														aria-valuetext={`${formData.article_count} articles`}
													/>

													<div className="flex justify-between px-1 text-xs text-muted-foreground">
														<span>3</span>
														<span>4</span>
														<span>5</span>
														<span>6</span>
														<span>7</span>
														<span>8</span>
													</div>
												</div>
												<p className="text-muted-foreground">
													How many articles would you like in each brew?
												</p>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>

							{/* Navigation Buttons */}
							<div className="flex items-center justify-between pt-4">
								{currentStep > 1 && (
									<button
										type="button"
										onClick={prevStep}
										className="px-6 py-2 border border-border rounded-xl font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
										aria-label="Go back to previous step"
									>
										Back
									</button>
								)}

								<div className="ml-auto">
									{currentStep < 3 ? (
										<button
											type="button"
											onClick={nextStep}
											disabled={!isStepValid}
											className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
												isStepValid
													? "bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg"
													: "bg-muted text-muted-foreground cursor-not-allowed"
											}`}
											aria-label="Continue to next step"
											aria-disabled={!isStepValid}
										>
											<span>Next</span>
											<ArrowRight className="w-4 h-4" />
										</button>
									) : (
										<ShinyButton
											type="submit"
											disabled={!isStepValid || isSubmitting}
											className="flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
											aria-label="Create brew"
										>
											{isSubmitting ? (
												<>
													<Sparkles
														className="w-4 h-4 animate-pulse"
														aria-hidden="true"
													/>
													<span>Creating...</span>
												</>
											) : (
												<>
													<Zap className="w-4 h-4" aria-hidden="true" />
													<span>Create Brew</span>
												</>
											)}
										</ShinyButton>
									)}
								</div>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BrewCreationForm;
