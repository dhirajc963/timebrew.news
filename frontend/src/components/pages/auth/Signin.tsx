import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
	Coffee,
	Mail,
	Loader2,
	AlertCircle,
	Sparkles,
	Zap,
	Send,
	Shield,
	ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { API_BASE_URL, API_ENDPOINTS, getApiUrl } from "@/config/api";
import { validateEmail } from "@/lib/utils";

// Types
interface LoginFormData {
	email: string;
	otpCode: string;
}

interface LoginResponse {
	message?: string;
	challengeName?: string;
	session?: string;
	email?: string;
	nextStep?: string;
	error?: string;
}

interface VerifyResponse {
	message?: string;
	accessToken?: string;
	refreshToken?: string;
	expiresIn?: number;
	user?: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		country: string;
		interests: string[];
	};
	error?: string;
}

type LoginStep = "email" | "otp";

const Login: React.FC = () => {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [formData, setFormData] = useState<LoginFormData>({
		email: "",
		otpCode: "",
	});

	const [currentStep, setCurrentStep] = useState<LoginStep>("email");
	const [session, setSession] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<React.ReactNode>("");
	const [showEmailError, setShowEmailError] = useState(false);

	// API Configuration is now imported from config/api.ts

	const handleInputChange = (field: keyof LoginFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (error) setError("");
		// Reset validation error display when user types in the email field
		if (field === "email") {
			setShowEmailError(false);
		}
	};

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		// Validate email format first
		if (!validateEmail(formData.email)) {
			setError("Please enter a valid email address");
			setShowEmailError(true);
			setLoading(false);
			return;
		}

		try {
			const response = await fetch(getApiUrl(API_ENDPOINTS.auth.login), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email: formData.email }),
			});

			// Try to parse the response, but handle the case where it might not be valid JSON
			let data: LoginResponse;
			try {
				data = await response.json();
			} catch (jsonError) {
			setError("Server error. Please try again later.");
				setLoading(false);
				return;
			}

			if (response.ok && data.challengeName === "EMAIL_OTP") {
				setSession(data.session || "");
				setCurrentStep("otp");
			} else if (
				response.status === 404 ||
				data.error?.toLowerCase().includes("not found")
			) {
				// User not found - suggest sign up
				setError(
					<>
						Account not found.{" "}
						<Link
							to="/signup"
							className="text-primary hover:underline font-medium"
						>
							Sign up
						</Link>{" "}
						to create an account.
					</>
				);
			} else if (response.status === 500) {
				// Handle server error - likely a new email that doesn't exist in the system
				setError(
					<>
						This email is not registered.{" "}
						<Link
							to="/signup"
							className="text-primary hover:underline font-medium"
						>
							Sign up
						</Link>{" "}
						to create an account.
					</>
				);
			} else {
				setError(
					data.error || "Failed to send verification code. Please try again."
				);
			}
		} catch (err) {
			setError("Network error. Please check your connection and try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleOTPSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const response = await fetch(getApiUrl(API_ENDPOINTS.auth.verifyOtp), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: formData.email,
					otpCode: formData.otpCode,
					session: session,
				}),
			});

			const data: VerifyResponse = await response.json();

			if (response.ok && data.accessToken && data.user) {
				// Use AuthContext login function to store tokens and user data
				login(
					{
						accessToken: data.accessToken,
						refreshToken: data.refreshToken || "",
						expiresIn: data.expiresIn || 3600,
					},
					{
						...data.user,
						timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
						createdAt: new Date().toISOString(),
					}
				);
				// Navigation is handled by the login function in AuthContext
			} else {
				setError(data.error || "Invalid verification code. Please try again.");
			}
		} catch (err) {
			setError("Network error. Please check your connection and try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleResendCode = async () => {
		setLoading(true);
		setError("");

		try {
			const response = await fetch(getApiUrl(API_ENDPOINTS.auth.login), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email: formData.email }),
			});

			const data: LoginResponse = await response.json();

			if (response.ok) {
				setSession(data.session || "");
				// Show success message briefly
				setError("");
			} else {
				setError("Failed to resend code. Please try again.");
			}
		} catch (err) {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const resetFlow = () => {
		setCurrentStep("email");
		setFormData({ email: formData.email, otpCode: "" });
		setSession("");
		setError("");
	};

	return (
		<div className="min-h-[70vh]  flex items-center justify-center relative overflow-hidden py-16 md:py-0 pt-23 md:pt-16">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

			<div className="max-w-lg mx-auto px-4 w-full">
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
								<Coffee className="w-4 h-4" />
								<span className="text-sm font-medium">Welcome Back</span>
							</AnimatedGradientText>
						</motion.div>

						<h1 className="text-3xl md:text-4xl font-bold mb-4">
							Sign In to <span className="text-gradient-green">TimeBrew</span>
						</h1>

						<TypingAnimation
							className="text-muted-foreground text-lg"
							duration={50}
						>
							{currentStep === "otp"
								? "Enter the verification code we sent to your email"
								: "Enter your email"}
						</TypingAnimation>
					</div>

					{/* Form Container */}
					<div className="relative group">
						<div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl opacity-60" />

						<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl">
							<BorderBeam size={300} duration={15} delay={3} />

							<AnimatePresence mode="wait">
								{/* Step 1: Email Entry */}
								{currentStep === "email" && (
									<motion.div
										key="email-step"
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -20 }}
										transition={{ duration: 0.3 }}
									>
										<form onSubmit={handleEmailSubmit} className="space-y-6">
											{/* Email Field */}
											<div className="space-y-2">
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
														placeholder="you@anyemail.com"
														required
													/>
													{showEmailError && !validateEmail(formData.email) && (
														<div className="text-xs text-red-500 mt-1 ml-1">
															Please enter a valid email address
														</div>
													)}
												</div>
											</div>

											{/* Submit Button */}
											<ShinyButton
												type="submit"
												disabled={loading || !formData.email}
												className="w-full flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
											>
												{loading ? (
													<>
														<Loader2 className="w-4 h-4 animate-spin" />
														<span>Sending Code...</span>
													</>
												) : (
													<>
														<Send className="w-4 h-4" />
														<span>Send Verification Code</span>
													</>
												)}
											</ShinyButton>
										</form>
									</motion.div>
								)}

								{/* Step 2: OTP Entry */}
								{currentStep === "otp" && (
									<motion.div
										key="otp-step"
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -20 }}
										transition={{ duration: 0.3 }}
									>
										<form onSubmit={handleOTPSubmit} className="space-y-6">
											{/* Back Button */}
											<button
												type="button"
												onClick={resetFlow}
												className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
											>
												<ArrowLeft className="w-4 h-4" />
												<span className="text-sm">Use different email</span>
											</button>

											{/* OTP Info */}
											<div className="text-center mb-6">
												<p className="text-muted-foreground text-sm">
													We sent a 8-digit code to{" "}
													<strong>{formData.email}</strong>
												</p>
											</div>

											{/* OTP Field */}
											<div className="space-y-2">
												<input
													type="text"
													value={formData.otpCode}
													onChange={(e) =>
														handleInputChange(
															"otpCode",
															e.target.value.replace(/\D/g, "").slice(0, 8)
														)
													}
													className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center text-2xl font-mono tracking-widest"
													placeholder="000000"
													maxLength={8}
													autoComplete="one-time-code"
													required
												/>
											</div>

											{/* Resend Code */}
											<div className="text-center">
												<button
													type="button"
													onClick={handleResendCode}
													disabled={loading}
													className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
												>
													Didn't receive the code? Send again
												</button>
											</div>

											{/* Submit Button */}
											<ShinyButton
												disabled={loading || formData.otpCode.length !== 8}
												className="w-full flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
											>
												{loading ? (
													<>
														<Loader2 className="w-4 h-4 animate-spin" />
														<span>Verifying...</span>
													</>
												) : (
													<>
														<Zap className="w-4 h-4" />
														<span>Sign In</span>
													</>
												)}
											</ShinyButton>
										</form>
									</motion.div>
								)}
							</AnimatePresence>

							{/* Error Message */}
							{error && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className="flex items-center space-x-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mt-6"
								>
									<AlertCircle className="w-4 h-4 flex-shrink-0" />
									<span className="text-sm">
										{typeof error === "string" ? error : error}
									</span>
								</motion.div>
							)}
						</div>
					</div>

					{/* Footer */}
					<p className="text-center text-sm text-muted-foreground mt-8">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="text-primary hover:text-primary/80 transition-colors font-medium"
						>
							Sign up for free
						</Link>
					</p>

					{/* Trust Badges */}
					<div className="flex items-center justify-center gap-6 mt-6">
						<div className="flex items-center space-x-2 text-sm text-muted-foreground">
							<Shield className="w-4 h-4 text-primary" />
							<span>Secure & Passwordless</span>
						</div>
						<div className="flex items-center space-x-2 text-sm text-muted-foreground">
							<Coffee className="w-4 h-4 text-accent" />
							<span>Always Fresh</span>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
};

export default Login;
