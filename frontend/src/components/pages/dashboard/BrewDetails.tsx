import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
	ArrowLeft,
	Clock,
	Newspaper,
	Calendar,
	RefreshCw,
	Settings,
	Edit,
	Loader2,
	AlertCircle,
	ThumbsUp,
	ThumbsDown,
	Mail,
	Eye,
	MousePointer,
	ChevronDown,
	ChevronUp,
	Star,
	MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShinyButton } from "@/components/magicui/shiny-button";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, Brew, Briefing } from "@/lib/apiClient";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { format } from "date-fns";
import BriefingCard from "./BriefingCard";

// Skeleton Components
const BrewHeaderSkeleton: React.FC = () => (
	<motion.div
		initial={{ opacity: 0, y: -10 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.3 }}
		className="bg-card/30 rounded-t-xl -mx-4 px-5 pt-7 md:pt-8 py-2.5 mb-0 max-w-7xl mx-auto"
	>
		<div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5">
			<div className="flex items-center gap-3">
				<Link
					to="/dashboard"
					className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Dashboard
				</Link>
			</div>
			<div className="flex items-center gap-2">
				<Skeleton className="h-6 w-32" />
				<Skeleton className="h-5 w-16 rounded-full" />
			</div>
			<div className="flex items-center gap-2">
				<Skeleton className="h-9 w-9 md:w-20 md:h-9 rounded-md" />
			</div>
		</div>
	</motion.div>
);

const BrewDetailsSkeleton: React.FC = () => (
	<motion.div
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.5 }}
		className="space-y-6"
	>
		{/* Brew Summary Card Skeleton */}
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Skeleton className="w-5 h-5 rounded" />
						<Skeleton className="h-6 w-32" />
					</div>
					<Skeleton className="h-9 w-16 rounded-md" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="flex items-center gap-2">
							<Skeleton className="w-4 h-4 rounded" />
							<div>
								<Skeleton className="h-4 w-20 mb-1" />
								<Skeleton className="h-3 w-16" />
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>

		{/* Briefings List Skeleton */}
		<div className="space-y-3 sm:space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
				<Skeleton className="h-6 w-40" />
			</div>
			{[...Array(3)].map((_, i) => (
				<BriefingSkeleton key={i} index={i} />
			))}
		</div>
	</motion.div>
);

const BriefingSkeleton: React.FC<{ index: number }> = ({ index }) => (
	<motion.div
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
	>
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<Skeleton className="w-4 h-4 rounded" />
							<Skeleton className="h-4 w-24" />
						</div>
						<Skeleton className="h-6 w-3/4 mb-2" />
						<Skeleton className="h-4 w-1/2" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="w-8 h-8 rounded" />
						<Skeleton className="w-8 h-8 rounded" />
						<Skeleton className="w-8 h-8 rounded" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	</motion.div>
);

const BrewDetails: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const { user } = useAuth();
	const [brew, setBrew] = useState<Brew | null>(null);
	const [briefings, setBriefings] = useState<Briefing[]>([]);
	const [loading, setLoading] = useState(true);
	const [briefingsLoading, setBriefingsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expandedBriefings, setExpandedBriefings] = useState<Set<string>>(
		new Set()
	);
	const [feedbackLoading, setFeedbackLoading] = useState<Set<string>>(
		new Set()
	);

	const fetchBrew = async () => {
		if (!id) {
			setError("No brew ID provided");
			setLoading(false);
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const response = await apiClient.getBrew(id);
			setBrew(response.brew);
		} catch (err) {
			setError("Failed to load brew details. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const fetchBriefings = async () => {
		if (!id || !user?.id) return;

		setBriefingsLoading(true);
		try {
			const response = await apiClient.getBriefings(id, 20, 0, user.id);
			setBriefings(response.briefings);
		} catch (err) {
			// Don't set error state for briefings, just handle silently
		} finally {
			setBriefingsLoading(false);
		}
	};

	useEffect(() => {
		if (id) {
			fetchBrew();
		}
	}, [id]);

	useEffect(() => {
		if (id && user?.id) {
			fetchBriefings();
		}
	}, [id, user?.id]);

	const toggleBriefingExpansion = (briefingId: string) => {
		setExpandedBriefings((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(briefingId)) {
				newSet.delete(briefingId);
			} else {
				newSet.add(briefingId);
			}
			return newSet;
		});
	};

	const handleFeedback = async (briefingId: string, rating: number) => {
		setFeedbackLoading((prev) => new Set(prev).add(briefingId));
		try {
			await apiClient.submitFeedback({
				briefing_id: briefingId,
				feedback_type: "overall",
				rating: rating,
			});
			// You could show a success message here
		} catch (err) {
			// You could show an error message here
		} finally {
			setFeedbackLoading((prev) => {
				const newSet = new Set(prev);
				newSet.delete(briefingId);
				return newSet;
			});
		}
	};

	// Format delivery time to 12-hour format
	const formatDeliveryTime = (time: string) => {
		if (!time) return "--:--";
		const [hours, minutes] = time.split(":");
		const hour = parseInt(hours);
		const period = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		return `${displayHour}:${minutes} ${period}`;
	};

	return (
			<div className="min-h-[70vh] py-3 md:py-0 px-4 mt-12 md:mt-18">
				{/* Header */}
				{loading ? (
					<BrewHeaderSkeleton />
				) : (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
						className="bg-card/30 rounded-t-xl -mx-4 px-5 pt-7 md:pt-8 py-2.5 mb-0 max-w-7xl mx-auto"
					>
						<div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5">
							{/* Left: Back button and title */}
							<div className="flex items-center gap-3">
								<Link
									to="/dashboard"
									className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
								>
									<ArrowLeft className="w-4 h-4" />
									Back to Dashboard
								</Link>
							</div>

							{/* Center: Brew name */}
							{brew && (
								<div className="flex items-center gap-2">
									<h1 className="text-xl font-bold">{brew.name}</h1>
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
							)}

							{/* Right: Actions */}
							<div className="flex items-center gap-2">
								<ShinyButton
									className="w-9 h-9 p-0 md:w-auto md:h-auto md:p-2 md:px-3 whitespace-nowrap flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2"
									onClick={() => {
										fetchBrew();
										if (user?.id) {
											fetchBriefings();
										}
									}}
									disabled={loading || briefingsLoading}
								>
									{loading || briefingsLoading ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<RefreshCw className="w-4 h-4" />
									)}
									<span className="hidden md:inline">
										{loading || briefingsLoading ? "Loading..." : "Refresh"}
									</span>
								</ShinyButton>
							</div>
						</div>
					</motion.div>
				)}

				<div className="max-w-7xl mx-auto bg-card/30 rounded-b-xl -mx-2 sm:-mx-4 px-3 sm:px-4 py-3">
					{loading ? (
						<BrewDetailsSkeleton />
				) : error ? (
					<div className="text-center py-12">
						<div className="bg-red-500/10 text-red-500 p-4 rounded-lg inline-flex items-center gap-2">
							<AlertCircle className="w-5 h-5" />
							<span>{error}</span>
							<button onClick={fetchBrew} className="ml-2 underline">
								Try again
							</button>
						</div>
					</div>
				) : brew ? (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5 }}
						className="space-y-6"
					>
						{/* Brew Summary Card */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2">
										<Mail className="w-5 h-5 text-primary" />
										{brew.name}
									</CardTitle>
									<ShinyButton className="whitespace-nowrap flex items-center justify-center gap-2 [&>span]:!flex [&>span]:!items-center [&>span]:!justify-center [&>span]:!gap-2">
										<Edit className="w-4 h-4" />
										<span className="hidden sm:inline">Edit</span>
									</ShinyButton>
								</div>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4 text-muted-foreground" />
										<div>
											<p className="text-sm font-medium">
												{formatDeliveryTime(brew.delivery_time)}
											</p>
											<p className="text-xs text-muted-foreground">
												Daily delivery
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Newspaper className="w-4 h-4 text-muted-foreground" />
										<div>
											<p className="text-sm font-medium">
												{brew.article_count} articles
											</p>
											<p className="text-xs text-muted-foreground">
												Per briefing
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-muted-foreground" />
										<div>
											<p className="text-sm font-medium">
												{briefings.length} sent
											</p>
											<p className="text-xs text-muted-foreground">
												Total briefings
											</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Briefings List */}
							<div className="space-y-3 sm:space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
									<h2 className="text-lg font-semibold">Recent Briefings</h2>
									{briefingsLoading && (
										<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
									)}
								</div>

								{briefingsLoading ? (
									[...Array(3)].map((_, i) => (
										<BriefingSkeleton key={i} index={i} />
									))
								) : briefings.length === 0 ? (
									<Card>
										<CardContent className="text-center py-8">
											<Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
											<h3 className="text-lg font-medium mb-2">
												No briefings yet
											</h3>
											<p className="text-muted-foreground mb-4">
												Your first briefing will be delivered at{" "}
												{formatDeliveryTime(brew.delivery_time)}
											</p>
										</CardContent>
									</Card>
								) : (
									briefings.map((briefing, index) => (
										<BriefingCard
											key={briefing.id}
											briefing={briefing}
											index={index}
											isExpanded={expandedBriefings.has(briefing.id)}
											onToggleExpansion={() =>
												toggleBriefingExpansion(briefing.id)
											}
											onFeedback={(rating) => handleFeedback(briefing.id, rating)}
											feedbackLoading={feedbackLoading.has(briefing.id)}
										/>
									))
								)}
							</div>
					</motion.div>
				) : (
					<div className="text-center py-12">
						<p className="text-muted-foreground">No brew found</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default BrewDetails;
