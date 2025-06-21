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

// Skeleton components for loading state
const SkeletonBrewCard: React.FC<{ index: number }> = ({ index }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
		>
			<Card className="h-full relative group overflow-hidden hover:shadow-md transition-all duration-300 gap-2 p-3">
				<CardHeader className="pb-2 pt-3 px-4">
					<div className="flex justify-between items-start">
						<div>
							<div className="h-6 w-32 bg-muted/60 rounded animate-pulse"></div>
							<div className="mt-1 h-4 w-40 bg-muted/40 rounded animate-pulse"></div>
						</div>
						<div className="px-2 py-0.5 h-5 w-16 bg-muted/60 rounded-full animate-pulse"></div>
					</div>
				</CardHeader>

				<CardContent className="pb-2 px-4">
					<div className="grid grid-cols-2 gap-2">
						<div className="flex flex-col">
							<div className="h-3 w-20 bg-muted/40 rounded animate-pulse mb-1"></div>
							<div className="flex items-center mt-0.5">
								<div className="w-3.5 h-3.5 mr-1 bg-muted/60 rounded-full animate-pulse"></div>
								<div className="h-4 w-16 bg-muted/60 rounded animate-pulse"></div>
							</div>
						</div>

						<div className="flex flex-col items-end text-right">
							<div className="h-3 w-16 bg-muted/40 rounded animate-pulse mb-1 ml-auto"></div>
							<div className="flex items-center mt-0.5">
								<div className="w-3.5 h-3.5 mr-1 bg-muted/60 rounded-full animate-pulse"></div>
								<div className="h-4 w-20 bg-muted/60 rounded animate-pulse"></div>
							</div>
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex justify-between border-t !pt-3 mt-0 px-4">
					<div className="flex items-center">
						<div className="w-3 h-3 mr-1 bg-muted/60 rounded-full animate-pulse"></div>
						<div className="h-3 w-24 bg-muted/40 rounded animate-pulse"></div>
					</div>

					<div className="h-6 w-14 bg-muted/60 rounded animate-pulse"></div>
				</CardFooter>
			</Card>
		</motion.div>
	);
};

// Skeleton for compact row view
const SkeletonBrewCompactRow: React.FC<{ index: number }> = ({ index }) => {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.05 + index * 0.03 }}
		>
			<div className="relative group overflow-hidden bg-card/80 border border-border rounded-lg hover:shadow-md transition-all duration-300">
				<div className="relative p-2.5 flex items-center justify-between">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div className="w-2 h-2 rounded-full bg-muted/60 animate-pulse"></div>

						<div className="flex-1 min-w-0">
							<div className="h-4 w-32 bg-muted/60 rounded animate-pulse mb-1"></div>
							<div className="h-3 w-40 bg-muted/40 rounded animate-pulse"></div>
						</div>
					</div>

					<div className="flex items-center gap-4">
						<div className="hidden md:flex items-center gap-4">
							<div className="flex items-center gap-1">
								<div className="w-3 h-3 bg-muted/60 rounded-full animate-pulse"></div>
								<div className="h-3 w-16 bg-muted/40 rounded animate-pulse"></div>
							</div>

							<div className="flex items-center gap-1">
								<div className="w-3 h-3 bg-muted/60 rounded-full animate-pulse"></div>
								<div className="h-3 w-20 bg-muted/40 rounded animate-pulse"></div>
							</div>
						</div>

						<div className="h-6 w-14 bg-muted/60 rounded animate-pulse"></div>
					</div>
				</div>
			</div>
		</motion.div>
	);
};

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
		<div className="min-h-[70vh] py-3 md:py-0 px-4 mt-12 md:mt-18">
			{/* Header with Controls */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
				className="bg-card/30 rounded-t-xl -mx-4 px-5 pt-7 md:pt-8 py-2.5 mb-0  max-w-7xl mx-auto "
			>
				<div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5">
					{/* Left: Welcome & Title */}
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-bold">
							Hi,{" "}
							<span className="text-gradient-green">
								{user?.firstName || "Brewer"}
							</span>
							!
						</h1>
					</div>

					{/* Center: Search */}
					<div className="relative order-3 md:order-2 w-full md:w-auto md:flex-1 md:max-w-xs md:mx-4">
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Search brews..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-9 pr-3 py-2 h-9 text-sm rounded-lg border border-border bg-card/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
							/>
						</div>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-2 order-2 md:order-3">
						<button
							onClick={toggleViewMode}
							className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors"
							title={
								viewMode === "grid"
									? "Switch to Compact View"
									: "Switch to Grid View"
							}
						>
							{viewMode === "grid" ? (
								<List className="h-4 w-4" />
							) : (
								<LayoutGrid className="h-4 w-4" />
							)}
						</button>

						<ShinyButton
							onClick={fetchBrews}
							className="w-9 h-9 p-0 md:w-auto md:h-auto md:p-2 md:px-3 whitespace-nowrap flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
							title="Refresh Brews"
							disabled={loading}
						>
							{loading ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<RefreshCw className="w-4 h-4" />
							)}
							<span className="hidden md:inline">
								{loading ? "Loading..." : "Refresh"}
							</span>
						</ShinyButton>

						<Link to="/dashboard/create-brew">
							<ShinyButton className="w-9 h-9 p-0 md:w-auto md:h-auto md:p-2 md:px-3 whitespace-nowrap flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
								<Plus className="w-4 h-4" />
								<span className="hidden md:inline">Create</span>
							</ShinyButton>
						</Link>
					</div>
				</div>
			</motion.div>

			<div className="max-w-7xl mx-auto bg-card/30 rounded-b-xl -mx-4 px-4 py-3">
				{/* Brews Content */}
				{loading ? (
					<>
						<div className="mb-6">
							<div className="flex items-center mb-3">
								<div className="h-6 w-28 bg-muted/60 rounded animate-pulse"></div>
								<div className="ml-2 px-2 py-0.5 h-5 w-8 bg-muted/40 rounded-full animate-pulse"></div>
							</div>

							{viewMode === "grid" ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
									{[...Array(4)].map((_, index) => (
										<SkeletonBrewCard key={index} index={index} />
									))}
								</div>
							) : (
								<div className="space-y-2">
									{[...Array(4)].map((_, index) => (
										<SkeletonBrewCompactRow key={index} index={index} />
									))}
								</div>
							)}
						</div>
					</>
				) : error ? (
					<div className="text-center py-6">
						<div className="bg-red-500/10 text-red-500 p-3 rounded-lg inline-flex items-center">
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
						<div className="text-center py-6 border border-dashed border-border rounded-xl bg-card/50">
							<Coffee className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
							<h3 className="text-xl font-semibold mb-2">
								{searchTerm ? "No matching brews found" : "No brews yet"}
							</h3>
							<p className="text-muted-foreground mb-3">
								{searchTerm
									? `Try a different search term or clear your search`
									: `Create your first personalized news brew to get started`}
							</p>
							{!searchTerm && (
								<Link to="/dashboard/create-brew">
									<ShinyButton className="mx-auto flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
										<Plus className="w-4 h-4" />
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
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.3 }}
								className="mb-6"
							>
								<div className="flex items-center mb-3">
									<h3 className="text-lg font-semibold">Active Brews</h3>
									<div className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs">
										{groupedBrews.active.length}
									</div>
								</div>

								{viewMode === "grid" ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
										{groupedBrews.active.map((brew, index) => (
											<BrewCard key={brew.id} brew={brew} index={index} />
										))}
									</div>
								) : (
									<div className="space-y-2">
										{groupedBrews.active.map((brew, index) => (
											<BrewCompactRow key={brew.id} brew={brew} index={index} />
										))}
									</div>
								)}
							</motion.div>
						)}

						{/* Inactive Brews Section */}
						{groupedBrews.inactive.length > 0 && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.3, delay: 0.1 }}
							>
								<div className="flex items-center mb-3">
									<h3 className="text-lg font-semibold">Inactive Brews</h3>
									<div className="ml-2 px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 text-xs">
										{groupedBrews.inactive.length}
									</div>
								</div>

								{viewMode === "grid" ? (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
										{groupedBrews.inactive.map((brew, index) => (
											<BrewCard key={brew.id} brew={brew} index={index} />
										))}
									</div>
								) : (
									<div className="space-y-2">
										{groupedBrews.inactive.map((brew, index) => (
											<BrewCompactRow key={brew.id} brew={brew} index={index} />
										))}
									</div>
								)}
							</motion.div>
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
			<Card className="h-full relative group overflow-hidden hover:shadow-md transition-all duration-300 gap-2 p-3">
				{/* <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div> */}

				<CardHeader className="pb-2 pt-3  px-4">
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

				<CardContent className="pb-2 px-4">
					<div className="grid grid-cols-2 gap-2">
						<div className="flex flex-col">
							<span className="text-xs text-muted-foreground">
								Delivery Time
							</span>
							<div className="flex items-center mt-0.5">
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

						<div className="flex flex-col items-end text-right">
							<span className="text-xs text-muted-foreground">Briefings</span>
							<div className="flex items-center mt-0.5">
								<Newspaper className="w-3.5 h-3.5 mr-1 text-primary" />
								<span className="text-sm">{brew.briefings_sent || 0} sent</span>
							</div>
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex justify-between border-t !pt-3 mt-0  px-4">
					<div className="flex items-center text-xs text-muted-foreground">
						<Calendar className="w-3 h-3 mr-1" />
						{brew.created_at && (
							<>
								{console.log(
									`Brew "${brew.name}" created_at:`,
									brew.created_at
								)}
								{console.log(
									`Brew "${brew.name}" created_at as Date:`,
									new Date(brew.created_at)
								)}
								{(() => {
									// Parse the ISO string with timezone information
									const createdDate = new Date(brew.created_at);
									const now = new Date();

									// Check if the date is invalid, in the future, or more than a year ahead
									if (
										isNaN(createdDate.getTime()) ||
										createdDate > now ||
										createdDate.getFullYear() > now.getFullYear() + 1
									) {
										console.log(
											`Detected invalid or future date for brew "${brew.name}", displaying "just now" instead`
										);
										return <span>just now</span>;
									} else {
										// formatDistanceToNow will use the browser's timezone for calculation
										return <span>{formatDistanceToNow(createdDate)} ago</span>;
									}
								})()}
							</>
						)}
					</div>

					<Link to={`/dashboard/brew/${brew.id}`}>
						<ShinyButton className="text-xs px-2.5 py-0.5 flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
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

				<div className="relative p-2.5 flex items-center justify-between">
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div
							className={`w-2 h-2 rounded-full ${
								brew.is_active ? "bg-green-500" : "bg-gray-400"
							}`}
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
									{parseInt(brew.delivery_time.split(":")[0]) >= 12
										? " PM"
										: " AM"}
								</span>
							</div>

							<div className="flex items-center gap-1">
								<Newspaper className="w-3 h-3 text-muted-foreground" />
								<span className="text-xs">{brew.briefings_sent || 0} briefings</span>
							</div>
						</div>

						<Link
							to={`/dashboard/brew/${brew.id}`}
							className="flex items-center"
						>
							<ShinyButton className="text-xs px-2.5 py-0.5 flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
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

// {/* Collapsible Info Section */}
// <motion.div
// initial={{ opacity: 0, height: 0 }}
// animate={{ opacity: 1, height: "auto" }}
// transition={{ duration: 0.3 }}
// className="mb-4 overflow-hidden"
// >
// <details className="group relative bg-card/80 backdrop-blur-xl border border-border rounded-xl shadow-sm">
//   <summary className="flex cursor-pointer list-none items-center justify-between p-4">
//     <div>
//       <h2 className="text-lg font-semibold">Your Personalized Brews</h2>
//       <p className="text-xs text-muted-foreground">Manage your daily news brews and customize your reading experience</p>
//     </div>
//     <div className="flex items-center gap-2">
//       <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
//         <Coffee className="w-3 h-3" />
//         <span className="hidden sm:inline">Personalized</span>
//       </div>
//       <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-full text-xs">
//         <Sparkles className="w-3 h-3" />
//         <span className="hidden sm:inline">AI Curation</span>
//       </div>
//       <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-xs">
//         <Clock className="w-3 h-3" />
//         <span className="hidden sm:inline">Scheduled</span>
//       </div>
//       <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
//     </div>
//   </summary>
//   <div className="p-4 pt-0 border-t border-border/50">
//     <p className="text-sm text-muted-foreground">
//       TimeBrew delivers personalized news articles based on your interests.
//       Create multiple brews with different topics and delivery times to stay informed
//       about what matters to you.
//     </p>
//   </div>
// </details>
// </motion.div>
