import React, { useState, useEffect, useMemo } from "react";
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
	Eye,
	EyeOff,
	LayoutGrid,
	List,
	Search,
	ChevronRight,
	MoreHorizontal,
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
	const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
	const [searchTerm, setSearchTerm] = useState("");

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

	// Filter brews based on search term
	const filteredBrews = useMemo(() => {
		if (!searchTerm.trim()) return brews;
		const term = searchTerm.toLowerCase();
		return brews.filter(
			(brew) =>
				brew.name.toLowerCase().includes(term) ||
				brew.topics.some((topic) => topic.toLowerCase().includes(term))
		);
	}, [brews, searchTerm]);

	// Group brews by active status
	const groupedBrews = useMemo(() => {
		const active = filteredBrews.filter((brew) => brew.is_active);
		const inactive = filteredBrews.filter((brew) => !brew.is_active);
		return { active, inactive };
	}, [filteredBrews]);

	// Toggle view mode between grid and compact
	const toggleViewMode = () => {
		setViewMode((prev) => (prev === "grid" ? "compact" : "grid"));
	};

	return (
		<div className="min-h-screen py-8 md:py-0 pt-16 md:pt-24 px-4">
			<div className="max-w-7xl mx-auto">
				{/* Welcome Header - More compact */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between"
				>
					<div className="text-center md:text-left mb-4 md:mb-0">
						<AnimatedGradientText className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-primary/50 bg-primary/20 backdrop-blur-sm text-primary mb-3">
							<Coffee className="w-3.5 h-3.5" />
							<span className="text-xs font-medium">Dashboard</span>
						</AnimatedGradientText>

						<h1 className="text-3xl md:text-4xl font-bold mb-2">
							Welcome back,{" "}
							<span className="text-gradient-green">
								{user?.firstName || "Brewer"}
							</span>
							!
						</h1>
						<p className="text-sm md:text-base text-muted-foreground">
							Your personalized news dashboard is brewing...
						</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-end">
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
									<span>Refresh</span>
								</>
							)}
						</ShinyButton>
					</div>
				</motion.div>

				{/* Dashboard Controls */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="mb-6 relative group"
				>
					<div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl blur-lg opacity-75"></div>

					<div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-xl p-4 md:p-6 shadow-lg">
						<BorderBeam />

						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div>
								<h2 className="text-xl font-bold mb-2">
									Your Personalized Brews
								</h2>
								<p className="text-sm text-muted-foreground mb-3">
									Manage your daily news brews and customize your reading experience.
								</p>

								<div className="flex flex-wrap gap-2">
									<div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs">
										<Coffee className="w-3.5 h-3.5" />
										<span>Personalized Brews</span>
									</div>
									<div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-500 px-2.5 py-1 rounded-full text-xs">
										<Sparkles className="w-3.5 h-3.5" />
										<span>AI Curation</span>
									</div>
									<div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-xs">
										<Clock className="w-3.5 h-3.5" />
										<span>Scheduled Delivery</span>
									</div>
								</div>
							</div>

							<div className="flex flex-col md:flex-row gap-3 mt-3 md:mt-0">
								{/* Search Input */}
								<div className="relative">
									<input
										type="text"
										placeholder="Search brews..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="w-full md:w-64 px-3 py-2 rounded-lg border border-border bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
									/>
								</div>

								{/* View Toggle */}
								<button
									onClick={toggleViewMode}
									className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors"
								>
									<span className="text-sm">
										{viewMode === "grid" ? "Compact View" : "Grid View"}
									</span>
								</button>
							</div>
						</div>
					</div>
				</motion.div>

				{/* Brews Content */}
				{loading && filteredBrews.length === 0 ? (
					<div className="flex justify-center items-center py-12">
						<Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
						<span className="text-lg">Loading your brews...</span>
					</div>
				) : error ? (
					<div className="text-center py-12">
						<div className="bg-red-500/10 text-red-500 p-4 rounded-lg inline-flex items-center">
							<span>{error}</span>
							<button onClick={fetchBrews} className="ml-2 underline">
								Try again
							</button>
						</div>
					</div>
				) : filteredBrews.length === 0 ? (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						className="relative group"
					>
						<div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
							<Coffee className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
							<h3 className="text-xl font-semibold mb-2">
								{searchTerm ? "No matching brews found" : "No brews yet"}
							</h3>
							<p className="text-muted-foreground mb-6">
								{searchTerm
									? `Try a different search term or clear your search`
									: `Create your first personalized news brew to get started`}
							</p>
							{!searchTerm && (
								<Link to="/dashboard/create-brew">
									<ShinyButton className="mx-auto">
										<Plus className="w-4 h-4 mr-2" />
										Create Your First Brew
									</ShinyButton>
								</Link>
							)}
							{searchTerm && (
								<button
									onClick={() => setSearchTerm("")}
									className="text-primary underline"
								>
									Clear search
								</button>
							)}
						</div>
					</motion.div>
				) : (
					<>
						{/* Active Brews Section */}
						{groupedBrews.active.length > 0 && (
							<div className="mb-8">
								<div className="flex items-center mb-4">
									<h3 className="text-lg font-semibold">Active Brews</h3>
									<div className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs">
										{groupedBrews.active.length}
									</div>
								</div>

								{viewMode === "grid" ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
										{groupedBrews.active.map((brew, index) => (
											<BrewCard key={brew.id} brew={brew} index={index} />
										))}
									</div>
								) : (
									<div className="space-y-3">
										{groupedBrews.active.map((brew, index) => (
											<BrewCompactRow key={brew.id} brew={brew} index={index} />
										))}
									</div>
								)}
							</div>
						)}

						{/* Inactive Brews Section */}
						{groupedBrews.inactive.length > 0 && (
							<div>
								<div className="flex items-center mb-4">
									<h3 className="text-lg font-semibold">Inactive Brews</h3>
									<div className="ml-2 px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 text-xs">
										{groupedBrews.inactive.length}
									</div>
								</div>

								{viewMode === "grid" ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
										{groupedBrews.inactive.map((brew, index) => (
											<BrewCard key={brew.id} brew={brew} index={index} />
										))}
									</div>
								) : (
									<div className="space-y-3">
										{groupedBrews.inactive.map((brew, index) => (
											<BrewCompactRow key={brew.id} brew={brew} index={index} />
										))}
									</div>
								)}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

// Brew Card Component for Grid View
interface BrewCardProps {
	brew: Brew;
	index: number;
}

const BrewCard: React.FC<BrewCardProps> = ({ brew, index }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
		>
			<Card className="h-full relative group overflow-hidden hover:shadow-md transition-all duration-300">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

				<CardHeader className="pb-3">
					<div className="flex justify-between items-start">
						<div>
							<CardTitle className="text-lg">{brew.name}</CardTitle>
							<CardDescription className="mt-1 line-clamp-1">
								{brew.topics.join(", ")}
							</CardDescription>
						</div>
						<div
							className={`px-2 py-0.5 rounded-full text-xs font-medium ${
								brew.is_active
									? "bg-green-500/10 text-green-500"
									: "bg-gray-500/10 text-gray-500"
							}`}
						>
							{brew.is_active ? "Active" : "Inactive"}
						</div>
					</div>
				</CardHeader>

				<CardContent className="pb-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col">
							<span className="text-xs text-muted-foreground">
								Delivery Time
							</span>
							<div className="flex items-center mt-1">
								<Clock className="w-3.5 h-3.5 mr-1 text-primary" />
								<span className="text-sm">
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
								<Newspaper className="w-3.5 h-3.5 mr-1 text-primary" />
								<span className="text-sm">{brew.article_count} per day</span>
							</div>
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex justify-between border-t pt-3">
					<div className="flex items-center text-xs text-muted-foreground">
						<Calendar className="w-3 h-3 mr-1" />
						{brew.created_at && (
							<span>
								{formatDistanceToNow(new Date(brew.created_at))} ago
							</span>
						)}
					</div>

					<Link to={`/dashboard/brew/${brew.id}`}>
						<ShinyButton className="text-xs px-2.5 py-0.5">
							View
						</ShinyButton>
					</Link>
				</CardFooter>
			</Card>
		</motion.div>
	);
};

// Brew Compact Row Component for Compact View
const BrewCompactRow: React.FC<BrewCardProps> = ({ brew, index }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.05 + index * 0.03 }}
		>
			<div className="relative group overflow-hidden bg-card/80 border border-border rounded-lg hover:shadow-md transition-all duration-300">
				<div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
				
				<div className="relative p-3 flex items-center justify-between">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div
							className={`w-2 h-2 rounded-full ${brew.is_active ? "bg-green-500" : "bg-gray-400"}`}
						></div>
						
						<div className="flex-1 min-w-0">
							<h3 className="font-medium text-sm truncate">{brew.name}</h3>
							<p className="text-xs text-muted-foreground truncate">
								{brew.topics.join(", ")}
							</p>
						</div>
					</div>
					
					<div className="flex items-center gap-4">
						<div className="hidden md:flex items-center gap-4">
							<div className="flex items-center gap-1">
								<Clock className="w-3 h-3 text-muted-foreground" />
								<span className="text-xs">
									{brew.delivery_time.split(":")[0]}:
									{brew.delivery_time.split(":")[1]}
									{parseInt(brew.delivery_time.split(":")[0]) >= 12 ? " PM" : " AM"}
								</span>
							</div>
							
							<div className="flex items-center gap-1">
								<Newspaper className="w-3 h-3 text-muted-foreground" />
								<span className="text-xs">{brew.article_count} articles</span>
							</div>
						</div>
						
						<Link to={`/dashboard/brew/${brew.id}`} className="flex items-center">
							<ShinyButton className="text-xs px-2.5 py-0.5 flex items-center gap-1">
								<span>View</span>
								<ChevronRight className="w-3 h-3" />
							</ShinyButton>
						</Link>
					</div>
				</div>
			</div>
		</motion.div>
	);
};

export default Dashboard;
