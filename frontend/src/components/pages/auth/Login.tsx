import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	Coffee,
	Mail,
	Lock,
	Eye,
	EyeOff,
	Loader2,
	ArrowRight,
	AlertCircle,
	Sparkles,
	Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { TypingAnimation } from "@/components/magicui/typing-animation";

// Types
interface LoginFormData {
	email: string;
	password: string;
}

interface LoginResponse {
	accessToken?: string;
	refreshToken?: string;
	expiresIn?: number;
	user?: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
	};
	error?: string;
	message?: string;
}

const Login: React.FC = () => {
	const navigate = useNavigate();
	const [formData, setFormData] = useState<LoginFormData>({
		email: "",
		password: "",
	});

	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	// API Configuration
	const API_BASE_URL =
		"https://your-api-id.execute-api.us-east-1.amazonaws.com/dev";

	const handleInputChange = (field: keyof LoginFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (error) setError("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			const response = await fetch(`${API_BASE_URL}/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data: LoginResponse = await response.json();

			if (response.ok && data.accessToken) {
				// Store tokens in localStorage (you might want to use a more secure method)
				localStorage.setItem("accessToken", data.accessToken);
				localStorage.setItem("refreshToken", data.refreshToken || "");
				localStorage.setItem("user", JSON.stringify(data.user));

				// Redirect to dashboard
				navigate("/dashboard");
			} else {
				setError(data.error || "Login failed. Please check your credentials.");
			}
		} catch (err) {
			setError("Network error. Please check your connection and try again.");
		} finally {
			setLoading(false);
		}
	};

	const isFormValid = formData.email && formData.password;

	return (
		<div className="min-h-screen flex items-center justify-center relative overflow-hidden py-16">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

			<div className="max-w-md mx-auto px-4 w-full">
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
							Access your personalized news brews and manage your preferences
						</TypingAnimation>
					</div>

					{/* Form Container */}
					<div className="relative group">
						<div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-2xl opacity-60" />

						<div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-3xl p-8 shadow-2xl">
							<BorderBeam size={300} duration={15} delay={3} />

							<form onSubmit={handleSubmit} className="space-y-6">
								{/* Email Field */}
								<div className="space-y-2">
									<label className="text-sm font-medium">Email Address</label>
									<div className="relative">
										<Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
										<input
											type="email"
											value={formData.email}
											onChange={(e) =>
												handleInputChange("email", e.target.value)
											}
											className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
											placeholder="Enter your email"
											required
										/>
									</div>
								</div>

								{/* Password Field */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium">Password</label>
										<button
											type="button"
											className="text-sm text-primary hover:text-primary/80 transition-colors"
										>
											Forgot password?
										</button>
									</div>
									<div className="relative">
										<Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
										<input
											type={showPassword ? "text" : "password"}
											value={formData.password}
											onChange={(e) =>
												handleInputChange("password", e.target.value)
											}
											className="w-full pl-10 pr-12 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
											placeholder="Enter your password"
											required
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
										>
											{showPassword ? (
												<EyeOff className="w-4 h-4" />
											) : (
												<Eye className="w-4 h-4" />
											)}
										</button>
									</div>
								</div>

								{/* Remember Me */}
								<div className="flex items-center space-x-2">
									<input
										type="checkbox"
										id="remember"
										className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary/50"
									/>
									<label
										htmlFor="remember"
										className="text-sm text-muted-foreground"
									>
										Remember me for 30 days
									</label>
								</div>

								{/* Error Message */}
								{error && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										className="flex items-center space-x-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-3"
									>
										<AlertCircle className="w-4 h-4 flex-shrink-0" />
										<span className="text-sm">{error}</span>
									</motion.div>
								)}

								{/* Submit Button */}
								<ShinyButton
									// type="submit"
									// disabled={loading || !isFormValid}
									className="w-full [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
								>
									{loading ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											<span>Signing In...</span>
										</>
									) : (
										<>
											<Zap className="w-4 h-4" />
											<span>Sign In</span>
										</>
									)}
								</ShinyButton>

								{/* Divider */}
								<div className="relative">
									<div className="absolute inset-0 flex items-center">
										<div className="w-full border-t border-border" />
									</div>
									<div className="relative flex justify-center text-sm">
										<span className="px-2 bg-card text-muted-foreground">
											Or continue with
										</span>
									</div>
								</div>

								{/* Social Login Buttons */}
								<div className="grid grid-cols-2 gap-3">
									<button
										type="button"
										className="flex items-center justify-center px-4 py-3 border border-border rounded-xl bg-background/50 hover:bg-background transition-all duration-200"
									>
										<svg className="w-5 h-5" viewBox="0 0 24 24">
											<path
												fill="currentColor"
												d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
											/>
											<path
												fill="currentColor"
												d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
											/>
											<path
												fill="currentColor"
												d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
											/>
											<path
												fill="currentColor"
												d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
											/>
										</svg>
										<span className="ml-2 text-sm font-medium">Google</span>
									</button>

									<button
										type="button"
										className="flex items-center justify-center px-4 py-3 border border-border rounded-xl bg-background/50 hover:bg-background transition-all duration-200"
									>
										<svg
											className="w-5 h-5"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
										</svg>
										<span className="ml-2 text-sm font-medium">Facebook</span>
									</button>
								</div>
							</form>
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
							<Sparkles className="w-4 h-4 text-primary" />
							<span>Secure Login</span>
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
