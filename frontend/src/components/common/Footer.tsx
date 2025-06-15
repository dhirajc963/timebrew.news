import React from "react";

const Footer = () => {
	return (
		<footer className="bg-slate-900 text-white py-16">
			<div className="max-w-5xl mx-auto px-6">
				<div className="grid md:grid-cols-4 gap-8">
					<div className="space-y-4">
						<div className="flex items-center space-x-2">
							<span className="text-xl font-bold">TimeBrew</span>
							<div className="w-2 h-2 bg-accent rounded-full"></div>
						</div>
						<p className="text-slate-400">Crafted in New Jersey ☕</p>
					</div>

					<div>
						<h4 className="font-semibold mb-4">Product</h4>
						<div className="space-y-2 text-slate-400">
							<a href="#" className="block hover:text-white transition-colors">
								Features
							</a>
							<a href="#" className="block hover:text-white transition-colors">
								Pricing
							</a>
							<a href="#" className="block hover:text-white transition-colors">
								Beta Access
							</a>
						</div>
					</div>

					<div>
						<h4 className="font-semibold mb-4">Company</h4>
						<div className="space-y-2 text-slate-400">
							<a href="#" className="block hover:text-white transition-colors">
								About
							</a>
							<a href="#" className="block hover:text-white transition-colors">
								Blog
							</a>
							<a href="#" className="block hover:text-white transition-colors">
								Contact
							</a>
						</div>
					</div>

					<div>
						<h4 className="font-semibold mb-4">Legal</h4>
						<div className="space-y-2 text-slate-400">
							<a href="#" className="block hover:text-white transition-colors">
								Privacy
							</a>
							<a href="#" className="block hover:text-white transition-colors">
								Terms
							</a>
							<a href="#" className="block hover:text-white transition-colors">
								Security
							</a>
						</div>
					</div>
				</div>

				<div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
					<p>&copy; 2025 TimeBrew LLC - Crafted in New Jersey ☕</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
