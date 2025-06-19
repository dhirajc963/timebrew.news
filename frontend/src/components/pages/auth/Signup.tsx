import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
	Coffee,
	Mail,
	User,
	Globe,
	ArrowRight,
	Check,
	AlertCircle,
	Sparkles,
	Zap,
	Loader2,
	Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { API_BASE_URL, API_ENDPOINTS, getApiUrl } from "@/config/api";
import { validateEmail } from "@/lib/utils";

// Types
interface SignupFormData {
	email: string;
	firstName: string;
	lastName: string;
	country: string;
	interests: string[];
	timezone: string;
}

interface ApiResponse {
	message: string;
	user?: any;
	error?: string;
}

const Signup: React.FC = () => {
	const [formData, setFormData] = useState<SignupFormData>({
		email: "",
		firstName: "",
		lastName: "",
		country: "",
		interests: [],
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});

	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<React.ReactNode>("");
	const [currentStep, setCurrentStep] = useState(1);
	const [showEmailError, setShowEmailError] = useState(false);

	// Available interests
	const availableInterests = [
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
	];

	// Popular countries
	const countries = [
		"United States",
		"Canada",
		"United Kingdom",
		"Australia",
		"Germany",
		"France",
		"Japan",
		"India",
		"Brazil",
		"Mexico",
		"Other",
	];

	// API Configuration is now imported from config/api.ts

	const handleInputChange = (field: keyof SignupFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (error) setError("");
		// Reset validation error display when user types in the email field
		if (field === "email") {
			setShowEmailError(false);
		}
	};

	const handleInterestToggle = (interest: string) => {
		setFormData((prev) => ({
			...prev,
			interests: prev.interests.includes(interest)
				? prev.interests.filter((i) => i !== interest)
				: [...prev.interests, interest],
		}));
	};

	const validateStep = (step: number): boolean => {
		switch (step) {
			case 1:
				// Check if email is valid in addition to other fields
				const isValid = !!(
					formData.firstName &&
					formData.lastName &&
					formData.email &&
					validateEmail(formData.email) &&
					formData.country
				);

				// Show email validation error if email is invalid
				if (formData.email && !validateEmail(formData.email)) {
					setShowEmailError(true);
				}
				return isValid;
			case 2:
				return formData.interests.length > 0;
			default:
				return false;
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		// Validate email format again before submission
		if (!validateEmail(formData.email)) {
			setError("Please enter a valid email address");
			setShowEmailError(true);
			setLoading(false);
			return;
		}

		try {
			const response = await fetch(getApiUrl(API_ENDPOINTS.auth.register), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data: ApiResponse = await response.json();

			if (response.ok) {
				setSuccess(true);
			} else if (
				data.error?.toLowerCase().includes("already exists") ||
				data.error?.toLowerCase().includes("already registered")
			) {
				// Email already registered - suggest sign in
				setError(
					<>
						This email is already registered.{" "}
						<Link
							to="/login"
							className="text-primary hover:underline font-medium"
						>
							Sign in
						</Link>{" "}
						to your account.
					</>
				);
			} else {
				setError(data.error || "Registration failed. Please try again.");
			}
		} catch (err) {
			setError("Network error. Please check your connection and try again.");
		} finally {
			setLoading(false);
		}
	};

	const nextStep = () => {
		if (validateStep(currentStep)) {
			setCurrentStep((prev) => Math.min(prev + 1, 2));
		}
	};

	const prevStep = () => {
		setCurrentStep((prev) => Math.max(prev - 1, 1));
	};

	// Success screen
	if (success) {
		return (
			<div className="min-h-screen flex items-center justify-center relative overflow-hidden py-16 md:py-0 pt-23 md:pt-16">
				<div className="max-w-md mx-auto px-4 text-center">
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.6 }}
						className="relative"
					>
						<div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-3xl blur-2xl" />

						<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl">
							<BorderBeam size={250} duration={12} delay={0} />

							<div className="space-y-6">
								<div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto flex items-center justify-center">
									<Check className="w-8 h-8 text-white" />
								</div>

								<h2 className="text-2xl font-bold text-gradient-green">
									Check Your Email!
								</h2>

								<div className="space-y-2">
									<p className="text-muted-foreground">
										We've sent a verification link to{" "}
										<strong>{formData.email}</strong>
									</p>
									<p className="text-sm text-muted-foreground">
										Click the link to verify your account, then you can sign in
										using just your email!
									</p>
								</div>

								<div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
									<div className="flex items-start space-x-3">
										<Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
										<div className="text-sm">
											<div className="font-medium text-primary mb-1">
												Passwordless Authentication
											</div>
											<div className="text-muted-foreground">
												No passwords to remember - just secure email codes!
											</div>
										</div>
									</div>
								</div>

								<Link to="/login">
									<ShinyButton className="w-full flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
										<Coffee className="w-4 h-4" />
										<span>Go to Sign In</span>
									</ShinyButton>
								</Link>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center relative overflow-hidden py-16 md:py-0 pt-23 md:pt-16">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

			<div className="max-w-2xl mx-auto px-4 w-full">
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
					className="relative"
				>
					{/* Header */}
					<div className="text-center mb-8">
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.2, duration: 0.5 }}
							className="mb-4"
						>
							<AnimatedGradientText className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm text-primary">
								<Sparkles className="w-4 h-4" />
								<span className="text-sm font-medium">Join the Beta</span>
							</AnimatedGradientText>
						</motion.div>

						<h1 className="text-3xl md:text-4xl font-bold mb-4">
							Start Your{" "}
							<span className="text-gradient-green">News Journey</span>
						</h1>

						<TypingAnimation
							className="text-muted-foreground text-lg"
							duration={50}
						>
							Create your account and get personalized news brews delivered
							daily
						</TypingAnimation>
					</div>

					{/* Progress Indicator */}
					<div className="flex items-center justify-center mb-8">
						{[1, 2].map((step) => (
							<React.Fragment key={step}>
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
										currentStep >= step
											? "bg-gradient-to-r from-primary to-accent text-white shadow-lg"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{step}
								</div>
								{step < 2 && (
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

					{/* Form Container */}
					<div className="relative group">
						<div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl opacity-60" />

						<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl">
							<BorderBeam size={300} duration={15} delay={3} />

							<form onSubmit={handleSubmit} className="space-y-6">
								<AnimatePresence mode="wait">
									{/* Step 1: Basic Info */}
									{currentStep === 1 && (
										<motion.div
											key="step1"
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.3 }}
											className="space-y-6"
										>
											<div className="text-center mb-6">
												<h3 className="text-xl font-semibold">
													Tell us about yourself
												</h3>
												<p className="text-muted-foreground text-sm">
													We'll use this to personalize your experience
												</p>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<label className="text-sm font-medium">
														First Name
													</label>
													<div className="relative">
														<User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
														<input
															type="text"
															value={formData.firstName}
															onChange={(e) =>
																handleInputChange("firstName", e.target.value)
															}
															className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
															placeholder="John"
															required
														/>
													</div>
												</div>

												<div className="space-y-2">
													<label className="text-sm font-medium">
														Last Name
													</label>
													<div className="relative">
														<User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
														<input
															type="text"
															value={formData.lastName}
															onChange={(e) =>
																handleInputChange("lastName", e.target.value)
															}
															className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
															placeholder="Doe"
															required
														/>
													</div>
												</div>
											</div>

											<div className="space-y-2">
												<label className="text-sm font-medium">
													Email Address
												</label>
												<div className="relative">
													<Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
													<input
														type="email"
														value={formData.email}
														onChange={(e) =>
															handleInputChange("email", e.target.value)
														}
														className={`w-full pl-10 pr-4 py-3 bg-background/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
															showEmailError && !validateEmail(formData.email)
																? "border-red-500 ring-1 ring-red-500/50"
																: "border-border"
														}`}
														placeholder="john@example.com"
														required
													/>
													{showEmailError && !validateEmail(formData.email) && (
														<div className="text-xs text-red-500 mt-1 ml-1">
															Please enter a valid email address
														</div>
													)}
												</div>
											</div>

											<div className="space-y-2">
												<label className="text-sm font-medium">Country</label>
												<div className="relative">
													<Globe className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
													<select
														value={formData.country}
														onChange={(e) =>
															handleInputChange("country", e.target.value)
														}
														className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
														required
													>
														<option value="">Select your country</option>
														{countries.map((country) => (
															<option key={country} value={country}>
																{country}
															</option>
														))}
													</select>
												</div>
											</div>
										</motion.div>
									)}

									{/* Step 2: Interests */}
									{currentStep === 2 && (
										<motion.div
											key="step2"
											initial={{ opacity: 0, x: 20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -20 }}
											transition={{ duration: 0.3 }}
											className="space-y-6"
										>
											<div className="text-center mb-6">
												<h3 className="text-xl font-semibold">
													What interests you?
												</h3>
												<p className="text-muted-foreground text-sm">
													Choose topics you'd like to receive news about
												</p>
											</div>

											<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
												{availableInterests.map((interest) => (
													<motion.button
														key={interest}
														type="button"
														onClick={() => handleInterestToggle(interest)}
														whileHover={{ scale: 1.02 }}
														whileTap={{ scale: 0.98 }}
														className={`p-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
															formData.interests.includes(interest)
																? "bg-gradient-to-r from-primary to-accent text-white border-primary shadow-lg"
																: "bg-background/50 border-border hover:border-primary/50"
														}`}
													>
														{interest}
													</motion.button>
												))}
											</div>

											<p className="text-center text-sm text-muted-foreground">
												Selected: {formData.interests.length} topic
												{formData.interests.length !== 1 ? "s" : ""}
											</p>
										</motion.div>
									)}
								</AnimatePresence>

								{/* Error Message */}
								{error && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										className="flex items-center space-x-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
									>
										<AlertCircle className="w-4 h-4 flex-shrink-0" />
										<span className="text-sm">
											{typeof error === "string" ? error : error}
										</span>
									</motion.div>
								)}

								{/* Navigation Buttons */}
								<div className="flex items-center justify-between pt-4">
									{currentStep > 1 && (
										<button
											type="button"
											onClick={prevStep}
											className="px-6 py-2 border border-border rounded-xl font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
										>
											Back
										</button>
									)}

									<div className="ml-auto">
										{currentStep < 2 ? (
											<button
												type="button"
												onClick={nextStep}
												disabled={!validateStep(currentStep)}
												className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${
													validateStep(currentStep)
														? "bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg"
														: "bg-muted text-muted-foreground cursor-not-allowed"
												}`}
											>
												<span>Next</span>
												<ArrowRight className="w-4 h-4" />
											</button>
										) : (
											<ShinyButton
												disabled={loading || formData.interests.length === 0}
												className="flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
											>
												{loading ? (
													<>
														<Loader2 className="w-4 h-4 animate-spin" />
														<span>Creating Account...</span>
													</>
												) : (
													<>
														<Zap className="w-4 h-4" />
														<span>Create Account</span>
													</>
												)}
											</ShinyButton>
										)}
									</div>
								</div>
							</form>
						</div>
					</div>

					{/* Footer */}
					<p className="text-center text-sm text-muted-foreground mt-8">
						Already have an account?{" "}
						<Link
							to="/login"
							className="text-primary hover:text-primary/80 transition-colors font-medium"
						>
							Sign in
						</Link>
					</p>
				</motion.div>
			</div>
		</div>
	);
};

export default Signup;
