import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
	Coffee,
	Settings,
	Sparkles,
	Clock,
	Plus,
	Newspaper,
	Calendar,
	RefreshCw,
	Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
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
import { apiClient, Brew } from "@/lib/apiClient";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";

const Dashboard: React.FC = () => {
	const { user } = useAuth();
	const [brews, setBrews] = useState<Brew[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchBrews = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await apiClient.getBrews();
			setBrews(response.brews);
		} catch (err) {
			console.error("Error fetching brews:", err);
			setError("Failed to load your brews. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBrews();
	}, []);

	return (
		<div className="min-h-screen py-16 md:py-0 pt-23 md:pt-32 px-4">
			<div className="max-w-6xl mx-auto">
				{/* Welcome Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-12 text-center"
				>
					<AnimatedGradientText className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm text-primary mb-6">
						<Coffee className="w-4 h-4" />
						<span className="text-sm font-medium">Dashboard</span>
					</AnimatedGradientText>

					<h1 className="text-4xl md:text-5xl font-bold mb-4">
						Welcome back,{" "}
						<span className="text-gradient-green">
							{user?.firstName || "Brewer"}
						</span>
						!
					</h1>
					<p className="text-xl text-muted-foreground">
						Your personalized news dashboard is brewing...
					</p>
				</motion.div>

				{/* Dashboard Content */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
					{/* Actions Card */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="md:col-span-3 relative group"
					>
						<div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-75"></div>

						<div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-xl p-8 shadow-xl">
							<BorderBeam />

							<div className="flex flex-col md:flex-row items-center justify-between gap-6">
								<div>
									<h2 className="text-2xl font-bold mb-2">
										Your Personalized Brews
									</h2>
									<p className="text-muted-foreground mb-4">
										Manage your daily news brews and customize your reading
										experience.
									</p>

									<div className="flex flex-wrap gap-3">
										<div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm">
											<Coffee className="w-4 h-4" />
											<span>Personalized Brews</span>
										</div>
										<div className="flex items-center gap-2 bg-purple-500/10 text-purple-500 px-3 py-1.5 rounded-full text-sm">
											<Sparkles className="w-4 h-4" />
											<span>AI Curation</span>
										</div>
										<div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-full text-sm">
											<Clock className="w-4 h-4" />
											<span>Scheduled Delivery</span>
										</div>
									</div>
								</div>

								<div className="flex flex-col sm:flex-row gap-3">
									<Link to="/dashboard/create-brew">
										<ShinyButton className="whitespace-nowrap flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
											<Plus className="w-4 h-4" />
											<span>Create Brew</span>
										</ShinyButton>
									</Link>

									<ShinyButton
										onClick={fetchBrews}
										className="whitespace-nowrap flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
									>
										{loading ? (
											<>
												<Loader2 className="w-4 h-4 animate-spin" />
												<span>Loading...</span>
											</>
										) : (
											<>
												<RefreshCw className="w-4 h-4" />
												<span>Refresh Brews</span>
											</>
										)}
									</ShinyButton>
								</div>
							</div>
						</div>
					</motion.div>

					{/* Brews Grid */}
					{loading && brews.length === 0 ? (
						<div className="md:col-span-3 flex justify-center items-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
							<span className="text-lg">Loading your brews...</span>
						</div>
					) : error ? (
						<div className="md:col-span-3 text-center py-12">
							<div className="bg-red-500/10 text-red-500 p-4 rounded-lg inline-flex items-center">
								<span>{error}</span>
								<button onClick={fetchBrews} className="ml-2 underline">
									Try again
								</button>
							</div>
						</div>
					) : brews.length === 0 ? (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="md:col-span-3 relative group"
						>
							<div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/50">
								<Coffee className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
								<h3 className="text-xl font-semibold mb-2">No brews yet</h3>
								<p className="text-muted-foreground mb-6">
									Create your first personalized news brew to get started
								</p>
								<Link to="/dashboard/create-brew">
									<ShinyButton className="mx-auto">
										<Plus className="w-4 h-4 mr-2" />
										Create Your First Brew
									</ShinyButton>
								</Link>
							</div>
						</motion.div>
					) : (
						<>
							{brews.map((brew, index) => (
								<motion.div
									key={brew.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
								>
									<Card className="h-full relative group overflow-hidden">
										<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

										<CardHeader>
											<div className="flex justify-between items-start">
												<div>
													<CardTitle className="text-xl">{brew.name}</CardTitle>
													<CardDescription className="mt-1">
														{brew.topics.join(", ")}
													</CardDescription>
												</div>
												<div
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														brew.is_active
															? "bg-green-500/10 text-green-500"
															: "bg-gray-500/10 text-gray-500"
													}`}
												>
													{brew.is_active ? "Active" : "Inactive"}
												</div>
											</div>
										</CardHeader>

										<CardContent>
											<div className="grid grid-cols-2 gap-4">
												<div className="flex flex-col">
													<span className="text-xs text-muted-foreground">
														Delivery Time
													</span>
													<div className="flex items-center mt-1">
														<Clock className="w-4 h-4 mr-1 text-primary" />
														<span>
															{brew.delivery_time.split(":")[0]}:
															{brew.delivery_time.split(":")[1]}
															{parseInt(brew.delivery_time.split(":")[0]) >= 12
																? " PM"
																: " AM"}
														</span>
													</div>
												</div>

												<div className="flex flex-col">
													<span className="text-xs text-muted-foreground">
														Articles
													</span>
													<div className="flex items-center mt-1">
														<Newspaper className="w-4 h-4 mr-1 text-primary" />
														<span>{brew.article_count} per day</span>
													</div>
												</div>
											</div>
										</CardContent>

										<CardFooter className="flex justify-between border-t">
											<div className="flex items-center text-xs text-muted-foreground">
												<Calendar className="w-3 h-3 mr-1" />
												{brew.created_at && (
													<span>
														Created{" "}
														{formatDistanceToNow(new Date(brew.created_at))} ago
													</span>
												)}
											</div>

											<Link to={`/dashboard/brew/${brew.id}`}>
												<ShinyButton className="text-xs px-3 py-1">
													View Details
												</ShinyButton>
											</Link>
										</CardFooter>
									</Card>
								</motion.div>
							))}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
