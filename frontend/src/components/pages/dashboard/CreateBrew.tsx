import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Coffee, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import BrewCreationForm from "./BrewCreationForm";

const CreateBrew: React.FC = () => {
	// Animation variants for page transitions
	const pageVariants = {
		initial: { opacity: 0, y: 20 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -20 },
	};

	// Background effects variants
	const backgroundVariants = {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		transition: { duration: 1.2 },
	};

	return (
		<div className="min-h-screen flex items-center justify-center relative overflow-hidden py-16 md:py-0 pt-23 md:pt-16">
			{/* Background Effects */}
			<motion.div
				className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
				variants={backgroundVariants}
				initial="initial"
				animate="animate"
			/>

			<div className="max-w-6xl mx-auto px-4 w-full">
				<motion.div
					initial="initial"
					animate="animate"
					exit="exit"
					variants={pageVariants}
					transition={{ duration: 0.8 }}
					className="relative"
				>
					{/* Header with Back Link */}
					<div className="mb-3 flex items-center justify-between">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.3, delay: 0.1 }}
						>
							<Link
								to="/dashboard"
								className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 group px-4 py-2 rounded-full border border-border/50 bg-card/20 backdrop-blur-sm"
								aria-label="Back to Dashboard"
							>
								<ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
								Back to Dashboard
							</Link>
						</motion.div>
					</div>

					{/* Brew Creation Form */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="relative group"
					>
						<BrewCreationForm />
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
};

export default CreateBrew;
