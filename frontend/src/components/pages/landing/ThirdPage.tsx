import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";

const ThirdPage = () => {
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	const faqs = [
		{
			q: "Why limit to 3 Brews?",
			a: "We believe in intentional consumption. Three focused digests prevent information overload while keeping you well-informed.",
		},
		{
			q: "Can I change article count later?",
			a: "Absolutely! Adjust your article count (3, 5, or 8) anytime in your preferences. Your brew, your rules.",
		},
		{
			q: "What sources do you pull from?",
			a: "We aggregate from 500+ trusted sources including major news outlets, industry publications, and emerging voices.",
		},
		{
			q: "How is my data handled?",
			a: "We store only your email and preferences. No tracking, no selling data, one-click delete anytime. Privacy by design.",
		},
	];

	return (
		<>
			{/* Early Adopter CTA */}
			<section className="py-24 bg-gradient-to-r from-primary to-accent text-primary-foreground">
				<div className="max-w-4xl mx-auto px-6 text-center">
					<h2 className="text-4xl font-bold mb-4">
						Help Shape the Future of News.
					</h2>
					<p className="text-xl mb-8 text-primary-foreground/80">
						Join the beta today, get priority feature requests & lifetime 50%
						discount when we launch Pro.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
						<input
							type="email"
							placeholder="you@example.com"
							className="flex-1 px-6 py-4 rounded-full text-foreground bg-background border-none focus:outline-none focus:ring-4 focus:ring-primary-foreground/30"
						/>
						<button className="bg-slate-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-slate-800 transition-colors">
							Claim Your Beta Spot
						</button>
					</div>

					<p className="text-sm text-primary-foreground/60 mt-4">
						We'll never share your email. Unsubscribe anytime.
					</p>
				</div>
			</section>

			{/* FAQ */}
			<section className="py-24 bg-card">
				<div className="max-w-4xl mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-bold text-card-foreground mb-4">
							Frequently Asked Questions
						</h2>
					</div>

					<div className="space-y-4">
						{faqs.map((faq, i) => (
							<div
								key={i}
								className="border border-border rounded-xl overflow-hidden"
							>
								<button
									className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
									onClick={() => setOpenFaq(openFaq === i ? null : i)}
								>
									<span className="font-semibold text-card-foreground">
										{faq.q}
									</span>
									{openFaq === i ? (
										<Minus className="w-5 h-5" />
									) : (
										<Plus className="w-5 h-5" />
									)}
								</button>
								{openFaq === i && (
									<div className="px-6 pb-4 text-muted-foreground border-t border-border">
										<p className="pt-4">{faq.a}</p>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>
		</>
	);
};

export default ThirdPage;
