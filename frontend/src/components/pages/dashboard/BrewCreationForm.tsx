import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
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
	Newspaper,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeBlockPicker } from "@/components/ui/time-block-picker";
import { ArticleCountPicker } from "@/components/ui/article-count-picker";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { Meteors } from "@/components/magicui/meteors";
import { WordRotate } from "@/components/magicui/word-rotate";
import { apiClient, Brew, AuthenticationError } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";

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
	// Get auth context and navigation
	const { isAuthenticated, user } = useAuth();
	const navigate = useNavigate();

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
	const [error, setError] = useState<string | null>(null);
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
			// Error toggling topic
		}
	}, []);

	// Handle form submission
	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setIsSubmitting(true);
			setError(null);

			// Check if user is authenticated
			if (!isAuthenticated || !user) {
				const errorMsg = "You must be logged in to create a brew";
				setError(errorMsg);
				toast.error(errorMsg);
				setIsSubmitting(false);
				// Redirect to login page after a short delay
				setTimeout(() => {
					navigate("/signin");
				}, 2000);
				return;
			}

			try {
				// Get the first topic as the main topic
				const mainTopic = formData.topics[0] || "";

				// Create brew data object
				const brewData: Brew = {
					name: formData.name,
					topics: formData.topics,
					delivery_time: formData.delivery_time,
					article_count: formData.article_count,
				};

				// Call API to create brew
				const response = await apiClient.createBrew(brewData);
				setSuccess(true);
			} catch (error) {

				// Check if it's an authentication error using the custom error class
				if (error instanceof AuthenticationError) {
					const errorMsg = "Authentication failed. Please log in again.";
					setError(errorMsg);
					toast.error("Authentication required");
					setTimeout(() => {
						navigate("/signin");
					}, 2000);
				} else {
					const errorMsg =
						error instanceof Error ? error.message : "Failed to create brew";
					setError(errorMsg);
					toast.error(errorMsg);
				}
			} finally {
				setIsSubmitting(false);
			}
		},
		[formData, isAuthenticated, user]
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
						<Meteors number={5} minDuration={3} maxDuration={8} />

						<div className="space-y-6">
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3, duration: 0.5 }}
								className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto flex items-center justify-center"
							>
								<Check className="w-8 h-8 text-white" />
							</motion.div>

							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.5, duration: 0.5 }}
								className="text-center"
							>
								<h2 className="text-2xl font-bold text-gradient-green mb-2">
									Your{" "}
									<AnimatedGradientText>{formData.name}</AnimatedGradientText>{" "}
									Brew is Created!
								</h2>
								<p className="text-xl text-muted-foreground">
									We'll deliver it daily at{" "}
									<span className="text-primary font-medium">
										{formData.delivery_time}
									</span>
								</p>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.7, duration: 0.5 }}
								className="bg-primary/10 border border-primary/20 rounded-xl p-4 max-w-md mx-auto"
							>
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
													className="bg-primary/20 text-primary font-medium text-xs px-3 py-1 rounded-full border border-primary/30"
												>
													{topic}
												</div>
											))}
										</div>
									</div>
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.9, duration: 0.5 }}
								className="pt-4 flex gap-3"
							>
								<ShinyButton
									onClick={resetForm}
									className="flex-1 flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
									aria-label="Create another brew"
								>
									<Plus className="w-4 h-4" />
									<span>Create Another Brew</span>
								</ShinyButton>

								<Link to="/dashboard" className="flex-1">
									<ShinyButton
										className="w-full flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
										aria-label="Go to Dashboard"
									>
										<Coffee className="w-4 h-4" />
										<span>View My Brews</span>
									</ShinyButton>
								</Link>
							</motion.div>
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
					className="text-muted-foreground max-w-lg mx-auto"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 }}
				>
					Customize your daily news digest with topics you care about.
					<br />
					We'll brew it fresh and deliver it to your inbox every day.
				</motion.p>
			</motion.div>

			{/* Form Container */}
			<div className="relative">
				{/* Background gradient */}
				<div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />

				{/* Form Card */}
				<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-6 md:p-8 shadow-2xl">
					{/* Step indicator */}
					<div className="flex justify-center mb-8">
						<div className="flex items-center space-x-2">
							{[1, 2, 3].map((step) => (
								<React.Fragment key={step}>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center ${
											currentStep === step
												? "bg-primary text-white"
												: currentStep > step
												? "bg-primary/20 text-primary"
												: "bg-muted text-muted-foreground"
										}`}
									>
										{currentStep > step ? (
											<Check className="w-4 h-4" />
										) : (
											<span>{step}</span>
										)}
									</div>
									{step < 3 && (
										<div
											className={`w-10 h-0.5 ${
												currentStep > step ? "bg-primary" : "bg-muted"
											}`}
										/>
									)}
								</React.Fragment>
							))}
						</div>
					</div>

					{/* Form */}
					<div className="max-w-2xl mx-auto">
						<form onSubmit={handleSubmit}>
							{/* Error message */}
							{error && (
								<div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">
									{error}
								</div>
							)}

							{/* Form Steps */}
							<AnimatePresence mode="wait">
								{/* Step 1: Brew Name */}
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
										<div className="text-center mb-6">
											<h3 className="text-xl font-semibold">Name Your Brew</h3>
											<p className="text-muted-foreground text-sm">
												Give your daily news digest a memorable name
											</p>
										</div>

										<div className="space-y-4">
											<div className="space-y-2">
												<Label
													htmlFor="brew-name"
													className="text-sm font-medium"
												>
													Brew Name
												</Label>
												<div className="relative">
													<Input
														id="brew-name"
														type="text"
														value={formData.name}
														onChange={(e) =>
															handleInputChange("name", e.target.value)
														}
														placeholder="e.g. Morning Tech Update"
														className="pl-10"
													/>
													<Coffee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
												</div>
												<p className="text-xs text-muted-foreground mt-1">
													Choose a name that reflects the content you want to
													receive
												</p>
											</div>

											<div className="pt-4">
												<div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
													<h4 className="text-sm font-medium flex items-center gap-2 mb-2">
														<Sparkles className="w-4 h-4 text-primary" />
														Suggested Names
													</h4>
													<div className="flex flex-wrap gap-2">
														{[
															"Daily Tech Brew",
															"Morning Business Brief",
															"Science Roundup",
															"Startup Insights",
														].map((name) => (
															<button
																key={name}
																type="button"
																onClick={() => handleInputChange("name", name)}
																className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
															>
																{name}
															</button>
														))}
													</div>
												</div>
											</div>
										</div>
									</motion.div>
								)}

								{/* Step 2: Topics */}
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
										<div className="text-center mb-6">
											<h3 className="text-xl font-semibold">Select Topics</h3>
											<p className="text-muted-foreground text-sm">
												Choose topics you're interested in
											</p>
										</div>

										<div className="space-y-6">
											<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
												{availableTopics.map((topic) => {
													const isSelected = formData.topics.includes(topic);
													return (
														<div
															key={topic}
															className={`relative rounded-xl border ${
																isSelected
																	? "border-primary bg-primary/10"
																	: "border-border hover:border-primary/50 bg-card/50 hover:bg-card"
															} p-3 cursor-pointer transition-all`}
															onClick={() => handleTopicToggle(topic)}
														>
															{isSelected && (
																<div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
																	<Check className="w-3 h-3 text-white" />
																</div>
															)}
															<div className="text-sm font-medium">{topic}</div>
														</div>
													);
												})}
											</div>

											<div className="pt-4">
												<p className="text-xs text-muted-foreground mb-2">
													Selected Topics ({formData.topics.length}):
												</p>
												<div className="flex flex-wrap gap-2">
													{formData.topics.length > 0 ? (
														formData.topics.map((topic) => (
															<div
																key={topic}
																className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full flex items-center gap-1"
															>
																{topic}
																<button
																	type="button"
																	onClick={() => handleTopicToggle(topic)}
																	className="hover:text-accent"
																>
																	×
																</button>
															</div>
														))
													) : (
														<div className="text-xs text-muted-foreground italic">
															No topics selected yet
														</div>
													)}
												</div>
											</div>

											<div className="pt-6">
												<Label
													htmlFor="article-count"
													className="text-sm font-medium mb-2 block"
												>
													Articles Per Brew
												</Label>
												<ArticleCountPicker
													value={formData.article_count}
													onChange={(value) =>
														handleInputChange("article_count", value)
													}
													className="w-full"
												/>
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

											{/* Article Count section removed and moved to Step 2 */}
											<div className="flex items-center justify-center h-full">
												<div className="text-center p-6 rounded-xl border border-dashed border-border bg-card/30">
													<Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
													<h4 className="text-lg font-medium">
														Article Count Set
													</h4>
													<p className="text-sm text-muted-foreground">
														You've selected {formData.article_count} articles
														per brew
													</p>
													<p className="text-xs text-muted-foreground mt-2">
														You can change this in step 2 if needed
													</p>
												</div>
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
