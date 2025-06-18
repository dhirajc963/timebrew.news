import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, Brew } from "@/lib/apiClient";
import {
	Coffee,
	Clock,
	Calendar,
	Newspaper,
	ChevronLeft,
	Loader2,
	Settings,
	RefreshCw,
	Check,
	Tag,
	Plus,
} from "lucide-react";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShinyButton } from "@/components/magicui/shiny-button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

const BrewDetails: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const [brew, setBrew] = useState<Brew | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchBrew = async () => {
		setLoading(true);
		setError(null);
		try {
			if (!id) throw new Error("Brew ID is required");
			const response = await apiClient.getBrew(id);
			// The API now returns the brew object directly
			setBrew(response);
		} catch (err) {
			console.error("Error fetching brew:", err);
			setError("Failed to load brew details. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBrew();
	}, [id]);

	// Format delivery time to 12-hour format
	const formatDeliveryTime = (time: string) => {
		const [hours, minutes] = time.split(":");
		const hour = parseInt(hours);
		const period = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${period}`;
	};

	return (
		<div className="min-h-screen py-16 md:py-0 pt-23 md:pt-32 px-4">
			<div className="max-w-4xl mx-auto">
				{/* Back Button */}
				<Link
					to="/dashboard"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
				>
					<ChevronLeft className="w-4 h-4 mr-1" />
					Back to Dashboard
				</Link>

				{loading ? (
					<div className="flex justify-center items-center py-12">
						<Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
						<span className="text-lg">Loading brew details...</span>
					</div>
				) : error ? (
					<div className="text-center py-12">
						<div className="bg-red-500/10 text-red-500 p-4 rounded-lg inline-flex items-center">
							<span>{error}</span>
							<button onClick={fetchBrew} className="ml-2 underline">
								Try again
							</button>
						</div>
					</div>
				) : brew ? (
					<>
						{/* Brew Header */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							className="mb-8"
						>
							<AnimatedGradientText className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm text-primary mb-6">
								<Coffee className="w-4 h-4" />
								<span className="text-sm font-medium">Brew Details</span>
							</AnimatedGradientText>

							<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
								<div>
									<h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
										<span className="text-gradient-green">{brew.name}</span>
										<div
											className={`px-3 py-1 rounded-full text-sm font-medium ${
												brew.is_active
													? "bg-green-500/10 text-green-500"
													: "bg-gray-500/10 text-gray-500"
											}`}
										>
											{brew.is_active ? "Active" : "Inactive"}
										</div>
									</h1>
									<p className="text-lg text-muted-foreground">
										Your personalized news brew is ready!
									</p>
								</div>

								<div className="flex gap-3">
									<ShinyButton
										onClick={fetchBrew}
										className="whitespace-nowrap flex items-center justify-center gap-2"
									>
										<RefreshCw className="w-4 h-4" />
										<span>Refresh</span>
									</ShinyButton>

									<ShinyButton className="whitespace-nowrap flex items-center justify-center gap-2">
										<Settings className="w-4 h-4" />
										<span>Edit Brew</span>
									</ShinyButton>
								</div>
							</div>
						</motion.div>

						{/* Brew Details Card */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
							className="relative group mb-8"
						>
							<div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-75"></div>

							<Card className="relative overflow-hidden">
								<BorderBeam />

								<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>

								<CardHeader>
									<div className="flex items-center gap-3 mb-2">
										<div className="bg-primary/20 p-3 rounded-full">
											<Check className="w-6 h-6 text-primary" />
										</div>
										<CardTitle className="text-2xl">
											Your <span className="text-primary">{brew.name}</span>{" "}
											Brew is Ready!
										</CardTitle>
									</div>
									<CardDescription className="text-base">
										We'll deliver it daily at{" "}
										<span className="text-primary font-medium">
											{brew.delivery_time
												? formatDeliveryTime(brew.delivery_time)
												: "--:--"}
										</span>
									</CardDescription>
								</CardHeader>

								<CardContent>
									<div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-6">
										<div className="flex items-center justify-between mb-6">
											<div className="flex items-center gap-2">
												<Coffee className="w-5 h-5 text-primary" />
												<span className="font-medium">Brew Details</span>
											</div>
											<div className="bg-primary/20 text-primary text-sm px-3 py-1 rounded-full">
												{brew.article_count || 0} articles
											</div>
										</div>

										<div className="space-y-6">
											<div>
												<div className="text-sm text-muted-foreground mb-2">
													Topics
												</div>
												<div className="flex flex-wrap gap-2">
													{brew.topics && brew.topics.length > 0 ? (
														brew.topics.map((topic, index) => (
															<div
																key={index}
																className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm"
															>
																<Tag className="w-3 h-3" />
																<span>{topic}</span>
															</div>
														))
													) : (
														<div className="text-muted-foreground text-sm">
															No topics specified
														</div>
													)}
												</div>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div className="bg-background/50 p-4 rounded-lg border border-border">
													<div className="flex items-center gap-2 mb-2">
														<Clock className="w-4 h-4 text-primary" />
														<span className="font-medium">Delivery Time</span>
													</div>
													<p className="text-xl font-semibold text-primary">
														{brew.delivery_time
															? formatDeliveryTime(brew.delivery_time)
															: "--:--"}
													</p>
													<p className="text-sm text-muted-foreground mt-1">
														Delivered to your inbox daily
													</p>
												</div>

												<div className="bg-background/50 p-4 rounded-lg border border-border">
													<div className="flex items-center gap-2 mb-2">
														<Newspaper className="w-4 h-4 text-primary" />
														<span className="font-medium">Articles</span>
													</div>
													<p className="text-xl font-semibold text-primary">
														{brew.article_count || 0} per day
													</p>
													<p className="text-sm text-muted-foreground mt-1">
														Personalized to your interests
													</p>
												</div>
											</div>
										</div>
									</div>

									<div className="bg-accent/5 border border-accent/10 rounded-xl p-6">
										<h3 className="text-lg font-medium mb-4 flex items-center gap-2">
											<Calendar className="w-5 h-5 text-accent" />
											Next Delivery
										</h3>

										<div className="bg-background/50 p-4 rounded-lg border border-border">
											<p className="text-sm text-muted-foreground mb-2">
												Your next brew will be delivered:
											</p>
											<p className="text-xl font-semibold">
												Today at{" "}
												<span className="text-accent">
													{brew.delivery_time
														? formatDeliveryTime(brew.delivery_time)
														: "--:--"}
												</span>
											</p>
										</div>
									</div>
								</CardContent>

								<CardFooter className="flex justify-between border-t">
									<div className="flex items-center text-sm text-muted-foreground">
										<Calendar className="w-4 h-4 mr-1" />
										{brew.created_at && (
											<span>
												Created {formatDistanceToNow(new Date(brew.created_at))}{" "}
												ago
											</span>
										)}
									</div>

									<ShinyButton className="px-4 py-2">
										View Latest Articles
									</ShinyButton>
								</CardFooter>
							</Card>
						</motion.div>

						{/* Create Another Brew Button */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="text-center"
						>
							<Link to="/dashboard/create-brew">
								<ShinyButton className="mx-auto flex items-center justify-center gap-2">
									<Plus className="w-4 h-4" />
									CREATE ANOTHER BREW
								</ShinyButton>
							</Link>
						</motion.div>
					</>
				) : (
					<div className="text-center py-12">
						<div className="bg-amber-500/10 text-amber-500 p-4 rounded-lg inline-flex items-center">
							<span>Brew not found. Please check the URL and try again.</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default BrewDetails;
