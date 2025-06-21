import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ChevronDown,
	ChevronUp,
	Mail,
	Calendar,
	ThumbsUp,
	ThumbsDown,
	Star,
	CheckCircle,
	XCircle,
	ExternalLink,
	Newspaper,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { Briefing } from "@/lib/apiClient";

interface BriefingCardProps {
	briefing: Briefing;
	index: number;
	isExpanded: boolean;
	onToggleExpansion: () => void;
	onFeedback: (rating: number) => void;
	onArticleFeedback: (articlePosition: number, rating: number) => void;
	feedbackLoading: boolean;
	articleFeedbackLoading: boolean;
}

const BriefingCard: React.FC<BriefingCardProps> = ({
	briefing,
	index,
	isExpanded,
	onToggleExpansion,
	onFeedback,
	onArticleFeedback,
	feedbackLoading,
	articleFeedbackLoading,
}) => {
	const getDeliveryStatusIcon = () => {
		switch (briefing.delivery_status) {
			case "sent":
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "failed":
				return <XCircle className="w-4 h-4 text-red-500" />;
			default:
				return <Mail className="w-4 h-4 text-muted-foreground" />;
		}
	};

	const getDeliveryStatusText = () => {
		switch (briefing.delivery_status) {
			case "sent":
				return "Delivered";
			case "failed":
				return "Failed";
			case "bounced":
				return "Bounced";
			default:
				return "Pending";
		}
	};

	const getDeliveryStatusColor = () => {
		switch (briefing.delivery_status) {
			case "sent":
				return "bg-green-500/10 text-green-500 hover:bg-green-500/10";
			case "failed":
				return "bg-red-500/10 text-red-500 hover:bg-red-500/10";
			default:
				return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/10";
		}
	};



	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: index * 0.1 }}
		>
			<Card className="overflow-hidden hover:shadow-lg hover:border-primary/20 transition-[box-shadow,border-color] duration-200 mx-1 sm:mx-0">
				<CardHeader className="pb-3 px-6 py-0 relative">
					{/* Mobile badge positioned absolutely in top right */}
					<div className="absolute top-3 right-3 sm:hidden">
						<Badge className={getDeliveryStatusColor()}>
							{getDeliveryStatusText()}
						</Badge>
					</div>

					{/* Mobile-first responsive header */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
						<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
							<div className="flex items-center gap-2 min-w-0 pr-16 sm:pr-0">
								{getDeliveryStatusIcon()}
								<CardTitle className="text-base sm:text-lg truncate max-w-[200px] sm:max-w-[300px]">
								{briefing.editor_draft?.subject && briefing.editor_draft.subject.length > 50
									? `${briefing.editor_draft.subject.substring(0, 50)}...`
									: briefing.editor_draft?.subject || `Briefing #${briefing.id}`}
							</CardTitle>
							</div>
							{/* Desktop badge in normal flow */}
							<div className="hidden sm:flex items-center gap-2 flex-wrap">
								<Badge className={getDeliveryStatusColor()}>
									{getDeliveryStatusText()}
								</Badge>
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
						<div className="flex items-center gap-1">
							<Calendar className="w-3 h-3" />
							<span className="text-xs sm:text-sm">
								{briefing.sent_at
									? formatDistanceToNow(new Date(briefing.sent_at)) + " ago"
									: "Not sent"}
							</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={onToggleExpansion}
							className="flex items-center gap-1 shrink-0 h-6 px-2"
						>
							{isExpanded ? (
								<>
									<ChevronUp className="w-4 h-4" />
									<span className="hidden sm:inline">Collapse</span>
								</>
							) : (
								<>
									<ChevronDown className="w-4 h-4" />
									<span className="hidden sm:inline">Expand</span>
								</>
							)}
						</Button>
					</div>
				</CardHeader>

				{isExpanded && (
					<CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
						{/* Briefing Content */}
						{briefing.editor_draft && (
							<div className="mb-6 space-y-4">
								{/* Intro */}
								{briefing.editor_draft.intro && (
									<div className="bg-muted/30 rounded-lg p-3 sm:p-4">
										<p className="text-sm text-muted-foreground leading-relaxed">
											{briefing.editor_draft.intro}
										</p>
									</div>
								)}

								{/* Articles */}
								{briefing.editor_draft.articles && briefing.editor_draft.articles.length > 0 && (
									<div className="space-y-3">
										{briefing.editor_draft.articles.map((article, articleIndex) => (
											<motion.div
												key={articleIndex}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ duration: 0.2, delay: articleIndex * 0.05 }}
											>
												<Card className="border border-border/50 hover:border-primary/20 transition-colors duration-200">
													<CardHeader className="pb-2">
														<div className="flex items-start justify-between gap-3">
															<div className="flex-1 min-w-0">
																<div className="flex items-center gap-2 mb-2">
																	<Newspaper className="w-4 h-4 text-primary flex-shrink-0" />
																	<Badge variant="outline" className="text-xs">
																		{article.source}
																	</Badge>
																	<span className="text-xs text-muted-foreground">#{articleIndex + 1}</span>
																</div>
																<CardTitle className="text-sm sm:text-base leading-tight mb-2">
																	{article.headline}
																</CardTitle>
																{article.story_content && (
																	<p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
																		{article.story_content}
																	</p>
																)}
															</div>
															<div className="flex flex-col gap-2">
																{article.original_url && article.original_url !== "null" && (
																	<Button
																		variant="outline"
																		size="sm"
																		asChild
																		className="h-8 px-2 text-xs"
																	>
																		<a
																			href={article.original_url}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="flex items-center gap-1"
																		>
																			<ExternalLink className="w-3 h-3" />
																			<span className="hidden sm:inline">Read</span>
																		</a>
																	</Button>
																)}
															</div>
														</div>
													</CardHeader>

													<CardContent className="pt-0 pb-3">
														{/* Article Feedback Section */}
														<div className="border-t pt-3">
															<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
																<h5 className="text-xs font-medium text-muted-foreground">
																	Rate this article
																</h5>
																{articleFeedbackLoading && (
																	<Skeleton className="w-3 h-3 rounded-full" />
																)}
															</div>

															{articleFeedbackLoading ? (
																<div className="flex items-center justify-between">
																	{/* Star Rating Skeleton */}
																	<div className="flex items-center gap-1">
																		{[1, 2, 3, 4, 5].map((rating) => (
																			<Skeleton
																				key={rating}
																				className="h-6 w-6 rounded-md"
																			/>
																		))}
																	</div>

																	{/* Quick Feedback Buttons Skeleton */}
																	<div className="flex items-center gap-2">
																		<Skeleton className="h-7 w-7 rounded-md" />
																		<Skeleton className="h-7 w-7 rounded-md" />
																	</div>
																</div>
															) : (
																<div className="flex items-center justify-between">
																	{/* Star Rating */}
																	<div className="flex items-center gap-1">
																		{[1, 2, 3, 4, 5].map((rating) => (
																			<Button
																				key={rating}
																				variant="ghost"
																				size="sm"
																				onClick={() => onArticleFeedback(articleIndex + 1, rating)}
																				className="p-0.5 h-6 w-6 hover:bg-yellow-500/20 hover:scale-110 transition-[background-color,transform] duration-200 touch-manipulation"
																			>
																				<Star className="w-3 h-3 text-yellow-500 transition-colors duration-200 hover:fill-yellow-500" />
																			</Button>
																		))}
																	</div>

																	{/* Quick Feedback Buttons */}
																	<div className="flex items-center gap-2">
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => onArticleFeedback(articleIndex + 1, 5)}
																			className="p-1 h-7 w-7 text-green-600 hover:bg-green-500/20 hover:text-green-700 hover:scale-105 transition-[background-color,color,transform] duration-200 touch-manipulation"
																		>
																			<ThumbsUp className="w-3 h-3" />
																		</Button>
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => onArticleFeedback(articleIndex + 1, 2)}
																			className="p-1 h-7 w-7 text-red-600 hover:bg-red-500/20 hover:text-red-700 hover:scale-105 transition-[background-color,color,transform] duration-200 touch-manipulation"
																		>
																			<ThumbsDown className="w-3 h-3" />
																		</Button>
																	</div>
																</div>
															)}
														</div>
													</CardContent>
												</Card>
											</motion.div>
										))}
									</div>
								)}

								{/* Outro */}
								{briefing.editor_draft.outro && (
									<div className="bg-muted/30 rounded-lg p-3 sm:p-4">
										<p className="text-sm text-muted-foreground leading-relaxed">
											{briefing.editor_draft.outro}
										</p>
									</div>
								)}
							</div>
						)}

						{/* Feedback Section */}
						<div className="border-t pt-4 sm:pt-6">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
								<h4 className="text-sm font-medium">How was this briefing?</h4>
								{feedbackLoading && (
									<Skeleton className="w-4 h-4 rounded-full" />
								)}
							</div>

							{feedbackLoading ? (
								<div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-3 mt-3 sm:mt-4">
									{/* Star Rating Skeleton */}
									<div className="flex items-center gap-2 sm:gap-1">
										{[1, 2, 3, 4, 5].map((rating) => (
											<Skeleton
												key={rating}
												className="h-8 w-8 sm:h-7 sm:w-7 rounded-md"
											/>
										))}
									</div>

									{/* Quick Feedback Buttons Skeleton */}
									<div className="flex items-center gap-3 sm:gap-2 flex-wrap">
										<Skeleton className="h-9 w-20 sm:w-16 rounded-md" />
										<Skeleton className="h-9 w-24 sm:w-20 rounded-md" />
									</div>
								</div>
							) : (
								<div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-3 mt-3 sm:mt-4">
									{/* Star Rating */}
									<div className="flex items-center gap-2 sm:gap-1">
										{[1, 2, 3, 4, 5].map((rating) => (
											<Button
												key={rating}
												variant="ghost"
												size="sm"
												onClick={() => onFeedback(rating)}
												className="p-1 h-8 w-8 sm:h-7 sm:w-7 hover:bg-yellow-500/20 hover:scale-110 transition-[background-color,transform] duration-200 touch-manipulation"
											>
												<Star className="w-4 h-4 sm:w-3 sm:h-3 text-yellow-500 transition-colors duration-200 hover:fill-yellow-500" />
											</Button>
										))}
									</div>

									{/* Quick Feedback Buttons */}
									<div className="flex items-center gap-3 sm:gap-2 flex-wrap">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onFeedback(5)}
											className="flex items-center gap-1.5 text-green-600 hover:bg-green-500/20 hover:text-green-700 hover:scale-105 transition-[background-color,color,transform] duration-200 text-xs sm:text-sm px-3 py-2 sm:px-2 sm:py-1 min-h-[36px] sm:min-h-[32px] touch-manipulation"
										>
											<ThumbsUp className="w-4 h-4 sm:w-3 sm:h-3" />
											<span className="hidden sm:inline">Loved it</span>
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onFeedback(2)}
											className="flex items-center gap-1.5 text-red-600 hover:bg-red-500/20 hover:text-red-700 hover:scale-105 transition-[background-color,color,transform] duration-200 text-xs sm:text-sm px-3 py-2 sm:px-2 sm:py-1 min-h-[36px] sm:min-h-[32px] touch-manipulation"
										>
											<ThumbsDown className="w-4 h-4 sm:w-3 sm:h-3" />
											<span className="hidden sm:inline">Not helpful</span>
										</Button>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				)}
			</Card>
		</motion.div>
	);
};

export default BriefingCard;
