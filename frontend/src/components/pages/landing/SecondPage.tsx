import React from "react";
import { Coffee, Zap, Shield, Sparkles, Check, Users } from "lucide-react";

const SecondPage = () => {
	const features = [
		{
			icon: Coffee,
			title: "Up to 3 Daily Brews",
			desc: "Zero overload, maximum value",
		},
		{
			icon: Zap,
			title: "Custom Article Count",
			desc: "3, 5, or 8 articles - you decide",
		},
		{
			icon: Sparkles,
			title: "AI-Curated Summaries",
			desc: "Powered by Perplexity Sonar",
		},
		{ icon: Shield, title: "Privacy First", desc: "Only email & prefs stored" },
	];

	return (
		<>
			{/* Feature Highlights */}
			<section
				id="features"
				className="py-24 bg-gradient-to-br from-background to-muted"
			>
				<div className="max-w-5xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-foreground mb-4">
							Why Choose TimeBrew?
						</h2>
						<p className="text-xl text-muted-foreground">
							Features designed for the modern news consumer
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{features.map((feature, i) => (
							<div
								key={i}
								className="group bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl mb-4 flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform duration-300">
									<feature.icon className="w-6 h-6" />
								</div>
								<h3 className="text-lg font-semibold text-card-foreground mb-2">
									{feature.title}
								</h3>
								<p className="text-muted-foreground">{feature.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Benefits Banner */}
			<section className="py-24 bg-card">
				<div className="max-w-5xl mx-auto px-6">
					<div className="grid lg:grid-cols-2 gap-12 items-center">
						<div className="space-y-8">
							<div className="space-y-6">
								<h2 className="text-4xl font-bold text-card-foreground">
									Stay Informed, Not Overwhelmed.
								</h2>
								<div className="space-y-4 text-lg text-muted-foreground">
									<div className="flex items-start space-x-3">
										<Check className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
										<span>
											Fits any schedule with customizable delivery times
										</span>
									</div>
									<div className="flex items-start space-x-3">
										<Check className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
										<span>Continuously learns what you like with feedback</span>
									</div>
									<div className="flex items-start space-x-3">
										<Check className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
										<span>No subscription fatigue - just what you need</span>
									</div>
								</div>
							</div>
							<button className="border-2 border-primary text-primary px-8 py-3 rounded-full font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300">
								See Sample Digest
							</button>
						</div>
						<div className="relative">
							<div className="bg-gradient-to-br from-muted to-secondary rounded-3xl h-96 flex items-center justify-center">
								<Users className="w-24 h-24 text-muted-foreground" />
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
};

export default SecondPage;
