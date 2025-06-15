import React from "react";
import { motion } from "framer-motion";
import { DotPattern } from "@/components/magicui/dot-pattern";

interface BackgroundProps {
	variant?: "default" | "minimal" | "hero" | "gradient";
	showDotPattern?: boolean;
	showFloatingDots?: boolean;
	children: React.ReactNode;
}

const Background: React.FC<BackgroundProps> = ({
	variant = "default",
	showDotPattern = true,
	showFloatingDots = true,
	children,
}) => {
	const getBackgroundVariant = () => {
		switch (variant) {
			case "hero":
				return "bg-gradient-to-br from-background via-card/30 to-background";
			case "minimal":
				return "bg-background";
			case "gradient":
				return "bg-gradient-to-br from-primary/5 via-transparent to-accent/5";
			default:
				return "bg-gradient-to-br from-background via-card/20 to-background";
		}
	};

	// Generate simple floating dots
	const floatingDots = Array.from({ length: 20 }, (_, i) => ({
		id: i,
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: Math.random() * 3 + 2,
		duration: Math.random() * 15 + 10,
		delay: Math.random() * 5,
	}));

	return (
		<div className={`relative min-h-screen ${getBackgroundVariant()}`}>
			{/* Static Dot Pattern Background */}
			{showDotPattern && (
				<DotPattern
					className="absolute inset-0 opacity-20"
					width={40}
					height={40}
					cx={1}
					cy={1}
					cr={1}
				/>
			)}

			{/* Simple Floating Dots */}
			{showFloatingDots && (
				<div className="absolute inset-0 overflow-hidden pointer-events-none">
					{floatingDots.map((dot) => (
						<motion.div
							key={dot.id}
							className="absolute bg-primary/20 rounded-full"
							style={{
								left: `${dot.x}%`,
								top: `${dot.y}%`,
								width: `${dot.size}px`,
								height: `${dot.size}px`,
							}}
							animate={{
								y: [0, -20, 0],
								opacity: [0.2, 0.6, 0.2],
							}}
							transition={{
								duration: dot.duration,
								repeat: Infinity,
								ease: "easeInOut",
								delay: dot.delay,
							}}
						/>
					))}
				</div>
			)}

			{/* Subtle gradient orbs */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<motion.div
					className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-primary/6 to-accent/6 rounded-full blur-3xl"
					animate={{
						scale: [1, 1.1, 1],
						opacity: [0.3, 0.5, 0.3],
					}}
					transition={{
						duration: 8,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
				<motion.div
					className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-accent/4 to-primary/4 rounded-full blur-3xl"
					animate={{
						scale: [1, 0.9, 1],
						opacity: [0.2, 0.4, 0.2],
					}}
					transition={{
						duration: 12,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 3,
					}}
				/>
			</div>

			{/* Content */}
			<div className="relative z-10">{children}</div>
		</div>
	);
};

export default Background;
