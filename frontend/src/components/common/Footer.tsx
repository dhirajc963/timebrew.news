import React from "react";
import ThemeToggle from "./ThemeToggle";

import { Twitter, Github, Linkedin } from "lucide-react";

const Footer = () => {
	return (
		<footer className="bg-card text-muted-foreground py-12">
			<div className="container mx-auto px-4 md:px-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
					{/* Product */}
					<div>
						<h3 className="text-foreground font-semibold mb-4">Product</h3>
						<ul className="space-y-2">
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Features
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Pricing
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Testimonials
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									FAQ
								</a>
							</li>
						</ul>
					</div>

					{/* Company */}
					<div>
						<h3 className="text-foreground font-semibold mb-4">Company</h3>
						<ul className="space-y-2">
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									About
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Blog
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Careers
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Contact
								</a>
							</li>
						</ul>
					</div>

					{/* Legal */}
					<div>
						<h3 className="text-foreground font-semibold mb-4">Legal</h3>
						<ul className="space-y-2">
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Terms
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Privacy
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Cookies
								</a>
							</li>
							<li>
								<a href="#" className="hover:text-foreground transition-colors">
									Licenses
								</a>
							</li>
						</ul>
					</div>

					{/* Social */}
					<div>
						<h3 className="text-foreground font-semibold mb-4">Connect</h3>
						<div className="flex space-x-4">
							<a
								href="#"
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<Twitter className="w-5 h-5" />
							</a>
							<a
								href="#"
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<Github className="w-5 h-5" />
							</a>
							<a
								href="#"
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<Linkedin className="w-5 h-5" />
							</a>
						</div>
					</div>
				</div>

				<div className="pt-8 mt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
					<p className="text-sm">
						&copy; {new Date().getFullYear()} TimeBrew. All rights reserved.
					</p>

					<div className="flex items-center gap-4">
						<span className="text-sm">Toggle Theme</span>
						<ThemeToggle variant="icon" />
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
